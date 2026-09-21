import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { mensajeDeError } from '../../lib/errores.ts'
import { supabase } from '../../lib/supabase.ts'
import styles from './auth.module.css'

export function NuevaContrasena() {
  const { session, cargando, terminarRecuperacion } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (cargando) return null

  // Sin sesión, el link de recuperación no funcionó (vencido o ya usado).
  if (!session) {
    return (
      <section className={styles.pantalla}>
        <h1>El link no sirve</h1>
        <p>El link para cambiar la contraseña venció o ya se usó.</p>
        <div className={styles.links}>
          <Link to="/recuperar">Pedir uno nuevo</Link>
        </div>
      </section>
    )
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (password !== repetida) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)
    if (error) {
      setError(mensajeDeError(error))
      return
    }
    terminarRecuperacion()
    navigate('/', { replace: true })
  }

  return (
    <section className={styles.pantalla}>
      <h1>Contraseña nueva</h1>
      <form className={styles.form} onSubmit={guardar}>
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          ayuda="Al menos 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Campo
          etiqueta="Repetila"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={enviando}>
          Guardar
        </Boton>
      </form>
    </section>
  )
}
