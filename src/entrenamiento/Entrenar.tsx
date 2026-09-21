import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Encabezado } from '../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton } from '../components/Formulario.tsx'
import { obtenerRutina, type RutinaCompleta } from '../datos/rutinas.ts'
import { registrarSesion, ultimaVez, type UltimaVez } from '../datos/sesiones.ts'
import { mensajeDeError } from '../lib/errores.ts'
import { formatearFechaHora } from '../lib/formato.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { BarraDescanso } from './BarraDescanso.tsx'
import { prepararSonido } from './descanso.ts'
import {
  borrarLocal,
  empezar,
  guardarLocal,
  leerLocal,
  paraRegistrar,
  problemaDeSerie,
  serieVacia,
  seriesHechas,
  type SerieEnCurso,
  type SesionEnCurso,
} from './enCurso.ts'
import styles from './entrenamiento.module.css'
import { formatearDuracion } from './formato.ts'
import { TarjetaEjercicio } from './TarjetaEjercicio.tsx'
import { usePantallaEncendida } from './usePantallaEncendida.ts'

// Una sesión sin terminar de hace más de esto se ofrece retomar o descartar;
// si es más nueva (por ejemplo, se salió a ver un video), se sigue sola.
const RETOMAR_SIN_PREGUNTAR_MS = 6 * 60 * 60 * 1000

// /entrenar/:id — RF-41 a RF-45. El cliente entrena su rutina, o el
// entrenador la registra en su nombre durante una clase presencial.
export function Entrenar() {
  const { id = '' } = useParams()
  const { datos, error, cargando, recargar } = useConsulta(async () => {
    const rutina = await obtenerRutina(id)
    const ultimas =
      rutina?.cliente_id
        ? await ultimaVez(rutina.cliente_id, [...new Set(rutina.items.map((i) => i.ejercicio.id))])
        : new Map<string, UltimaVez>()
    return { rutina, ultimas }
  }, [id])

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) {
    return (
      <section className={pantalla.pantalla}>
        <Aviso tipo="error">{error}</Aviso>
        <Boton type="button" variante="secundario" onClick={recargar}>
          Reintentar
        </Boton>
      </section>
    )
  }
  const rutina = datos?.rutina
  if (!rutina) return <Aviso tipo="error">Esa rutina no existe o ya no está disponible.</Aviso>
  if (!rutina.cliente_id) return <Aviso tipo="error">Las plantillas no se entrenan: asignala a un cliente.</Aviso>
  if (rutina.items.length === 0) return <Aviso tipo="info">Esta rutina todavía no tiene ejercicios.</Aviso>
  return <Inicio rutina={rutina} clienteId={rutina.cliente_id} ultimas={datos.ultimas} />
}

function Inicio({ rutina, clienteId, ultimas }: { rutina: RutinaCompleta; clienteId: string; ultimas: Map<string, UltimaVez> }) {
  const [sesion, setSesion] = useState<SesionEnCurso | null>(() => {
    const guardada = leerLocal(rutina.id, clienteId)
    if (!guardada) return empezar(rutina, clienteId, ultimas)
    const reciente = Date.now() - new Date(guardada.iniciadaEn).getTime() < RETOMAR_SIN_PREGUNTAR_MS
    return reciente ? guardada : null
  })

  if (!sesion) {
    const guardada = leerLocal(rutina.id, clienteId)
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo={rutina.nombre} />
        <Aviso tipo="info">
          Quedó un entrenamiento sin terminar del {guardada ? formatearFechaHora(guardada.iniciadaEn) : 'otro día'}.
        </Aviso>
        <Boton type="button" onClick={() => guardada && setSesion(guardada)}>
          Seguir ese
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          onClick={() => {
            borrarLocal(rutina.id, clienteId)
            setSesion(empezar(rutina, clienteId, ultimas))
          }}
        >
          Descartarlo y empezar de nuevo
        </Boton>
      </section>
    )
  }
  return <EnCurso inicial={sesion} ultimas={ultimas} />
}

