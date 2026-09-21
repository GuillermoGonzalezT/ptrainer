import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { Aviso } from '../../components/Formulario.tsx'
import {
  borrarVideo,
  intercambiarOrden,
  listarVideos,
  marcarPrincipal,
  urlsDeVideos,
  type VideoEjercicio,
} from '../../datos/ejercicios.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { SubirVideo } from './SubirVideo.tsx'
import propios from './videos.module.css'

type ConUrl = VideoEjercicio & { url: string | null }

async function cargar(ejercicioId: string): Promise<ConUrl[]> {
  const videos = await listarVideos(ejercicioId)
  const urls = await urlsDeVideos(videos)
  return videos.map((v, i) => ({ ...v, url: urls[i] }))
}

// RF-22 (edición, para el entrenador) y RF-23 (reproducción, para todos).
export function VideosEjercicio({ ejercicioId, editable }: { ejercicioId: string; editable: boolean }) {
  const { session } = useAuth()
  const { datos: videos, error: errorCarga, cargando, recargar } = useConsulta(() => cargar(ejercicioId), [ejercicioId])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function hacer(accion: () => Promise<void>) {
    setOcupado(true)
    setError(null)
    try {
      await accion()
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setOcupado(false)
  }

  function borrar(video: VideoEjercicio) {
    if (!window.confirm('¿Borrar este video?')) return
    hacer(() => borrarVideo(video))
  }

  const lista = videos ?? []
  if (!editable && !cargando && lista.length === 0) return null

  return (
    <div className={styles.seccion}>
      <h2>{lista.length > 1 ? 'Videos' : 'Video'}</h2>
      {cargando && <p className={styles.textoApagado}>Cargando…</p>}
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
      {editable && !cargando && lista.length === 0 && (
        <p className={styles.textoApagado}>Todavía no tiene video. Grabate haciendo el ejercicio: tus clientes lo van a ver desde su rutina.</p>
      )}

      {lista.map((video, i) => (
        <figure key={video.id} className={propios.video}>
          {video.url ? (
            <video className={propios.reproductor} src={video.url} controls playsInline preload="metadata" />
          ) : (
            <p className={styles.textoApagado}>No se pudo cargar este video.</p>
          )}
          <figcaption className={propios.pie}>
            <span className={styles.textoApagado}>
              {video.principal && lista.length > 1 && <strong className={styles.etiqueta}>Principal</strong>}{' '}
              {video.duracion_s !== null && `${Math.round(video.duracion_s)} s`}
            </span>
            {editable && (
              <span className={propios.acciones}>
                {!video.principal && (
                  <button type="button" className={propios.accion} disabled={ocupado} onClick={() => hacer(() => marcarPrincipal(ejercicioId, video.id))}>
                    Hacer principal
                  </button>
                )}
                {i > 0 && (
                  <button
                    type="button"
                    className={propios.accion}
                    disabled={ocupado}
                    aria-label="Subir un lugar"
                    onClick={() => hacer(() => intercambiarOrden(video, lista[i - 1]))}
                  >
                    ↑
                  </button>
                )}
                <button type="button" className={styles.linkPeligro} disabled={ocupado} onClick={() => borrar(video)}>
                  Borrar
                </button>
              </span>
            )}
          </figcaption>
        </figure>
      ))}

      {error && <Aviso tipo="error">{error}</Aviso>}
      {editable && session && videos && (
        <SubirVideo entrenadorId={session.user.id} ejercicioId={ejercicioId} existentes={videos} alTerminar={recargar} />
      )}
    </div>
  )
}
