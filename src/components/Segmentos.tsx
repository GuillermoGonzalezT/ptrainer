import styles from './Segmentos.module.css'

type Props<T extends string> = {
  etiqueta: string
  opciones: { valor: T; etiqueta: string }[]
  valor: T
  onCambio: (valor: T) => void
  deshabilitado?: boolean
}

// Botones de opción única en fila: filtros y cambios de estado.
export function Segmentos<T extends string>({ etiqueta, opciones, valor, onCambio, deshabilitado }: Props<T>) {
  return (
    <div className={styles.segmentos} role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          className={o.valor === valor ? `${styles.opcion} ${styles.elegida}` : styles.opcion}
          disabled={deshabilitado}
          onClick={() => o.valor !== valor && onCambio(o.valor)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
