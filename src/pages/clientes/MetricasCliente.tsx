import { useState } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { asignarMetrica, listarMetricas, listarMetricasDeCliente } from '../../datos/metricas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { ListaSeguimientos } from '../metricas/ListaSeguimientos.tsx'

// Las métricas de un cliente, en su ficha (RF-51, RF-54).
export function MetricasCliente({ clienteId }: { clienteId: string }) {
  const { datos: asignaciones, error, recargar } = useConsulta(() => listarMetricasDeCliente(clienteId), [clienteId])
  const [eligiendo, setEligiendo] = useState(false)

  return (
    <div className={styles.seccion}>
      <h2>Métricas</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {asignaciones && asignaciones.length === 0 && <p className={styles.textoApagado}>Todavía no le asignaste métricas.</p>}
      {asignaciones && asignaciones.length > 0 && <ListaSeguimientos asignaciones={asignaciones} />}
      {eligiendo ? (
        <ElegirMetrica
          clienteId={clienteId}
          yaTiene={new Set(asignaciones?.map((a) => a.metrica.id))}
          onListo={() => {
            setEligiendo(false)
            recargar()
          }}
          onCerrar={() => setEligiendo(false)}
        />
      ) : (
        <Boton type="button" variante="secundario" onClick={() => setEligiendo(true)}>
          + Asignar métrica
        </Boton>
      )}
    </div>
  )
}

type Props = {
  clienteId: string
  yaTiene: Set<string>
  onListo: () => void
  onCerrar: () => void
}

function ElegirMetrica({ clienteId, yaTiene, onListo, onCerrar }: Props) {
  const { datos: metricas, error: errorCarga } = useConsulta(listarMetricas, [])
  const [asignando, setAsignando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disponibles = (metricas ?? []).filter((m) => !m.archivada && !yaTiene.has(m.id))

  async function asignar(metricaId: string) {
    setAsignando(metricaId)
    setError(null)
    try {
      // Por defecto carga solo el entrenador; se habilita desde la métrica.
      await asignarMetrica(metricaId, [clienteId], false)
      onListo()
    } catch (e) {
      setError(mensajeDeError(e))
      setAsignando(null)
    }
  }

  return (
    <>
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
      {metricas && disponibles.length === 0 && (
        <p className={styles.textoApagado}>
          Ya tiene todas. <Link to="/metricas/nueva">Creá una métrica nueva</Link>.
        </p>
      )}
      {disponibles.length > 0 && (
        <ul className={styles.lista}>
          {disponibles.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`${styles.fila} ${styles.filaBoton}`}
                disabled={asignando !== null}
                onClick={() => asignar(m.id)}
              >
                <span className={styles.filaTexto}>
                  <span className={styles.filaNombre}>{m.nombre}</span>
                  <span className={styles.filaDetalle}>
                    {m.unidad}
                    {m.entrenador_id === null && ' · predefinida'}
                  </span>
                </span>
                <span className={styles.etiqueta}>{asignando === m.id ? 'Asignando…' : 'Asignar'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" variante="secundario" onClick={onCerrar}>
        Cancelar
      </Boton>
    </>
  )
}
