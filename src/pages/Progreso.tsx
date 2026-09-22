import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Adherencia } from '../components/Adherencia.tsx'
import { Encabezado } from '../components/Encabezado.tsx'
import { Aviso, Boton } from '../components/Formulario.tsx'
import { listarMetricasDeCliente } from '../datos/metricas.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { ListaSeguimientos } from './metricas/ListaSeguimientos.tsx'
import { ListaEjerciciosRealizados } from './progreso/ListaEjerciciosRealizados.tsx'

// El progreso del cliente: sus métricas (RF-54) y sus ejercicios (RF-60).
export function Progreso() {
  const { rol } = useAuth()
  const { datos: asignaciones, error, cargando, recargar } = useConsulta(() => listarMetricasDeCliente(), [])
  // Con un solo entrenador hay una sola ficha activa; con varios (fase 3),
  // acá habrá que elegir de cuál.
  const ficha = rol?.fichas.find((f) => f.estado !== 'baja')

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
      {ficha && <Adherencia clienteId={ficha.id} />}
      <h2 className={pantalla.subtitulo}>Métricas</h2>
      {asignaciones && asignaciones.length === 0 && (
        <p className={pantalla.textoApagado}>
          Cuando tu entrenador te asigne métricas (salto, peso, tiempos…), vas a ver acá cómo evolucionan.
        </p>
      )}
      {asignaciones && asignaciones.length > 0 && <ListaSeguimientos asignaciones={asignaciones} />}

      {ficha && (
        <p>
          <Link to={`/checkins/${ficha.id}`}>Ver mis check-ins semanales</Link>
        </p>
      )}

      <h2 className={pantalla.subtitulo}>Ejercicios</h2>
      {ficha && <ListaEjerciciosRealizados clienteId={ficha.id} />}
    </section>
  )
}
