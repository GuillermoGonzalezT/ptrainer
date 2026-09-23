import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo, Selector } from '../../components/Formulario.tsx'
import {
  borrarFranja,
  crearFranja,
  guardarZonaHoraria,
  listarFranjas,
  obtenerZonaHoraria,
  type Franja,
} from '../../datos/agenda.ts'
import { nombreDia, type Dia } from '../../datos/rutinas.ts'
import { formatearHora } from '../../lib/agenda.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import styles from './agenda.module.css'

const DIAS: Dia[] = [1, 2, 3, 4, 5, 6, 7]

// RF-81: las franjas en las que el entrenador atiende. El cliente solo puede
// reservar adentro de estas.
export function Disponibilidad() {
  const { session } = useAuth()
  const entrenadorId = session?.user.id ?? ''
  const { datos, error, cargando, recargar } = useConsulta(
    async () => ({ franjas: await listarFranjas(entrenadorId), zona: await obtenerZonaHoraria(entrenadorId) }),
    [entrenadorId],
  )

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo="Mis horarios" volver={{ to: '/agenda', etiqueta: 'la agenda' }} />
      <p className={pantalla.textoApagado}>
        Tus clientes pueden pedir turno solo dentro de estas franjas, y su reserva te queda pendiente hasta que la
        confirmes. Vos podés agendar cuando quieras, adentro o afuera.
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

      {datos && (
        <>
          <Zona entrenadorId={entrenadorId} zona={datos.zona} alGuardar={recargar} />
          <div className={pantalla.seccion}>
            <h2>Franjas</h2>
            {datos.franjas.length === 0 && <p className={pantalla.textoApagado}>Todavía no pusiste ninguna.</p>}
            {DIAS.filter((d) => datos.franjas.some((f) => f.dia === d)).map((dia) => (
              <div key={dia}>
                <h3 className={styles.diaTitulo}>{nombreDia[dia]}</h3>
                <ul className={pantalla.lista}>
                  {datos.franjas
                    .filter((f) => f.dia === dia)
                    .map((f) => (
                      <li key={f.id}>
                        <FilaFranja franja={f} alBorrar={recargar} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <Agregar alAgregar={recargar} />
        </>
      )}
    </section>
  )
}

function FilaFranja({ franja, alBorrar }: { franja: Franja; alBorrar: () => void }) {
  const [error, setError] = useState<string | null>(null)

  async function borrar() {
    try {
      await borrarFranja(franja.id)
      alBorrar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className={pantalla.fila}>
      <span className={pantalla.filaTexto}>
        <span className={pantalla.filaNombre}>
          {franja.desde.slice(0, 5)} a {franja.hasta.slice(0, 5)}
        </span>
      </span>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <button type="button" className={pantalla.linkPeligro} onClick={borrar}>
        Quitar
      </button>
    </div>
  )
}

function Agregar({ alAgregar }: { alAgregar: () => void }) {
  const [dia, setDia] = useState<Dia>(1)
  const [desde, setDesde] = useState('08:00')
  const [hasta, setHasta] = useState('12:00')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agregar() {
    if (hasta <= desde) {
      setError('La franja tiene que terminar después de empezar.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await crearFranja(dia, desde, hasta)
      alAgregar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <div className={pantalla.seccion}>
      <h2>Agregar franja</h2>
      <Selector
        etiqueta="Día"
        value={String(dia)}
        onChange={(e) => setDia(Number(e.target.value) as Dia)}
        opciones={DIAS.map((d) => ({ valor: String(d), etiqueta: nombreDia[d] }))}
      />
      <div className={styles.dosCampos}>
        <Campo etiqueta="Desde" type="time" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Campo etiqueta="Hasta" type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" cargando={guardando} onClick={agregar}>
        Agregar
      </Boton>
    </div>
  )
}

// La zona horaria decide a qué instante corresponde "los lunes a las 8".
function Zona({ entrenadorId, zona, alGuardar }: { entrenadorId: string; zona: string; alGuardar: () => void }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const delTelefono = Intl.DateTimeFormat().resolvedOptions().timeZone

  async function usarLaDelTelefono() {
    setGuardando(true)
    setError(null)
    try {
      await guardarZonaHoraria(entrenadorId, delTelefono)
      alGuardar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <div className={pantalla.seccion}>
      <h2>Zona horaria</h2>
      <p className={pantalla.textoApagado}>
        {zona} · ahora son las {formatearHora(new Date(), zona)}. Es la hora con la que se leen tus franjas.
      </p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {delTelefono !== zona && (
        <Boton type="button" variante="secundario" cargando={guardando} onClick={usarLaDelTelefono}>
          Usar la de este teléfono ({delTelefono})
        </Boton>
      )}
    </div>
  )
}
