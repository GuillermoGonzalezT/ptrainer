import { useId, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { Avatar } from '../../components/Avatar.tsx'
import { Aviso } from '../../components/Formulario.tsx'
import type { Cliente } from '../../datos/clientes.ts'
import { quitarFotoCliente, subirFotoCliente, urlsDeFotos } from '../../datos/fotos.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { ErrorDeFoto, prepararFoto } from '../../lib/prepararFoto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from './FotoCliente.module.css'

// La foto del cliente arriba de su ficha, con los botones para cambiarla (RF-11).
export function FotoCliente({ cliente, alCambiar }: { cliente: Cliente; alCambiar: () => void }) {
  const { session } = useAuth()
  const idArchivo = useId()
  const { datos: urls } = useConsulta(
    () => urlsDeFotos(cliente.foto_path ? [cliente.foto_path] : []),
    [cliente.foto_path],
  )
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegida(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || !session) return
    setSubiendo(true)
    setError(null)
    try {
      await subirFotoCliente(session.user.id, cliente, await prepararFoto(archivo))
      alCambiar()
    } catch (e) {
      setError(e instanceof ErrorDeFoto ? e.message : mensajeDeError(e))
    }
    setSubiendo(false)
  }

  async function quitar() {
    if (!window.confirm('¿Quitar la foto?')) return
    setError(null)
    try {
      await quitarFotoCliente(cliente)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  const url = cliente.foto_path ? urls?.get(cliente.foto_path) : null

  return (
    <div className={styles.foto}>
      <Avatar key={url ?? 'sin-foto'} nombre={cliente.nombre} url={url} tamano={96} />
      <div className={styles.acciones}>
        {/* Sin `capture`: el teléfono ofrece sacar una foto o elegir de la galería. */}
        <label htmlFor={idArchivo} className={styles.boton} aria-disabled={subiendo}>
          {subiendo ? 'Subiendo…' : cliente.foto_path ? 'Cambiar foto' : 'Agregar foto'}
        </label>
        <input
          id={idArchivo}
          className={styles.oculto}
          type="file"
          accept="image/*"
          disabled={subiendo}
          onChange={elegida}
        />
        {cliente.foto_path && !subiendo && (
          <button type="button" className={styles.quitar} onClick={quitar}>
            Quitar
          </button>
        )}
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}
