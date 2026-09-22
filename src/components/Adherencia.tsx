import { listarRutinasDeCliente } from '../datos/rutinas.ts'
import { listarSesiones } from '../datos/sesiones.ts'
import { SEMANAS, semanasRecientes, type Semana } from '../lib/adherencia.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import styles from './Adherencia.module.css'

const fechaCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

// RF-63: sesiones hechas contra planificadas, por semana. Lo planificado sale
// de los días fijos de las rutinas activas de hoy.
export function Adherencia({ clienteId }: { clienteId: string }) {
  const { datos } = useConsulta(async () => {
    const [rutinas, sesiones] = await Promise.all([listarRutinasDeCliente(clienteId), listarSesiones(clienteId, 200)])
    const planificadas = rutinas.filter((r) => !r.archivada).reduce((total, r) => total + r.dias_semana.length, 0)
    return { planificadas, semanas: semanasRecientes(sesiones.map((s) => s.iniciada_en)) }
  }, [clienteId])

  if (!datos) return null
  return <GraficaAdherencia planificadas={datos.planificadas} semanas={datos.semanas} />
}

// La parte visual, separada de la carga de datos.
export function GraficaAdherencia({ planificadas, semanas }: { planificadas: number; semanas: Semana[] }) {
  if (planificadas === 0 && semanas.every((s) => s.hechas === 0)) return null

  // Un 20 % de aire arriba, así la línea de lo planificado no queda pegada a los números.
  const maximo = Math.max(planificadas, ...semanas.map((s) => s.hechas), 1) * 1.2
  // Las últimas 4 semanas completas (sin contar la actual, que está en curso).
  const cerradas = semanas.slice(-5, -1)
  const hechas4 = cerradas.reduce((t, s) => t + s.hechas, 0)
  const planificadas4 = planificadas * cerradas.length

  return (
    <div className={pantalla.seccion}>
      <h2>Adherencia</h2>
      {planificadas > 0 ? (
        <p>
          Últimas 4 semanas: <strong>{hechas4}</strong> de {planificadas4} sesiones planificadas (
          {Math.round((hechas4 / planificadas4) * 100)} %).
        </p>
      ) : (
        <p className={pantalla.textoApagado}>Sus rutinas no tienen días fijos, así que se cuentan solo las sesiones hechas.</p>
      )}

      <div className={styles.grafica} role="img" aria-label={`Sesiones por semana en las últimas ${SEMANAS} semanas`}>
        {semanas.map((s, i) => {
          const actual = i === semanas.length - 1
          const etiqueta = planificadas > 0 ? `${s.hechas}/${planificadas}` : String(s.hechas)
          return (
            <div key={s.desde.getTime()} className={styles.columna}>
              <span className={styles.valor}>{etiqueta}</span>
              <div className={styles.carril}>
                {planificadas > 0 && <div className={styles.meta} style={{ bottom: `${(planificadas / maximo) * 100}%` }} />}
                <div className={styles.barra} style={{ height: `${(s.hechas / maximo) * 100}%` }} />
              </div>
              <span className={styles.semana}>{actual ? 'Esta' : fechaCorta.format(s.desde)}</span>
            </div>
          )
        })}
      </div>
      {planificadas > 0 && (
        <p className={pantalla.textoApagado}>
          La línea marca las {planificadas} sesiones por semana de sus rutinas actuales.
        </p>
      )}
    </div>
  )
}
