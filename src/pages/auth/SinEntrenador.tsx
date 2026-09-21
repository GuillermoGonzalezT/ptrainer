import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Boton, Campo } from '../../components/Formulario.tsx'
import { cerrarSesion } from '../../lib/sesion.ts'
import styles from './auth.module.css'

// Cuenta con sesión pero sin ficha de cliente ni rol de entrenador.
export function SinEntrenador() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')

  function seguir(e: FormEvent) {
    e.preventDefault()
    navigate(`/invitacion/${codigo.trim().toUpperCase()}`)
  }

  return (
    <section className={styles.pantalla}>
      <h1>Todavía no tenés entrenador</h1>
      <p className={styles.bajada}>
        Pedile a tu entrenador el link o el código de invitación. Si te mandó el link, abrilo desde este mismo teléfono.
      </p>
      <form className={styles.form} onSubmit={seguir}>
        <Campo
          etiqueta="Código de invitación"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          minLength={10}
          maxLength={10}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <Boton type="submit">Seguir</Boton>
      </form>
      <Boton type="button" variante="secundario" onClick={cerrarSesion}>
        Cerrar sesión
      </Boton>
    </section>
  )
}
