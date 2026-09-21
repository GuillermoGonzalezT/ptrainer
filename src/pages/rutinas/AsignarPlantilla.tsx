import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { DiasSemana } from '../../components/DiasSemana.tsx'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarClientes } from '../../datos/clientes.ts'
import { asignarPlantilla, obtenerRutina, type Dia, type RutinaCompleta } from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './rutinas.module.css'

// RF-31 y RF-32: copia la plantilla a los clientes elegidos, con días.
export function AsignarPlantilla() {
  const { id = '' } = useParams()
  const { datos, error, cargando } = useConsulta(
    async () => ({ plantilla: await obtenerRutina(id), clientes: await listarClientes() }),
    [id],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos?.plantilla || datos.plantilla.cliente_id) return <Aviso tipo="error">Esa plantilla no existe.</Aviso>
  return (
    <Formulario
      plantilla={datos.plantilla}
      clientes={datos.clientes.filter((c) => c.estado !== 'baja')}
    />
  )
}

function Formulario({ plantilla, clientes }: { plantilla: RutinaCompleta; clientes: { id: string; nombre: string }[] }) {
  const navigate = useNavigate()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [dias, setDias] = useState<Dia[]>(plantilla.dias_semana)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternar(id: string) {
    setElegidos((actuales) => (actuales.includes(id) ? actuales.filter((c) => c !== id) : [...actuales, id]))
  }

  async function asignar() {
    setGuardando(true)
    setError(null)
    try {
      await asignarPlantilla(plantilla.id, elegidos, dias)
      const n = elegidos.length
      navigate(`/rutinas/${plantilla.id}`, {
        replace: true,
        state: { aviso: n === 1 ? 'Asignada a 1 cliente.' : `Asignada a ${n} clientes.` },
      })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={`Asignar “${plantilla.nombre}”`} volver={{ to: `/rutinas/${plantilla.id}`, etiqueta: 'la plantilla' }} />
      <p className={pantalla.textoApagado}>
        Cada cliente recibe su propia copia. Si después cambiás la plantilla, las copias no cambian.
      </p>
      {plantilla.items.length === 0 && <Aviso tipo="info">La plantilla todavía no tiene ejercicios.</Aviso>}

      {clientes.length === 0 ? (
        <p>No tenés clientes activos todavía.</p>
      ) : (
        <fieldset className={styles.clientes}>
          <legend className={styles.leyenda}>Clientes</legend>
          {clientes.map((c) => (
            <label key={c.id} className={styles.casillaCliente}>
              <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternar(c.id)} />
              {c.nombre}
            </label>
          ))}
        </fieldset>
      )}

      <DiasSemana valor={dias} onCambio={setDias} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" cargando={guardando} disabled={elegidos.length === 0} onClick={asignar}>
        {elegidos.length === 0
          ? 'Elegí al menos un cliente'
          : elegidos.length === 1
            ? 'Asignar a 1 cliente'
            : `Asignar a ${elegidos.length} clientes`}
      </Boton>
    </section>
  )
}
