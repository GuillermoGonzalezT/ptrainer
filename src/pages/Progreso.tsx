import { Encabezado } from '../components/Encabezado.tsx'
import { Aviso, Boton } from '../components/Formulario.tsx'
import { listarMetricasDeCliente } from '../datos/metricas.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { ListaSeguimientos } from './metricas/ListaSeguimientos.tsx'

// El progreso del cliente: sus métricas (RF-54). Las gráficas por ejercicio
// (RF-60) se suman acá.
export function Progreso() {
  const { datos: asignaciones, error, cargando, recargar } = useConsulta(() => listarMetricasDeCliente(), [])

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo="Progreso" />
      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}
      {asignaciones && asignaciones.length === 0 && (
        <div className={pantalla.vacio}>
          <p>Cuando tu entrenador te asigne métricas (salto, peso, tiempos…), vas a ver acá cómo evolucionan.</p>
        </div>
      )}
      {asignaciones && asignaciones.length > 0 && (
        <>
          <h2 className={pantalla.subtitulo}>Métricas</h2>
          <ListaSeguimientos asignaciones={asignaciones} />
        </>
      )}
    </section>
  )
}
