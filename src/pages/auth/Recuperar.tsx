import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { mensajeDeError } from '../../lib/errores.ts'
import { supabase, urlDeLaApp } from '../../lib/supabase.ts'
import styles from './auth.module.css'

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  async function pedirLink(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setError(null)
    // El link vuelve a la raíz de la app; supabase-js avisa que es de
    // recuperación y la app lleva a elegir la contraseña nueva.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: urlDeLaApp() })
    setEnviando(false)
    if (error) setError(mensajeDeError(error))
    else setEnviado(true)
  }

  if (enviado) {
    return (
      <section className={styles.pantalla}>
        <h1>Revisá tu correo</h1>
        <p>Si hay una cuenta con ese correo, te llegó un link para elegir una contraseña nueva. Vence en una hora.</p>
        <div className={styles.links}>
          <Link to="/ingresar">Volver a ingresar</Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.pantalla}>
      <h1>Recuperar contraseña</h1>
      <p className={styles.bajada}>Te mandamos un link para elegir una nueva.</p>
      <form className={styles.form} onSubmit={pedirLink}>
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={enviando}>
          Mandar link
        </Boton>
      </form>
      <div className={styles.links}>
        <Link to="/ingresar">Volver a ingresar</Link>
      </div>
    </section>
  )
}
