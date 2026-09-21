import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarClientes } from '../../datos/clientes.ts'
import { asignarMetrica, listarMetricasDeCliente, obtenerMetrica, type Metrica } from '../../datos/metricas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import estilosRutinas from '../rutinas/rutinas.module.css'

// RF-51: una métrica a varios clientes de una vez.
export function AsignarMetrica() {
  const { id = '' } = useParams()
  const { datos, error, cargando } = useConsulta(async () => {
    const [metrica, clientes, asignaciones] = await Promise.all([obtenerMetrica(id), listarClientes(), listarMetricasDeCliente()])
    const yaLaTienen = new Set(asignaciones.filter((a) => a.metrica.id === id).map((a) => a.cliente_id))
    return { metrica, clientes: clientes.filter((c) => c.estado !== 'baja'), yaLaTienen }
  }, [id])

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos?.metrica) return <Aviso tipo="error">Esa métrica no existe.</Aviso>
  return <Formulario metrica={datos.metrica} clientes={datos.clientes} yaLaTienen={datos.yaLaTienen} />
}

type Props = {
  metrica: Metrica
  clientes: { id: string; nombre: string }[]
  yaLaTienen: Set<string>
}

function Formulario({ metrica, clientes, yaLaTienen }: Props) {
  const navigate = useNavigate()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [puedeCargar, setPuedeCargar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function alternar(id: string) {
    setElegidos((actuales) => (actuales.includes(id) ? actuales.filter((c) => c !== id) : [...actuales, id]))
  }

  async function asignar() {
    setGuardando(true)
    setError(null)
    try {
      await asignarMetrica(metrica.id, elegidos, puedeCargar)
      navigate(`/metricas/${metrica.id}`, { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={`Asignar “${metrica.nombre}”`} volver={{ to: `/metricas/${metrica.id}`, etiqueta: 'la métrica' }} />
      {clientes.length === 0 ? (
        <p>No tenés clientes activos todavía.</p>
      ) : (
        <fieldset className={estilosRutinas.clientes}>
          <legend className={estilosRutinas.leyenda}>Clientes</legend>
          {clientes.map((c) => (
            <label key={c.id} className={estilosRutinas.casillaCliente}>
              <input
                type="checkbox"
                disabled={yaLaTienen.has(c.id)}
                checked={yaLaTienen.has(c.id) || elegidos.includes(c.id)}
                onChange={() => alternar(c.id)}
              />
              {c.nombre}
              {yaLaTienen.has(c.id) && <span className={pantalla.textoApagado}> · ya la tiene</span>}
            </label>
          ))}
        </fieldset>
      )}
      <label className={estilosRutinas.casilla}>
        <input type="checkbox" checked={puedeCargar} onChange={(e) => setPuedeCargar(e.target.checked)} />
        Que cada cliente también pueda cargar sus mediciones
      </label>
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
