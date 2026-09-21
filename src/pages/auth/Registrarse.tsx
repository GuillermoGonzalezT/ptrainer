import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { mensajeDeError } from '../../lib/errores.ts'
import { supabase, urlDeLaApp } from '../../lib/supabase.ts'
import styles from './auth.module.css'

export function Registrarse() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviadoA, setEnviadoA] = useState<string | null>(null)

  async function registrarse(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setError(null)
    const correo = email.trim()
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password,
      options: { data: { nombre: nombre.trim() }, emailRedirectTo: urlDeLaApp() },
    })
    setEnviando(false)
    if (error) {
      setError(mensajeDeError(error))
      return
    }
    // Con confirmación de correo activada no hay sesión todavía. Si no la hay,
    // el cambio de sesión lleva solo a la app.
    if (!data.session) setEnviadoA(correo)
  }

  if (enviadoA) {
    return (
      <section className={styles.pantalla}>
        <h1>Revisá tu correo</h1>
        <p>
          Te mandamos un link a <strong>{enviadoA}</strong>. Abrilo para confirmar la cuenta y entrar. Si no lo ves,
          buscalo en spam.
        </p>
        <div className={styles.links}>
          <Link to="/ingresar">Ya confirmé: ingresar</Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.pantalla}>
      <h1>Crear cuenta</h1>
      <form className={styles.form} onSubmit={registrarse}>
        <Campo
          etiqueta="Nombre y apellido"
          autoComplete="name"
          required
          maxLength={100}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          ayuda="Al menos 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={enviando}>
          Crear cuenta
        </Boton>
      </form>
      <div className={styles.links}>
        <Link to="/ingresar">Ya tengo cuenta: ingresar</Link>
      </div>
    </section>
  )
}
