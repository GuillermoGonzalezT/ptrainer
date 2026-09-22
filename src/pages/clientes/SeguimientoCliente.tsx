import { Link } from 'react-router'
import { Aviso } from '../../components/Formulario.tsx'
import { listarCheckins, obtenerCuestionario, PREGUNTAS_PARQ, semanaDe } from '../../datos/seguimiento.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { TablaCheckins } from '../seguimiento/Checkins.tsx'

// Cuestionario inicial (RF-13) y check-ins (RF-65) en la ficha del cliente.
export function SeguimientoCliente({ clienteId }: { clienteId: string }) {
  const { datos, error } = useConsulta(
    async () => ({
      cuestionario: await obtenerCuestionario(clienteId),
      checkins: await listarCheckins(clienteId, 4),
    }),
    [clienteId],
  )

  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos) return null
  const { cuestionario, checkins } = datos
  const respuestas = cuestionario?.respuestas
  const afirmativas = (respuestas?.parq ?? []).filter((r) => r === true).length
  const estaSemana = semanaDe()

  return (
    <>
      <div className={styles.seccion}>
        <h2>Cuestionario inicial</h2>
        {cuestionario?.completado_en ? (
          <>
            <p className={styles.textoApagado}>Completado el {formatearFecha(cuestionario.completado_en)}.</p>
            {afirmativas > 0 && (
              <p>
                <strong>
                  {afirmativas === 1 ? '1 respuesta afirmativa' : `${afirmativas} respuestas afirmativas`}
                </strong>{' '}
                en las {PREGUNTAS_PARQ.length} preguntas de salud.
              </p>
            )}
            {respuestas?.lesiones && <p className={styles.notaTexto}>Lesiones: {respuestas.lesiones}</p>}
            {respuestas?.disponibilidad && <p className={styles.notaTexto}>Disponibilidad: {respuestas.disponibilidad}</p>}
          </>
        ) : (
          <p className={styles.textoApagado}>
            {cuestionario ? 'Empezado, pero sin terminar.' : 'Todavía no lo completó.'}
          </p>
        )}
        <Link to={`/cuestionario/${clienteId}`} className={`${styles.botonLink} ${styles.botonSecundario}`}>
          {cuestionario ? 'Ver y editar' : 'Completarlo con el cliente'}
        </Link>
      </div>

      <div className={styles.seccion}>
        <h2>Check-ins semanales</h2>
        {checkins.length === 0 ? (
          <p className={styles.textoApagado}>Todavía no hizo ninguno.</p>
        ) : (
          <>
            {!checkins.some((c) => c.semana === estaSemana) && (
              <p className={styles.textoApagado}>Falta el de esta semana.</p>
            )}
            <TablaCheckins checkins={checkins} clienteId={clienteId} />
          </>
        )}
        <Link to={`/checkins/${clienteId}`} className={`${styles.botonLink} ${styles.botonSecundario}`}>
          Ver todos
        </Link>
      </div>
    </>
  )
}
