import styles from './PaginaProvisoria.module.css'

type Props = {
  titulo: string
  descripcion: string
}

// Marca las secciones que todavía no están construidas.
export function PaginaProvisoria({ titulo, descripcion }: Props) {
  return (
    <section className={styles.pagina}>
      <h1>{titulo}</h1>
      <p className={styles.descripcion}>{descripcion}</p>
    </section>
  )
}
