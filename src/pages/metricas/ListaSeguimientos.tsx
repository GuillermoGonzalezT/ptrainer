import { Link } from 'react-router'
import type { MetricaDeCliente } from '../../datos/metricas.ts'
import { formatearFecha } from '../../lib/formato.ts'
import pantalla from '../../styles/pantalla.module.css'
import { conUnidad, describirCambio } from './formato.ts'
import styles from './metricas.module.css'

// Las métricas de un cliente con su último valor y el cambio respecto de la
// anterior. La usan la ficha del cliente y su pantalla de Progreso.
export function ListaSeguimientos({ asignaciones }: { asignaciones: MetricaDeCliente[] }) {
  return (
    <ul className={pantalla.lista}>
      {asignaciones.map((a) => {
        const [ultima, anterior] = a.ultimas
        const cambio = ultima && anterior ? describirCambio(a.metrica, ultima.valor, anterior.valor) : null
        return (
          <li key={a.id}>
            <Link to={`/seguimiento/${a.id}`} className={pantalla.fila}>
              <span className={pantalla.filaTexto}>
                <span className={pantalla.filaNombre}>{a.metrica.nombre}</span>
                <span className={pantalla.filaDetalle}>
                  {ultima ? formatearFecha(ultima.fecha) : 'Sin mediciones'}
                  {a.objetivo !== null && ` · objetivo ${conUnidad(a.objetivo, a.metrica.unidad)}`}
                  {a.cliente_puede_cargar && ' · carga el cliente'}
                </span>
              </span>
              {ultima && (
                <span className={styles.filaMetrica}>
                  <span className={styles.filaValor}>{conUnidad(ultima.valor, a.metrica.unidad)}</span>
                  {cambio && (
                    <span className={pantalla.filaDetalle}>
                      {cambio.sentido !== 'neutro' && (
                        <span className={`${styles.flecha} ${styles[cambio.sentido]}`} aria-hidden="true">
                          {cambio.sentido === 'mejora' ? '▲' : '▼'}
                        </span>
                      )}
                      {cambio.texto}
                    </span>
                  )}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
