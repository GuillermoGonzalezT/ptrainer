import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { archivarEjercicio, obtenerEjercicio, type Ejercicio } from '../../datos/ejercicios.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { VideosEjercicio } from './VideosEjercicio.tsx'

// La ven el entrenador (con edición) y sus clientes (solo lectura, RF-23).
export function DetalleEjercicio() {
  const { id = '' } = useParams()
  const { session, tipo } = useAuth()
  const { datos: ejercicio, error, cargando, recargar } = useConsulta(() => obtenerEjercicio(id), [id])

  if (cargando) return <p className={styles.textoApagado}>Cargando…</p>
  if (error) {
    return (
      <section className={styles.pantalla}>
        <Aviso tipo="error">{error}</Aviso>
        <Boton type="button" variante="secundario" onClick={recargar}>
          Reintentar
        </Boton>
      </section>
    )
  }

  const volver = tipo === 'entrenador' ? { to: '/ejercicios', etiqueta: 'ejercicios' } : { to: '/', etiqueta: 'inicio' }
  if (!ejercicio) {
    return (
      <section className={styles.pantalla}>
        <Encabezado titulo="No encontrado" volver={volver} />
        <p>Ese ejercicio no existe.</p>
      </section>
    )
  }

  const editable = tipo === 'entrenador' && ejercicio.entrenador_id === session?.user.id

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo={ejercicio.nombre}
        volver={volver}
        accion={
          editable && (
            <Link to={`/ejercicios/${ejercicio.id}/editar`} className={`${styles.botonLink} ${styles.botonChico}`}>
              Editar
            </Link>
          )
        }
      />
      {ejercicio.archivado && (
        <Aviso tipo="info">Archivado: no aparece al armar rutinas nuevas.</Aviso>
      )}
      <VideosEjercicio ejercicioId={ejercicio.id} editable={editable} />
      <Informacion ejercicio={ejercicio} />
      {editable && <Archivar ejercicio={ejercicio} alCambiar={recargar} />}
    </section>
  )
}

function Informacion({ ejercicio }: { ejercicio: Ejercicio }) {
  const detalle = [ejercicio.grupo_muscular, ejercicio.equipamiento].filter(Boolean).join(' · ')
  if (!detalle && !ejercicio.descripcion && !ejercicio.consejos) return null
  return (
    <div className={styles.seccion}>
      {detalle && <p className={styles.textoApagado}>{detalle}</p>}
      {ejercicio.descripcion && (
        <>
          <h2>Cómo se hace</h2>
          <p className={styles.notaTexto}>{ejercicio.descripcion}</p>
        </>
      )}
      {ejercicio.consejos && (
        <>
          <h2>Consejos</h2>
          <p className={styles.notaTexto}>{ejercicio.consejos}</p>
        </>
      )}
    </div>
  )
}

function Archivar({ ejercicio, alCambiar }: { ejercicio: Ejercicio; alCambiar: () => void }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cambiar() {
    setGuardando(true)
    setError(null)
    try {
      await archivarEjercicio(ejercicio.id, !ejercicio.archivado)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <>
      <Boton type="button" variante="secundario" cargando={guardando} onClick={cambiar}>
        {ejercicio.archivado ? 'Sacar de archivados' : 'Archivar ejercicio'}
      </Boton>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </>
  )
}
