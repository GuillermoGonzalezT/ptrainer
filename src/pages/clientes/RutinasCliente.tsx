import { useState } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import {
  borrarAsignacion,
  listarAsignaciones,
  semanaActual,
  type Asignacion,
} from '../../datos/programas.ts'
import { asignarPlantilla, listarPlantillas, listarRutinasDeCliente, type RutinaEnLista } from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { FilaRutina } from '../rutinas/ListaRutinas.tsx'

// Las rutinas de un cliente, dentro de su ficha (RF-32).
export function RutinasCliente({ clienteId }: { clienteId: string }) {
  const { datos, error, recargar } = useConsulta(
    async () => ({
      rutinas: await listarRutinasDeCliente(clienteId),
      asignaciones: await listarAsignaciones(clienteId),
    }),
    [clienteId],
  )
  const [eligiendo, setEligiendo] = useState(false)

  const rutinas = datos?.rutinas
  const activas = (rutinas ?? []).filter((r) => !r.archivada)
  const archivadas = (rutinas ?? []).filter((r) => r.archivada)
  // Las de un programa se muestran aparte, agrupadas por semana (RF-34).
  const sueltas = activas.filter((r) => r.asignacion_id === null)

  return (
    <div className={styles.seccion}>
      <h2>Rutinas</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {rutinas && activas.length === 0 && <p className={styles.textoApagado}>Todavía no tiene rutinas.</p>}
      {sueltas.length > 0 && (
        <ul className={styles.lista}>
          {sueltas.map((r) => (
            <li key={r.id}>
              <FilaRutina rutina={r} />
            </li>
          ))}
        </ul>
      )}
      {(datos?.asignaciones ?? []).map((a) => (
        <Programa
          key={a.id}
          asignacion={a}
          rutinas={activas.filter((r) => r.asignacion_id === a.id)}
          alQuitar={recargar}
        />
      ))}
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

// Un programa asignado, semana por semana, con la que corre hoy marcada.
function Programa({
  asignacion,
  rutinas,
  alQuitar,
}: {
  asignacion: Asignacion
  rutinas: RutinaEnLista[]
  alQuitar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const actual = semanaActual(asignacion)
  const semanas = [...new Set(rutinas.map((r) => r.semana ?? 0))].sort((a, b) => a - b)

  async function quitar() {
    const aviso = `¿Sacarle el programa “${asignacion.nombre}”? Se borran sus ${rutinas.length} rutinas y lo que no haya entrenado todavía.`
    if (!window.confirm(aviso)) return
    try {
      await borrarAsignacion(asignacion.id)
      alQuitar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className={styles.seccion}>
      <h3>{asignacion.nombre}</h3>
      <p className={styles.textoApagado}>
        {actual === null
          ? `${asignacion.semanas} semanas · arranca el ${formatearFecha(asignacion.inicia_el)}`
          : `Semana ${actual} de ${asignacion.semanas}`}
      </p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {semanas.map((semana) => (
        <div key={semana}>
          <h4 className={styles.textoApagado}>
            Semana {semana}
            {semana === actual && ' · ahora'}
          </h4>
          <ul className={styles.lista}>
            {rutinas
              .filter((r) => r.semana === semana)
              .map((r) => (
                <li key={r.id}>
                  <FilaRutina rutina={r} />
                </li>
              ))}
          </ul>
        </div>
      ))}
      <Boton type="button" variante="secundario" onClick={quitar}>
        Sacarle este programa
      </Boton>
    </div>
  )
}
