import styles from './seguimiento.module.css'

type Props = {
  etiqueta: string
  bajo: string
  alto: string
  valor: number | null
  onCambio: (valor: number | null) => void
}

// Una escala del 1 al 5 con las puntas explicadas. Tocar el valor elegido lo
// desmarca: todo el check-in es opcional.
export function EscalaCinco({ etiqueta, bajo, alto, valor, onCambio }: Props) {
  return (
    <fieldset className={styles.escala}>
      <legend className={styles.escalaEtiqueta}>{etiqueta}</legend>
      <div className={styles.botones} role="radiogroup" aria-label={etiqueta}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            className={valor === n ? `${styles.punto} ${styles.puntoElegido}` : styles.punto}
            onClick={() => onCambio(valor === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={styles.puntas}>
        <span>1: {bajo}</span>
        <span>5: {alto}</span>
      </div>
    </fieldset>
  )
}
