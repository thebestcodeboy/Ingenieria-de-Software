import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: Request) {
  try {
    const supabaseAdmin = crearClienteAdmin();
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Sesión administrativa requerida.' }, { status: 401 });
    }

    const { data: requesterData, error: requesterError } = await supabaseAdmin.auth.getUser(token);
    if (requesterError || requesterData.user?.user_metadata?.rol !== 'mesa_entrada') {
      return NextResponse.json({ error: 'No tenés permisos para crear accesos docentes.' }, { status: 403 });
    }

    const { profesorId, nombre, apellido, dni, username } = await req.json();

    if (!dni || !username) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para habilitar el acceso docente.' },
        { status: 400 }
      );
    }

    const emailInstitucional = `${username}@profesor.ateneo.com`;
    const passwordInicial = String(dni);

    // 1. Crear el usuario en Supabase Auth con rol 'profesor'
    const metadata = {
      rol: 'profesor',
      debe_cambiar_pass: true,
      nombre: `${nombre} ${apellido}`,
      dni: String(dni),
      username,
      profesor_id: profesorId ? String(profesorId) : null,
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailInstitucional,
      password: passwordInicial,
      email_confirm: true,
      user_metadata: metadata,
    });

    let authUserId = authData.user?.id ?? null;

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
      authUserId = usersData.users.find(
        (user) => user.email?.toLowerCase() === emailInstitucional.toLowerCase(),
      )?.id ?? null;
    }

    if (!authUserId) {
      throw new Error('No se pudo identificar el usuario Auth del profesor.');
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
        username_institucional: username,
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
      usuario: username,
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
