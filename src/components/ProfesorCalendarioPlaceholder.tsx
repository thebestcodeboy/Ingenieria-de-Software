export default function ProfesorCalendarioPlaceholder() {
  return (
    <section aria-labelledby="titulo-calendario-docente">
      <div style={{ marginBottom: '24px' }}>
        <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Portal docente
        </span>
        <h1 id="titulo-calendario-docente" style={{ color: '#0f172a', fontSize: '24px', margin: '5px 0 4px' }}>
          Mi calendario
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          Este espacio queda reservado para integrar el calendario diario y semanal.
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '10px', minHeight: '420px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
        <div>
          <div aria-hidden="true" style={{ color: '#94a3b8', fontSize: '42px', marginBottom: '12px' }}>▦</div>
          <strong style={{ color: '#334155', display: 'block', fontSize: '15px' }}>Calendario pendiente de integración</strong>
          <span style={{ color: '#94a3b8', display: 'block', fontSize: '12px', marginTop: '5px' }}>
            No se muestran datos provisorios para evitar mezclar esta pantalla con la implementación definitiva.
          </span>
        </div>
      </div>
    </section>
  );
}
