import { useEffect, useState, type FormEvent } from 'react'
import { Link, useBeforeUnload, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { DiasSemana } from '../../components/DiasSemana.tsx'
import { Encabezado } from '../../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import {
  archivarRutina,
  crearRutina,
  guardarRutina,
  obtenerRutina,
  type Dia,
  type RutinaCompleta,
} from '../../datos/rutinas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { desdeGuardado, nuevo, paraGuardar, type Borrador } from './borrador.ts'
import { ItemRutina } from './ItemRutina.tsx'
import styles from './rutinas.module.css'
import { SelectorEjercicio } from './SelectorEjercicio.tsx'

// /rutinas/nueva (plantilla), /rutinas/nueva?cliente=ID (rutina de un
// cliente) y /rutinas/:id (editar cualquiera de las dos). RF-30 a RF-32.
export function EditorRutina() {
  const { id } = useParams()
  const clienteParam = useSearchParams()[0].get('cliente')
  const { datos, error, cargando, recargar } = useConsulta(async () => {
    const rutina = id ? await obtenerRutina(id) : null
    const clienteId = rutina ? rutina.cliente_id : clienteParam
    const cliente = clienteId ? await obtenerCliente(clienteId) : null
    return { rutina, cliente }
  }, [id, clienteParam])

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  if (!datos) return null
  if (id && !datos.rutina) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="No encontrada" volver={{ to: '/rutinas', etiqueta: 'rutinas' }} />
        <p>Esa rutina no existe o no es tuya.</p>
      </section>
    )
  }
  const cliente = datos.cliente ? { id: datos.cliente.id, nombre: datos.cliente.nombre } : null
  // La key cambia cuando la base devuelve ejercicios nuevos (con su id): así
  // el editor arranca de nuevo desde lo guardado y no los vuelve a insertar.
  const firma = datos.rutina ? `${datos.rutina.id}:${datos.rutina.items.map((i) => i.id).join(',')}` : 'nueva'
  return <Editor key={firma} rutina={datos.rutina} cliente={cliente} alGuardar={recargar} />
}

type Props = {
  rutina: RutinaCompleta | null
  cliente: { id: string; nombre: string } | null
  alGuardar: () => void
}

