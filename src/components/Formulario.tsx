import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
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

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
