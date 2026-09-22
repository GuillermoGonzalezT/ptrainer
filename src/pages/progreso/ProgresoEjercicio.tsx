import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso } from '../../components/Formulario.tsx'
import { GraficaEvolucion } from '../../components/GraficaEvolucion.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import { obtenerEjercicio } from '../../datos/ejercicios.ts'
import { progresoDeEjercicio, tipoDeProgreso, type SesionDeEjercicio } from '../../datos/progreso.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { conUnidad, describirCambio } from '../metricas/formato.ts'
import estilos from '../metricas/metricas.module.css'

// /progreso/:clienteId/:ejercicioId — RF-60. Carga máxima y volumen van en
// dos gráficas separadas: tienen escalas muy distintas y un solo eje las
// distorsionaría.
export function ProgresoEjercicio() {
  const { clienteId = '', ejercicioId = '' } = useParams()
  const { tipo } = useAuth()
  const esEntrenador = tipo === 'entrenador'
  const { datos, error, cargando } = useConsulta(
    async () => ({
      sesiones: await progresoDeEjercicio(clienteId, ejercicioId),
      ejercicio: await obtenerEjercicio(ejercicioId),
      cliente: esEntrenador ? await obtenerCliente(clienteId) : null,
    }),
    [clienteId, ejercicioId, esEntrenador],
  )

  const volver = esEntrenador
    ? { to: `/clientes/${clienteId}/progreso`, etiqueta: 'el progreso' }
    : { to: '/progreso', etiqueta: 'progreso' }

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos?.ejercicio || datos.sesiones.length === 0) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="Sin datos" volver={volver} />
        <p>No hay sesiones registradas con este ejercicio.</p>
      </section>
    )
  }

  const { sesiones, ejercicio, cliente } = datos
  const quien = cliente ? ` de ${cliente.nombre}` : ''

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={ejercicio.nombre} volver={volver} />
      <p className={pantalla.textoApagado}>
        {cliente && `${cliente.nombre} · `}
        {sesiones.length === 1 ? '1 sesión' : `${sesiones.length} sesiones`} ·{' '}
        <Link to={`/ejercicios/${ejercicio.id}`}>Ver cómo se hace</Link>
      </p>
      <Contenido sesiones={sesiones} descripcion={`${ejercicio.nombre}${quien}`} />
    </section>
  )
}

function Contenido({ sesiones, descripcion }: { sesiones: SesionDeEjercicio[]; descripcion: string }) {
  const tipo = tipoDeProgreso(sesiones)
  const conValor = (campo: (s: SesionDeEjercicio) => number | null) =>
    sesiones.flatMap((s) => {
      const v = campo(s)
      return v === null ? [] : [{ fecha: s.fecha, valor: v, sesion: s }]
    })

  const principal =
    tipo === 'carga'
      ? { titulo: 'Carga máxima', unidad: 'kg', puntos: conValor((s) => s.carga_max) }
      : tipo === 'repeticiones'
        ? { titulo: 'Repeticiones máximas', unidad: 'reps', puntos: conValor((s) => s.reps_max) }
        : { titulo: 'Mejor tiempo', unidad: 's', puntos: conValor((s) => s.segundos_max) }
  const secundaria =
    tipo === 'carga'
      ? { titulo: 'Volumen', ayuda: 'Kilos × repeticiones, sumando todas las series.', unidad: 'kg', puntos: conValor((s) => s.volumen) }
      : tipo === 'repeticiones'
        ? { titulo: 'Repeticiones totales', ayuda: 'Sumando todas las series.', unidad: 'reps', puntos: conValor((s) => s.reps_total) }
        : null

  const ultima = principal.puntos.at(-1)
  const anterior = principal.puntos.at(-2)
  const mejor = principal.puntos.reduce((m, p) => (p.valor > m.valor ? p : m), principal.puntos[0])
  const cambio = ultima && anterior ? describirCambio({ mejor: 'mayor', unidad: principal.unidad }, ultima.valor, anterior.valor) : null

  return (
    <>
      {ultima && (
        <div className={estilos.resumen}>
          <div className={estilos.dato}>
            <span className={estilos.datoEtiqueta}>{principal.titulo}, última sesión</span>
            <span className={estilos.datoValor}>{conUnidad(ultima.valor, principal.unidad)}</span>
            {cambio && (
              <span className={estilos.cambio}>
                {cambio.sentido !== 'neutro' && (
                  <span className={`${estilos.flecha} ${estilos[cambio.sentido]}`} aria-hidden="true">
                    {cambio.sentido === 'mejora' ? '▲' : '▼'}
                  </span>
                )}
                {cambio.texto} vs. la anterior
              </span>
            )}
          </div>
          <div className={estilos.dato}>
            <span className={estilos.datoEtiqueta}>Mejor marca</span>
            <span className={estilos.datoValor}>{conUnidad(mejor.valor, principal.unidad)}</span>
            <span className={pantalla.textoApagado}>{formatearFecha(mejor.fecha)}</span>
          </div>
        </div>
      )}

      {principal.puntos.length > 1 && (
        <div className={pantalla.seccion}>
          <h2>{principal.titulo}</h2>
          <GraficaEvolucion puntos={principal.puntos} unidad={principal.unidad} descripcion={`${principal.titulo}, ${descripcion}`} />
        </div>
      )}
      {secundaria && secundaria.puntos.length > 1 && (
        <div className={pantalla.seccion}>
          <h2>{secundaria.titulo}</h2>
          <p className={pantalla.textoApagado}>{secundaria.ayuda}</p>
          <GraficaEvolucion puntos={secundaria.puntos} unidad={secundaria.unidad} descripcion={`${secundaria.titulo}, ${descripcion}`} />
        </div>
      )}
      {principal.puntos.length === 1 && (
        <p className={pantalla.textoApagado}>Con una sesión más aparece la gráfica de evolución.</p>
      )}

      {/* La tabla: todas las sesiones, la más nueva arriba. */}
      <div className={pantalla.seccion}>
        <h2>Sesiones</h2>
        <ul className={pantalla.lista}>
          {[...sesiones].reverse().map((s) => (
            <li key={s.sesion_id}>
              <Link to={`/sesion/${s.sesion_id}`} className={pantalla.fila}>
                <span className={pantalla.filaTexto}>
                  <span className={pantalla.filaNombre}>{formatearFecha(s.fecha)}</span>
                  <span className={pantalla.filaDetalle}>
                    {s.series === 1 ? '1 serie' : `${s.series} series`}
                    {tipo === 'carga' && ` · volumen ${conUnidad(s.volumen, 'kg')}`}
                    {tipo === 'repeticiones' && s.reps_total !== null && ` · ${s.reps_total} reps en total`}
                  </span>
                </span>
                <span className={estilos.filaValor}>
                  {tipo === 'carga' && s.carga_max !== null && conUnidad(s.carga_max, 'kg')}
                  {tipo === 'repeticiones' && s.reps_max !== null && conUnidad(s.reps_max, 'reps')}
                  {tipo === 'tiempo' && s.segundos_max !== null && conUnidad(s.segundos_max, 's')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