function EnCurso({ inicial, ultimas }: { inicial: SesionEnCurso; ultimas: Map<string, UltimaVez> }) {
  const { tipo } = useAuth()
  const [sesion, setSesion] = useState(inicial)
  const [fase, setFase] = useState<'entrenando' | 'cierre'>('entrenando')
  const [finDescanso, setFinDescanso] = useState<number | null>(null)
  const [totalDescanso, setTotalDescanso] = useState(0)
  const [errorSerie, setErrorSerie] = useState<{ serie: number; mensaje: string } | null>(null)
  usePantallaEncendida()

  // Cada cambio queda guardado en el teléfono al instante, pero recién desde
  // la primera serie marcada: quien entra a mirar y se va no deja un
  // "entrenamiento sin terminar".
  useEffect(() => {
    if (seriesHechas(sesion) > 0) guardarLocal(sesion)
    else borrarLocal(sesion.rutinaId, sesion.clienteId)
  }, [sesion])

  const actual = sesion.ejercicios[sesion.actual]
  const volverA = tipo === 'entrenador' ? `/rutinas/${sesion.rutinaId}` : `/rutina/${sesion.rutinaId}`

  function cambiarEjercicio(cambio: (series: SerieEnCurso[]) => SerieEnCurso[]) {
    setSesion((s) => ({
      ...s,
      ejercicios: s.ejercicios.map((e, i) => (i === s.actual ? { ...e, series: cambio(e.series) } : e)),
    }))
  }

  function ir(indice: number) {
    setErrorSerie(null)
    setSesion((s) => ({ ...s, actual: indice }))
    window.scrollTo({ top: 0 })
  }

  function marcar(indice: number) {
    const serie = actual.series[indice]
    if (serie.hecha) {
      cambiarEjercicio((series) => series.map((s, i) => (i === indice ? { ...s, hecha: false } : s)))
      return
    }
    const problema = problemaDeSerie(serie, actual.prescripcion.segundos !== null)
    if (problema) {
      setErrorSerie({ serie: indice, mensaje: problema })
      return
    }
    setErrorSerie(null)
    prepararSonido()
    cambiarEjercicio((series) => series.map((s, i) => (i === indice ? { ...s, hecha: true } : s)))
    const descanso = actual.prescripcion.descanso_s
    const esLaUltima = sesion.actual === sesion.ejercicios.length - 1 && actual.series.every((s, i) => i === indice || s.hecha)
    if (descanso && !esLaUltima) {
      setTotalDescanso(descanso)
      setFinDescanso(Date.now() + descanso * 1000)
    }
  }

  const cambiarFin = useCallback((fin: number | null) => setFinDescanso(fin), [])

  if (fase === 'cierre') {
    return <Cierre sesion={sesion} volverAEntrenar={() => setFase('entrenando')} volverA={volverA} />
  }

  const esUltimo = sesion.actual === sesion.ejercicios.length - 1

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={sesion.rutinaNombre} volver={{ to: volverA, etiqueta: 'la rutina' }} />
      <div className={styles.progreso}>
        <span className={pantalla.textoApagado}>
          Ejercicio {sesion.actual + 1} de {sesion.ejercicios.length}
        </span>
        <div className={styles.puntos}>
          {sesion.ejercicios.map((e, i) => (
            <button
              key={e.rutinaEjercicioId}
              type="button"
              className={`${styles.punto} ${i === sesion.actual ? styles.puntoActual : ''} ${e.series.some((s) => s.hecha) ? styles.puntoHecho : ''}`}
              aria-label={`Ir a ${e.nombre}`}
              aria-current={i === sesion.actual ? 'step' : undefined}
              onClick={() => ir(i)}
            />
          ))}
        </div>
      </div>

      <TarjetaEjercicio
        ejercicio={actual}
        ultima={ultimas.get(actual.ejercicioId)}
        error={errorSerie}
        onCambiarSerie={(i, cambios) => cambiarEjercicio((series) => series.map((s, j) => (j === i ? { ...s, ...cambios } : s)))}
        onMarcar={marcar}
        onAgregarSerie={() => cambiarEjercicio((series) => [...series, serieVacia(series.at(-1))])}
        onQuitarSerie={() => cambiarEjercicio((series) => series.slice(0, -1))}
      />

      <div className={styles.navegacion}>
        <Boton type="button" variante="secundario" disabled={sesion.actual === 0} onClick={() => ir(sesion.actual - 1)}>
          ‹ Anterior
        </Boton>
        {esUltimo ? (
          <Boton type="button" onClick={() => setFase('cierre')}>
            Terminar
          </Boton>
        ) : (
          <Boton type="button" onClick={() => ir(sesion.actual + 1)}>
            Siguiente ›
          </Boton>
        )}
      </div>
      {!esUltimo && (
        <button type="button" className={styles.terminarAntes} onClick={() => setFase('cierre')}>
          Terminar el entrenamiento acá
        </button>
      )}
      <p className={pantalla.textoApagado}>Lo que anotás queda guardado en este teléfono aunque salgas.</p>

      {finDescanso !== null && <BarraDescanso fin={finDescanso} total={totalDescanso} onCambiarFin={cambiarFin} />}
    </section>
  )
}

