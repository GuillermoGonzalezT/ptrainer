import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DiasSemana } from '../../components/DiasSemana.tsx'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  agregarRutinaAlPrograma,
  archivarPrograma,
  cambiarRutinaDePrograma,
  crearPrograma,
  guardarPrograma,
  obtenerPrograma,
  quitarRutinaDePrograma,
  type ProgramaCompleto,
  type RutinaDePrograma,
} from '../../datos/programas.ts'
import { listarPlantillas, type Dia, type RutinaEnLista } from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearAjuste, formatearDias } from '../../lib/prescripcion.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './programas.module.css'

// RF-34: se arma el programa (nombre y cuántas semanas) y después se pone
// qué plantilla va en cada semana, con cuánto ajuste de carga.
export function EditorPrograma() {
  const { id } = useParams()
  const { datos, error, cargando, recargar } = useConsulta(
    async () => ({
      programa: id ? await obtenerPrograma(id) : null,
      plantillas: await listarPlantillas(),
    }),
    [id],
  )

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (id && !datos?.programa) return <Aviso tipo="error">Ese programa no existe.</Aviso>

  return (
    <Editor
      programa={datos?.programa ?? null}
      plantillas={(datos?.plantillas ?? []).filter((p) => !p.archivada)}
      recargar={recargar}
    />
  )
}

type PropsEditor = {
  programa: ProgramaCompleto | null
  plantillas: RutinaEnLista[]
  recargar: () => void
}

