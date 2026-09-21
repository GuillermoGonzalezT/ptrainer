import { useState, type FormEvent } from 'react'
import { AreaDeTexto, Aviso, Boton } from '../../components/Formulario.tsx'
import { borrarNota, crearNota, listarNotas } from '../../datos/clientes.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFechaHora } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from './clientes.module.css'

// RF-12. El cliente no las ve: la base no se las devuelve.
export function NotasCliente({ clienteId }: { clienteId: string }) {
  const { datos: notas, error: errorCarga, recargar } = useConsulta(() => listarNotas(clienteId), [clienteId])
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    setGuardando(true)
    setError(null)
    try {
      await crearNota(clienteId, limpio)
      setTexto('')
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  async function borrar(id: string) {
    if (!window.confirm('¿Borrar esta nota?')) return
    try {
      await borrarNota(id)
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className={styles.seccion}>
      <h2>Notas privadas</h2>
      <p className={styles.textoApagado}>Solo las ves vos.</p>
      <form className={styles.form} onSubmit={agregar}>
        <AreaDeTexto
          etiqueta="Nota nueva"
          maxLength={5000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Boton type="submit" variante="secundario" cargando={guardando} disabled={!texto.trim()}>
          Agregar nota
        </Boton>
      </form>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
      {notas && notas.length > 0 && (
        <ul className={styles.notas}>
          {notas.map((n) => (
            <li key={n.id} className={styles.nota}>
              <p className={styles.notaTexto}>{n.texto}</p>
              <div className={styles.notaPie}>
                <span>{formatearFechaHora(n.created_at)}</span>
                <button type="button" className={styles.linkPeligro} onClick={() => borrar(n.id)}>
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
