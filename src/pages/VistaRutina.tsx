import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Encabezado } from '../components/Encabezado.tsx'
import { Aviso } from '../components/Formulario.tsx'
import { obtenerRutina } from '../datos/rutinas.ts'
import { detallesPrescripcion, formatearDias, formatearVolumen } from '../lib/prescripcion.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import styles from './VistaRutina.module.css'

// La rutina como la ve el cliente: qué hacer en cada ejercicio, y el video a
// un toque (RF-23). Desde acá arranca el modo entrenamiento (RF-41).
export function VistaRutina() {
  const { id = '' } = useParams()
  const { tipo } = useAuth()
  const { datos: rutina, error, cargando } = useConsulta(() => obtenerRutina(id), [id])
  const volver = tipo === 'entrenador' && rutina ? { to: `/rutinas/${rutina.id}`, etiqueta: 'el editor' } : { to: '/', etiqueta: 'hoy' }

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!rutina) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="No encontrada" volver={{ to: '/', etiqueta: 'hoy' }} />
        <p>Esa rutina no existe o ya no está disponible.</p>
      </section>
    )
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={rutina.nombre} volver={volver} />
      <p className={pantalla.textoApagado}>{formatearDias(rutina.dias_semana)}</p>
      {rutina.descripcion && <p className={pantalla.notaTexto}>{rutina.descripcion}</p>}

      <ol className={styles.ejercicios}>
        {rutina.items.map((item, i) => {
          const detalles = detallesPrescripcion(item)
          return (
            <li key={item.id} className={styles.ejercicio}>
              <span className={styles.numero}>{i + 1}</span>
              <div className={styles.cuerpo}>
                <Link to={`/ejercicios/${item.ejercicio.id}`} className={styles.nombre}>
                  {item.ejercicio.nombre}
                  <span className={styles.verVideo}>Ver cómo se hace ›</span>
                </Link>
                <p className={styles.volumen}>{formatearVolumen(item)}</p>
                {detalles.length > 0 && <p className={pantalla.textoApagado}>{detalles.join(' · ')}</p>}
                {item.notas && <p className={styles.notas}>{item.notas}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {rutina.items.length === 0 && <p className={pantalla.textoApagado}>Esta rutina todavía no tiene ejercicios.</p>}
      {rutina.items.length > 0 && rutina.cliente_id && (
        <div className={styles.empezar}>
          <Link to={`/entrenar/${rutina.id}`} className={pantalla.botonLink}>
            {tipo === 'entrenador' ? 'Registrar una sesión' : 'Empezar entrenamiento'}
          </Link>
        </div>
      )}
    </section>
  )
}
