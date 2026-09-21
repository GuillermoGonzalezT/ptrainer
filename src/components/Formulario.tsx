import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import styles from './Formulario.module.css'

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  ayuda?: string
}

export function Campo({ etiqueta, ayuda, ...input }: CampoProps) {
  const id = useId()
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
      </label>
      <input id={id} className={styles.input} aria-describedby={idAyuda} {...input} />
      {ayuda && (
        <p id={idAyuda} className={styles.ayuda}>
          {ayuda}
        </p>
      )}
    </div>
  )
}

type AreaDeTextoProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  etiqueta: string
  ayuda?: string
}

export function AreaDeTexto({ etiqueta, ayuda, ...textarea }: AreaDeTextoProps) {
  const id = useId()
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
      </label>
      <textarea id={id} className={styles.textarea} rows={3} aria-describedby={idAyuda} {...textarea} />
      {ayuda && (
        <p id={idAyuda} className={styles.ayuda}>
          {ayuda}
        </p>
      )}
    </div>
  )
}

type SelectorProps = SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string
  opciones: { valor: string; etiqueta: string }[]
}

export function Selector({ etiqueta, opciones, ...select }: SelectorProps) {
  const id = useId()
  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
      </label>
      <select id={id} className={styles.input} {...select}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )
}

type BotonProps =ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'principal' | 'secundario'
  cargando?: boolean
}

export function Boton({ variante = 'principal', cargando = false, children, disabled, ...boton }: BotonProps) {
  return (
    <button
      className={variante === 'principal' ? styles.botonPrincipal : styles.botonSecundario}
      disabled={disabled || cargando}
      aria-busy={cargando}
      {...boton}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  )
}

export function Aviso({ tipo, children }: { tipo: 'error' | 'info'; children: ReactNode }) {
  return (
    <p className={tipo === 'error' ? styles.avisoError : styles.avisoInfo} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
