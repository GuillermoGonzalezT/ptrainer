import { Boton } from '../../components/Formulario.tsx'
import { cerrarSesion } from '../../lib/sesion.ts'
import styles from './auth.module.css'

// RF-14: el entrenador dio de baja al cliente. Su historial se conserva.
export function Baja() {
  return (
    <section className={styles.pantalla}>
      <h1>Tu acceso está dado de baja</h1>
      <p className={styles.bajada}>
        Tu entrenador dio de baja tu cuenta. Tu historial se guarda: si vuelven a trabajar juntos, lo vas a ver de
        nuevo.
      </p>
      <Boton type="button" variante="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </section>
  )
}
