import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
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
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailInstitucional,
      password: passwordInicial,
      email_confirm: true,
      user_metadata: {
        rol: 'profesor',
        debe_cambiar_pass: true,
        nombre: `${nombre} ${apellido}`,
        dni: String(dni),
        username: username,
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (!msg.includes('already') && !msg.includes('exists')) {
        throw authError;
      }
    }

    // 2. Actualizar la tabla profesores (por ID o por DNI)
    const query = supabaseAdmin
      .from('profesores')
      .update({
        acceso_portal: true,
        username_institucional: username,
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
  } catch (error: any) {
    console.error('Error en crear-acceso profesor:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al generar credenciales docentes.' },
      { status: 500 }
    );
  }
}