import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { GraficaEvolucion } from '../../components/GraficaEvolucion.tsx'
import {
  actualizarMedicion,
  borrarMedicion,
  cambiarPermisoDeCarga,
  crearMedicion,
  guardarObjetivo,
  mejorMarca,
  obtenerMetricaDeCliente,
  quitarAsignacion,
  recordsDeMetrica,
  valorDeIntentos,
  type Medicion,
  type MetricaDeClienteCompleta,
} from '../../datos/metricas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import estilosRutinas from '../rutinas/rutinas.module.css'
import { conUnidad, describirCambio, leerNumero } from './formato.ts'
import { FormularioMedicion } from './FormularioMedicion.tsx'
import styles from './metricas.module.css'

// /seguimiento/:id — una métrica de un cliente: evolución (RF-54) y
// mediciones (RF-52, RF-53). La usan el entrenador y el cliente.
export function Seguimiento() {
  const { id = '' } = useParams()
  const { session, tipo } = useAuth()
  const { datos, error, cargando, recargar } = useConsulta(() => obtenerMetricaDeCliente(id), [id])

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  const esEntrenador = tipo === 'entrenador'
  if (!datos) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="No encontrada" volver={{ to: esEntrenador ? '/clientes' : '/progreso', etiqueta: 'atrás' }} />
        <p>Esa métrica no existe o ya no está asignada.</p>
      </section>
    )
  }
  return <Contenido datos={datos} esEntrenador={esEntrenador} uid={session?.user.id} alCambiar={recargar} />
}

type Props = {
  datos: MetricaDeClienteCompleta
  esEntrenador: boolean
  uid: string | undefined
  alCambiar: () => void
}

