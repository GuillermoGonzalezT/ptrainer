import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton } from '../../components/Formulario.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import {
  ESCALAS,
  guardarCheckin,
  obtenerCheckin,
  semanaDe,
  type Checkin,
  type DatosCheckin,
} from '../../datos/seguimiento.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { EscalaCinco } from './EscalaCinco.tsx'

// RF-65: el check-in de una semana. Por defecto, la actual.
export function CheckinSemanal() {
  const { clienteId = '' } = useParams()
  const semana = useSearchParams()[0].get('semana') ?? semanaDe()
  const { tipo } = useAuth()
  const { datos, error, cargando } = useConsulta(
    async () => ({
      checkin: await obtenerCheckin(clienteId, semana),
      cliente: tipo === 'entrenador' ? await obtenerCliente(clienteId) : null,
    }),
    [clienteId, semana, tipo],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  const volver =
    tipo === 'entrenador' ? { to: `/clientes/${clienteId}/checkins`, etiqueta: 'los check-ins' } : { to: '/', etiqueta: 'hoy' }
  return (
    <Formulario
      key={semana}
      clienteId={clienteId}
      semana={semana}
      nombre={datos?.cliente?.nombre ?? null}
      existente={datos?.checkin ?? null}
      volver={volver}
    />
  )
}

type Props = {
  clienteId: string
  semana: string
  nombre: string | null
  existente: Checkin | null
  volver: { to: string; etiqueta: string }
}

function Formulario({ clienteId, semana, nombre, existente, volver }: Props) {
  const navigate = useNavigate()
  const [valores, setValores] = useState<Omit<DatosCheckin, 'comentario'>>({
    sueno: existente?.sueno ?? null,
    estres: existente?.estres ?? null,
    energia: existente?.energia ?? null,
    cumplimiento: existente?.cumplimiento ?? null,
  })
  const [comentario, setComentario] = useState(existente?.comentario ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await guardarCheckin(clienteId, semana, { ...valores, comentario: comentario.trim() || null }, existente)
      navigate(volver.to, { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo="Check-in de la semana" volver={volver} />
      <p className={pantalla.textoApagado}>
        {nombre && `${nombre} · `}Semana del {formatearFecha(semana)}
      </p>

      <form className={pantalla.form} onSubmit={guardar}>
        {ESCALAS.map((escala) => (
          <EscalaCinco
            key={escala.campo}
            etiqueta={escala.etiqueta}
            bajo={escala.bajo}
            alto={escala.alto}
            valor={valores[escala.campo]}
            onCambio={(valor) => setValores({ ...valores, [escala.campo]: valor })}
          />
        ))}
        <AreaDeTexto
          etiqueta="Comentario (opcional)"
          maxLength={2000}
          placeholder="Cómo venís, si algo te costó, qué necesitás…"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {existente ? 'Guardar cambios' : 'Guardar check-in'}
        </Boton>
      </form>
    </section>
  )
}
