import { useId, useState, type ChangeEvent } from 'react'
import { Aviso } from '../../components/Formulario.tsx'
import { subirVideo, type VideoEjercicio } from '../../datos/ejercicios.ts'
import { DURACION_MAXIMA_S, ErrorDeVideo, prepararVideo } from '../../lib/comprimirVideo.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import styles from '../../styles/pantalla.module.css'
import propios from './videos.module.css'

type Etapa = { tipo: 'libre' } | { tipo: 'comprimiendo'; progreso: number } | { tipo: 'subiendo' }

type Props = {
  entrenadorId: string
  ejercicioId: string
  existentes: VideoEjercicio[]
  alTerminar: () => void
}

// Graba con la cámara o elige de la galería, comprime y sube (RF-22).
export function SubirVideo({ entrenadorId, ejercicioId, existentes, alTerminar }: Props) {
  const idCamara = useId()
  const idGaleria = useId()
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'libre' })
  const [error, setError] = useState<string | null>(null)

  async function elegido(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    // Se limpia para que elegir el mismo archivo otra vez vuelva a disparar el cambio.
    e.target.value = ''
    if (!archivo) return
    setError(null)
    setEtapa({ tipo: 'comprimiendo', progreso: 0 })
    try {
      const video = await prepararVideo(archivo, (progreso) => setEtapa({ tipo: 'comprimiendo', progreso }))
      setEtapa({ tipo: 'subiendo' })
      await subirVideo(entrenadorId, ejercicioId, video, existentes)
      alTerminar()
    } catch (e) {
      setError(e instanceof ErrorDeVideo ? e.message : mensajeDeError(e))
    }
    setEtapa({ tipo: 'libre' })
  }

  if (etapa.tipo !== 'libre') {
    return (
      <div className={propios.progreso} role="status">
        <p>
          {etapa.tipo === 'comprimiendo'
            ? `Preparando el video… ${Math.round(etapa.progreso * 100)} %`
            : 'Subiendo…'}
        </p>
        <progress max={1} value={etapa.tipo === 'comprimiendo' ? etapa.progreso : undefined} />
        <p className={styles.textoApagado}>No cierres la app hasta que termine.</p>
      </div>
    )
  }

  return (
    <>
      <div className={styles.acciones}>
        {/* capture abre directo la cámara en el teléfono; en la compu se ignora. */}
        <label htmlFor={idCamara} className={styles.botonLink}>
          Grabar video
        </label>
        <input id={idCamara} className={propios.oculto} type="file" accept="video/*" capture="environment" onChange={elegido} />
        <label htmlFor={idGaleria} className={`${styles.botonLink} ${propios.secundario}`}>
          Elegir de la galería
        </label>
        <input id={idGaleria} className={propios.oculto} type="file" accept="video/*" onChange={elegido} />
      </div>
      <p className={styles.textoApagado}>Hasta {DURACION_MAXIMA_S} segundos. Se comprime antes de subir.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </>
  )
}
