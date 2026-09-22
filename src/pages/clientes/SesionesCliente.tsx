import { Link } from 'react-router'
import { Aviso } from '../../components/Formulario.tsx'
import { listarSesiones } from '../../datos/sesiones.ts'
import { ListaSesiones } from '../../entrenamiento/ListaSesiones.tsx'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

const MOSTRAR = 5

// Las últimas sesiones del cliente, en su ficha. Se pide una más de las que
// se muestran para saber si hay más.
export function SesionesCliente({ clienteId }: { clienteId: string }) {
  const { datos: sesiones, error } = useConsulta(() => listarSesiones(clienteId, MOSTRAR + 1), [clienteId])

  return (
    <div className={styles.seccion}>
      <h2>Últimas sesiones</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {sesiones && sesiones.length === 0 && <p className={styles.textoApagado}>Todavía no registró ninguna sesión.</p>}
      {sesiones && sesiones.length > 0 && <ListaSesiones sesiones={sesiones.slice(0, MOSTRAR)} />}
      {sesiones && sesiones.length > 0 && (
        <div className={styles.acciones}>
          {sesiones.length > MOSTRAR && (
            <Link to={`/clientes/${clienteId}/sesiones`} className={`${styles.botonLink} ${styles.botonSecundario}`}>
              Ver todas
            </Link>
          )}
          <Link to={`/clientes/${clienteId}/progreso`} className={`${styles.botonLink} ${styles.botonSecundario}`}>
            Progreso por ejercicio
          </Link>
        </div>
      )}
    </div>
  )
}
