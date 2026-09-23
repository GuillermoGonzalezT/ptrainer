import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  cambiarEstado,
  listarFranjas,
  listarTurnos,
  reservarTurno,
  type Estado,
  type TurnoConCliente,
} from '../../datos/agenda.ts'
import { nombreDia } from '../../datos/rutinas.ts'
import { aIcs, diaDeLaSemana, formatearRango, huecosLibres, minutosDeTurno } from '../../lib/agenda.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './agenda.module.css'

const LARGOS = [30, 45, 60, 75, 90]

const ETIQUETA: Record<Estado, string> = {
  pendiente: 'Esperando que lo confirme',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

// RF-81 desde el cliente: sus turnos y pedir uno nuevo dentro de las franjas
// de su entrenador.
export function MisTurnos() {
  const { rol } = useAuth()
  const ficha = rol?.fichas.find((f) => f.estado !== 'baja')

  const { datos, error, cargando, recargar } = useConsulta(
    async () => {
      const hoy = new Date()
      return {
        turnos: await listarTurnos(hoy, new Date(hoy.getTime() + 60 * 86_400_000)),
        franjas: await listarFranjas(),
      }
    },
    [ficha?.id],
  )

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo="Mis turnos" />

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {datos && (
        <>
          {datos.turnos.length === 0 ? (
            <p className={pantalla.textoApagado}>No tenés turnos en los próximos dos meses.</p>
          ) : (
            <div className={pantalla.seccion}>
              <h2>Próximos</h2>
              {datos.turnos.map((t) => (
                <TurnoDelCliente key={t.id} turno={t} alCambiar={recargar} />
              ))}
              <Exportar turnos={datos.turnos} />
            </div>
          )}

          {ficha && datos.franjas.length > 0 && (
            <Pedir
              clienteId={ficha.id}
              entrenadorId={ficha.entrenador_id}
              franjas={datos.franjas}
              turnos={datos.turnos}
              alReservar={recargar}
            />
          )}
          {datos.franjas.length === 0 && (
            <p className={pantalla.textoApagado}>
              Tu entrenador todavía no publicó horarios para reservar. Cuando lo haga, vas a poder pedir turno desde
              acá.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function TurnoDelCliente({ turno, alCambiar }: { turno: TurnoConCliente; alCambiar: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function cancelar() {
    if (!window.confirm('¿Cancelar este turno?')) return
    setOcupado(true)
    setError(null)
    try {
      await cambiarEstado(turno.id, 'cancelado')
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setOcupado(false)
  }

  return (
    <div className={`${styles.turno} ${turno.estado === 'cancelado' ? styles.cancelado : ''}`}>
      <div className={styles.turnoCabecera}>
        <span className={styles.hora}>
          {nombreDia[diaDeLaSemana(turno.inicia_en.slice(0, 10))]} {formatearFecha(turno.inicia_en.slice(0, 10))}
        </span>
        <span className={styles.etiquetaEstado}>{ETIQUETA[turno.estado]}</span>
      </div>
      <p className={styles.quien}>
        {formatearRango(turno)} · {minutosDeTurno(turno)} min
      </p>
      {turno.lugar && <p className={pantalla.textoApagado}>{turno.lugar}</p>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {turno.estado !== 'cancelado' && (
        <Boton type="button" variante="secundario" cargando={ocupado} onClick={cancelar}>
          Cancelar
        </Boton>
      )}
    </div>
  )
}

type PropsPedir = {
  clienteId: string
  entrenadorId: string
  franjas: Awaited<ReturnType<typeof listarFranjas>>
  turnos: TurnoConCliente[]
  alReservar: () => void
}

function Pedir({ clienteId, entrenadorId, franjas, turnos, alReservar }: PropsPedir) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [largo, setLargo] = useState('60')
  const [nota, setNota] = useState('')
  const [pidiendo, setPidiendo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // La zona del entrenador no la ve el cliente: para armar los huecos se usa
  // la del teléfono, que en la práctica es la misma. Si no coincide, el turno
  // igual se valida en la base contra la franja de verdad.
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone
  const huecos = huecosLibres(fecha, franjas, turnos, Number(largo), zona)
  const dia = diaDeLaSemana(fecha)

  async function pedir(inicia: Date, termina: Date) {
    setPidiendo(inicia.toISOString())
    setError(null)
    try {
      await reservarTurno(entrenadorId, clienteId, inicia.toISOString(), termina.toISOString(), nota.trim() || null)
      setNota('')
      alReservar()
    } catch (e) {
      // La base rechaza la fila si el horario se ocupó entre que se dibujaron
      // los huecos y el toque, o si quedó fuera de las franjas. Es lo mismo
      // para quien reserva: ese horario no sirve.
      const codigo = (e as { code?: string } | null)?.code
      setError(
        codigo === '42501' || codigo === '23P01'
          ? 'Ese horario ya no está libre. Elegí otro.'
          : mensajeDeError(e),
      )
      alReservar()
    }
    setPidiendo(null)
  }

  return (
    <div className={pantalla.seccion}>
      <h2>Pedir un turno</h2>
      <p className={pantalla.textoApagado}>
        Elegí el día y el largo, y tocá un horario libre. Tu entrenador lo tiene que confirmar.
      </p>
      <Campo
        etiqueta="Día"
        type="date"
        min={new Date().toISOString().slice(0, 10)}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />
      <Selector
        etiqueta="Largo"
        value={largo}
        onChange={(e) => setLargo(e.target.value)}
        opciones={LARGOS.map((m) => ({ valor: String(m), etiqueta: `${m} minutos` }))}
      />
      <Campo
        etiqueta="Nota para tu entrenador (opcional)"
        maxLength={1000}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
      {error && <Aviso tipo="error">{error}</Aviso>}

      {huecos.length === 0 ? (
        <p className={pantalla.textoApagado}>
          {franjas.some((f) => f.dia === dia)
            ? 'Ese día no quedan horarios libres para ese largo.'
            : `Tu entrenador no atiende los ${nombreDia[dia].toLowerCase()}.`}
        </p>
      ) : (
        <div className={styles.huecos}>
          {huecos.map((h) => (
            <Boton
              key={h.inicia.toISOString()}
              type="button"
              variante="secundario"
              cargando={pidiendo === h.inicia.toISOString()}
              onClick={() => pedir(h.inicia, h.termina)}
            >
              {formatearRango({ inicia_en: h.inicia.toISOString(), termina_en: h.termina.toISOString() })}
            </Boton>
          ))}
        </div>
      )}
    </div>
  )
}

function Exportar({ turnos }: { turnos: TurnoConCliente[] }) {
  const activos = turnos.filter((t) => t.estado !== 'cancelado')
  if (activos.length === 0) return null

  function descargar() {
    const url = URL.createObjectURL(new Blob([aIcs(activos, () => 'Entrenamiento')], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'mis-turnos.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Boton type="button" variante="secundario" onClick={descargar}>
      Exportar a mi calendario ({activos.length})
    </Boton>
  )
}
