'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { cancelarInscripcion, inscribirAlumno, inscribirAlumnoCurso, inscribirAlumnoSerie } from '../services/turnos';

export default function PortalAlumnoModule({ activeTab }) {
  const { user } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [todosLosTurnos, setTodosLosTurnos] = useState([]);
  const [misInscripciones, setMisInscripciones] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [alumnoActual, setAlumnoActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros del catálogo
  const [filtroNivel, setFiltroNivel] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 8;

  // Inscripción en materia
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [tipoItem, setTipoItem] = useState('materia');
  const [profesoresDisponiblesMateria, setProfesoresDisponiblesMateria] = useState([]);
  const [profeSeleccionado, setProfeSeleccionado] = useState('');
  const [turnosDelProfesor, setTurnosDelProfesor] = useState([]);

  // Detalle de comisión ("Aula del Curso")
  const [cursoDetalleActivo, setCursoDetalleActivo] = useState(null);
  const [companerosComision, setCompanerosComision] = useState([]);
  const [loadingCompaneros, setLoadingCompaneros] = useState(false);

  // Modal de perfil de usuario
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);

  // Navegación de mes para ambos calendarios
  const [mesActual, setMesActual] = useState(() => new Date().getMonth());
  const [anioActual, setAnioActual] = useState(() => new Date().getFullYear());
  const [vistaCalendario, setVistaCalendario] = useState('mes');
  const [successMsg, setSuccessMsg] = useState('');
  const [inscripcionCancelar, setInscripcionCancelar] = useState(null);
  const [cancelandoInscripcion, setCancelandoInscripcion] = useState(false);

  useEffect(() => {
    const handleAbrirPerfil = () => setMostrarModalPerfil(true);
    window.addEventListener('abrir-perfil-alumno', handleAbrirPerfil);
    return () => window.removeEventListener('abrir-perfil-alumno', handleAbrirPerfil);
  }, []);

  useEffect(() => {
    setItemSeleccionado(null);
    setCursoDetalleActivo(null);
    setError('');
    setSuccessMsg('');
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const userEmail = user?.email || '';
      const usernameSesion = userEmail ? userEmail.split('@')[0] : (user?.user_metadata?.username || '');

      let alumnoData = null;

      if (userEmail) {
        const { data: porEmail } = await supabase
          .from('alumnos')
          .select('*')
          .ilike('email', userEmail)
          .maybeSingle();

        if (porEmail) {
          alumnoData = porEmail;
        }
      }

      if (!alumnoData && usernameSesion) {
        const { data: porUsername } = await supabase
          .from('alumnos')
          .select('*')
          .ilike('username_institucional', usernameSesion)
          .maybeSingle();

        if (porUsername) {
          alumnoData = porUsername;
        }
      }

      if (!alumnoData && user) {
        alumnoData = {
          id: user.id,
          username_institucional: usernameSesion.toUpperCase(),
          nombre: user.user_metadata?.nombre || usernameSesion.toUpperCase(),
          apellido: user.user_metadata?.apellido || '',
          dni: user.user_metadata?.dni || 'No registrado',
          telefono: user.user_metadata?.telefono || 'No registrado',
          email: userEmail || 'No registrado',
          direccion: user.user_metadata?.direccion || 'No registrada',
        };
      }

      setAlumnoActual(alumnoData);

      const [matRes, curRes, profRes, turnosRes, inscRes] = await Promise.all([
        supabase.from('materias').select('*').order('nombre', { ascending: true }),
        supabase.from('cursos_ingreso').select('*').order('nombre', { ascending: true }),
        supabase.from('profesores').select('*').order('nombre', { ascending: true }),
        supabase
          .from('turnos_clase')
          .select('*, materias(nombre, nivel), cursos_ingreso(nombre), profesores(id, nombre, apellido, email)')
          .order('fecha', { ascending: true }),
        supabase
          .from('inscripciones')
          .select('*, turnos_clase(*, materias(nombre, nivel), cursos_ingreso(nombre), profesores(id, nombre, apellido, email))'),
      ]);

      if (matRes.error) throw matRes.error;
      if (curRes.error) throw curRes.error;
      if (profRes.error) throw profRes.error;
      if (turnosRes.error) throw turnosRes.error;
      if (inscRes.error) throw inscRes.error;

      setMaterias(matRes.data || []);
      setCursos(curRes.data || []);
      setProfesores(profRes.data || []);
      setTodosLosTurnos(turnosRes.data || []);

      const todasInscripciones = inscRes.data || [];
      setInscripciones(todasInscripciones);
      if (alumnoData?.id) {
        const propias = todasInscripciones.filter((i) => String(i.alumno_id) === String(alumnoData.id));
        setMisInscripciones(propias);
      } else {
        setMisInscripciones([]);
      }
    } catch (err) {
      setError(`Error al conectar con la base de datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  const misInscripcionesVisibles = useMemo(
    () => misInscripciones.filter((ins) => ins.estado !== 'cancelado' && ins.turnos_clase?.estado !== 'cancelado'),
    [misInscripciones],
  );
  const misCursosAgrupados = useMemo(() => {
    const grupos = new Map();
    for (const inscripcion of misInscripcionesVisibles) {
      const turno = inscripcion.turnos_clase || {};
      const docenteId = turno.profesor_id || turno.profesores?.id || '';
      const actividadId = turno.curso_id
        ? `curso:${turno.curso_id}`
        : turno.clase_particular_id
          ? `particular:${turno.clase_particular_id}`
          : `materia:${turno.materia_id || turno.id}`;
      const clave = `${actividadId}:docente:${docenteId}`;

      if (!grupos.has(clave)) {
        grupos.set(clave, { clave, inscripciones: [] });
      }
      grupos.get(clave).inscripciones.push(inscripcion);
    }

    return Array.from(grupos.values()).sort((a, b) => {
      const fechaA = a.inscripciones[0].turnos_clase?.fecha || '';
      const fechaB = b.inscripciones[0].turnos_clase?.fecha || '';
      return fechaA.localeCompare(fechaB);
    });
  }, [misInscripcionesVisibles]);

  const itemsFiltrados = useMemo(() => {
    if (filtroNivel === 'Universitario') {
      return materias.filter((m) => (m.nivel || '').toLowerCase().includes('universitario'));
    }
    if (filtroNivel === 'Secundario') {
      return materias.filter((m) => (m.nivel || '').toLowerCase().includes('secundario'));
    }
    if (filtroNivel === 'curso') {
      return cursos.map((c) => ({ ...c, nivel: 'Curso de Ingreso', tipoOrigen: 'curso' }));
    }
    return [
      ...materias.map((m) => ({ ...m, tipoOrigen: 'materia' })),
      ...cursos.map((c) => ({ ...c, nivel: 'Curso de Ingreso', tipoOrigen: 'curso' })),
    ];
  }, [materias, cursos, filtroNivel]);

  const totalPaginas = Math.ceil(itemsFiltrados.length / elementosPorPagina) || 1;
  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return itemsFiltrados.slice(inicio, inicio + elementosPorPagina);
  }, [itemsFiltrados, paginaActual]);

  const handleSeleccionarItem = async (item, tipo) => {
    setItemSeleccionado(item);
    setTipoItem(tipo);
    setProfeSeleccionado('');
    setTurnosDelProfesor([]);
    setSuccessMsg('');
    setError('');

    try {
      let listaProfs = [];
      if (tipo === 'curso') {
        const { data, error } = await supabase
          .rpc('listar_docentes_curso_alumno', { p_curso_id: item.id });
        if (error) throw error;
        listaProfs = data || [];
      } else {
        const { data, error } = await supabase
          .from('profesor_materia')
          .select('profesores(id, nombre, apellido)')
          .eq('materia_id', item.id);
        if (error) throw error;
        listaProfs = (data || []).map((d) => d.profesores).filter(Boolean);
      }

      const profsMap = new Map();
      listaProfs.forEach((p) => profsMap.set(p.id, p));
      const listaUnica = Array.from(profsMap.values());

      listaUnica.sort((a, b) => {
        const apellidoA = (a.apellido || '').toLowerCase();
        const apellidoB = (b.apellido || '').toLowerCase();
        if (apellidoA !== apellidoB) return apellidoA.localeCompare(apellidoB);
        return (a.nombre || '').toLowerCase().localeCompare((b.nombre || '').toLowerCase());
      });

      setProfesoresDisponiblesMateria(listaUnica);
    } catch (err) {
      setError(`Error al cargar los docentes de la asignatura: ${err.message}`);
    }
  };

  // HU14: Se traen todos los turnos pero se identifica el estado (para no permitir inscripción a cancelados)
  const handleCambiarProfesor = async (profId) => {
    setProfeSeleccionado(profId);
    setTurnosDelProfesor([]);

    if (!profId || !itemSeleccionado) return;

    try {
      const columnaFiltro = tipoItem === 'curso' ? 'curso_id' : 'materia_id';
      const { data, error } = await supabase
        .from('turnos_clase')
        .select('*, materias(nombre), cursos_ingreso(nombre)')
        .eq(columnaFiltro, itemSeleccionado.id)
        .eq('profesor_id', profId);

      if (error) throw error;
      setTurnosDelProfesor(data || []);
    } catch (err) {
      setError(`Error al consultar turnos del docente: ${err.message}`);
    }
  };

  // HU14: Verificación estricta de que el turno no esté cancelado antes de guardar
  const handleInscribirseTurno = async (turnoId) => {
    try {
      if (alumnoActual?.activo === false) {
        setError('Tu cuenta está inactiva y no puede realizar nuevas inscripciones. Contactá a Mesa de Entrada.');
        return;
      }

      if (!alumnoActual?.id) {
        setError('No se pudo identificar una cuenta de alumno activa.');
        return;
      }

      const { data: turnoDb, error: errTurno } = await supabase
        .from('turnos_clase')
        .select('id, estado, serie_id')
        .eq('id', turnoId)
        .single();

      if (errTurno || !turnoDb) {
        throw new Error('El turno seleccionado no existe.');
      }

      if (turnoDb.estado === 'cancelado') {
        throw new Error('No es posible inscribirse: este turno ha sido cancelado.');
      }

      if (tipoItem === 'curso' && itemSeleccionado?.id && profeSeleccionado) {
        const resultado = await inscribirAlumnoCurso(
          String(itemSeleccionado.id),
          String(profeSeleccionado),
          String(alumnoActual.id),
        );
        const avisoEspera = resultado.cantidadEnEspera > 0
          ? ` ${resultado.cantidadEnEspera} fecha(s) quedaron en lista de espera.`
          : '';
        setSuccessMsg(`Inscripción al curso confirmada para ${resultado.cantidadSesiones} fecha(s).${avisoEspera}`);
      } else if (turnoDb.serie_id) {
        const resultado = await inscribirAlumnoSerie(turnoDb.serie_id, alumnoActual.id);
        const avisoEspera = resultado.cantidadEnEspera > 0
          ? ` ${resultado.cantidadEnEspera} fecha(s) quedaron en lista de espera.`
          : '';
        setSuccessMsg(`Inscripción al curso confirmada para ${resultado.cantidadSesiones} fecha(s).${avisoEspera}`);
      } else {
        const resultado = await inscribirAlumno(turnoId, alumnoActual.id);
        setSuccessMsg(resultado.estado === 'en_espera'
          ? 'El turno está completo. Te anotamos en la lista de espera.'
          : 'Inscripción confirmada con éxito.');
      }
      await cargarDatos();
      setTimeout(() => {
        setSuccessMsg('');
      }, 2500);
    } catch (err) {
      setError(`No se pudo completar la inscripción: ${err.message}`);
    }
  };

  const handleVerDetalleCursoAnotado = async (ins) => {
    setCursoDetalleActivo(ins);
    setLoadingCompaneros(true);
    try {
      const { data, error } = await supabase
        .from('inscripciones')
        .select('id, alumno_id, alumnos(id, nombre, apellido, email)')
        .eq('turno_id', ins.turno_id);

      if (error) throw error;
      const alumnos = (data || []).map((d) => d.alumnos).filter(Boolean);
      setCompanerosComision(alumnos);
    } catch (err) {
      setCompanerosComision([]);
    } finally {
      setLoadingCompaneros(false);
    }
  };

  const handleCancelarInscripcion = async (inscripcion) => {
    try {
      setCancelandoInscripcion(true);
      setError('');
      await cancelarInscripcion(inscripcion.id, inscripcion.turno_id);
      setSuccessMsg('Te diste de baja de esta fecha. Las demás clases del curso siguen igual.');
      setInscripcionCancelar(null);
      await cargarDatos();
    } catch (cancelError) {
      setError(`No se pudo cancelar la inscripción: ${cancelError.message}`);
    } finally {
      setCancelandoInscripcion(false);
    }
  };

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const cambiarMes = (direccion) => {
    if (direccion === 'ant') {
      if (mesActual === 0) {
        setMesActual(11);
        setAnioActual((a) => a - 1);
      } else {
        setMesActual((m) => m - 1);
      }
    } else {
      if (mesActual === 11) {
        setMesActual(0);
        setAnioActual((a) => a + 1);
      } else {
        setMesActual((m) => m + 1);
      }
    }
  };

  const celdasCalendario = useMemo(() => {
    const celdas = [];
    const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

    for (let p = 0; p < primerDiaSemana; p++) {
      celdas.push({ tipo: 'vacio', clave: `prev-${p}` });
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      celdas.push({
        tipo: 'dia',
        numero: dia,
        fechaStr,
        clave: `dia-${fechaStr}`,
      });
    }

    const celdasRestantes = (7 - (celdas.length % 7)) % 7;
    for (let r = 0; r < celdasRestantes; r++) {
      celdas.push({ tipo: 'vacio', clave: `post-${r}` });
    }

    return celdas;
  }, [anioActual, mesActual]);

  const hoy = new Date();
  const hoyRef = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const inicioSemanaActual = new Date(hoy);
  inicioSemanaActual.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const finSemanaActual = new Date(inicioSemanaActual);
  finSemanaActual.setDate(inicioSemanaActual.getDate() + 6);
  const fechaInicioSemana = `${inicioSemanaActual.getFullYear()}-${String(inicioSemanaActual.getMonth() + 1).padStart(2, '0')}-${String(inicioSemanaActual.getDate()).padStart(2, '0')}`;
  const fechaFinSemana = `${finSemanaActual.getFullYear()}-${String(finSemanaActual.getMonth() + 1).padStart(2, '0')}-${String(finSemanaActual.getDate()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '14px' }}>
        Cargando portal académico...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* 1. SELECCIÓN DE MATERIA Y CALENDARIO PARA ANOTARSE */}
      {itemSeleccionado ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', width: '100%', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <button
            onClick={() => setItemSeleccionado(null)}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
          >
            ← Volver al catálogo de cursos
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: 'linear-gradient(135deg, #0b1e33 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
              {itemSeleccionado.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#3730a3', backgroundColor: '#e0e7ff', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                {tipoItem === 'materia' ? itemSeleccionado.nivel || 'Universitario' : 'Curso de Ingreso'}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '6px 0 2px 0', textTransform: 'uppercase' }}>
                {itemSeleccionado.nombre}
              </h2>
            </div>
          </div>

          <div style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ width: '350px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Seleccione Docente Titular *
                </label>
                <select
                  value={profeSeleccionado}
                  onChange={(e) => handleCambiarProfesor(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                >
                  <option value="">Seleccione un profesor habilitado</option>
                  {profesoresDisponiblesMateria.length === 0 ? (
                    <option value="" disabled>No hay profesores asignados a esta asignatura</option>
                  ) : (
                    profesoresDisponiblesMateria.map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.apellido ? `${prof.apellido}, ${prof.nombre}` : prof.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {profeSeleccionado && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    {[
                      { id: 'dia', label: 'Día' },
                      { id: 'semana', label: 'Semana' },
                      { id: 'mes', label: 'Mes' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVistaCalendario(v.id)}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: vistaCalendario === v.id ? '#0b1e33' : 'transparent',
                          color: vistaCalendario === v.id ? '#ffffff' : '#475569',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 600, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span> Disponible
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#64748b', borderRadius: '50%', display: 'inline-block' }}></span> Ya Inscripto
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span> Lleno / Cancelado
                    </span>
                  </div>
                </div>
              )}
            </div>

            {successMsg && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                {successMsg}
              </div>
            )}
            {error && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {profeSeleccionado && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #94a3b8', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => cambiarMes('ant')}
                      title="Mes anterior"
                      style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ‹
                    </button>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0b1e33', minWidth: '180px' }}>
                      {nombresMeses[mesActual]} de {anioActual}
                    </h3>
                    <button
                      onClick={() => cambiarMes('sig')}
                      title="Mes siguiente"
                      style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ›
                    </button>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Docente: {profesoresDisponiblesMateria.find((p) => p.id === profeSeleccionado)?.nombre}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'].map((col) => (
                    <div key={col} style={{ padding: '8px 4px', borderRight: '1px solid #334155' }}>
                      {col}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #cbd5e1' }}>
                  {celdasCalendario.map((celda, idx) => {
                    const esVacio = celda.tipo === 'vacio';
                    const turnosDelDia = !esVacio
                      ? turnosDelProfesor.filter((t) => t.fecha === celda.fechaStr && t.estado !== 'cancelado' && !t.cancelado)
                      : [];
                    const esPasado = !esVacio && celda.fechaStr < hoyRef;

                    if (vistaCalendario === 'dia' && (!celda.numero || celda.fechaStr !== hoyRef)) {
                      return null;
                    }
                    if (vistaCalendario === 'semana' && (!celda.numero || celda.fechaStr < fechaInicioSemana || celda.fechaStr > fechaFinSemana)) {
                      return null;
                    }

                    return (
                      <div
                        key={celda.clave}
                        style={{
                          backgroundColor: esVacio ? '#f1f5f9' : esPasado ? '#fff5f5' : '#ffffff',
                          borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #cbd5e1',
                          borderBottom: '1px solid #cbd5e1',
                          minHeight: vistaCalendario === 'dia' ? '280px' : '115px',
                          padding: '6px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: esPasado ? '#991b1b' : '#334155', textAlign: 'left', marginBottom: '4px' }}>
                          {!esVacio && celda.numero}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
                          {turnosDelDia.map((t) => {
                            const totalConfirmados = inscripciones.filter(ins => ins.turno_id === t.id && ins.estado === 'confirmado').length;
                            const cuposLibres = t.cupo_maximo == null ? null : Math.max(t.cupo_maximo - totalConfirmados, 0);
                            const estaLleno = cuposLibres === 0;
                            const turnoVencido = new Date(`${t.fecha}T${t.hora_inicio}`) <= new Date();
                            const turnoCancelado = Boolean(t.cancelado);
                            const yaInscripto = misInscripciones.some((ins) => ins.turno_id === t.id && ins.estado !== 'cancelado' && ins.turnos_clase?.estado !== 'cancelado');
                            const esCancelado = t.estado === 'cancelado';
                            const nombreCurso = (tipoItem === 'curso' ? itemSeleccionado?.nombre : t.cursos_ingreso?.nombre) || t.materias?.nombre || 'Clase';
                            const nombreMateria = t.materias?.nombre && nombreCurso !== t.materias.nombre ? t.materias.nombre : null;

                            let bgColor = '#10b981';
                            const requiereInscripcionIntegral = tipoItem === 'curso' || Boolean(t.serie_id);
                            let textoBoton = requiereInscripcionIntegral ? 'Anotarme al curso' : 'Anotarse';
                            let cursorEstilo = 'pointer';

                            if (esCancelado) {
                              bgColor = '#dc2626';
                              textoBoton = 'CANCELADO';
                              cursorEstilo = 'not-allowed';
                            } else if (yaInscripto) {
                              bgColor = '#64748b';
                              textoBoton = 'INSCRIPTO';
                              cursorEstilo = 'not-allowed';
                            } else if (turnoCancelado || turnoVencido || t.cupo_maximo == null) {
                              bgColor = '#ef4444';
                              textoBoton = turnoCancelado ? 'CANCELADO' : turnoVencido ? 'PASADO' : 'SIN CUPO';
                              cursorEstilo = 'not-allowed';
                            } else if (estaLleno) {
                              bgColor = '#d97706';
                              textoBoton = 'LISTA DE ESPERA';
                            }

                            return (
                              <div
                                key={t.id}
                                onClick={() => !turnoCancelado && !turnoVencido && t.cupo_maximo != null && !yaInscripto && handleInscribirseTurno(t.id)}
                                title={yaInscripto ? 'Ya te encuentras registrado en este turno' : turnoCancelado ? 'Turno cancelado' : turnoVencido ? 'Turno pasado' : t.cupo_maximo == null ? 'La clase no tiene cupo definido' : requiereInscripcionIntegral ? 'Anotarse a todas las fechas futuras del curso con este docente' : estaLleno ? 'Anotarse en lista de espera' : 'Haga clic para anotarse'}
                                style={{
                                  backgroundColor: bgColor,
                                  color: '#ffffff',
                                  borderRadius: '4px',
                                  padding: '5px 6px',
                                  cursor: cursorEstilo,
                                  fontSize: '11px',
                                  lineHeight: 1.25,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                  opacity: esCancelado ? 0.85 : 1,
                                }}
                              >
                                <div style={{ fontWeight: 700, textDecoration: esCancelado ? 'line-through' : 'none' }}>
                                  {nombreCurso}
                                </div>
                                {nombreMateria && <div style={{ fontSize: '9px', marginTop: '1px', color: '#dbeafe' }}>Materia: {nombreMateria}</div>}
                                <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>
                                    {`${t.hora_inicio.slice(0, 5)} - ${t.hora_fin.slice(0, 5)} · `}{turnoVencido ? 'PASADO' : t.cupo_maximo == null ? 'SIN CUPO' : `${yaInscripto ? (misInscripciones.find(ins => ins.turno_id === t.id)?.estado === 'en_espera' ? 'EN ESPERA · ' : 'REGISTRADO · ') : ''}Cupo ${totalConfirmados}/${t.cupo_maximo} · Libres: ${cuposLibres}`}
                                  </span>
                                  <span style={{ fontWeight: 600, textDecoration: (!yaInscripto && !turnoCancelado && !turnoVencido && t.cupo_maximo != null) ? 'underline' : 'none' }}>
                                    {textoBoton}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: '11px', color: '#64748b' }}>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', marginRight: '6px' }}>NOTAS:</span>
                  En gris se indican turnos donde ya estás inscripto, en verde disponibles, y en rojo aquellos cancelados, vencidos o completos.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'cursos' ? (
        /* 2. CATÁLOGO DE CURSOS DISPONIBLES */
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Catálogo de Cursos Disponibles
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { id: 'todos', label: 'Todos los Cursos' },
              { id: 'Universitario', label: 'Nivel Universitario' },
              { id: 'Secundario', label: 'Nivel Secundario' },
              { id: 'curso', label: 'Cursos de Ingreso' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => { setFiltroNivel(f.id); setPaginaActual(1); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: filtroNivel === f.id ? '1.5px solid #0b1e33' : '1.5px solid #cbd5e1',
                  backgroundColor: filtroNivel === f.id ? '#0b1e33' : '#ffffff',
                  color: filtroNivel === f.id ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {itemsPaginados.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No se encontraron registros activos para este filtro.
              </div>
            ) : (
              itemsPaginados.map((item, idx) => {
                const esCurso = item.tipoOrigen === 'curso' || !item.nivel;
                const gradients = [
                  'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                  'linear-gradient(135deg, #581c87 0%, #8b5cf6 100%)',
                  'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
                ];
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxSizing: 'border-box',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ height: '80px', background: gradients[idx % gradients.length], display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.35)', padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {item.nivel || 'Curso de Ingreso'}
                      </span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', lineHeight: 1.35 }}>
                          {item.nombre}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleSeleccionarItem(item, esCurso ? 'curso' : 'materia')}
                        style={{ marginTop: '16px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#0b1e33', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
                      >
                        Abrir Calendario y Anotarse
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '20px', paddingBottom: '20px' }}>
              <button
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={paginaActual === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: paginaActual === 1 ? '#f1f5f9' : '#ffffff', color: '#0f172a', fontSize: '12px', fontWeight: 700, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: paginaActual === totalPaginas ? '#f1f5f9' : '#ffffff', color: '#0f172a', fontSize: '12px', fontWeight: 700, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'inscripcion' ? (
        /* 3. MIS CURSOS ANOTADOS */
        <div>
          {cursoDetalleActivo ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <button
                onClick={() => setCursoDetalleActivo(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
              >
                ← Volver a mis cursos
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'linear-gradient(135deg, #0b1e33 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '18px' }}>
                  {(cursoDetalleActivo.turnos_clase?.materias?.nombre || cursoDetalleActivo.turnos_clase?.cursos_ingreso?.nombre || 'CU').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: cursoDetalleActivo.turnos_clase?.estado === 'cancelado' ? '#991b1b' : '#15803d',
                      backgroundColor: cursoDetalleActivo.turnos_clase?.estado === 'cancelado' ? '#fee2e2' : '#f0fdf4',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {cursoDetalleActivo.turnos_clase?.estado === 'cancelado' ? 'CLASE CANCELADA' : 'Matriculado Activo'}
                  </span>
                  <h2
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '6px 0 2px 0',
                      textTransform: 'uppercase',
                      textDecoration: cursoDetalleActivo.turnos_clase?.estado === 'cancelado' ? 'line-through' : 'none',
                    }}
                  >
                    {cursoDetalleActivo.turnos_clase?.materias?.nombre || cursoDetalleActivo.turnos_clase?.cursos_ingreso?.nombre}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                    Nivel: {cursoDetalleActivo.turnos_clase?.materias?.nivel || 'Institucional'} | Aula: {cursoDetalleActivo.turnos_clase?.aula_numero || 'Presencial'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0b1e33', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
                    Docente Titular
                  </h3>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    {cursoDetalleActivo.turnos_clase?.profesores?.apellido ? `${cursoDetalleActivo.turnos_clase.profesores.apellido}, ${cursoDetalleActivo.turnos_clase.profesores.nombre}` : cursoDetalleActivo.turnos_clase?.profesores?.nombre}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    Email: {cursoDetalleActivo.turnos_clase?.profesores?.email || 'instituto@ateneo.edu.ar'}
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Horario de Cursada:
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: cursoDetalleActivo.turnos_clase?.estado === 'cancelado' ? '#dc2626' : '#2563eb', marginTop: '2px' }}>
                      {cursoDetalleActivo.turnos_clase?.fecha} | {cursoDetalleActivo.turnos_clase?.hora_inicio} - {cursoDetalleActivo.turnos_clase?.hora_fin}
                      {cursoDetalleActivo.turnos_clase?.estado === 'cancelado' && ' (SUSPENDIDA)'}
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0b1e33', margin: '0 0 14px 0', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Alumnos de la Comisión</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                      {companerosComision.length} Inscriptos
                    </span>
                  </h3>

                  {loadingCompaneros ? (
                    <div style={{ color: '#64748b', fontSize: '13px', padding: '16px 0' }}>Cargando alumnos de la comisión...</div>
                  ) : companerosComision.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13px', padding: '16px 0' }}>No hay otros alumnos inscriptos por el momento.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {companerosComision.map((comp) => {
                        const esElUsuarioActual = alumnoActual?.id === comp.id || (user?.email && comp.email === user.email);

                        return (
                          <div
                            key={comp.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              backgroundColor: esElUsuarioActual ? '#eff6ff' : '#f8fafc',
                              borderRadius: '6px',
                              border: esElUsuarioActual ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                {comp.apellido ? `${comp.apellido}, ${comp.nombre}` : comp.nombre}
                              </span>
                              {esElUsuarioActual && (
                                <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>
                                  Tú
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                {comp.email}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                  Mis Cursos y Clases Anotadas
                </h1>
              </div>

              {misInscripcionesVisibles.length === 0 ? (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Aún no se encuentra inscripto en ningún curso o clase particular. Diríjase a la pestaña Cursos para registrarse.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {misCursosAgrupados.map((grupo, idx) => {
                    const ins = grupo.inscripciones[0];
                    const turno = ins.turnos_clase;
                    const nombre = turno?.cursos_ingreso?.nombre || turno?.materias?.nombre || 'Clase Institucional';
                    const materia = turno?.curso_id ? turno?.materias?.nombre : null;
                    const nivel = turno?.materias?.nivel || (turno?.curso_id ? 'Curso de ingreso' : 'Curso Activo');
                    const fechas = grupo.inscripciones
                      .map((sesion) => sesion.turnos_clase)
                      .filter(Boolean)
                      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
                    const proximaFecha = fechas.find((fecha) => new Date(`${fecha.fecha}T${fecha.hora_inicio}`) > new Date()) || fechas[0];
                    const gradients = [
                      'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                      'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                      'linear-gradient(135deg, #581c87 0%, #8b5cf6 100%)',
                      'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
                    ];

                    return (
                      <div
                        key={grupo.clave}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          boxSizing: 'border-box',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ height: '80px', background: gradients[idx % gradients.length], display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.35)', padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {nivel}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', backgroundColor: '#16a34a', padding: '3px 7px', borderRadius: '4px' }}>
                            INSCRIPTO
                          </span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', lineHeight: 1.35 }}>
                              {nombre}
                            </h3>
                            {materia && <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>Materia: {materia}</p>}
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                              Titular: {turno?.profesores?.apellido ? `${turno.profesores.apellido}, ${turno.profesores.nombre}` : turno?.profesores?.nombre}
                            </p>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                              {proximaFecha ? `Próxima clase: ${proximaFecha.fecha} (${proximaFecha.hora_inicio?.slice(0, 5)} hs)` : 'Sin fechas próximas'}
                            </div>
                            <div style={{ marginTop: '5px', fontSize: '11px', color: '#64748b' }}>{grupo.inscripciones.length} fechas anotadas</div>
                          </div>
                          <button
                            onClick={() => handleVerDetalleCursoAnotado(ins)}
                            style={{ marginTop: '16px', backgroundColor: '#0b1e33', border: 'none', color: '#ffffff', borderRadius: '6px', padding: '9px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
                          >
                            Ver Comisión y Alumnos
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 4. CALENDARIO PERSONAL DEL ALUMNO */
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0', letterSpacing: '-0.02em' }}>
              Mi Agenda de Clases
            </h1>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #94a3b8', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => cambiarMes('ant')}
                  title="Mes anterior"
                  style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ‹
                </button>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0b1e33', minWidth: '180px' }}>
                  {nombresMeses[mesActual]} de {anioActual}
                </h3>
                <button
                  onClick={() => cambiarMes('sig')}
                  title="Mes siguiente"
                  style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ›
                </button>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                {misInscripcionesVisibles.length} {misInscripcionesVisibles.length === 1 ? 'Clase Programada' : 'Clases Programadas'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              {['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'].map((col) => (
                <div key={col} style={{ padding: '8px 4px', borderRight: '1px solid #334155' }}>
                  {col}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #cbd5e1' }}>
              {celdasCalendario.map((celda, idx) => {
                const esVacio = celda.tipo === 'vacio';
                const misTurnosDelDia = !esVacio
                  ? misInscripcionesVisibles.filter((ins) => ins.turnos_clase?.fecha === celda.fechaStr)
                  : [];

                return (
                  <div
                    key={celda.clave}
                    style={{
                      backgroundColor: esVacio ? '#f1f5f9' : '#ffffff',
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #cbd5e1',
                      borderBottom: '1px solid #cbd5e1',
                      minHeight: '120px',
                      padding: '6px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', textAlign: 'left', marginBottom: '4px' }}>
                      {!esVacio && celda.numero}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
                      {misTurnosDelDia.map((ins) => {
                        const t = ins.turnos_clase;
                        const nombreCurso = t?.cursos_ingreso?.nombre || t?.clases_particulares?.nombre || t?.materias?.nombre || 'Clase';
                        const nombreMateria = t?.cursos_ingreso?.nombre ? t?.materias?.nombre : null;
                        const profNombre = t?.profesores?.apellido ? `${t.profesores.apellido}` : (t?.profesores?.nombre || 'Docente');
                        const esFutura = t?.fecha && t?.hora_inicio && new Date(`${t.fecha}T${t.hora_inicio}`) > new Date();

                        return (
                          <div
                            key={ins.id}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              borderRadius: '4px',
                              padding: '5px 6px',
                              fontSize: '11px',
                              lineHeight: 1.25,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                              {nombreCurso}
                            </div>
                            {nombreMateria && <div style={{ fontSize: '9px', marginTop: '1px', color: '#dbeafe' }}>Materia: {nombreMateria}</div>}
                            <div style={{ fontSize: '10px', marginTop: '2px', color: '#dbeafe' }}>
                              Horario: {t?.hora_inicio?.slice(0, 5)} - {t?.hora_fin?.slice(0, 5)}
                            </div>
                            <div style={{ fontSize: '9px', color: '#e0e7ff', marginTop: '1px' }}>
                              Prof. {profNombre}
                            </div>
                            {esFutura && (
                              <button
                                type="button"
                                onClick={() => setInscripcionCancelar(ins)}
                                style={{ marginTop: '5px', padding: '3px 6px', border: '1px solid rgba(255,255,255,0.75)', borderRadius: '4px', backgroundColor: '#fff', color: '#b91c1c', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Cancelar esta fecha
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: '11px', color: '#64748b' }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', marginRight: '6px' }}>NOTAS:</span>
              En este calendario se reflejan de forma exclusiva las clases confirmadas en las que usted está registrado como alumno.
            </div>
          </div>
        </div>
      )}

      {inscripcionCancelar && (
        <div
          role="presentation"
          onMouseDown={() => !cancelandoInscripcion && setInscripcionCancelar(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '20px', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-baja-inscripcion"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)' }}
          >
            <h2 id="titulo-baja-inscripcion" style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '18px' }}>¿Cancelar solo esta clase?</h2>
            <p style={{ margin: '0 0 18px', color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>
              Te vas a dar de baja de la sesión del {inscripcionCancelar.turnos_clase?.fecha}. Las otras fechas del curso no cambian.
            </p>
            {error && <div role="alert" style={{ marginBottom: '14px', padding: '10px', borderRadius: '5px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" disabled={cancelandoInscripcion} onClick={() => setInscripcionCancelar(null)} style={{ padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: '5px', backgroundColor: '#fff', color: '#334155', cursor: 'pointer' }}>Volver</button>
              <button type="button" disabled={cancelandoInscripcion} onClick={() => void handleCancelarInscripcion(inscripcionCancelar)} style={{ padding: '9px 13px', border: '0', borderRadius: '5px', backgroundColor: '#b91c1c', color: '#fff', fontWeight: 700, cursor: cancelandoInscripcion ? 'wait' : 'pointer' }}>{cancelandoInscripcion ? 'Cancelando...' : 'Confirmar baja'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERFIL INSTITUCIONAL */}
      {mostrarModalPerfil && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0b1e33' }}>
                Perfil Institucional del Alumno
              </h3>
              <button
                onClick={() => setMostrarModalPerfil(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Usuario Institucional</label>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{alumnoActual?.username_institucional || (user?.email ? user.email.split('@')[0].toUpperCase() : 'USUARIO')}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Nombre</label>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.nombre || 'No registrado'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Apellido</label>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.apellido || 'No registrado'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>DNI</label>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.dni || 'No registrado'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Teléfono</label>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.telefono || 'No registrado'}</div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Correo Electrónico</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.email || user?.email || 'No registrado'}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Dirección</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{alumnoActual?.direccion || 'No registrada'}</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                onClick={() => setMostrarModalPerfil(false)}
                style={{ backgroundColor: '#0b1e33', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
