import { useEffect, useState } from 'react'
import { avisarFinDeDescanso } from './descanso.ts'
import styles from './entrenamiento.module.css'
import { formatearReloj } from './formato.ts'

type Props = {
  fin: number
  total: number
  onCambiarFin: (fin: number | null) => void
}

// RF-42. La cuenta se calcula contra la hora de fin, no descontando de a un
// segundo: si el teléfono pasa a segundo plano, al volver marca bien.
export function BarraDescanso({ fin, total, onCambiarFin }: Props) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 250)
    return () => clearInterval(intervalo)
  }, [])

  const restante = (fin - ahora) / 1000
  useEffect(() => {
    if (restante > 0) return
    avisarFinDeDescanso()
    onCambiarFin(null)
  }, [restante, onCambiarFin])

  return (
    <div className={styles.descanso} role="timer" aria-live="off" aria-label="Descanso">
      <div className={styles.descansoBarra} style={{ width: `${Math.max(0, Math.min(1, restante / total)) * 100}%` }} />
      <span className={styles.descansoTexto}>
        Descanso <strong>{formatearReloj(restante)}</strong>
      </span>
      <button type="button" className={styles.descansoBoton} onClick={() => onCambiarFin(fin - 15_000)}>
        −15
      </button>
      <button type="button" className={styles.descansoBoton} onClick={() => onCambiarFin(fin + 15_000)}>
        +15
      </button>
      <button type="button" className={styles.descansoBoton} onClick={() => onCambiarFin(null)}>
        Saltar
      </button>
    </div>
  )
}
