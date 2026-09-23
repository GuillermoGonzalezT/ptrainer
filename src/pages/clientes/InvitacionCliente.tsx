import { useState } from 'react'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { crearInvitacion, invitacionVigente, type Invitacion } from '../../datos/clientes.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { urlDeLaApp } from '../../lib/supabase.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

// RF-02. Solo se muestra mientras la ficha no tiene una cuenta vinculada.
export function InvitacionCliente({ clienteId, nombre }: { clienteId: string; nombre: string }) {
  const { datos: vigente, error: errorCarga, cargando } = useConsulta(() => invitacionVigente(clienteId), [clienteId])
  const [nueva, setNueva] = useState<Invitacion | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Qué se acaba de copiar, para avisarlo en el botón que se tocó.
  const [copiado, setCopiado] = useState<'mensaje' | 'codigo' | null>(null)

  const invitacion = nueva ?? vigente ?? null
  const link = invitacion ? `${urlDeLaApp()}#/invitacion/${invitacion.codigo}` : ''
  const primerNombre = nombre.trim().split(' ')[0]
  const mensaje = `Hola ${primerNombre}, te invito a PTrainer para ver tus rutinas y registrar tus entrenamientos. Creá tu cuenta desde este link: ${link}`

  async function crear() {
    if (invitacion && !window.confirm('El código anterior va a dejar de funcionar. ¿Crear uno nuevo?')) return
    setCreando(true)
    setError(null)
    try {
      setNueva(await crearInvitacion(clienteId))
      setCopiado(null)
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setCreando(false)
  }

  async function copiar(texto: string, que: 'mensaje' | 'codigo') {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(que)
      setError(null)
    } catch {
      // Pasa si el navegador no da permiso o la página no es segura.
      setError(que === 'codigo' ? 'No se pudo copiar. Anotá el código a mano.' : 'No se pudo copiar. Copiá el link a mano.')
    }
  }

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invitación a PTrainer', text: mensaje })
      } catch {
        // La persona cerró el menú de compartir: no es un error.
      }
      return
    }
    await copiar(mensaje, 'mensaje')
  }

  return (
    <div className={styles.seccion}>
      <h2>Invitación</h2>
      {cargando && <p className={styles.textoApagado}>Cargando…</p>}
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}

      {!cargando && !invitacion && (
        <>
          <p className={styles.textoApagado}>
            {primerNombre} todavía no tiene cuenta. Creá una invitación y mandásela por WhatsApp o como prefieras.
          </p>
          <Boton type="button" cargando={creando} onClick={crear}>
            Crear invitación
          </Boton>
        </>
      )}

      {invitacion && (
        <>
          <p className={styles.textoApagado}>
            Mandale el link. Si lo abre en otro dispositivo, también puede escribir el código. Vence el{' '}
            {formatearFecha(invitacion.expira_en)}.
          </p>
          <div className={styles.filaCodigo}>
            <p className={styles.codigo}>{invitacion.codigo}</p>
            <Boton type="button" variante="secundario" onClick={() => copiar(invitacion.codigo, 'codigo')}>
              {copiado === 'codigo' ? 'Código copiado' : 'Copiar código'}
            </Boton>
          </div>
          <div className={styles.acciones}>
            <Boton type="button" onClick={compartir}>
              {copiado === 'mensaje' ? 'Mensaje copiado' : 'Compartir link'}
            </Boton>
            <Boton type="button" variante="secundario" cargando={creando} onClick={crear}>
              Crear otro código
            </Boton>
          </div>
        </>
      )}

      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}
