import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Aviso, Boton } from '../components/Formulario.tsx'
import { listarTurnos, type TurnoConCliente } from '../datos/agenda.ts'
import { cargarPanel, DIAS_RECIENTES, guardarUmbral, type Panel } from '../datos/panel.ts'
import { mensajeDeError } from '../lib/errores.ts'
import { formatearRango, minutosDeTurno } from '../lib/agenda.ts'
import { formatearFecha, formatearFechaHora } from '../lib/formato.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { conUnidad } from './metricas/formato.ts'
import styles from './InicioEntrenador.module.css'

const opcionesUmbral = [3, 5, 7, 10, 14, 21, 30]

// RF-70: lo que el entrenador tiene que mirar al abrir la app.
export function InicioEntrenador() {
  const { rol, session } = useAuth()
  const uid = session?.user.id ?? ''
  const { datos: panel, error, cargando, recargar } = useConsulta(() => cargarPanel(uid), [uid])
  const primerNombre = rol?.nombre.trim().split(' ')[0]

  return (
    <section className={pantalla.pantalla}>
      <h1 className={styles.saludo}>{primerNombre ? `Hola, ${primerNombre}` : 'Inicio'}</h1>

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      <TurnosDeHoy />

      {panel && (
        <>
          <div className={styles.cifras}>
            <div className={styles.cifra}>
              <span className={styles.cifraEtiqueta}>Sesiones, últimos 7 días</span>
              <span className={styles.cifraValor}>{panel.sesionesSemana}</span>
            </div>
            <Link to="/clientes" className={`${styles.cifra} ${styles.cifraLink}`}>
              <span className={styles.cifraEtiqueta}>Clientes activos</span>
              <span className={styles.cifraValor}>{panel.clientesActivos}</span>
            </Link>
          </div>

          {panel.clientesActivos === 0 ? (
            <div className={pantalla.vacio}>
              <p>Todavía no tenés clientes activos. Empezá sumando el primero y mandándole la invitación.</p>
              <Link to="/clientes/nuevo" className={pantalla.botonLink}>
                Agregar cliente
              </Link>
            </div>
          ) : (
            <>
              <ParaRevisar panel={panel} />
              <CheckinsPendientes panel={panel} />
              <SinEntrenar panel={panel} entrenadorId={uid} alCambiar={recargar} />
              <MedicionesNuevas panel={panel} />
            </>
          )}
        </>
      )}
    </section>
  )
}

