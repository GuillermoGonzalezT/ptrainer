import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarClientes } from '../../datos/clientes.ts'
import { duplicarRutina, type RutinaCompleta } from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

// RF-35: copiar una rutina como plantilla o para otro cliente.
export function DuplicarRutina({ rutina, onCerrar }: { rutina: RutinaCompleta; onCerrar: () => void }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { datos: clientes, error: errorCarga } = useConsulta(listarClientes, [])
  const [copiando, setCopiando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function copiar(clienteId: string | null) {
    if (!session) return
    setCopiando(clienteId ?? 'plantilla')
    setError(null)
    try {
      const nuevaId = await duplicarRutina(session.user.id, rutina, clienteId)
      navigate(`/rutinas/${nuevaId}`, { state: { aviso: 'Copia creada. Podés ajustarla acá.' } })
    } catch (e) {
      setError(mensajeDeError(e))
      setCopiando(null)
    }
  }

  const activos = (clientes ?? []).filter((c) => c.estado !== 'baja')

  return (
    <div className={pantalla.seccion}>
      <h2>Duplicar en…</h2>
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
      <ul className={pantalla.lista}>
        <li>
          <button
            type="button"
            className={`${pantalla.fila} ${pantalla.filaBoton}`}
            disabled={copiando !== null}
            onClick={() => copiar(null)}
          >
            <span className={pantalla.filaTexto}>
              <span className={pantalla.filaNombre}>Una plantilla nueva</span>
              <span className={pantalla.filaDetalle}>Para asignarla después a quien quieras</span>
            </span>
            {copiando === 'plantilla' && <span className={pantalla.etiqueta}>Copiando…</span>}
          </button>
        </li>
        {activos.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`${pantalla.fila} ${pantalla.filaBoton}`}
              disabled={copiando !== null}
              onClick={() => copiar(c.id)}
            >
              <span className={pantalla.filaTexto}>
                <span className={pantalla.filaNombre}>{c.nombre}</span>
                {c.id === rutina.cliente_id && <span className={pantalla.filaDetalle}>El mismo cliente</span>}
              </span>
              {copiando === c.id && <span className={pantalla.etiqueta}>Copiando…</span>}
            </button>
          </li>
        ))}
      </ul>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" variante="secundario" onClick={onCerrar}>
        Cancelar
      </Boton>
    </div>
  )
}
