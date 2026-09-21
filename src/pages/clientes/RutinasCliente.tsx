import { useState } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { asignarPlantilla, listarPlantillas, listarRutinasDeCliente } from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { FilaRutina } from '../rutinas/ListaRutinas.tsx'

// Las rutinas de un cliente, dentro de su ficha (RF-32).
export function RutinasCliente({ clienteId }: { clienteId: string }) {
  const { datos: rutinas, error, recargar } = useConsulta(() => listarRutinasDeCliente(clienteId), [clienteId])
  const [eligiendo, setEligiendo] = useState(false)

  const activas = (rutinas ?? []).filter((r) => !r.archivada)
  const archivadas = (rutinas ?? []).filter((r) => r.archivada)

  return (
    <div className={styles.seccion}>
      <h2>Rutinas</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {rutinas && activas.length === 0 && <p className={styles.textoApagado}>Todavía no tiene rutinas.</p>}
      {activas.length > 0 && (
        <ul className={styles.lista}>
          {activas.map((r) => (
            <li key={r.id}>
              <FilaRutina rutina={r} />
            </li>
          ))}
        </ul>
      )}
      {archivadas.length > 0 && (
        <details>
          <summary className={styles.textoApagado}>Archivadas ({archivadas.length})</summary>
          <ul className={styles.lista}>
            {archivadas.map((r) => (
              <li key={r.id}>
                <FilaRutina rutina={r} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {eligiendo ? (
        <ElegirPlantilla
          clienteId={clienteId}
          onListo={() => {
            setEligiendo(false)
            recargar()
          }}
          onCerrar={() => setEligiendo(false)}
        />
      ) : (
        <div className={styles.acciones}>
          <Boton type="button" onClick={() => setEligiendo(true)}>
            Desde plantilla
          </Boton>
          <Link to={`/rutinas/nueva?cliente=${clienteId}`} className={`${styles.botonLink} ${styles.botonSecundario}`}>
            Rutina nueva
          </Link>
        </div>
      )}
    </div>
  )
}

function ElegirPlantilla({ clienteId, onListo, onCerrar }: { clienteId: string; onListo: () => void; onCerrar: () => void }) {
  const { datos: plantillas, error: errorCarga } = useConsulta(listarPlantillas, [])
  const [asignando, setAsignando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disponibles = (plantillas ?? []).filter((p) => !p.archivada)

  async function asignar(plantillaId: string, dias: Parameters<typeof asignarPlantilla>[2]) {
    setAsignando(plantillaId)
    setError(null)
    try {
      // Con los días sugeridos de la plantilla; después se cambian en la copia.
      await asignarPlantilla(plantillaId, [clienteId], dias)
      onListo()
    } catch (e) {
      setError(mensajeDeError(e))
      setAsignando(null)
    }
  }

  return (
    <>
      <p className={styles.textoApagado}>Elegí una plantilla. Se copia y después la podés ajustar para este cliente.</p>
      {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
      {plantillas && disponibles.length === 0 && (
        <p className={styles.textoApagado}>
          No tenés plantillas. <Link to="/rutinas/nueva">Creá una</Link>.
        </p>
      )}
      {disponibles.length > 0 && (
        <ul className={styles.lista}>
          {disponibles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`${styles.fila} ${styles.filaBoton}`}
                disabled={asignando !== null}
                onClick={() => asignar(p.id, p.dias_semana)}
              >
                <span className={styles.filaTexto}>
                  <span className={styles.filaNombre}>{p.nombre}</span>
                  <span className={styles.filaDetalle}>
                    {p.ejercicios === 1 ? '1 ejercicio' : `${p.ejercicios} ejercicios`}
                  </span>
                </span>
                <span className={styles.etiqueta}>{asignando === p.id ? 'Asignando…' : 'Asignar'}</span>
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
