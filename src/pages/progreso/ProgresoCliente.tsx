import { useParams } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso } from '../../components/Formulario.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { ListaEjerciciosRealizados } from './ListaEjerciciosRealizados.tsx'

// /clientes/:id/progreso — el progreso por ejercicio de un cliente, para el
// entrenador (RF-60).
export function ProgresoCliente() {
  const { id = '' } = useParams()
  const { datos: cliente, error } = useConsulta(() => obtenerCliente(id), [id])

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={cliente ? `Progreso de ${cliente.nombre}` : 'Progreso'}
        volver={{ to: `/clientes/${id}`, etiqueta: 'la ficha' }}
      />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <p className={pantalla.textoApagado}>Tocá un ejercicio para ver cómo evolucionó su carga y su volumen.</p>
      <ListaEjerciciosRealizados clienteId={id} />
    </section>
  )
}
