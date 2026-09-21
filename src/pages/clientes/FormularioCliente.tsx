import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  actualizarCliente,
  crearCliente,
  etiquetaModalidad,
  etiquetaNivel,
  obtenerCliente,
  type Cliente,
  type DatosCliente,
  type Modalidad,
  type Nivel,
} from '../../datos/clientes.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

// Alta (/clientes/nuevo) y edición (/clientes/:id/editar) de la ficha (RF-11).
export function FormularioCliente() {
  const { id } = useParams()
  const { datos: cliente, error, cargando } = useConsulta(
    () => (id ? obtenerCliente(id) : Promise.resolve(null)),
    [id],
  )

  if (id && cargando) return <p className={styles.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (id && !cliente) return <Aviso tipo="error">Ese cliente no existe.</Aviso>
  // La key reinicia el formulario si se pasa de un cliente a otro.
  return <Formulario key={id ?? 'nuevo'} cliente={cliente ?? null} />
}

const opcionesModalidad = (Object.keys(etiquetaModalidad) as Modalidad[]).map((m) => ({
  valor: m,
  etiqueta: etiquetaModalidad[m],
}))

const opcionesNivel = [
  { valor: '', etiqueta: 'Sin definir' },
  ...(Object.keys(etiquetaNivel) as Nivel[]).map((n) => ({ valor: n, etiqueta: etiquetaNivel[n] })),
]

// Texto vacío se guarda como null, no como "".
const oNull = (texto: string) => texto.trim() || null

function Formulario({ cliente }: { cliente: Cliente | null }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [email, setEmail] = useState(cliente?.email ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [nacimiento, setNacimiento] = useState(cliente?.fecha_nacimiento ?? '')
  const [modalidad, setModalidad] = useState<Modalidad>(cliente?.modalidad ?? 'presencial')
  const [nivel, setNivel] = useState<Nivel | ''>(cliente?.nivel ?? '')
  const [objetivos, setObjetivos] = useState(cliente?.objetivos ?? '')
  const [lesiones, setLesiones] = useState(cliente?.lesiones ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const volverA = cliente ? `/clientes/${cliente.id}` : '/clientes'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const datos: DatosCliente = {
      nombre: nombre.trim(),
      email: oNull(email),
      telefono: oNull(telefono),
      fecha_nacimiento: nacimiento || null,
      modalidad,
      nivel: nivel || null,
      objetivos: oNull(objetivos),
      lesiones: oNull(lesiones),
    }
    setGuardando(true)
    setError(null)
    try {
      if (cliente) {
        await actualizarCliente(cliente.id, datos)
        navigate(volverA, { replace: true })
      } else {
        const nuevoId = await crearCliente(session.user.id, datos)
        navigate(`/clientes/${nuevoId}`, { replace: true })
      }
    } catch (e) {
      setError(mensajeDeError(e))
      setGuardando(false)
    }
  }

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo={cliente ? 'Editar ficha' : 'Nuevo cliente'}
        volver={{ to: volverA, etiqueta: cliente ? 'la ficha' : 'clientes' }}
      />
      <form className={styles.form} onSubmit={guardar}>
        <Campo
          etiqueta="Nombre y apellido"
          required
          maxLength={100}
          autoComplete="off"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Selector
          etiqueta="Modalidad"
          opciones={opcionesModalidad}
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value as Modalidad)}
        />
        <Campo
          etiqueta="Teléfono"
          type="tel"
          inputMode="tel"
          maxLength={30}
          autoComplete="off"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <Campo
          etiqueta="Correo"
          type="email"
          inputMode="email"
          maxLength={254}
          autoComplete="off"
          ayuda="Solo de contacto. La cuenta la crea el cliente con la invitación."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Fecha de nacimiento"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={nacimiento}
          onChange={(e) => setNacimiento(e.target.value)}
        />
        <Selector
          etiqueta="Nivel"
          opciones={opcionesNivel}
          value={nivel}
          onChange={(e) => setNivel(e.target.value as Nivel | '')}
        />
        <AreaDeTexto
          etiqueta="Objetivos"
          maxLength={2000}
          value={objetivos}
          onChange={(e) => setObjetivos(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Lesiones y restricciones"
          maxLength={2000}
          ayuda="El cliente puede ver su ficha. Lo que sea solo para vos, anotalo en las notas privadas."
          value={lesiones}
          onChange={(e) => setLesiones(e.target.value)}
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" cargando={guardando}>
          {cliente ? 'Guardar cambios' : 'Crear cliente'}
        </Boton>
      </form>
    </section>
  )
}
