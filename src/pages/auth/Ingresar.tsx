import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { mensajeDeError } from '../../lib/errores.ts'
import { supabase } from '../../lib/supabase.ts'
import styles from './auth.module.css'

export function Ingresar() {
  const { errorEnlace, borrarErrorEnlace } = useAuth()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ingresar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setError(null)
    borrarErrorEnlace()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setEnviando(false)
    // Si sale bien, el cambio de sesión lleva solo a la app.
    if (error) setError(mensajeDeError(error))
  }

  return (
    <section className={styles.pantalla}>
      <h1>Ingresar</h1>
      {aviso && <Aviso tipo="info">{aviso}</Aviso>}
      {errorEnlace && <Aviso tipo="error">{mensajeDeError(errorEnlace)}</Aviso>}

      <form className={styles.form} onSubmit={ingresar}>
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={enviando}>
          Ingresar
        </Boton>
      </form>

      <div className={styles.links}>
        <Link to="/recuperar">Olvidé mi contraseña</Link>
        <Link to="/registrarse">No tengo cuenta: registrarme</Link>
      </div>
    </section>
  )
}
