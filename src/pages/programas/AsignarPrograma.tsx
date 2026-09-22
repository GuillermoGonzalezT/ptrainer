import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { listarClientes } from '../../datos/clientes.ts'
import { asignarPrograma, obtenerPrograma, type ProgramaCompleto } from '../../datos/programas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import rutinas from '../rutinas/rutinas.module.css'
import { hoyLocal } from '../metricas/formato.ts'

// RF-34: copia al cliente las rutinas de todas las semanas, con la carga ya
// ajustada, y deja anotado el día en que arranca.
export function AsignarPrograma() {
  const { id = '' } = useParams()
  const { datos, error, cargando } = useConsulta(
    async () => ({ programa: await obtenerPrograma(id), clientes: await listarClientes() }),
    [id],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos?.programa) return <Aviso tipo="error">Ese programa no existe.</Aviso>

  return <Formulario programa={datos.programa} clientes={datos.clientes.filter((c) => c.estado !== 'baja')} />
}

function Formulario({ programa, clientes }: { programa: ProgramaCompleto; clientes: { id: string; nombre: string }[] }) {
  const navigate = useNavigate()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [inicia, setInicia] = useState(hoyLocal())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternar(id: string) {
    setElegidos((actuales) => (actuales.includes(id) ? actuales.filter((c) => c !== id) : [...actuales, id]))
  }

  async function asignar() {
    setGuardando(true)
    setError(null)
    try {
      await asignarPrograma(programa.id, elegidos, inicia)
      const n = elegidos.length
      navigate(`/programas/${programa.id}`, {
        replace: true,
        state: { aviso: n === 1 ? 'Asignado a 1 cliente.' : `Asignado a ${n} clientes.` },
      })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  const copias = programa.rutinas.length

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={`Asignar “${programa.nombre}”`}
        volver={{ to: `/programas/${programa.id}`, etiqueta: 'el programa' }}
      />
      <p className={pantalla.textoApagado}>
        Cada cliente recibe su propia copia de las {copias === 1 ? 'rutina' : `${copias} rutinas`} del programa, con
        la carga de cada semana ya ajustada. Ve solo la semana que le toca.
      </p>
      {copias === 0 && <Aviso tipo="info">El programa todavía no tiene ninguna rutina.</Aviso>}

      {clientes.length === 0 ? (
        <p>No tenés clientes activos todavía.</p>
      ) : (
        <fieldset className={rutinas.clientes}>
          <legend className={rutinas.leyenda}>Clientes</legend>
          {clientes.map((c) => (
            <label key={c.id} className={rutinas.casillaCliente}>
              <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternar(c.id)} />
              {c.nombre}
            </label>
          ))}
        </fieldset>
      )}

      <Campo
        etiqueta="Arranca el"
        type="date"
        required
        ayuda="La semana en la que está el cliente se cuenta desde este día."
        value={inicia}
        onChange={(e) => setInicia(e.target.value)}
      />

      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton
        type="button"
        cargando={guardando}
        disabled={elegidos.length === 0 || copias === 0 || !inicia}
        onClick={asignar}
      >
        {elegidos.length === 0
          ? 'Elegí al menos un cliente'
          : elegidos.length === 1
            ? 'Asignar a 1 cliente'
            : `Asignar a ${elegidos.length} clientes`}
      </Boton>
    </section>
  )
}
