import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Encabezado } from '../components/Encabezado.tsx'
import { AreaDeTexto, Aviso, Boton } from '../components/Formulario.tsx'
import { borrarDevolucion, borrarSesion, guardarDevolucion, obtenerSesion, type SesionCompleta } from '../datos/sesiones.ts'
import { mensajeDeError } from '../lib/errores.ts'
import { formatearFechaHora } from '../lib/formato.ts'
import { useConsulta } from '../lib/useConsulta.ts'
import pantalla from '../styles/pantalla.module.css'
import { conUnidad } from '../pages/metricas/formato.ts'
import type { RecordPersonal } from './enCurso.ts'
import { formatearDuracion, formatearSerie } from './formato.ts'
import styles from './entrenamiento.module.css'

// Una sesión registrada (RF-46) con la devolución del entrenador (RF-61).
export function DetalleSesion() {
  const { id = '' } = useParams()
  const { session, tipo } = useAuth()
  const navigate = useNavigate()
  const estado = useLocation().state as { aviso?: string; records?: RecordPersonal[] } | null
  const aviso = estado?.aviso
  const records = estado?.records ?? []
  const { datos: sesion, error, cargando, recargar } = useConsulta(() => obtenerSesion(id), [id])
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)

  if (cargando) return <p className={pantalla.textoApagado}>Cargando…</p>
  if (error) return <Aviso tipo="error">{error}</Aviso>
  const esEntrenador = tipo === 'entrenador'
  const volver = esEntrenador && sesion ? { to: `/clientes/${sesion.cliente_id}/sesiones`, etiqueta: 'las sesiones' } : { to: '/historial', etiqueta: 'el historial' }
  if (!sesion) {
    return (
      <section className={pantalla.pantalla}>
        <Encabezado titulo="No encontrada" volver={volver} />
        <p>Esa sesión no existe.</p>
      </section>
    )
  }

  const registradaPorOtro = sesion.registrada_por !== null && sesion.registrada_por !== session?.user.id

  async function borrar() {
    if (!window.confirm('¿Borrar esta sesión? No se puede deshacer.')) return
    try {
      await borrarSesion(id)
      navigate(volver.to, { replace: true })
    } catch (e) {
      setErrorBorrar(mensajeDeError(e))
    }
  }

  return (
    <section className={pantalla.pantalla}>
      <Encabezado titulo={sesion.rutina_nombre} volver={volver} />
      {aviso && <Aviso tipo="info">{aviso}</Aviso>}
      {records.length > 0 && (
        <div className={styles.records} role="status">
          <strong>{records.length === 1 ? '¡Nuevo récord!' : `¡${records.length} récords nuevos!`}</strong>
          <ul>
            {records.map((r) => (
              <li key={r.nombre}>
                {r.nombre}: {conUnidad(r.peso, 'kg')}
                <span className={pantalla.textoApagado}> (antes {conUnidad(r.anterior, 'kg')})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={pantalla.seccion}>
        <dl className={pantalla.datos}>
          {esEntrenador && sesion.cliente && (
            <>
              <dt>Cliente</dt>
              <dd>
                <Link to={`/clientes/${sesion.cliente_id}`}>{sesion.cliente.nombre}</Link>
              </dd>
            </>
          )}
          <dt>Fecha</dt>
          <dd>{formatearFechaHora(sesion.iniciada_en)}</dd>
          {sesion.finalizada_en && (
            <>
              <dt>Duración</dt>
              <dd>{formatearDuracion(sesion.iniciada_en, sesion.finalizada_en)}</dd>
            </>
          )}
          {sesion.esfuerzo !== null && (
            <>
              <dt>Esfuerzo</dt>
              <dd>{sesion.esfuerzo}/10</dd>
            </>
          )}
          {registradaPorOtro && (
            <>
              <dt>Registrada</dt>
              <dd>{esEntrenador ? 'por el cliente' : 'por tu entrenador'}</dd>
            </>
          )}
        </dl>
        {sesion.comentario && <p className={pantalla.notaTexto}>“{sesion.comentario}”</p>}
      </div>

      <div className={pantalla.seccion}>
        <h2>Lo que hizo</h2>
        {sesion.ejercicios.length === 0 && <p className={pantalla.textoApagado}>Sin series registradas.</p>}
        <dl className={pantalla.datos}>
          {sesion.ejercicios.map((e, i) => (
            <div key={`${i}-${e.ejercicio_id}`} style={{ display: 'contents' }}>
              <dt>{e.nombre}</dt>
              <dd>
                {e.series.map((s) => (
                  <span key={s.numero} style={{ display: 'block' }}>
                    {formatearSerie(s)}
                    {s.rpe !== null && <span className={pantalla.textoApagado}> · RPE {String(s.rpe).replace('.', ',')}</span>}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Devolucion sesion={sesion} editable={esEntrenador} alCambiar={recargar} />

      {errorBorrar && <Aviso tipo="error">{errorBorrar}</Aviso>}
      <button type="button" className={pantalla.linkPeligro} style={{ alignSelf: 'center' }} onClick={borrar}>
        Borrar sesión
      </button>
    </section>
  )
}

function Devolucion({ sesion, editable, alCambiar }: { sesion: SesionCompleta; editable: boolean; alCambiar: () => void }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(sesion.devolucion?.texto ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editable && !sesion.devolucion) return null

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const limpio = texto.trim()
      if (limpio) await guardarDevolucion(sesion.id, limpio, sesion.devolucion !== null)
      else if (sesion.devolucion) await borrarDevolucion(sesion.id)
      setEditando(false)
      alCambiar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  return (
    <div className={pantalla.seccion}>
      <h2>{editable ? 'Tu devolución' : 'Devolución de tu entrenador'}</h2>
      {editando ? (
        <>
          <AreaDeTexto
            etiqueta="Devolución"
            maxLength={2000}
            ayuda="El cliente la ve en su historial."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className={pantalla.acciones}>
            <Boton type="button" cargando={guardando} onClick={guardar}>
              Guardar
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)}>
              Cancelar
            </Boton>
          </div>
        </>
      ) : (
        <>
          {sesion.devolucion ? (
            <p className={pantalla.notaTexto}>{sesion.devolucion.texto}</p>
          ) : (
            <p className={pantalla.textoApagado}>Todavía no le dejaste una devolución.</p>
          )}
          {editable && (
            <Boton type="button" variante="secundario" onClick={() => setEditando(true)}>
              {sesion.devolucion ? 'Editar' : 'Escribir devolución'}
            </Boton>
          )}
        </>
      )}
    </div>
  )
}
