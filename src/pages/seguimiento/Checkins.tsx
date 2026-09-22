import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import { ESCALAS, listarCheckins, semanaDe, type Checkin } from '../../datos/seguimiento.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './seguimiento.module.css'

// /checkins/:clienteId — el historial de check-ins (RF-65). Lo ven el
// entrenador y el propio cliente.
export function Checkins() {
  const { clienteId = '' } = useParams()
  const { tipo } = useAuth()
  const esEntrenador = tipo === 'entrenador'
  const { datos, error, cargando, recargar } = useConsulta(
    async () => ({
      checkins: await listarCheckins(clienteId, 24),
      cliente: esEntrenador ? await obtenerCliente(clienteId) : null,
    }),
    [clienteId, esEntrenador],
  )

  const volver = esEntrenador ? { to: `/clientes/${clienteId}`, etiqueta: 'la ficha' } : { to: '/progreso', etiqueta: 'progreso' }
  const estaSemana = semanaDe()
  const hecho = datos?.checkins.some((c) => c.semana === estaSemana)

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={datos?.cliente ? `Check-ins de ${datos.cliente.nombre}` : 'Check-ins'} volver={volver} />
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
          <Link to={`/checkin/${clienteId}`} className={pantalla.botonLink}>
            {hecho ? 'Editar el de esta semana' : 'Hacer el de esta semana'}
          </Link>
          {datos.checkins.length === 0 ? (
            <p className={pantalla.textoApagado}>Todavía no hay check-ins.</p>
          ) : (
            <TablaCheckins checkins={datos.checkins} clienteId={clienteId} />
          )}
        </>
      )}
    </section>
  )
}

export function TablaCheckins({ checkins, clienteId }: { checkins: Checkin[]; clienteId: string }) {
  return (
    <table className={styles.tabla}>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          {ESCALAS.map((e) => (
            <th key={e.campo} scope="col">
              {e.etiqueta === 'Cumplimiento del plan' ? 'Plan' : e.etiqueta}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {checkins.map((c) => (
          <Fila key={c.id} checkin={c} clienteId={clienteId} />
        ))}
      </tbody>
    </table>
  )
}

function Fila({ checkin, clienteId }: { checkin: Checkin; clienteId: string }) {
  return (
    <>
      <tr>
        <td>
          <Link to={`/checkin/${clienteId}?semana=${checkin.semana}`}>{formatearFecha(checkin.semana)}</Link>
        </td>
        {ESCALAS.map((e) => (
          <td key={e.campo}>{checkin[e.campo] ?? '–'}</td>
        ))}
      </tr>
      {checkin.comentario && (
        <tr className={styles.comentarioFila}>
          <td colSpan={ESCALAS.length + 1}>{checkin.comentario}</td>
        </tr>
      )}
    </>
  )
}
