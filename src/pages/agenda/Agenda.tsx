import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import {
  borrarTurno,
  cambiarEstado,
  listarTurnos,
  obtenerZonaHoraria,
  type Estado,
  type TurnoConCliente,
} from '../../datos/agenda.ts'
import { nombreDia } from '../../datos/rutinas.ts'
import {
  aIcs,
  diaDeLaSemana,
  fechaEnZona,
  formatearRango,
  instanteLocal,
  lunesDe,
  minutosDeTurno,
  sumarDias,
} from '../../lib/agenda.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './agenda.module.css'

// RF-80: la agenda del entrenador, por día o por semana. RF-82: exportarla.
export function Agenda() {
  const { session } = useAuth()
  const entrenadorId = session?.user.id ?? ''
  const [vista, setVista] = useState<'dia' | 'semana'>('dia')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))

  const { datos: zona } = useConsulta(() => obtenerZonaHoraria(entrenadorId), [entrenadorId])
  const desde = vista === 'dia' ? fecha : lunesDe(fecha)
  const dias = vista === 'dia' ? 1 : 7

  const { datos: turnos, error, cargando, recargar } = useConsulta(
    async () => {
      if (!zona) return null
      return listarTurnos(instanteLocal(desde, '00:00', zona), instanteLocal(sumarDias(desde, dias), '00:00', zona))
    },
    [desde, dias, zona],
  )

  function mover(cuantos: number) {
    setFecha(sumarDias(fecha, cuantos * dias))
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo="Agenda"
        accion={
          <Link to="/agenda/nuevo" className={`${pantalla.botonLink} ${pantalla.botonChico}`}>
            Nuevo
          </Link>
        }
      />

      <Segmentos
        etiqueta="Cómo ver la agenda"
        opciones={[
          { valor: 'dia', etiqueta: 'Día' },
          { valor: 'semana', etiqueta: 'Semana' },
        ]}
        valor={vista}
        onCambio={setVista}
      />

      <div className={styles.navegacion}>
        <Boton type="button" variante="secundario" onClick={() => mover(-1)}>
          ‹
        </Boton>
        <span className={styles.rango}>
          {vista === 'dia'
            ? `${nombreDia[diaDeLaSemana(fecha)]} ${formatearFecha(fecha)}`
            : `${formatearFecha(desde)} al ${formatearFecha(sumarDias(desde, 6))}`}
        </span>
        <Boton type="button" variante="secundario" onClick={() => mover(1)}>
          ›
        </Boton>
      </div>
      {fecha !== new Date().toISOString().slice(0, 10) && (
        <button type="button" className={styles.hoyLink} onClick={() => setFecha(new Date().toISOString().slice(0, 10))}>
          Volver a hoy
        </button>
      )}

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {turnos && zona && (
        <>
          {turnos.length === 0 ? (
            <p className={pantalla.textoApagado}>
              {vista === 'dia' ? 'Ese día no tenés turnos.' : 'Esa semana no tenés turnos.'}
            </p>
          ) : (
            Array.from({ length: dias }, (_, i) => sumarDias(desde, i))
              .map((dia) => ({ dia, delDia: turnos.filter((t) => fechaEnZona(new Date(t.inicia_en), zona) === dia) }))
              .filter(({ delDia }) => delDia.length > 0)
              .map(({ dia, delDia }) => (
                <div key={dia} className={pantalla.seccion}>
                  <h2>
                    {nombreDia[diaDeLaSemana(dia)]} {formatearFecha(dia)}
                  </h2>
                  {delDia.map((t) => (
                    <TarjetaTurno key={t.id} turno={t} zona={zona} alCambiar={recargar} />
                  ))}
                </div>
              ))
          )}
          <Exportar turnos={turnos} desde={desde} />
        </>
      )}

      <Link to="/agenda/disponibilidad" className={pantalla.fila}>
        <span className={pantalla.filaTexto}>
          <span className={pantalla.filaNombre}>Mis horarios</span>
          <span className={pantalla.filaDetalle}>En qué franjas te pueden reservar tus clientes</span>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
    </section>
  )
}

const ETIQUETA: Record<Estado, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

function TarjetaTurno({
  turno,
  zona,
  alCambiar,
}: {
  turno: TurnoConCliente
  zona: string
  alCambiar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function cambiar(estado: Estado) {
    setOcupado(true)
    setError(null)
    try {
      await cambiarEstado(turno.id, estado)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setOcupado(false)
  }

  async function borrar() {
    if (!window.confirm('¿Borrar este turno de la agenda?')) return
    setOcupado(true)
    try {
      await borrarTurno(turno.id)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
      setOcupado(false)
    }
  }

  return (
    <div className={`${styles.turno} ${turno.estado === 'cancelado' ? styles.cancelado : ''}`}>
      <div className={styles.turnoCabecera}>
        <span className={styles.hora}>{formatearRango(turno, zona)}</span>
        <span className={styles.etiquetaEstado}>{ETIQUETA[turno.estado]}</span>
      </div>
      <p className={styles.quien}>
        {turno.cliente ? turno.cliente.nombre : 'Agenda bloqueada'} · {minutosDeTurno(turno)} min
      </p>
      {turno.lugar && <p className={pantalla.textoApagado}>{turno.lugar}</p>}
      {turno.nota && <p className={pantalla.textoApagado}>{turno.nota}</p>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className={styles.acciones}>
        {turno.estado === 'pendiente' && (
          <Boton type="button" cargando={ocupado} onClick={() => cambiar('confirmado')}>
            Confirmar
          </Boton>
        )}
        {turno.estado !== 'cancelado' && (
          <Boton type="button" variante="secundario" cargando={ocupado} onClick={() => cambiar('cancelado')}>
            Cancelar
          </Boton>
        )}
        <Link to={`/agenda/${turno.id}`} className={`${pantalla.botonLink} ${pantalla.botonSecundario}`}>
          Mover
        </Link>
        {turno.estado === 'cancelado' && (
          <Boton type="button" variante="secundario" cargando={ocupado} onClick={borrar}>
            Borrar
          </Boton>
        )}
      </div>
    </div>
  )
}

// RF-82: se descarga un .ics, que Google Calendar, Apple y Outlook importan.
function Exportar({ turnos, desde }: { turnos: TurnoConCliente[]; desde: string }) {
  function descargar() {
    const url = URL.createObjectURL(new Blob([aIcs(turnos)], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `agenda-${desde}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activos = turnos.filter((t) => t.estado !== 'cancelado').length
  if (activos === 0) return null

  return (
    <Boton type="button" variante="secundario" onClick={descargar}>
      Exportar a mi calendario ({activos})
    </Boton>
  )
}
