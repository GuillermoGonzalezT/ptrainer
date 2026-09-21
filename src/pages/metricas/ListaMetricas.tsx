import { useState } from 'react'
import { Link } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarMetricas, type MetricaEnLista } from '../../datos/metricas.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

// RF-50 y RF-55: las métricas propias y las predefinidas.
export function ListaMetricas() {
  const { datos: metricas, error, cargando, recargar } = useConsulta(listarMetricas, [])
  const [verArchivadas, setVerArchivadas] = useState(false)

  const propias = (metricas ?? []).filter((m) => m.entrenador_id !== null && m.archivada === verArchivadas)
  const predefinidas = (metricas ?? []).filter((m) => m.entrenador_id === null)
  const archivadas = (metricas ?? []).filter((m) => m.entrenador_id !== null && m.archivada).length

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={verArchivadas ? 'Métricas archivadas' : 'Métricas'}
        accion={
          <Link to="/metricas/nueva" className={`${pantalla.botonLink} ${pantalla.botonChico}`}>
            Nueva
          </Link>
        }
      />
      <p className={pantalla.textoApagado}>
        Lo que medís cada tanto para ver cómo evoluciona un cliente: salto vertical, dominadas, tiempo en 5 km…
      </p>

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {metricas && (
        <>
          <h2 className={pantalla.subtitulo}>{verArchivadas ? 'Archivadas' : 'Tuyas'}</h2>
          {propias.length === 0 ? (
            <p className={pantalla.textoApagado}>
              {verArchivadas ? 'No hay métricas archivadas.' : 'Todavía no creaste métricas propias.'}
            </p>
          ) : (
            <Lista metricas={propias} />
          )}
          {(archivadas > 0 || verArchivadas) && (
            <Boton type="button" variante="secundario" onClick={() => setVerArchivadas(!verArchivadas)}>
              {verArchivadas ? 'Volver a las métricas' : `Ver archivadas (${archivadas})`}
            </Boton>
          )}
          {!verArchivadas && (
            <>
              <h2 className={pantalla.subtitulo}>Predefinidas</h2>
              <Lista metricas={predefinidas} />
            </>
          )}
        </>
      )}
    </section>
  )
}

function Lista({ metricas }: { metricas: MetricaEnLista[] }) {
  return (
    <ul className={pantalla.lista}>
      {metricas.map((m) => (
        <li key={m.id}>
          <Link to={`/metricas/${m.id}`} className={pantalla.fila}>
            <span className={pantalla.filaTexto}>
              <span className={pantalla.filaNombre}>{m.nombre}</span>
              <span className={pantalla.filaDetalle}>
                {m.unidad} · {m.clientes === 0 ? 'sin asignar' : m.clientes === 1 ? '1 cliente' : `${m.clientes} clientes`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
