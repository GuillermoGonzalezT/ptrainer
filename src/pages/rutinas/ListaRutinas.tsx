import { useState } from 'react'
import { Link } from 'react-router'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarPlantillas, type RutinaEnLista } from '../../datos/rutinas.ts'
import { formatearDias } from '../../lib/prescripcion.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'

// Las plantillas del entrenador (RF-31). Las rutinas de cada cliente se ven
// en su ficha.
export function ListaRutinas() {
  const { datos: plantillas, error, cargando, recargar } = useConsulta(listarPlantillas, [])
  const [verArchivadas, setVerArchivadas] = useState(false)

  const visibles = (plantillas ?? []).filter((p) => p.archivada === verArchivadas)
  const archivadas = (plantillas ?? []).filter((p) => p.archivada).length

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={verArchivadas ? 'Plantillas archivadas' : 'Plantillas'}
        accion={
          <Link to="/rutinas/nueva" className={`${pantalla.botonLink} ${pantalla.botonChico}`}>
            Nueva
          </Link>
        }
      />
      <p className={pantalla.textoApagado}>
        Armá una rutina una vez y asignala a varios clientes. Las rutinas de cada cliente están en su ficha.
      </p>
      <Link to="/programas" className={pantalla.fila}>
        <span className={pantalla.filaTexto}>
          <span className={pantalla.filaNombre}>Programas</span>
          <span className={pantalla.filaDetalle}>Varias semanas seguidas, con progresión de carga</span>
        </span>
        <span aria-hidden="true">›</span>
      </Link>

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {plantillas && plantillas.length === 0 && (
        <div className={pantalla.vacio}>
          <p>Todavía no tenés plantillas.</p>
          <Link to="/rutinas/nueva" className={pantalla.botonLink}>
            Crear la primera
          </Link>
        </div>
      )}

      {visibles.length > 0 && (
        <ul className={pantalla.lista}>
          {visibles.map((r) => (
            <li key={r.id}>
              <FilaRutina rutina={r} />
            </li>
          ))}
        </ul>
      )}
      {(archivadas > 0 || verArchivadas) && (
        <Boton type="button" variante="secundario" onClick={() => setVerArchivadas(!verArchivadas)}>
          {verArchivadas ? 'Volver a las plantillas' : `Ver archivadas (${archivadas})`}
        </Boton>
      )}
    </section>
  )
}

export function FilaRutina({ rutina, to }: { rutina: RutinaEnLista; to?: string }) {
  return (
    <Link to={to ?? `/rutinas/${rutina.id}`} className={pantalla.fila}>
      <span className={pantalla.filaTexto}>
        <span className={pantalla.filaNombre}>{rutina.nombre}</span>
        <span className={pantalla.filaDetalle}>
          {rutina.ejercicios === 1 ? '1 ejercicio' : `${rutina.ejercicios} ejercicios`} ·{' '}
          {formatearDias(rutina.dias_semana, true)}
        </span>
      </span>
      {rutina.archivada && <span className={pantalla.etiqueta}>Archivada</span>}
    </Link>
  )
}
