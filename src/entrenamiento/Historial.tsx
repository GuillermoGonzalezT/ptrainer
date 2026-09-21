import { useParams } from 'react-router'
import { Encabezado } from '../components/Encabezado.tsx'
import { Aviso, Boton } from '../components/Formulario.tsx'
import { obtenerCliente } from '../datos/clientes.ts'
import { listarSesiones } from '../datos/sesiones.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { ListaSesiones } from './ListaSesiones.tsx'

// /historial (el cliente, sus sesiones) y /clientes/:id/sesiones (el
// entrenador, las de un cliente). RF-46.
export function Historial() {
  const { id } = useParams()
  const { datos, error, cargando, recargar } = useConsulta(
    async () => ({
      sesiones: await listarSesiones(id, 200),
      cliente: id ? await obtenerCliente(id) : null,
    }),
    [id],
  )

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={datos?.cliente ? `Sesiones de ${datos.cliente.nombre}` : 'Historial'}
        volver={id ? { to: `/clientes/${id}`, etiqueta: 'la ficha' } : undefined}
      />
      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}
      {datos && datos.sesiones.length === 0 && (
        <div className={pantalla.vacio}>
          <p>{id ? 'Todavía no registró ninguna sesión.' : 'Todavía no registraste ningún entrenamiento. Empezá uno desde Hoy.'}</p>
        </div>
      )}
      {datos && datos.sesiones.length > 0 && <ListaSesiones sesiones={datos.sesiones} />}
    </section>
  )
}
