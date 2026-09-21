import { useState } from 'react'
import { Link } from 'react-router'
import { Aviso, Boton } from '../../components/Formulario.tsx'
import { listarEjercicios } from '../../datos/ejercicios.ts'
import { normalizar } from '../../lib/formato.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './rutinas.module.css'

type Props = {
  onElegir: (ejercicio: { id: string; nombre: string }) => void
  onCerrar: () => void
}

// Buscador de la biblioteca para agregar un ejercicio. Los archivados no
// aparecen (RF-21).
export function SelectorEjercicio({ onElegir, onCerrar }: Props) {
  const { datos, error } = useConsulta(listarEjercicios, [])
  const [busqueda, setBusqueda] = useState('')

  const texto = normalizar(busqueda.trim())
  const visibles = (datos ?? []).filter(
    (e) =>
      !e.archivado &&
      (!texto || normalizar(e.nombre).includes(texto) || normalizar(e.grupo_muscular ?? '').includes(texto)),
  )

  return (
    <div className={styles.selector}>
      <div className={styles.selectorCabecera}>
        <input
          type="search"
          className={pantalla.buscador}
          placeholder="Buscar ejercicio o grupo muscular"
          aria-label="Buscar ejercicio"
          // Se abre para escribir: el foco va directo al buscador.
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {datos && visibles.length === 0 && (
        <p className={pantalla.textoApagado}>
          {datos.length === 0 ? (
            <>
              Tu biblioteca está vacía. <Link to="/ejercicios/nuevo">Agregá ejercicios</Link> primero.
            </>
          ) : (
            'Ningún ejercicio coincide.'
          )}
        </p>
      )}
      {visibles.length > 0 && (
        <ul className={pantalla.lista}>
          {visibles.map((e) => (
            <li key={e.id}>
              <button type="button" className={`${pantalla.fila} ${styles.opcion}`} onClick={() => onElegir(e)}>
                <span className={pantalla.filaTexto}>
                  <span className={pantalla.filaNombre}>{e.nombre}</span>
                  {e.grupo_muscular && <span className={pantalla.filaDetalle}>{e.grupo_muscular}</span>}
                </span>
                <span aria-hidden="true">＋</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
