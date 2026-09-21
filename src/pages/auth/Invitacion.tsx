import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { mensajeDeError } from '../../lib/errores.ts'
import { borrarInvitacion, guardarInvitacion } from '../../lib/invitacionPendiente.ts'
import { supabase } from '../../lib/supabase.ts'
import styles from './auth.module.css'

// Destino del link que manda el entrenador: #/invitacion/CODIGO (RF-02).
export function Invitacion() {
  const codigo = (useParams().codigo ?? '').toUpperCase()
  const { session, cargando, recargarRol } = useAuth()
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sin cuenta todavía: se guarda el código para aceptarlo al volver
  // (después de registrarse y confirmar el correo).
  useEffect(() => {
    if (!cargando && !session && codigo) guardarInvitacion(codigo)
  }, [cargando, session, codigo])

  if (cargando) return null

  if (!session) {
    return (
      <section className={styles.pantalla}>
        <h1>Te invitaron a PTrainer</h1>
        <p>Tu entrenador te sumó como cliente. Creá tu cuenta, o ingresá si ya tenés una, y la invitación se acepta sola.</p>
        <Boton type="button" onClick={() => navigate('/registrarse')}>
          Crear cuenta
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => navigate('/ingresar')}>
          Ya tengo cuenta
        </Boton>
      </section>
    )
  }

  async function aceptar() {
    if (!supabase) return
    setEnviando(true)
    setError(null)
    const { error } = await supabase.rpc('aceptar_invitacion', { p_codigo: codigo })
    // Salga bien o mal, el código ya no se reintenta solo.
    borrarInvitacion()
    if (error) {
      setEnviando(false)
      setError(mensajeDeError(error))
      return
    }
    await recargarRol()
    navigate('/', { replace: true })
  }

  return (
    <section className={styles.pantalla}>
      <h1>Aceptar invitación</h1>
      <p>
        Código <span className={styles.codigo}>{codigo}</span>
      </p>
      <p className={styles.bajada}>Al aceptar, tu entrenador va a poder asignarte rutinas y ver lo que registres.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" cargando={enviando} onClick={aceptar}>
        Aceptar
      </Boton>
      <div className={styles.links}>
        <Link to="/" replace onClick={borrarInvitacion}>
          Ahora no
        </Link>
      </div>
    </section>
  )
}
