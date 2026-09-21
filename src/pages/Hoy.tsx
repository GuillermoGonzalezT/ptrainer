import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Aviso, Boton } from '../components/Formulario.tsx'
import { diaDeHoy, misRutinas, nombreDia, type RutinaEnLista } from '../datos/rutinas.ts'
import { formatearDias } from '../lib/prescripcion.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import styles from './Hoy.module.css'

// RF-40: lo que le toca hoy arriba; el resto, abajo para elegir.
export function Hoy() {
  const { rol } = useAuth()
  const { datos: rutinas, error, cargando, recargar } = useConsulta(misRutinas, [])
  const hoy = diaDeHoy()

  const deHoy = (rutinas ?? []).filter((r) => r.dias_semana.includes(hoy))
  const libres = (rutinas ?? []).filter((r) => r.dias_semana.length === 0)
  const otras = (rutinas ?? []).filter((r) => r.dias_semana.length > 0 && !r.dias_semana.includes(hoy))
  const primerNombre = rol?.nombre.trim().split(' ')[0]

  return (
    <section className={pantalla.pantalla}>
      <div>
        <h1 className={styles.saludo}>{primerNombre ? `Hola, ${primerNombre}` : 'Hoy'}</h1>
        <p className={pantalla.textoApagado}>{nombreDia[hoy]}</p>
      </div>

      {error && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <Boton type="button" variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </>
      )}
      {cargando && !error && <p className={pantalla.textoApagado}>Cargando…</p>}

      {rutinas && rutinas.length === 0 && (
        <div className={pantalla.vacio}>
          <p>Tu entrenador todavía no te asignó rutinas. Cuando lo haga, las vas a ver acá.</p>
        </div>
      )}

      {rutinas && rutinas.length > 0 && (
        <>
          {deHoy.length > 0 ? (
            <div className={styles.grupo}>
              <h2 className={styles.titulo}>Te toca hoy</h2>
              {deHoy.map((r) => (
                <TarjetaRutina key={r.id} rutina={r} destacada />
              ))}
            </div>
          ) : (
            <p className={styles.descanso}>
              {libres.length > 0 ? 'Hoy no tenés nada fijo: elegí una rutina.' : 'Hoy no te toca entrenar. ¡A descansar!'}
            </p>
          )}
          {libres.length > 0 && (
            <div className={styles.grupo}>
              <h2 className={styles.titulo}>Cuando quieras</h2>
              {libres.map((r) => (
                <TarjetaRutina key={r.id} rutina={r} />
              ))}
            </div>
          )}
          {otras.length > 0 && (
            <div className={styles.grupo}>
              <h2 className={styles.titulo}>Otros días</h2>
              {otras.map((r) => (
                <TarjetaRutina key={r.id} rutina={r} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function TarjetaRutina({ rutina, destacada = false }: { rutina: RutinaEnLista; destacada?: boolean }) {
  return (
    <Link to={`/rutina/${rutina.id}`} className={destacada ? `${styles.tarjeta} ${styles.destacada}` : styles.tarjeta}>
      <span className={styles.tarjetaNombre}>{rutina.nombre}</span>
      <span className={styles.tarjetaDetalle}>
        {rutina.ejercicios === 1 ? '1 ejercicio' : `${rutina.ejercicios} ejercicios`}
        {rutina.dias_semana.length > 0 && ` · ${formatearDias(rutina.dias_semana, true)}`}
      </span>
    </Link>
  )
}