// RF-44: esfuerzo percibido y comentario, y se guarda todo junto.
function Cierre({ sesion, volverAEntrenar, volverA }: { sesion: SesionEnCurso; volverAEntrenar: () => void; volverA: string }) {
  const navigate = useNavigate()
  const [esfuerzo, setEsfuerzo] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hechas = seriesHechas(sesion)
  const ejercicios = sesion.ejercicios.filter((e) => e.series.some((s) => s.hecha)).length

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const id = await registrarSesion(paraRegistrar(sesion, esfuerzo, comentario))
      borrarLocal(sesion.rutinaId, sesion.clienteId)
      navigate(`/sesion/${id}`, { replace: true, state: { aviso: '¡Entrenamiento guardado!' } })
    } catch (e) {
      setError(`${mensajeDeError(e)} Lo que anotaste sigue guardado en este teléfono.`)
      setGuardando(false)
    }
  }

  function descartar() {
    if (!window.confirm('¿Descartar este entrenamiento? Se pierde lo que anotaste.')) return
    borrarLocal(sesion.rutinaId, sesion.clienteId)
    navigate(volverA, { replace: true })
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo="Terminar entrenamiento" />
      <p className={styles.resumen}>
        {hechas === 0
          ? 'No marcaste ninguna serie.'
          : `${hechas} ${hechas === 1 ? 'serie' : 'series'} en ${ejercicios} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'} · ${formatearDuracion(sesion.iniciadaEn, new Date().toISOString())}`}
      </p>

      {hechas > 0 && (
        <>
          <fieldset className={styles.esfuerzo}>
            <legend className={styles.leyenda}>¿Qué tan duro fue? (opcional)</legend>
            <div className={styles.escala}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={esfuerzo === n ? `${styles.nivel} ${styles.nivelElegido}` : styles.nivel}
                  aria-pressed={esfuerzo === n}
                  onClick={() => setEsfuerzo(esfuerzo === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className={pantalla.textoApagado}>1 es muy fácil, 10 es el máximo esfuerzo.</p>
          </fieldset>
          <AreaDeTexto
            etiqueta="Comentario (opcional)"
            maxLength={2000}
            placeholder="Cómo te sentiste, si algo dolió…"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="button" cargando={guardando} onClick={guardar}>
            Guardar entrenamiento
          </Boton>
        </>
      )}
      <Boton type="button" variante="secundario" onClick={volverAEntrenar}>
        Seguir entrenando
      </Boton>
      <button type="button" className={styles.terminarAntes} onClick={descartar}>
        Descartar el entrenamiento
      </button>
    </section>
  )
}
