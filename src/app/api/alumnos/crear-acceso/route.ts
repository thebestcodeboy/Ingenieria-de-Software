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
    const { alumnoId, nombre, apellido, dni, legajo, username } = await req.json();

    if (!dni || !username) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para habilitar el acceso.' },
        { status: 400 }
      );
    }

    const emailInstitucional = `${username}@alumno.ateneo.com`;
    const passwordInicial = String(dni);

    // 1. Crear el usuario en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailInstitucional,
      password: passwordInicial,
      email_confirm: true,
      user_metadata: {
        rol: 'alumno',
        debe_cambiar_pass: true,
        nombre: `${nombre} ${apellido}`,
        dni: String(dni),
        legajo: legajo,
        username: username,
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      // Si ya fue creado en Auth, continuamos para asegurar que quede actualizado en la tabla
      if (!msg.includes('already') && !msg.includes('exists')) {
        throw authError;
      }
    }

    // 2. Actualizar la fila en la tabla public.alumnos por DNI (infalible) o por ID
    const query = supabaseAdmin
      .from('alumnos')
      .update({
        acceso_portal: true,
        username_institucional: username,
      });

    const { data: updatedData, error: dbError } = alumnoId
      ? await query.eq('id', alumnoId).select()
      : await query.eq('dni', parseInt(String(dni), 10)).select();

    if (dbError) {
      console.error('Error al actualizar tabla alumnos:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log('Alumno actualizado exitosamente en DB:', updatedData);

    return NextResponse.json({
      success: true,
      usuario: username,
      claveProvisoria: passwordInicial,
      email: emailInstitucional,
    });
  } catch (error: unknown) {
    console.error('Error en crear-acceso:', error);
    const message = error instanceof Error
      ? error.message
      : 'Error interno al generar credenciales.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
