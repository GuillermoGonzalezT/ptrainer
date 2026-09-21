import { useId, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import {
  archivarMetrica,
  etiquetaMejor,
  obtenerMetrica,
  quitarVideoMetrica,
  subirVideoMetrica,
  urlDeVideoMetrica,
  type Metrica,
} from '../../datos/metricas.ts'
import { DURACION_MAXIMA_S, ErrorDeVideo, prepararVideo } from '../../lib/comprimirVideo.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import videos from '../ejercicios/videos.module.css'

// Una métrica: cómo se mide y su video (RF-50). La ven el entrenador y, en
// modo lectura, sus clientes.
export function DetalleMetrica() {
  const { id = '' } = useParams()
  const { session, tipo } = useAuth()
  const navigate = useNavigate()
  const { datos, error, cargando, recargar } = useConsulta(async () => {
    const metrica = await obtenerMetrica(id)
    const url = metrica?.video_path ? await urlDeVideoMetrica(metrica.video_path) : null
    return { metrica, url }
  }, [id])
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  const esEntrenador = tipo === 'entrenador'
  const volver = esEntrenador ? { to: '/metricas', etiqueta: 'métricas' } : { to: '/progreso', etiqueta: 'progreso' }
  const metrica = datos?.metrica
  if (!metrica) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="No encontrada" volver={volver} />
        <p>Esa métrica no existe.</p>
      </section>
    )
  }
  const propia = esEntrenador && metrica.entrenador_id === session?.user.id

  async function alternarArchivo() {
    try {
      await archivarMetrica(metrica!.id, !metrica!.archivada)
      navigate('/metricas')
    } catch (e) {
      setErrorArchivo(mensajeDeError(e))
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={metrica.nombre}
        volver={volver}
        accion={
          propia && (
            <Link to={`/metricas/${metrica.id}/editar`} className={`${pantalla.botonLink} ${pantalla.botonChico}`}>
              Editar
            </Link>
          )
        }
      />
      {metrica.archivada && <Aviso tipo="info">Archivada: no aparece para asignar.</Aviso>}
      {metrica.entrenador_id === null && esEntrenador && (
        <p className={pantalla.textoApagado}>Métrica predefinida: no se edita, pero la podés asignar.</p>
      )}

      <div className={pantalla.seccion}>
        <dl className={pantalla.datos}>
          <dt>Unidad</dt>
          <dd>{metrica.unidad}</dd>
          <dt>Mejor</dt>
          <dd>{etiquetaMejor[metrica.mejor]}</dd>
        </dl>
        {metrica.protocolo && (
          <>
            <h2>Cómo se mide</h2>
            <p className={pantalla.notaTexto}>{metrica.protocolo}</p>
          </>
        )}
      </div>

      {(datos.url || propia) && (
        <div className={pantalla.seccion}>
          <h2>Video</h2>
          {datos.url && <video className={videos.reproductor} src={datos.url} controls playsInline preload="metadata" />}
          {propia && <VideoPropio metrica={metrica} entrenadorId={session!.user.id} alCambiar={recargar} />}
        </div>
      )}

      {esEntrenador && !metrica.archivada && (
        <Link to={`/metricas/${metrica.id}/asignar`} className={pantalla.botonLink}>
          Asignar a clientes
        </Link>
      )}
      {propia && (
        <Boton type="button" variante="secundario" onClick={alternarArchivo}>
          {metrica.archivada ? 'Sacar de archivadas' : 'Archivar'}
        </Boton>
      )}
      {errorArchivo && <Aviso tipo="error">{errorArchivo}</Aviso>}
    </section>
  )
}

// Un solo video por métrica: se sube, se reemplaza o se quita.
function VideoPropio({ metrica, entrenadorId, alCambiar }: { metrica: Metrica; entrenadorId: string; alCambiar: () => void }) {
  const idCamara = useId()
  const idGaleria = useId()
  const [progreso, setProgreso] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function elegido(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setError(null)
    setProgreso(0)
    try {
      const video = await prepararVideo(archivo, setProgreso)
      setProgreso(1)
      await subirVideoMetrica(entrenadorId, metrica, video)
      alCambiar()
    } catch (e) {
      setError(e instanceof ErrorDeVideo ? e.message : mensajeDeError(e))
    }
    setProgreso(null)
  }

  async function quitar() {
    if (!window.confirm('¿Quitar el video?')) return
    try {
      await quitarVideoMetrica(metrica)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  if (progreso !== null) {
    return (
      <div className={videos.progreso} role="status">
        <p>{progreso < 1 ? `Preparando el video… ${Math.round(progreso * 100)} %` : 'Subiendo…'}</p>
        <progress max={1} value={progreso < 1 ? progreso : undefined} />
      </div>
    )
  }

  return (
    <>
      {!metrica.video_path && (
        <p className={pantalla.textoApagado}>Grabate tomando la medición, así cada cliente la hace igual.</p>
      )}
      <div className={pantalla.acciones}>
        <label htmlFor={idCamara} className={pantalla.botonLink}>
          {metrica.video_path ? 'Grabar otro' : 'Grabar video'}
        </label>
        <input id={idCamara} className={videos.oculto} type="file" accept="video/*" capture="environment" onChange={elegido} />
        <label htmlFor={idGaleria} className={`${pantalla.botonLink} ${videos.secundario}`}>
          De la galería
        </label>
        <input id={idGaleria} className={videos.oculto} type="file" accept="video/*" onChange={elegido} />
      </div>
      <p className={pantalla.textoApagado}>Hasta {DURACION_MAXIMA_S} segundos.</p>
      {metrica.video_path && (
        <button type="button" className={pantalla.linkPeligro} style={{ alignSelf: 'flex-start' }} onClick={quitar}>
          Quitar video
        </button>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
    </>
  )
}
