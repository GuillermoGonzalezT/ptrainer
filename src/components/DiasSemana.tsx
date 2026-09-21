import { inicialDia, nombreDia, type Dia } from '../datos/rutinas.ts'
import styles from './DiasSemana.module.css'

const dias: Dia[] = [1, 2, 3, 4, 5, 6, 7]

type Props = {
  valor: Dia[]
  onCambio: (dias: Dia[]) => void
  etiqueta?: string
}

// Siete botones que se prenden y apagan (RF-32). Ninguno prendido = sin días fijos.
export function DiasSemana({ valor, onCambio, etiqueta = 'Días' }: Props) {
  function alternar(dia: Dia) {
    onCambio(valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia].sort())
  }

  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.etiqueta}>{etiqueta}</legend>
      <div className={styles.dias}>
        {dias.map((d) => (
          <button
            key={d}
            type="button"
            className={valor.includes(d) ? `${styles.dia} ${styles.prendido}` : styles.dia}
            aria-pressed={valor.includes(d)}
            aria-label={nombreDia[d]}
            onClick={() => alternar(d)}
          >
            {inicialDia[d]}
          </button>
        ))}
      </div>
      <p className={styles.ayuda}>{valor.length === 0 ? 'Sin días fijos: el cliente elige cuándo hacerla.' : ' '}</p>
    </fieldset>
  )
}