function ParaRevisar({ panel }: { panel: Panel }) {
  return (
    <div className={pantalla.seccion}>
      <div className={styles.titulo}>
        <h2>Para revisar</h2>
        {panel.paraRevisar.length > 0 && <span className={styles.contador}>{panel.paraRevisar.length}</span>}
      </div>
      {panel.paraRevisar.length === 0 ? (
        <p className={pantalla.textoApagado}>Estás al día: no hay sesiones sin tu devolución en los últimos {DIAS_RECIENTES} días.</p>
      ) : (
        <>
          <p className={pantalla.textoApagado}>Sesiones que registraron tus clientes y todavía no tienen tu devolución.</p>
          <ul className={pantalla.lista}>
            {panel.paraRevisar.map((s) => (
              <li key={s.id}>
                <Link to={`/sesion/${s.id}`} className={pantalla.fila}>
                  <span className={pantalla.filaTexto}>
                    <span className={pantalla.filaNombre}>{s.cliente}</span>
                    <span className={pantalla.filaDetalle}>
                      {s.rutina_nombre} · {formatearFechaHora(s.iniciada_en)}
                      {s.esfuerzo !== null && ` · esfuerzo ${s.esfuerzo}/10`}
                    </span>
                  </span>
                  {s.comentario && <span className={pantalla.etiqueta}>Comentó</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// RF-65: a quién le falta el check-in de esta semana.
function CheckinsPendientes({ panel }: { panel: Panel }) {
  if (panel.sinCheckin.length === 0) {
    return (
      <div className={pantalla.seccion}>
        <div className={styles.titulo}>
          <h2>Check-ins</h2>
        </div>
        <p className={pantalla.textoApagado}>Todos tus clientes activos hicieron el check-in de esta semana.</p>
      </div>
    )
  }
  return (
    <div className={pantalla.seccion}>
      <div className={styles.titulo}>
        <h2>Check-ins pendientes</h2>
        <span className={styles.contador}>{panel.sinCheckin.length}</span>
      </div>
      <p className={pantalla.textoApagado}>Les falta el de esta semana.</p>
      <ul className={pantalla.lista}>
        {panel.sinCheckin.map((c) => (
          <li key={c.id}>
            <Link to={`/checkin/${c.id}`} className={pantalla.fila}>
              <span className={pantalla.filaTexto}>
                <span className={pantalla.filaNombre}>{c.nombre}</span>
                <span className={pantalla.filaDetalle}>Cargarlo con el cliente</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SinEntrenar({ panel, entrenadorId, alCambiar }: { panel: Panel; entrenadorId: string; alCambiar: () => void }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cambiar(dias: number) {
    setGuardando(true)
    setError(null)
    try {
      await guardarUmbral(entrenadorId, dias)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <div className={pantalla.seccion}>
      <div className={styles.titulo}>
        <h2>Sin entrenar</h2>
        {panel.sinEntrenar.length > 0 && <span className={styles.contador}>{panel.sinEntrenar.length}</span>}
      </div>
      <label className={styles.umbral}>
        Hace
        <select
          className={styles.umbralSelector}
          value={panel.umbral}
          disabled={guardando}
          onChange={(e) => cambiar(Number(e.target.value))}
        >
          {/* Si el valor guardado no está en la lista, se agrega para no perderlo. */}
          {[...new Set([...opcionesUmbral, panel.umbral])].sort((a, b) => a - b).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        días o más
      </label>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {panel.sinEntrenar.length === 0 ? (
        <p className={pantalla.textoApagado}>Todos tus clientes activos entrenaron en los últimos {panel.umbral} días.</p>
      ) : (
        <ul className={pantalla.lista}>
          {panel.sinEntrenar.map(({ cliente, ultima, dias }) => (
            <li key={cliente.id}>
              <Link to={`/clientes/${cliente.id}`} className={pantalla.fila}>
                <span className={pantalla.filaTexto}>
                  <span className={pantalla.filaNombre}>{cliente.nombre}</span>
                  <span className={pantalla.filaDetalle}>
                    {ultima ? `Última sesión: ${formatearFecha(ultima)}` : cliente.usuario_id ? 'Nunca registró una sesión' : 'Todavía no creó su cuenta'}
                  </span>
                </span>
                {dias !== null && <span className={pantalla.etiqueta}>{dias === 1 ? '1 día' : `${dias} días`}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MedicionesNuevas({ panel }: { panel: Panel }) {
  if (panel.mediciones.length === 0) return null
  return (
    <div className={pantalla.seccion}>
      <div className={styles.titulo}>
        <h2>Mediciones nuevas</h2>
        <span className={styles.contador}>{panel.mediciones.length}</span>
      </div>
      <p className={pantalla.textoApagado}>Las que cargaron tus clientes en los últimos {DIAS_RECIENTES} días.</p>
      <ul className={pantalla.lista}>
        {panel.mediciones.map((m) => (
          <li key={m.id}>
            <Link to={`/seguimiento/${m.asignacionId}`} className={pantalla.fila}>
              <span className={pantalla.filaTexto}>
                <span className={pantalla.filaNombre}>{m.cliente}</span>
                <span className={pantalla.filaDetalle}>
                  {m.metrica} · {formatearFecha(m.fecha)}
                </span>
              </span>
              <span className={styles.valor}>{conUnidad(m.valor, m.unidad)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// RF-71: los turnos de hoy, arriba de todo, que es lo primero que uno mira.
function TurnosDeHoy() {
  const { datos: turnos } = useConsulta(async () => {
    const desde = new Date()
    desde.setHours(0, 0, 0, 0)
    const hasta = new Date(desde)
    hasta.setDate(hasta.getDate() + 1)
    return listarTurnos(desde, hasta)
  }, [])

  const activos = (turnos ?? []).filter((t) => t.estado !== 'cancelado')
  const pendientes = activos.filter((t) => t.estado === 'pendiente').length

  return (
    <div className={pantalla.seccion}>
      <div className={styles.titulo}>
        <h2>Hoy en la agenda</h2>
        <Link to="/agenda" className={styles.verTodo}>
          Ver la agenda
        </Link>
      </div>
      {turnos && activos.length === 0 && <p className={pantalla.textoApagado}>Hoy no tenés turnos.</p>}
      {pendientes > 0 && (
        <p className={pantalla.textoApagado}>
          {pendientes === 1 ? 'Hay 1 reserva sin confirmar.' : `Hay ${pendientes} reservas sin confirmar.`}
        </p>
      )}
      {activos.length > 0 && (
        <ul className={pantalla.lista}>
          {activos.map((t) => (
            <li key={t.id}>
              <Turno turno={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Turno({ turno }: { turno: TurnoConCliente }) {
  return (
    <Link to="/agenda" className={pantalla.fila}>
      <span className={pantalla.filaTexto}>
        <span className={pantalla.filaNombre}>
          {formatearRango(turno)} · {turno.cliente ? turno.cliente.nombre : 'Agenda bloqueada'}
        </span>
        <span className={pantalla.filaDetalle}>
          {minutosDeTurno(turno)} min
          {turno.lugar && ` · ${turno.lugar}`}
          {turno.estado === 'pendiente' && ' · sin confirmar'}
        </span>
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  )
}
