import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { Boton } from '../../components/Formulario.tsx'
import { cerrarSesion } from '../../lib/sesion.ts'
import styles from './auth.module.css'

// No se pudo saber si la cuenta es de entrenador o de cliente.
export function ErrorDeCarga() {
  const { recargarRol } = useAuth()
  const [reintentando, setReintentando] = useState(false)

  async function reintentar() {
    setReintentando(true)
    await recargarRol()
    setReintentando(false)
  }

  return (
    <section className={styles.pantalla}>
      <h1>No pudimos cargar tu cuenta</h1>
      <p className={styles.bajada}>Revisá la conexión a internet y probá de nuevo.</p>
      <Boton type="button" cargando={reintentando} onClick={reintentar}>
        Reintentar
      </Boton>
      <Boton type="button" variante="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </section>
  )
}
