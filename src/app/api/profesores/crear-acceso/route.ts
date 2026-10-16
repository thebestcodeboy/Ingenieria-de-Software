import { NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

function crearClienteAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ROLES_ADMINISTRATIVOS = ['mesa_entrada', 'mesa de entrada', 'gerente', 'gerencia', 'admin', 'administrador'];

function normalizarRol(valor: unknown): string {
  return String(valor ?? '').toLowerCase().trim();
}

// Misma lógica que getRoleFromUser() del frontend: app_metadata, user_metadata,
// email que empieza con "gerente" y, como último recurso, la tabla `perfiles`.
async function tienePermisoAdministrativo(
  supabaseAdmin: ReturnType<typeof crearClienteAdmin>,
  user: User,
): Promise<boolean> {
  const rolMetadata = normalizarRol(
    user.app_metadata?.rol ?? user.app_metadata?.role ?? user.user_metadata?.rol ?? user.user_metadata?.role,
  );
  if (ROLES_ADMINISTRATIVOS.includes(rolMetadata)) return true;

  const email = normalizarRol(user.email);
  if (email.startsWith('gerente') || email.startsWith('gerencia')) return true;

  const { data: perfil } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  return ROLES_ADMINISTRATIVOS.includes(normalizarRol(perfil?.rol));
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = crearClienteAdmin();
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Sesión administrativa requerida.' }, { status: 401 });
    }

    let solicitante = null as User | null;
    let motivoRechazo = '';
    const adminRes = await supabaseAdmin.auth.getUser(token);
    if (adminRes.data.user) {
      solicitante = adminRes.data.user;
    } else {
      motivoRechazo = adminRes.error?.message ?? 'sin usuario';
      // Alternativa: validar el token con la clave pública (anon)
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (anonKey) {
        const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const anonRes = await supabaseAnon.auth.getUser(token);
        if (anonRes.data.user) solicitante = anonRes.data.user;
        else motivoRechazo += ` | anon: ${anonRes.error?.message ?? 'sin usuario'}`;
      }
    }

    if (!solicitante) {
      console.error('crear-acceso profesor: token rechazado ->', motivoRechazo);
      return NextResponse.json(
        { error: `Sesión administrativa inválida o vencida. (${motivoRechazo})` },
        { status: 401 },
      );
    }

    if (!(await tienePermisoAdministrativo(supabaseAdmin, solicitante))) {
      return NextResponse.json({ error: 'No tenés permisos para crear accesos docentes.' }, { status: 403 });
    }

    const { profesorId, nombre, apellido, dni, username } = await req.json();

    if (!dni || !username) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para habilitar el acceso docente.' },
        { status: 400 }
      );
    }

    const passwordInicial = String(dni);
    const dniTxt = String(dni).replace(/\D/g, '');

    // Candidatos de usuario: si "prof.ggimenez" ya es de otro docente, se prueba con sufijos del DNI.
    const candidatos = [username, `${username}${dniTxt.slice(-3)}`, `${username}${dniTxt.slice(-4)}`, `${username}${dniTxt}`];

    let usernameFinal = '';
    let emailInstitucional = '';
    let authUserId: string | null = null;
    let metadata: Record<string, unknown> = {};

    for (const candidato of candidatos) {
      // ¿Otro docente ya usa este username?
      let qUser = supabaseAdmin.from('profesores').select('id').eq('username_institucional', candidato);
      if (profesorId) qUser = qUser.neq('id', profesorId);
      const { data: ocupado } = await qUser.limit(1);
      if (ocupado && ocupado.length > 0) continue;

      const email = `${candidato}@profesor.ateneo.com`;
      const meta = {
        rol: 'profesor',
        debe_cambiar_pass: true,
        nombre: `${nombre} ${apellido}`,
        dni: String(dni),
        username: candidato,
        profesor_id: profesorId ? String(profesorId) : null,
      };

      // 1. Crear el usuario en Supabase Auth con rol 'profesor'
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: passwordInicial,
        email_confirm: true,
        user_metadata: meta,
      });

      let idCandidato: string | null = authData?.user?.id ?? null;

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (!msg.includes('already') && !msg.includes('exists')) {
          throw authError;
        }
        const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (usersError) throw usersError;
        idCandidato = usersData.users.find(
          (user) => user.email?.toLowerCase() === email.toLowerCase(),
        )?.id ?? null;
      }

      if (!idCandidato) continue;

      // ¿Esa cuenta Auth ya pertenece a otro docente?
      let qAuth = supabaseAdmin.from('profesores').select('id').eq('auth_user_id', idCandidato);
      if (profesorId) qAuth = qAuth.neq('id', profesorId);
      const { data: duenio } = await qAuth.limit(1);
      if (duenio && duenio.length > 0) continue;

      usernameFinal = candidato;
      emailInstitucional = email;
      authUserId = idCandidato;
      metadata = meta;
      break;
    }

    if (!authUserId) {
      throw new Error('No se pudo generar un usuario único para este docente.');
    }

    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: metadata,
    });
    if (metadataError) throw metadataError;

    // 2. Actualizar la tabla profesores (por ID o por DNI)
    const query = supabaseAdmin
      .from('profesores')
      .update({
        acceso_portal: true,
        username_institucional: usernameFinal,
        auth_user_id: authUserId,
      });

    const { error: dbError } = profesorId
      ? await query.eq('id', profesorId)
      : await query.eq('dni', parseInt(String(dni), 10));

    if (dbError) {
      console.error('Error al actualizar tabla profesores:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      usuario: usernameFinal,
      claveProvisoria: passwordInicial,
      email: emailInstitucional,
    });
  } catch (error: unknown) {
    console.error('Error en crear-acceso profesor:', error);
    const message = error instanceof Error
      ? error.message
      : 'Error interno al generar credenciales docentes.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}