import { Link } from 'react-router'
import type { SesionEnLista } from '../datos/sesiones.ts'
import { formatearFechaHora } from '../lib/formato.ts'
import pantalla from '../styles/pantalla.module.css'

// Lista de sesiones (RF-46). La usan el historial del cliente y su ficha.
export function ListaSesiones({ sesiones }: { sesiones: SesionEnLista[] }) {
  return (
    <ul className={pantalla.lista}>
      {sesiones.map((s) => {
        const detalle = [
          `${s.series} ${s.series === 1 ? 'serie' : 'series'}`,
          s.esfuerzo !== null && `esfuerzo ${s.esfuerzo}/10`,
          s.comentario && 'con comentario',
        ].filter(Boolean)
        return (
          <li key={s.id}>
            <Link to={`/sesion/${s.id}`} className={pantalla.fila}>
              <span className={pantalla.filaTexto}>
                <span className={pantalla.filaNombre}>{s.rutina_nombre}</span>
                <span className={pantalla.filaDetalle}>
                  {formatearFechaHora(s.iniciada_en)} · {detalle.join(' · ')}
                </span>
              </span>
              {s.conDevolucion && <span className={pantalla.etiqueta}>Devolución</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
