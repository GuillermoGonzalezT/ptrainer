import styles from './Marca.module.css'

// Logo + nombre. La usan el login y el encabezado de la app, para que se vean
// iguales.
export function Marca({ tamano = 'grande' }: { tamano?: 'grande' | 'chica' }) {
  const lado = tamano === 'grande' ? 40 : 32
  return (
    <span className={tamano === 'grande' ? styles.grande : styles.chica}>
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={lado} height={lado} />
      <span>PTrainer</span>
    </span>
  )
}