function Editor({ rutina, cliente, alGuardar }: Props) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const [nombre, setNombre] = useState(rutina?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(rutina?.descripcion ?? '')
  const [dias, setDias] = useState<Dia[]>(rutina?.dias_semana ?? [])
  const [items, setItems] = useState<Borrador[]>(() => rutina?.items.map(desdeGuardado) ?? [])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [eligiendo, setEligiendo] = useState(false)
  const [cambios, setCambios] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esPlantilla = !cliente
  const volver = cliente
    ? { to: `/clientes/${cliente.id}`, etiqueta: cliente.nombre }
    : { to: '/rutinas', etiqueta: 'rutinas' }

  // Avisar antes de perder cambios, tanto al navegar dentro de la app como al
  // cerrar o recargar la pestaña.
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      cambios && !guardando && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (bloqueo.state !== 'blocked') return
    if (window.confirm('Tenés cambios sin guardar. ¿Salir igual?')) bloqueo.proceed()
    else bloqueo.reset()
  }, [bloqueo])
  useBeforeUnload((e) => {
    if (cambios) e.preventDefault()
  })

  function marcar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v)
      setCambios(true)
    }
  }

  function cambiarItem(clave: string, parcial: Partial<Borrador>) {
    setItems((actuales) => actuales.map((b) => (b.clave === clave ? { ...b, ...parcial } : b)))
    setCambios(true)
  }

  function mover(indice: number, direccion: -1 | 1) {
    setItems((actuales) => {
      const copia = [...actuales]
      const destino = indice + direccion
      ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
      return copia
    })
    setCambios(true)
  }

  function quitar(clave: string) {
    setItems((actuales) => actuales.filter((b) => b.clave !== clave))
    setCambios(true)
  }

  function agregar(ejercicio: { id: string; nombre: string }) {
    const borrador = nuevo(ejercicio)
    setItems((actuales) => [...actuales, borrador])
    setAbierto(borrador.clave)
    setEligiendo(false)
    setCambios(true)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    const resultado = paraGuardar(items)
    if ('error' in resultado) {
      setError(resultado.error)
      return
    }
    const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, dias_semana: dias }
    setGuardando(true)
    setError(null)
    try {
      const rutinaId = rutina?.id ?? (await crearRutina(session.user.id, cliente?.id ?? null, datos))
      await guardarRutina(rutinaId, datos, resultado.items)
      setCambios(false)
      navigate(`/rutinas/${rutinaId}`, { replace: true, state: { aviso: 'Guardada.' } })
      // Si ya existía, la ruta no cambia: hay que pedir lo guardado a mano.
      if (rutina) alGuardar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  async function alternarArchivo() {
    if (!rutina) return
    if (!rutina.archivada && cliente && !window.confirm(`${cliente.nombre} va a dejar de ver esta rutina. ¿Archivarla?`)) return
    try {
      await archivarRutina(rutina.id, !rutina.archivada)
      navigate(volver.to)
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  const titulo = rutina ? rutina.nombre : esPlantilla ? 'Nueva plantilla' : `Rutina para ${cliente?.nombre}`

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={titulo} volver={volver} />
      {aviso && !cambios && <Aviso tipo="info">{aviso}</Aviso>}
      {rutina?.archivada && <Aviso tipo="info">Archivada: {esPlantilla ? 'no aparece entre tus plantillas.' : 'el cliente no la ve.'}</Aviso>}
      <p className={pantalla.textoApagado}>
        {esPlantilla
          ? 'Una plantilla no es de nadie: se copia a cada cliente al asignarla, y después cada copia se puede ajustar.'
          : `Solo la ve ${cliente?.nombre}.`}
      </p>

      <form className={pantalla.form} onSubmit={guardar}>
        <Campo
          etiqueta="Nombre"
          required
          maxLength={120}
          placeholder="Fuerza A, Tren inferior…"
          value={nombre}
          onChange={(e) => marcar(setNombre)(e.target.value)}
        />
        <AreaDeTexto
          etiqueta="Descripción (opcional)"
          maxLength={2000}
          rows={2}
          value={descripcion}
          onChange={(e) => marcar(setDescripcion)(e.target.value)}
        />
        <DiasSemana
          etiqueta={esPlantilla ? 'Días sugeridos' : 'Días'}
          valor={dias}
          onCambio={marcar(setDias)}
        />

        <div className={styles.encabezadoLista}>
          <h2>Ejercicios</h2>
          <span className={pantalla.textoApagado}>{items.length}</span>
        </div>
        {items.length === 0 && !eligiendo && (
          <p className={pantalla.textoApagado}>Todavía no tiene ejercicios.</p>
        )}
        {items.length > 0 && (
          <ol className={styles.items}>
            {items.map((b, i) => (
              <ItemRutina
                key={b.clave}
                numero={i + 1}
                item={b}
                abierto={abierto === b.clave}
                esPrimero={i === 0}
                esUltimo={i === items.length - 1}
                onAbrir={() => setAbierto(abierto === b.clave ? null : b.clave)}
                onCambio={(parcial) => cambiarItem(b.clave, parcial)}
                onMover={(direccion) => mover(i, direccion)}
                onQuitar={() => quitar(b.clave)}
              />
            ))}
          </ol>
        )}
        {eligiendo ? (
          <SelectorEjercicio onElegir={agregar} onCerrar={() => setEligiendo(false)} />
        ) : (
          <Boton type="button" variante="secundario" onClick={() => setEligiendo(true)}>
            + Agregar ejercicio
          </Boton>
        )}

        <div className={styles.barraGuardar}>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" cargando={guardando} disabled={!!rutina && !cambios}>
            {rutina ? (cambios ? 'Guardar cambios' : 'Sin cambios') : esPlantilla ? 'Crear plantilla' : 'Crear rutina'}
          </Boton>
        </div>
      </form>

      {rutina && !cambios && (
        <div className={pantalla.acciones}>
          {esPlantilla && !rutina.archivada && (
            <Link to={`/rutinas/${rutina.id}/asignar`} className={pantalla.botonLink}>
              Asignar a clientes
            </Link>
          )}
          <Boton type="button" variante="secundario" onClick={alternarArchivo}>
            {rutina.archivada ? 'Sacar de archivadas' : 'Archivar'}
          </Boton>
        </div>
      )}
    </section>
  )
}
