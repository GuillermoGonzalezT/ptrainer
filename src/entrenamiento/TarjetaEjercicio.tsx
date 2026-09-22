import { Link } from 'react-router'
import type { UltimaVez } from '../datos/sesiones.ts'
import { formatearFecha } from '../lib/formato.ts'
import { detallesPrescripcion, formatearVolumen } from '../lib/prescripcion.ts'
import pantalla from '../styles/pantalla.module.css'
import type { EjercicioEnCurso, SerieEnCurso } from './enCurso.ts'
import styles from './entrenamiento.module.css'
import { formatearSeries } from './formato.ts'

type Props = {
  ejercicio: EjercicioEnCurso
  // A1, A2… si es parte de una superserie.
  etiqueta?: string | null
  ultima: UltimaVez | undefined
  error: { serie: number; mensaje: string } | null
  onCambiarSerie: (indice: number, cambios: Partial<SerieEnCurso>) => void
  onMarcar: (indice: number) => void
  onAgregarSerie: () => void
  onQuitarSerie: () => void
}

// Un ejercicio del modo entrenamiento: qué hay que hacer, qué hizo la última
// vez (RF-43) y una fila por serie para anotar lo que hizo realmente (RF-41).
export function TarjetaEjercicio({ ejercicio, etiqueta, ultima, error, onCambiarSerie, onMarcar, onAgregarSerie, onQuitarSerie }: Props) {
  const p = ejercicio.prescripcion
  const porTiempo = p.segundos !== null
  const detalles = detallesPrescripcion(p)
  const ultimaSinMarcar = ejercicio.series.length > 1 && !ejercicio.series.at(-1)!.hecha

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <h2 className={styles.nombre}>
          {etiqueta && <span className={styles.superserie}>{etiqueta}</span>}
          {ejercicio.nombre}
        </h2>
        <Link to={`/ejercicios/${ejercicio.ejercicioId}`} className={styles.video}>
          Ver video
        </Link>
      </div>
      <p className={styles.objetivo}>
        {formatearVolumen(p)}
        {detalles.length > 0 && <span className={pantalla.textoApagado}> · {detalles.join(' · ')}</span>}
      </p>
      {p.notas && <p className={styles.notas}>{p.notas}</p>}
      <p className={styles.ultima}>
        {ultima ? (
          <>
            <span className={pantalla.textoApagado}>La última vez ({formatearFecha(ultima.fecha)}):</span>{' '}
            {formatearSeries(ultima.series)}
          </>
        ) : (
          <span className={pantalla.textoApagado}>Primera vez con este ejercicio.</span>
        )}
      </p>

      <div className={styles.series} style={{ gridTemplateColumns: p.pedir_rpe ? '2rem 1fr 1fr 1fr 3rem' : '2rem 1fr 1fr 3rem' }}>
        <span className={styles.titulo}>#</span>
        <span className={styles.titulo}>kg</span>
        <span className={styles.titulo}>{porTiempo ? 'Seg.' : 'Reps'}</span>
        {p.pedir_rpe && <span className={styles.titulo}>RPE</span>}
        <span />
        {ejercicio.series.map((s, i) => (
          <FilaSerie
            key={i}
            numero={i + 1}
            serie={s}
            porTiempo={porTiempo}
            pedirRpe={p.pedir_rpe}
            conError={error?.serie === i}
            onCambio={(cambios) => onCambiarSerie(i, cambios)}
            onMarcar={() => onMarcar(i)}
          />
        ))}
      </div>
      {error && <p className={styles.errorSerie} role="alert">Serie {error.serie + 1}: {error.mensaje}</p>}
      <div className={styles.accionesSeries}>
        <button type="button" className={styles.accionChica} onClick={onAgregarSerie}>
          + Serie
        </button>
        {ultimaSinMarcar && (
          <button type="button" className={styles.accionChica} onClick={onQuitarSerie}>
            − Serie
          </button>
        )}
      </div>
    </div>
  )
}

type FilaProps = {
  numero: number
  serie: SerieEnCurso
  porTiempo: boolean
  pedirRpe: boolean
  conError: boolean
  onCambio: (cambios: Partial<SerieEnCurso>) => void
  onMarcar: () => void
}

function FilaSerie({ numero, serie, porTiempo, pedirRpe, conError, onCambio, onMarcar }: FilaProps) {
  const clase = `${styles.entrada} ${serie.hecha ? styles.entradaHecha : ''} ${conError ? styles.entradaError : ''}`
  return (
    <>
      <span className={styles.numeroSerie}>{numero}</span>
      <input
        className={clase}
        inputMode="decimal"
        aria-label={`Kilos de la serie ${numero}`}
        value={serie.peso}
        onChange={(e) => onCambio({ peso: e.target.value })}
      />
      <input
        className={clase}
        inputMode="numeric"
        aria-label={`${porTiempo ? 'Segundos' : 'Repeticiones'} de la serie ${numero}`}
        value={porTiempo ? serie.segundos : serie.reps}
        onChange={(e) => onCambio(porTiempo ? { segundos: e.target.value } : { reps: e.target.value })}
      />
      {pedirRpe && (
        <input
          className={clase}
          inputMode="decimal"
          aria-label={`RPE de la serie ${numero}`}
          value={serie.rpe}
          onChange={(e) => onCambio({ rpe: e.target.value })}
        />
      )}
      <button
        type="button"
        className={serie.hecha ? `${styles.marcar} ${styles.marcada}` : styles.marcar}
        aria-pressed={serie.hecha}
        aria-label={serie.hecha ? `Desmarcar la serie ${numero}` : `Marcar la serie ${numero} como hecha`}
        onClick={onMarcar}
      >
        ✓
      </button>
    </>
  )
}
