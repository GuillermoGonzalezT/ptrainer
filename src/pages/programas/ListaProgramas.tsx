import { useState } from 'react'
import { Link } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarProgramas } from '../../datos/programas.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

// RF-34: los programas del entrenador. Un programa arma varias semanas con
// plantillas; al asignarlo, el cliente recibe todas sus rutinas.
export function ListaProgramas() {
  const { datos: programas, error, cargando, recargar } = useConsulta(listarProgramas, [])
  const [verArchivados, setVerArchivados] = useState(false)

  const visibles = (programas ?? []).filter((p) => p.archivado === verArchivados)
  const archivados = (programas ?? []).filter((p) => p.archivado).length

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={verArchivados ? 'Programas archivados' : 'Programas'}
        volver={{ to: '/rutinas', etiqueta: 'rutinas' }}
        accion={
          <Link to="/programas/nuevo" className={`${pantalla.botonLink} ${pantalla.botonChico}`}>
            Nuevo
          </Link>
        }
      />
      <p className={pantalla.textoApagado}>
        Un programa ordena tus plantillas en semanas, con la progresión de carga que quieras. Al asignarlo, el
        cliente recibe las rutinas de todas las semanas y ve en cuál está.
      </p>

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {programas && programas.length === 0 && (
        <div className={pantalla.vacio}>
          <p>Todavía no tenés programas.</p>
          <Link to="/programas/nuevo" className={pantalla.botonLink}>
            Crear el primero
          </Link>
        </div>
      )}

      {visibles.length > 0 && (
        <ul className={pantalla.lista}>
          {visibles.map((p) => (
            <li key={p.id}>
              <Link to={`/programas/${p.id}`} className={pantalla.fila}>
                <span className={pantalla.filaTexto}>
                  <span className={pantalla.filaNombre}>{p.nombre}</span>
                  <span className={pantalla.filaDetalle}>
                    {p.semanas === 1 ? '1 semana' : `${p.semanas} semanas`} ·{' '}
                    {p.rutinas === 1 ? '1 rutina' : `${p.rutinas} rutinas`}
                  </span>
                </span>
                {p.archivado && <span className={pantalla.etiqueta}>Archivado</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(archivados > 0 || verArchivados) && (
        <Boton type="button" variante="secundario" onClick={() => setVerArchivados(!verArchivados)}>
          {verArchivados ? 'Volver a los programas' : `Ver archivados (${archivados})`}
        </Boton>
      )}
    </section>
  )
}
