import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  actualizarEjercicio,
  crearEjercicio,
  equipamientos,
  gruposMusculares,
  obtenerEjercicio,
  type DatosEjercicio,
  type Ejercicio,
} from '../../datos/ejercicios.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

// Alta (/ejercicios/nuevo) y edición (/ejercicios/:id/editar) (RF-21).
export function FormularioEjercicio() {
  const { id } = useParams()
  const { datos: ejercicio, error, cargando } = useConsulta(
    () => (id ? obtenerEjercicio(id) : Promise.resolve(null)),
    [id],
  )

  if (id && cargando) return <p className={styles.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (id && !ejercicio) return <Aviso tipo="error">Ese ejercicio no existe.</Aviso>
  return <Formulario key={id ?? 'nuevo'} ejercicio={ejercicio ?? null} />
}

const opciones = (lista: string[]) => [
  { valor: '', etiqueta: 'Sin definir' },
  ...lista.map((v) => ({ valor: v, etiqueta: v })),
]

const oNull = (texto: string) => texto.trim() || null

function Formulario({ ejercicio }: { ejercicio: Ejercicio | null }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(ejercicio?.nombre ?? '')
  const [grupo, setGrupo] = useState(ejercicio?.grupo_muscular ?? '')
  const [equipamiento, setEquipamiento] = useState(ejercicio?.equipamiento ?? '')
  const [descripcion, setDescripcion] = useState(ejercicio?.descripcion ?? '')
  const [consejos, setConsejos] = useState(ejercicio?.consejos ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const volverA = ejercicio ? `/ejercicios/${ejercicio.id}` : '/ejercicios'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const datos: DatosEjercicio = {
      nombre: nombre.trim(),
      grupo_muscular: grupo || null,
      equipamiento: equipamiento || null,
      descripcion: oNull(descripcion),
      consejos: oNull(consejos),
    }
    setGuardando(true)
    setError(null)
    try {
      if (ejercicio) {
        await actualizarEjercicio(ejercicio.id, datos)
        navigate(volverA, { replace: true })
      } else {
        // Al crear se va al detalle, que es donde se suben los videos.
        const nuevoId = await crearEjercicio(session.user.id, datos)
        navigate(`/ejercicios/${nuevoId}`, { replace: true })
      }
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo={ejercicio ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        volver={{ to: volverA, etiqueta: ejercicio ? 'el ejercicio' : 'ejercicios' }}
      />
      <form className={styles.form} onSubmit={guardar}>
        <Campo
          etiqueta="Nombre"
          required
          maxLength={120}
          autoComplete="off"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Selector
          etiqueta="Grupo muscular"
          opciones={opciones(gruposMusculares)}
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
        />
        <Selector
          etiqueta="Equipamiento"
          opciones={opciones(equipamientos)}
          value={equipamiento}
          onChange={(e) => setEquipamiento(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Cómo se hace"
          maxLength={5000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Consejos técnicos"
          maxLength={5000}
          ayuda="Errores comunes, en qué fijarse. El cliente los ve junto al video."
          value={consejos}
          onChange={(e) => setConsejos(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {ejercicio ? 'Guardar cambios' : 'Crear y agregar videos'}
        </Boton>
      </form>
    </section>
  )
}
