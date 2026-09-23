import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  crearTurno,
  listarTurnos,
  moverTurno,
  obtenerZonaHoraria,
  type TurnoConCliente,
} from '../../datos/agenda.ts'
import { listarClientes } from '../../datos/clientes.ts'
import { fechaEnZona, formatearHora, instanteLocal, minutosDeTurno } from '../../lib/agenda.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

const LARGOS = [30, 45, 60, 75, 90, 120]

// Agenda un turno nuevo, o mueve uno que ya existe (RF-81).
export function FormularioTurno() {
  const { id } = useParams()
  const { session } = useAuth()
  const entrenadorId = session?.user.id ?? ''

  const { datos, error, cargando } = useConsulta(
    async () => {
      const zona = await obtenerZonaHoraria(entrenadorId)
      const clientes = await listarClientes()
      if (!id) return { zona, clientes, turno: null }
      // Un turno suelto: se busca en una ventana amplia alrededor de hoy.
      const hoy = new Date()
      const turnos = await listarTurnos(
        new Date(hoy.getTime() - 365 * 86_400_000),
        new Date(hoy.getTime() + 365 * 86_400_000),
      )
      return { zona, clientes, turno: turnos.find((t) => t.id === id) ?? null }
    },
    [entrenadorId, id],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (id && !datos?.turno) return <Aviso tipo="error">Ese turno no existe o quedó fuera del año.</Aviso>

  return (
    <Formulario
      zona={datos?.zona ?? 'America/Montevideo'}
      clientes={(datos?.clientes ?? []).filter((c) => c.estado !== 'baja')}
      turno={datos?.turno ?? null}
    />
  )
}

type Props = {
  zona: string
  clientes: { id: string; nombre: string }[]
  turno: TurnoConCliente | null
}

function Formulario({ zona, clientes, turno }: Props) {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(turno?.cliente_id ?? '')
  const [fecha, setFecha] = useState(
    turno ? fechaEnZona(new Date(turno.inicia_en), zona) : new Date().toISOString().slice(0, 10),
  )
  const [hora, setHora] = useState(turno ? formatearHora(turno.inicia_en, zona) : '08:00')
  const [largo, setLargo] = useState(String(turno ? minutosDeTurno(turno) : 60))
  const [lugar, setLugar] = useState(turno?.lugar ?? '')
  const [nota, setNota] = useState(turno?.nota ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const inicia = instanteLocal(fecha, hora, zona)
    const termina = new Date(inicia.getTime() + Number(largo) * 60_000)
    try {
      if (turno) {
        await moverTurno(turno.id, inicia.toISOString(), termina.toISOString())
      } else {
        await crearTurno({
          cliente_id: cliente || null,
          inicia_en: inicia.toISOString(),
          termina_en: termina.toISOString(),
          // Lo que agenda el entrenador ya está confirmado; un bloqueo de
          // agenda no puede quedar pendiente.
          estado: 'confirmado',
          lugar: lugar.trim() || null,
          nota: nota.trim() || null,
        })
      }
      navigate('/agenda', { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={turno ? 'Mover turno' : 'Nuevo turno'}
        volver={{ to: '/agenda', etiqueta: 'la agenda' }}
      />
      {turno && (
        <p className={pantalla.textoApagado}>
          De {turno.cliente ? turno.cliente.nombre : 'agenda bloqueada'}. Cambiale el día, la hora o el largo.
        </p>
      )}

      <form className={pantalla.form} onSubmit={guardar}>
        {!turno && (
          <Selector
            etiqueta="Cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            opciones={[
              { valor: '', etiqueta: 'Sin cliente (bloquear la agenda)' },
              ...clientes.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
            ]}
          />
        )}
        <Campo etiqueta="Día" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Campo etiqueta="Hora" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
        <Selector
          etiqueta="Largo"
          value={largo}
          onChange={(e) => setLargo(e.target.value)}
          opciones={LARGOS.map((m) => ({ valor: String(m), etiqueta: `${m} minutos` }))}
        />
        {!turno && (
          <>
            <Campo
              etiqueta="Lugar (opcional)"
              maxLength={200}
              placeholder="Parque Rodó, gimnasio…"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
            <Campo
              etiqueta="Nota (opcional)"
              maxLength={1000}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {turno ? 'Mover el turno' : 'Agendar'}
        </Boton>
      </form>
    </section>
  )
}