function Contenido({ datos, esEntrenador, uid, alCambiar }: Props) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { metrica, mediciones } = datos
  const records = recordsDeMetrica(metrica, mediciones)
  const volver = esEntrenador
    ? { to: `/clientes/${datos.cliente_id}`, etiqueta: datos.cliente.nombre }
    : { to: '/progreso', etiqueta: 'progreso' }
  const puedeCargar = esEntrenador || datos.cliente_puede_cargar
  // RF-53: el cliente edita o borra solo las que cargó él.
  const puedeEditar = (m: Medicion) => esEntrenador || (datos.cliente_puede_cargar && m.registrada_por === uid)

  const ultima = mediciones.at(-1)
  const anterior = mediciones.at(-2)
  const mejor = mejorMarca(metrica, mediciones)
  const cambio = ultima && anterior ? describirCambio(metrica, ultima.valor, anterior.valor) : null

  async function hacer(accion: () => Promise<void>) {
    setError(null)
    try {
      await accion()
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  async function quitar() {
    const n = mediciones.length
    const aviso = n === 0 ? '' : ` Se borran también sus ${n === 1 ? 'una medición' : `${n} mediciones`}.`
    if (!window.confirm(`¿Quitarle “${metrica.nombre}” a ${datos.cliente.nombre}?${aviso}`)) return
    try {
      await quitarAsignacion(datos.id)
      navigate(`/clientes/${datos.cliente_id}`, { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={metrica.nombre} volver={volver} />
      {aviso && (
        <p className={styles.record} role="status">
          {aviso}
        </p>
      )}
      <p className={pantalla.textoApagado}>
        {esEntrenador && `${datos.cliente.nombre} · `}
        <Link to={`/metricas/${metrica.id}`}>Cómo se mide</Link>
      </p>

      {ultima ? (
        <div className={styles.resumen}>
          <div className={styles.dato}>
            <span className={styles.datoEtiqueta}>Última</span>
            <span className={styles.datoValor}>{conUnidad(ultima.valor, metrica.unidad)}</span>
            {cambio && (
              <span className={styles.cambio}>
                {cambio.sentido !== 'neutro' && (
                  <span className={`${styles.flecha} ${styles[cambio.sentido]}`} aria-hidden="true">
                    {cambio.sentido === 'mejora' ? '▲' : '▼'}
                  </span>
                )}
                {cambio.texto} vs. la anterior
                {cambio.sentido !== 'neutro' && <span className={styles.oculto}> ({cambio.sentido === 'mejora' ? 'mejoró' : 'empeoró'})</span>}
              </span>
            )}
          </div>
          {mejor && (
            <div className={styles.dato}>
              <span className={styles.datoEtiqueta}>Mejor marca</span>
              <span className={styles.datoValor}>{conUnidad(mejor.valor, metrica.unidad)}</span>
              <span className={pantalla.textoApagado}>{formatearFecha(mejor.fecha)}</span>
            </div>
          )}
          {datos.objetivo !== null && (
            <div className={styles.dato}>
              <span className={styles.datoEtiqueta}>Objetivo</span>
              <span className={styles.datoValor}>{conUnidad(datos.objetivo, metrica.unidad)}</span>
              <span className={pantalla.textoApagado}>{distanciaAlObjetivo(metrica, ultima.valor, datos.objetivo)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className={pantalla.textoApagado}>Todavía no hay mediciones.</p>
      )}

      {mediciones.length > 1 && (
        <div className={pantalla.seccion}>
          <h2>Evolución</h2>
          <GraficaEvolucion
            puntos={mediciones}
            unidad={metrica.unidad}
            referencia={datos.objetivo !== null ? { valor: datos.objetivo, etiqueta: 'Objetivo' } : null}
            descripcion={`${metrica.nombre}${esEntrenador ? ` de ${datos.cliente.nombre}` : ''}`}
          />
        </div>
      )}

      {puedeCargar && (
        <div className={pantalla.seccion}>
          <h2>Nueva medición</h2>
          <FormularioMedicion
            metrica={metrica}
            // Sin `hacer`: si falla, el error lo muestra el formulario y no se borra lo escrito.
            onGuardar={async (fecha, intentos, nota) => {
              await crearMedicion(datos.id, fecha, intentos, nota)
              // RF-62: si superó la mejor marca, se festeja.
              const valor = valorDeIntentos(metrica, intentos)
              const esRecord = mejor !== null && (metrica.mejor === 'mayor' ? valor > mejor.valor : valor < mejor.valor)
              setAviso(esRecord ? `¡Nuevo récord! ${conUnidad(valor, metrica.unidad)} supera la mejor marca anterior.` : null)
              alCambiar()
            }}
          />
        </div>
      )}

      {mediciones.length > 0 && (
        <div className={pantalla.seccion}>
          <h2>Mediciones</h2>
          <ul className={pantalla.notas}>
            {[...mediciones].reverse().map((m) =>
              editando === m.id ? (
                <li key={m.id} className={pantalla.nota}>
                  <FormularioMedicion
                    metrica={metrica}
                    medicion={m}
                    onGuardar={async (fecha, intentos, nota) => {
                      await actualizarMedicion(m.id, fecha, intentos, nota)
                      setEditando(null)
                      alCambiar()
                    }}
                    onCancelar={() => setEditando(null)}
                  />
                </li>
              ) : (
                <li key={m.id} className={pantalla.nota}>
                  <div className={styles.medicion}>
                    <strong>
                      {conUnidad(m.valor, metrica.unidad)}
                      {records.has(m.id) && <span className={styles.marcaRecord}>Récord</span>}
                    </strong>
                    <span className={pantalla.textoApagado}>{formatearFecha(m.fecha)}</span>
                  </div>
                  {m.intentos.length > 1 && (
                    <span className={pantalla.textoApagado}>
                      Intentos: {m.intentos.map((v) => String(v).replace('.', ',')).join(' · ')}
                    </span>
                  )}
                  {m.nota && <p className={pantalla.notaTexto}>{m.nota}</p>}
                  <div className={pantalla.notaPie}>
                    <span>
                      {m.registrada_por === uid ? 'La cargaste vos' : esEntrenador ? 'La cargó el cliente' : 'La cargó tu entrenador'}
                    </span>
                    {puedeEditar(m) && (
                      <span>
                        <button type="button" className={styles.accionTexto} onClick={() => setEditando(m.id)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={pantalla.linkPeligro}
                          onClick={() => window.confirm('¿Borrar esta medición?') && hacer(() => borrarMedicion(m.id))}
                        >
                          Borrar
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {error && <Aviso tipo="error">{error}</Aviso>}

      {esEntrenador && (
        <div className={pantalla.seccion}>
          <label className={estilosRutinas.casilla}>
            <input
              type="checkbox"
              checked={datos.cliente_puede_cargar}
              onChange={(e) => hacer(() => cambiarPermisoDeCarga(datos.id, e.target.checked))}
            />
            {datos.cliente.nombre} puede cargar sus propias mediciones
          </label>
          <Objetivo
            actual={datos.objetivo}
            unidad={metrica.unidad}
            onGuardar={(valor) => hacer(() => guardarObjetivo(datos.id, valor))}
          />
          <button type="button" className={pantalla.linkPeligro} style={{ alignSelf: 'flex-start' }} onClick={quitar}>
            Quitar esta métrica
          </button>
        </div>
      )}
    </section>
  )
}

// "Faltan 5 cm", "¡Alcanzado!" o, si no hay un "mejor", la diferencia.
function distanciaAlObjetivo(metrica: MetricaDeClienteCompleta['metrica'], actual: number, objetivo: number): string {
  const diferencia = objetivo - actual
  const cuanto = conUnidad(Math.abs(Math.round(diferencia * 1000) / 1000), metrica.unidad)
  if (metrica.mejor === 'ninguno') return diferencia === 0 ? 'En el objetivo' : `A ${cuanto}`
  const alcanzado = metrica.mejor === 'mayor' ? actual >= objetivo : actual <= objetivo
  return alcanzado ? '¡Alcanzado!' : `Faltan ${cuanto}`
}

// RF-56: el entrenador fija (o borra) el objetivo de este cliente.
function Objetivo({ actual, unidad, onGuardar }: { actual: number | null; unidad: string; onGuardar: (v: number | null) => Promise<void> }) {
  const [texto, setTexto] = useState(actual === null ? '' : String(actual).replace('.', ','))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valor = leerNumero(texto)
  const sinCambios = valor === actual

  async function guardar() {
    if (texto.trim() && valor === null) {
      setError('Poné un número.')
      return
    }
    setError(null)
    setGuardando(true)
    await onGuardar(valor)
    setGuardando(false)
  }

  return (
    <div className={styles.objetivo}>
      <Campo
        etiqueta={`Objetivo (${unidad})`}
        inputMode="decimal"
        ayuda="Aparece en la gráfica. Dejalo vacío para no tener objetivo."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <Boton type="button" variante="secundario" cargando={guardando} disabled={sinCambios} onClick={guardar}>
        Guardar objetivo
      </Boton>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}
