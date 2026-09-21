import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Encabezado.module.css'

type Props = {
  titulo: string
  // Adónde vuelve la flecha. Sin `volver`, no hay flecha.
  volver?: { to: string; etiqueta: string }
  accion?: ReactNode
}

export function Encabezado({ titulo, volver, accion }: Props) {
  return (
    <header className={styles.encabezado}>
      {volver && (
        <Link to={volver.to} className={styles.volver} aria-label={`Volver a ${volver.etiqueta}`}>
          <span aria-hidden="true">‹</span>
        </Link>
      )}
      <h1 className={styles.titulo}>{titulo}</h1>
      {accion}
    </header>
  )
}
