import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import {
  actualizarMetrica,
  crearMetrica,
  etiquetaMejor,
  obtenerMetrica,
  type Mejor,
  type Metrica,
} from '../../datos/metricas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

// Alta (/metricas/nueva) y edición (/metricas/:id/editar) de una métrica (RF-50).
export function FormularioMetrica() {
  const { id } = useParams()
  const { datos: metrica, error, cargando } = useConsulta(
    () => (id ? obtenerMetrica(id) : Promise.resolve(null)),
    [id],
  )

  if (id && cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (id && (!metrica || metrica.entrenador_id === null)) return <Aviso tipo="error">Esa métrica no se puede editar.</Aviso>
  return <Formulario key={id ?? 'nueva'} metrica={metrica ?? null} />
}

const opcionesMejor = (Object.keys(etiquetaMejor) as Mejor[]).map((m) => ({ valor: m, etiqueta: etiquetaMejor[m] }))

function Formulario({ metrica }: { metrica: Metrica | null }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(metrica?.nombre ?? '')
  const [unidad, setUnidad] = useState(metrica?.unidad ?? '')
  const [mejor, setMejor] = useState<Mejor>(metrica?.mejor ?? 'mayor')
  const [protocolo, setProtocolo] = useState(metrica?.protocolo ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const volverA = metrica ? `/metricas/${metrica.id}` : '/metricas'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const datos = { nombre: nombre.trim(), unidad: unidad.trim(), mejor, protocolo: protocolo.trim() || null }
    setGuardando(true)
    setError(null)
    try {
      const id = metrica ? (await actualizarMetrica(metrica.id, datos), metrica.id) : await crearMetrica(session.user.id, datos)
      navigate(`/metricas/${id}`, { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={metrica ? 'Editar métrica' : 'Nueva métrica'}
        volver={{ to: volverA, etiqueta: metrica ? 'la métrica' : 'métricas' }}
      />
      <form className={pantalla.form} onSubmit={guardar}>
        <Campo
          etiqueta="Nombre"
          required
          maxLength={80}
          placeholder="Salto vertical"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Campo
          etiqueta="Unidad"
          required
          maxLength={20}
          placeholder="cm, kg, s, reps…"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        />
        <div>
          <p className={pantalla.etiquetaCampo}>¿Qué es mejor?</p>
          <Segmentos etiqueta="Qué valor es mejor" opciones={opcionesMejor} valor={mejor} onCambio={setMejor} />
          <p className={pantalla.textoApagado}>
            {mejor === 'ninguno'
              ? 'No se marca la mejor marca, y si hay varios intentos vale el último.'
              : `Define la mejor marca, y si hay varios intentos en una toma, cuenta el ${mejor === 'mayor' ? 'más alto' : 'más bajo'}.`}
          </p>
        </div>
        <AreaDeTexto
          etiqueta="Cómo se mide (opcional)"
          maxLength={2000}
          ayuda="Protocolo para que las tomas sean comparables. El video lo agregás después de crearla."
          value={protocolo}
          onChange={(e) => setProtocolo(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {metrica ? 'Guardar cambios' : 'Crear métrica'}
        </Boton>
      </form>
    </section>
  )
}
