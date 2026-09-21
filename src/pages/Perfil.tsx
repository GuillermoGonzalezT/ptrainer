import { useAuth } from '../auth/useAuth.ts'
import { Boton } from '../components/Formulario.tsx'
import { cerrarSesion } from '../lib/sesion.ts'
import styles from './Perfil.module.css'

export function Perfil() {
  const { session, rol, tipo } = useAuth()

  return (
    <section className={styles.perfil}>
      <h1>{rol?.nombre || 'Tu perfil'}</h1>
      <dl className={styles.datos}>
        <dt>Correo</dt>
        <dd>{session?.user.email}</dd>
        <dt>Cuenta</dt>
        <dd>{tipo === 'entrenador' ? 'Entrenador' : 'Cliente'}</dd>
      </dl>
      <Boton type="button" variante="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </section>
  )
}
