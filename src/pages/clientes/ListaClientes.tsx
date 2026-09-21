import { useState } from 'react'
import { Link } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import { etiquetaEstado, etiquetaModalidad, listarClientes, type Cliente, type EstadoCliente } from '../../datos/clientes.ts'
import { normalizar } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import styles from '../../styles/pantalla.module.css'

type Filtro = EstadoCliente | 'todos'

const filtros: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'activo', etiqueta: 'Activos' },
  { valor: 'pausado', etiqueta: 'Pausados' },
  { valor: 'baja', etiqueta: 'Baja' },
  { valor: 'todos', etiqueta: 'Todos' },
]

// RF-10. La lista completa llega de una vez y se filtra en el teléfono: un
// entrenador tiene decenas de clientes, no miles.
export function ListaClientes() {
  const { datos: clientes, error, cargando, recargar } = useConsulta(listarClientes, [])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activo')

  const texto = normalizar(busqueda.trim())
  const visibles = (clientes ?? []).filter(
    (c) => (filtro === 'todos' || c.estado === filtro) && (!texto || normalizar(c.nombre).includes(texto)),
  )

  return (
    <section className={styles.pantalla}>
      <Encabezado
        titulo="Clientes"
        accion={
          <Link to="/clientes/nuevo" className={`${styles.botonLink} ${styles.botonChico}`}>
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

      {clientes && clientes.length === 0 && (
        <div className={styles.vacio}>
          <p>Todavía no tenés clientes. Agregá el primero y mandale la invitación.</p>
          <Link to="/clientes/nuevo" className={styles.botonLink}>
            Agregar cliente
          </Link>
        </div>
      )}

      {clientes && clientes.length > 0 && (
        <>
          <input
            type="search"
            className={styles.buscador}
            placeholder="Buscar por nombre"
            aria-label="Buscar cliente por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Segmentos etiqueta="Filtrar por estado" opciones={filtros} valor={filtro} onCambio={setFiltro} />
          {visibles.length === 0 ? (
            <p className={styles.textoApagado}>Ningún cliente coincide.</p>
          ) : (
            <ul className={styles.lista}>
              {visibles.map((c) => (
                <li key={c.id}>
                  <FilaCliente cliente={c} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {cargando && !error && <p className={styles.textoApagado}>Cargando…</p>}
    </section>
  )
}

function FilaCliente({ cliente }: { cliente: Cliente }) {
  return (
    <Link to={`/clientes/${cliente.id}`} className={styles.fila}>
      <span className={styles.inicial} aria-hidden="true">
        {cliente.nombre.trim()[0]?.toUpperCase()}
      </span>
      <span className={styles.filaTexto}>
        <span className={styles.filaNombre}>{cliente.nombre}</span>
        <span className={styles.filaDetalle}>
          {etiquetaModalidad[cliente.modalidad]}
          {!cliente.usuario_id && ' · Sin cuenta'}
        </span>
      </span>
      {cliente.estado !== 'activo' && <span className={styles.etiqueta}>{etiquetaEstado[cliente.estado]}</span>}
    </Link>
  )
}
