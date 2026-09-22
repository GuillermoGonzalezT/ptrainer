import { Link } from 'react-router'
import { Aviso } from '../../components/Formulario.tsx'
import { ejerciciosRealizados } from '../../datos/progreso.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { conUnidad } from '../metricas/formato.ts'

// Los ejercicios que hizo un cliente, para abrir su progreso (RF-60). La usan
// la pestaña Progreso del cliente y la página de progreso de su ficha.
export function ListaEjerciciosRealizados({ clienteId }: { clienteId: string }) {
  const { datos: ejercicios, error, cargando } = useConsulta(() => ejerciciosRealizados(clienteId), [clienteId])

  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (!ejercicios || ejercicios.length === 0) {
    return <p className={pantalla.textoApagado}>Todavía no hay entrenamientos registrados.</p>
  }

  return (
    <ul className={pantalla.lista}>
      {ejercicios.map((e) => (
        <li key={e.ejercicio_id}>
          <Link to={`/progreso/${clienteId}/${e.ejercicio_id}`} className={pantalla.fila}>
            <span className={pantalla.filaTexto}>
              <span className={pantalla.filaNombre}>{e.nombre}</span>
              <span className={pantalla.filaDetalle}>
                {e.sesiones === 1 ? '1 sesión' : `${e.sesiones} sesiones`} · última {formatearFecha(e.ultima)}
              </span>
            </span>
            {e.carga_max !== null && e.carga_max > 0 && (
              <span className={pantalla.etiqueta}>máx. {conUnidad(e.carga_max, 'kg')}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
