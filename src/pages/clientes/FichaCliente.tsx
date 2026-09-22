import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Adherencia } from '../../components/Adherencia.tsx'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import {
  cambiarEstado,
  etiquetaEstado,
  etiquetaModalidad,
  etiquetaNivel,
  obtenerCliente,
  type Cliente,
  type EstadoCliente,
} from '../../datos/clientes.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { edad, formatearFecha } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'
import { FotoCliente } from './FotoCliente.tsx'
import { InvitacionCliente } from './InvitacionCliente.tsx'
import { MetricasCliente } from './MetricasCliente.tsx'
import { NotasCliente } from './NotasCliente.tsx'
import { RutinasCliente } from './RutinasCliente.tsx'
import { SesionesCliente } from './SesionesCliente.tsx'

export function FichaCliente() {
  const { id = '' } = useParams()
  const { datos: cliente, error, cargando, recargar } = useConsulta(() => obtenerCliente(id), [id])

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
  if (!cliente) {
    return (
      <section className={styles.pantalla}>
        <Encabezado titulo="No encontrado" volver={{ to: '/clientes', etiqueta: 'clientes' }} />
        <p>Ese cliente no existe o no es tuyo.</p>
      </section>
    )
  }

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo={cliente.nombre}
        volver={{ to: '/clientes', etiqueta: 'clientes' }}
        accion={
          <Link to={`/clientes/${cliente.id}/editar`} className={`${styles.botonLink} ${styles.botonChico}`}>
            Editar
          </Link>
        }
      />
      <FotoCliente cliente={cliente} alCambiar={recargar} />
      {!cliente.usuario_id && <InvitacionCliente clienteId={cliente.id} nombre={cliente.nombre} />}
      <RutinasCliente clienteId={cliente.id} />
      <Adherencia clienteId={cliente.id} />
      <SesionesCliente clienteId={cliente.id} />
      <MetricasCliente clienteId={cliente.id} />
      <Datos cliente={cliente} />
      <Estado cliente={cliente} alCambiar={recargar} />
      <NotasCliente clienteId={cliente.id} />
    </section>
  )
}

function Datos({ cliente }: { cliente: Cliente }) {
  const filas: [string, string | null][] = [
    ['Modalidad', etiquetaModalidad[cliente.modalidad]],
    ['Nivel', cliente.nivel ? etiquetaNivel[cliente.nivel] : null],
    [
      'Edad',
      cliente.fecha_nacimiento
        ? `${edad(cliente.fecha_nacimiento)} años (${formatearFecha(cliente.fecha_nacimiento)})`
        : null,
    ],
    ['Teléfono', cliente.telefono],
    ['Correo', cliente.email],
    ['Objetivos', cliente.objetivos],
    ['Lesiones', cliente.lesiones],
  ]
  const completas = filas.filter((f): f is [string, string] => f[1] !== null)

  return (
    <div className={styles.seccion}>
      <h2>Ficha</h2>
      <dl className={styles.datos}>
        {completas.map(([etiqueta, valor]) => (
          <div key={etiqueta} style={{ display: 'contents' }}>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {completas.length < filas.length && (
        <p className={styles.textoApagado}>
          Faltan datos. <Link to={`/clientes/${cliente.id}/editar`}>Completar la ficha</Link>
        </p>
      )}
    </div>
  )
}

const opcionesEstado = (Object.keys(etiquetaEstado) as EstadoCliente[]).map((e) => ({
  valor: e,
  etiqueta: etiquetaEstado[e],
}))

const explicacionEstado: Record<EstadoCliente, string> = {
  activo: 'Ve sus rutinas y registra sus sesiones.',
  pausado: 'Sigue entrando a la app, pero no aparece entre tus clientes activos.',
  baja: 'Ya no puede entrar a ver nada. Su historial se guarda, y podés reactivarlo cuando quieras.',
}

// RF-14
function Estado({ cliente, alCambiar }: { cliente: Cliente; alCambiar: () => void }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cambiar(estado: EstadoCliente) {
    if (estado === 'baja' && !window.confirm(`¿Dar de baja a ${cliente.nombre}? Deja de ver sus rutinas.`)) return
    setGuardando(true)
    setError(null)
    try {
      await cambiarEstado(cliente.id, estado)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <div className={styles.seccion}>
      <h2>Estado</h2>
      <Segmentos
        etiqueta="Estado del cliente"
        opciones={opcionesEstado}
        valor={cliente.estado}
        onCambio={cambiar}
        deshabilitado={guardando}
      />
      <p className={styles.textoApagado}>{explicacionEstado[cliente.estado]}</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}