function Editor({ programa, plantillas, recargar }: PropsEditor) {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(programa?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(programa?.descripcion ?? '')
  const [semanas, setSemanas] = useState(String(programa?.semanas ?? 4))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const cuantas = Number(semanas)
    if (!Number.isInteger(cuantas) || cuantas < 1 || cuantas > 52) {
      setError('Las semanas tienen que ser un número entero entre 1 y 52.')
      return
    }
    setGuardando(true)
    setError(null)
    const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, semanas: cuantas }
    try {
      if (programa) {
        await guardarPrograma(programa.id, datos)
        recargar()
      } else {
        const nuevo = await crearPrograma(datos)
        navigate(`/programas/${nuevo}`, { replace: true })
        return
      }
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  async function archivar() {
    if (!programa) return
    try {
      await archivarPrograma(programa.id, !programa.archivado)
      navigate('/programas')
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={programa ? programa.nombre : 'Nuevo programa'}
        volver={{ to: '/programas', etiqueta: 'programas' }}
      />
      {programa?.archivado && <Aviso tipo="info">Archivado: no aparece entre tus programas.</Aviso>}

      <form className={pantalla.form} onSubmit={guardar}>
        <Campo
          etiqueta="Nombre"
          required
          maxLength={120}
          placeholder="Fuerza 8 semanas, Pretemporada…"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Descripción (opcional)"
          maxLength={2000}
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <Campo
          etiqueta="Semanas"
          inputMode="numeric"
          required
          ayuda="Cuánto dura el programa. Después ponés qué rutina va en cada una."
          value={semanas}
          onChange={(e) => setSemanas(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {programa ? 'Guardar cambios' : 'Crear programa'}
        </Boton>
      </form>

      {programa && (
        <>
          <Semanas programa={programa} plantillas={plantillas} recargar={recargar} />
          <Link to={`/programas/${programa.id}/asignar`} className={pantalla.botonLink}>
            Asignar a clientes
          </Link>
          <Boton type="button" variante="secundario" onClick={archivar}>
            {programa.archivado ? 'Sacar de archivados' : 'Archivar programa'}
          </Boton>
        </>
      )}
    </section>
  )
}

function Semanas({ programa, plantillas, recargar }: { programa: ProgramaCompleto } & Omit<PropsEditor, 'programa'>) {
  const semanas = Array.from({ length: programa.semanas }, (_, i) => i + 1)

  return (
    <div className={pantalla.seccion}>
      <h2>Semanas</h2>
      {plantillas.length === 0 && (
        <Aviso tipo="info">
          Todavía no tenés plantillas. Armá una en Rutinas y después ponela acá.
        </Aviso>
      )}
      {semanas.map((semana) => (
        <Semana
          key={semana}
          semana={semana}
          rutinas={programa.rutinas.filter((r) => r.semana === semana)}
          programaId={programa.id}
          plantillas={plantillas}
          recargar={recargar}
        />
      ))}
    </div>
  )
}

type PropsSemana = {
  semana: number
  rutinas: RutinaDePrograma[]
  programaId: string
  plantillas: RutinaEnLista[]
  recargar: () => void
}

function Semana({ semana, rutinas, programaId, plantillas, recargar }: PropsSemana) {
  const [agregando, setAgregando] = useState(false)
  const [elegida, setElegida] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    const plantilla = plantillas.find((p) => p.id === elegida)
    if (!plantilla) return
    setError(null)
    try {
      await agregarRutinaAlPrograma(programaId, {
        semana,
        plantilla_id: plantilla.id,
        dias_semana: plantilla.dias_semana,
        // La semana 1 va como la plantilla; el ajuste se pone a mano.
        ajuste_carga_pct: 0,
      })
      setElegida('')
      setAgregando(false)
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  const libres = plantillas.filter((p) => !rutinas.some((r) => r.plantilla_id === p.id))

  return (
    <div className={styles.semana}>
      <h3 className={styles.semanaTitulo}>Semana {semana}</h3>
      {rutinas.length === 0 && !agregando && <p className={pantalla.textoApagado}>Sin rutinas.</p>}
      {rutinas.map((r) => (
        <RutinaEnSemana key={r.id} rutina={r} recargar={recargar} />
      ))}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {agregando ? (
        <div className={styles.agregar}>
          <Selector
            etiqueta="Plantilla"
            value={elegida}
            onChange={(e) => setElegida(e.target.value)}
            opciones={[
              { valor: '', etiqueta: 'Elegí una plantilla' },
              ...libres.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
            ]}
          />
          <div className={styles.acciones}>
            <Boton type="button" disabled={!elegida} onClick={agregar}>
              Agregar
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setAgregando(false)}>
              Cancelar
            </Boton>
          </div>
        </div>
      ) : (
        libres.length > 0 && (
          <button type="button" className={styles.agregarLink} onClick={() => setAgregando(true)}>
            + Agregar rutina a la semana {semana}
          </button>
        )
      )}
    </div>
  )
}

function RutinaEnSemana({ rutina, recargar }: { rutina: RutinaDePrograma; recargar: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [dias, setDias] = useState<Dia[]>(rutina.dias_semana)
  const [ajuste, setAjuste] = useState(String(rutina.ajuste_carga_pct))
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const pct = Number(ajuste.replace(',', '.'))
    if (!Number.isFinite(pct) || pct < -50 || pct > 100) {
      setError('El ajuste tiene que ser un número entre -50 y 100.')
      return
    }
    setError(null)
    try {
      await cambiarRutinaDePrograma(rutina.id, { dias_semana: dias, ajuste_carga_pct: pct })
      setAbierto(false)
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  async function quitar() {
    if (!window.confirm(`¿Sacar “${rutina.plantilla.nombre}” de la semana ${rutina.semana}?`)) return
    try {
      await quitarRutinaDePrograma(rutina.id)
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className={styles.rutina}>
      <button type="button" className={styles.rutinaCabecera} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span className={pantalla.filaTexto}>
          <span className={pantalla.filaNombre}>{rutina.plantilla.nombre}</span>
          <span className={pantalla.filaDetalle}>
            {formatearDias(rutina.dias_semana, true)}
            {rutina.ajuste_carga_pct !== 0 && ` · carga ${formatearAjuste(rutina.ajuste_carga_pct)}`}
          </span>
        </span>
        <span className={styles.flecha} aria-hidden="true">
          {abierto ? '▴' : '▾'}
        </span>
      </button>
      {abierto && (
        <div className={styles.rutinaCuerpo}>
          <DiasSemana valor={dias} onCambio={setDias} />
          <Campo
            etiqueta="Ajuste de carga (%)"
            inputMode="decimal"
            ayuda="Sobre la carga de la plantilla. 2,5 sube un 2,5 %; -10 la baja."
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
          />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className={styles.acciones}>
            <Boton type="button" onClick={guardar}>
              Guardar
            </Boton>
            <Boton type="button" variante="secundario" onClick={quitar}>
              Quitar
            </Boton>
          </div>
        </div>
      )}
    </div>
  )
}
