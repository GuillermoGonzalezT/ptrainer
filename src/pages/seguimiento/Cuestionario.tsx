import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import { guardarCuestionario, obtenerCuestionario, PREGUNTAS_PARQ, type Respuestas } from '../../datos/seguimiento.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './seguimiento.module.css'

// RF-13: antecedentes de salud (PAR-Q), experiencia y disponibilidad. Lo
// completa el cliente al sumarse, o el entrenador con él.
export function Cuestionario() {
  const { clienteId = '' } = useParams()
  const { tipo } = useAuth()
  const { datos, error, cargando } = useConsulta(
    async () => ({
      cuestionario: await obtenerCuestionario(clienteId),
      cliente: tipo === 'entrenador' ? await obtenerCliente(clienteId) : null,
    }),
    [clienteId, tipo],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  const volver = tipo === 'entrenador' ? { to: `/clientes/${clienteId}`, etiqueta: 'la ficha' } : { to: '/', etiqueta: 'hoy' }
  return (
    <Formulario
      clienteId={clienteId}
      nombre={datos?.cliente?.nombre ?? null}
      inicial={datos?.cuestionario?.respuestas ?? {}}
      volver={volver}
    />
  )
}

type Props = {
  clienteId: string
  nombre: string | null
  inicial: Respuestas
  volver: { to: string; etiqueta: string }
}

const siNo = [
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no', etiqueta: 'No' },
]

function Formulario({ clienteId, nombre, inicial, volver }: Props) {
  const navigate = useNavigate()
  const [parq, setParq] = useState<(boolean | null)[]>(
    () => PREGUNTAS_PARQ.map((_, i) => inicial.parq?.[i] ?? null),
  )
  const [detalleParq, setDetalleParq] = useState(inicial.detalleParq ?? '')
  const [experiencia, setExperiencia] = useState(inicial.experiencia ?? '')
  const [disponibilidad, setDisponibilidad] = useState(inicial.disponibilidad ?? '')
  const [lesiones, setLesiones] = useState(inicial.lesiones ?? '')
  const [otros, setOtros] = useState(inicial.otros ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const algunSi = parq.some((r) => r === true)
  const completo = parq.every((r) => r !== null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await guardarCuestionario(
        clienteId,
        {
          parq,
          detalleParq: detalleParq.trim() || undefined,
          experiencia: experiencia.trim() || undefined,
          disponibilidad: disponibilidad.trim() || undefined,
          lesiones: lesiones.trim() || undefined,
          otros: otros.trim() || undefined,
        },
        completo,
      )
      navigate(volver.to, { replace: true })
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={nombre ? `Cuestionario de ${nombre}` : 'Cuestionario inicial'} volver={volver} />
      <p className={pantalla.textoApagado}>
        {nombre
          ? 'Lo puede completar el cliente desde su cuenta, o vos con él.'
          : 'Sirve para que tu entrenador sepa de dónde partís y entrene seguro. Lo ven solo vos y tu entrenador.'}
      </p>

      <form className={pantalla.form} onSubmit={guardar}>
        <div className={pantalla.seccion}>
          <h2>Antecedentes de salud</h2>
          {PREGUNTAS_PARQ.map((pregunta, i) => (
            <div key={pregunta} className={styles.pregunta}>
              <p className={styles.enunciado}>{pregunta}</p>
              <div className={styles.siNo}>
                <Segmentos
                  etiqueta={pregunta}
                  opciones={siNo}
                  valor={parq[i] === null ? '' : parq[i] ? 'si' : 'no'}
                  onCambio={(v) => setParq(parq.map((r, j) => (j === i ? v === 'si' : r)))}
                />
              </div>
            </div>
          ))}
          {algunSi && (
            <>
              <p className={styles.aviso}>
                Con alguna respuesta afirmativa, conviene consultar con un profesional de la salud antes de empezar o
                de aumentar la actividad física.
              </p>
              <AreaDeTexto
                etiqueta="Contá un poco más"
                maxLength={2000}
                ayuda="Qué te pasó, desde cuándo, qué te indicaron."
                value={detalleParq}
                onChange={(e) => setDetalleParq(e.target.value)}
              />
            </>
          )}
        </div>

        <AreaDeTexto
          etiqueta="Experiencia entrenando"
          maxLength={2000}
          ayuda="Cuánto tiempo, qué hacías, hace cuánto que no entrenás."
          value={experiencia}
          onChange={(e) => setExperiencia(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Disponibilidad"
          maxLength={2000}
          ayuda="Qué días y en qué horarios podés entrenar."
          value={disponibilidad}
          onChange={(e) => setDisponibilidad(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Lesiones o molestias"
          maxLength={2000}
          value={lesiones}
          onChange={(e) => setLesiones(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Algo más que quieras contar"
          maxLength={2000}
          value={otros}
          onChange={(e) => setOtros(e.target.value)}
        />

        {!completo && <p className={pantalla.textoApagado}>Podés guardarlo igual y terminarlo después.</p>}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          Guardar
        </Boton>
      </form>
    </section>
  )
}
