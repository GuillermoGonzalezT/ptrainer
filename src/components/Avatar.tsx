import { useState } from 'react'
import styles from './Avatar.module.css'

type Props = {
  nombre: string
  url?: string | null
  tamano?: number
}

// Foto de perfil redonda; sin foto (o si no carga), la inicial del nombre.
export function Avatar({ nombre, url, tamano = 40 }: Props) {
  const [fallo, setFallo] = useState(false)
  const estilo = { width: tamano, height: tamano, fontSize: tamano * 0.42 }

  if (url && !fallo) {
    return <img className={styles.avatar} src={url} alt="" style={estilo} onError={() => setFallo(true)} />
  }
  return (
    <span className={`${styles.avatar} ${styles.inicial}`} style={estilo} aria-hidden="true">
      {nombre.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
