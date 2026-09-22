import { useState } from 'react'
import { Link } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { equipamientos, gruposMusculares, listarEjercicios, type EjercicioEnLista } from '../../datos/ejercicios.ts'
import { normalizar } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

// RF-20. Como con los clientes, la biblioteca llega entera y se filtra acá.
export function ListaEjercicios() {
  const { datos: ejercicios, error, cargando, recargar } = useConsulta(listarEjercicios, [])
  const [busqueda, setBusqueda] = useState('')
  const [grupo, setGrupo] = useState('')
  const [equipo, setEquipo] = useState('')
  const [verArchivados, setVerArchivados] = useState(false)

  const texto = normalizar(busqueda.trim())
  const coincide = (e: EjercicioEnLista) =>
    (!grupo || e.grupo_muscular === grupo) &&
    (!equipo || e.equipamiento === equipo) &&
    (!texto || normalizar(e.nombre).includes(texto))
  // Los propios y los de la biblioteca base (RF-24) van en listas separadas.
  const propios = (ejercicios ?? []).filter((e) => e.entrenador_id !== null && e.archivado === verArchivados && coincide(e))
  const base = (ejercicios ?? []).filter((e) => e.entrenador_id === null && coincide(e))
  const archivados = (ejercicios ?? []).filter((e) => e.archivado).length
  const tienePropios = (ejercicios ?? []).some((e) => e.entrenador_id !== null)

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo={verArchivados ? 'Archivados' : 'Ejercicios'}
        accion={
          <Link to="/ejercicios/nuevo" className={`${styles.botonLink} ${styles.botonChico}`}>
            Agregar
          </Link>
        }
      />

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}

      {ejercicios && !tienePropios && (
        <div className={styles.vacio}>
          <p>
            Todavía no tenés ejercicios propios. Podés usar los de la biblioteca base, o copiar uno y grabarle tu
            video.
          </p>
          <Link to="/ejercicios/nuevo" className={styles.botonLink}>
            Agregar ejercicio
          </Link>
        </div>
      )}

      {ejercicios && ejercicios.length > 0 && (
        <>
          <input
            type="search"
            className={styles.buscador}
            placeholder="Buscar por nombre"
            aria-label="Buscar ejercicio por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className={styles.buscador}
            aria-label="Filtrar por grupo muscular"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
          >
            <option value="">Todos los grupos musculares</option>
            {gruposMusculares.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className={styles.buscador}
            aria-label="Filtrar por equipamiento"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
          >
            <option value="">Todo el equipamiento</option>
            {equipamientos.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          {tienePropios && (
            <>
              <h2 className={styles.subtitulo}>{verArchivados ? 'Archivados' : 'Tuyos'}</h2>
              {propios.length === 0 ? (
                <p className={styles.textoApagado}>Ninguno coincide.</p>
              ) : (
                <Lista ejercicios={propios} />
              )}
            </>
          )}
          {(archivados > 0 || verArchivados) && (
            <Boton type="button" variante="secundario" onClick={() => setVerArchivados(!verArchivados)}>
              {verArchivados ? 'Volver a la biblioteca' : `Ver archivados (${archivados})`}
            </Boton>
          )}
          {!verArchivados && (
            <>
              <h2 className={styles.subtitulo}>Biblioteca base</h2>
              <p className={styles.textoApagado}>
                Vienen con la app y no se editan. Podés usarlos en tus rutinas, o copiar uno para ajustarlo y grabarle
                tu video.
              </p>
              {base.length === 0 ? (
                <p className={styles.textoApagado}>Ninguno coincide.</p>
              ) : (
                <Lista ejercicios={base} />
              )}
            </>
          )}
        </>
      )}

      {cargando && !error && <p className={styles.textoApagado}>Cargando…</p>}
    </section>
  )
}

function Lista({ ejercicios }: { ejercicios: EjercicioEnLista[] }) {
  return (
    <ul className={styles.lista}>
      {ejercicios.map((e) => (
        <li key={e.id}>
          <FilaEjercicio ejercicio={e} />
        </li>
      ))}
    </ul>
  )
}

function FilaEjercicio({ ejercicio }: { ejercicio: EjercicioEnLista }) {
  const detalle = [ejercicio.grupo_muscular, ejercicio.equipamiento].filter(Boolean).join(' · ')
  return (
    <Link to={`/ejercicios/${ejercicio.id}`} className={styles.fila}>
      <span className={styles.filaTexto}>
        <span className={styles.filaNombre}>{ejercicio.nombre}</span>
        {detalle && <span className={styles.filaDetalle}>{detalle}</span>}
      </span>
      {ejercicio.entrenador_id !== null && (
        <span className={styles.etiqueta}>
          {ejercicio.videos === 0 ? 'Sin video' : ejercicio.videos === 1 ? '1 video' : `${ejercicio.videos} videos`}
        </span>
      )}
    </Link>
  )
}
