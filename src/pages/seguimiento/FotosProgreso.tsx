import { useId, useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { Encabezado } from '../../components/Encabezado.tsx'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import { obtenerCliente } from '../../datos/clientes.ts'
import {
  borrarFotoProgreso,
  fechasConFotos,
  listarFotosProgreso,
  subirFotoProgreso,
  VISTAS,
  type FotoProgreso,
  type Vista,
} from '../../datos/fotosProgreso.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import { formatearFecha } from '../../lib/formato.ts'
import { ErrorDeFoto, prepararFoto } from '../../lib/prepararFoto.ts'
import { useConsulta } from '../../lib/useConsulta.ts'
import pantalla from '../../styles/pantalla.module.css'
import { hoyLocal } from '../metricas/formato.ts'
import styles from './fotos.module.css'

// RF-64: fotos de frente, perfil y espalda con fecha, y comparación de dos
// fechas lado a lado. Las ven solo el cliente y su entrenador.
export function FotosProgreso() {
  const { clienteId = '' } = useParams()
  const { session, rol, tipo } = useAuth()
  const esEntrenador = tipo === 'entrenador'
  const { datos, error, cargando, recargar } = useConsulta(
    async () => ({
      fotos: await listarFotosProgreso(clienteId),
      cliente: esEntrenador ? await obtenerCliente(clienteId) : null,
    }),
    [clienteId, esEntrenador],
  )
  const [vista, setVista] = useState<'galeria' | 'comparar'>('galeria')

  // La carpeta es siempre la del entrenador de ese cliente.
  const entrenadorId = esEntrenador ? session?.user.id : rol?.fichas.find((f) => f.id === clienteId)?.entrenador_id
  const volver = esEntrenador ? { to: `/clientes/${clienteId}`, etiqueta: 'la ficha' } : { to: '/progreso', etiqueta: 'progreso' }
  const fotos = datos?.fotos ?? []

  return (
    <section className={pantalla.pantalla}>
      <Encabezado
        titulo={datos?.cliente ? `Fotos de ${datos.cliente.nombre}` : 'Fotos de progreso'}
        volver={volver}
      />
      <p className={pantalla.textoApagado}>
        Las ven solo {esEntrenador ? 'vos y tu cliente' : 'vos y tu entrenador'}. Para comparar bien, sacalas siempre
        con luz parecida y desde el mismo lugar.
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

      {entrenadorId && <Subir clienteId={clienteId} entrenadorId={entrenadorId} alSubir={recargar} />}

      {fotos.length > 0 && (
        <>
          <Segmentos
            etiqueta="Cómo ver las fotos"
            opciones={[
              { valor: 'galeria', etiqueta: 'Galería' },
              { valor: 'comparar', etiqueta: 'Comparar' },
            ]}
            valor={vista}
            onCambio={setVista}
          />
          {vista === 'galeria' ? <Galeria fotos={fotos} alBorrar={recargar} /> : <Comparar fotos={fotos} />}
        </>
      )}
      {datos && fotos.length === 0 && (
        <p className={pantalla.textoApagado}>Todavía no hay fotos.</p>
      )}
    </section>
  )
}

function Subir({ clienteId, entrenadorId, alSubir }: { clienteId: string; entrenadorId: string; alSubir: () => void }) {
  const idArchivo = useId()
  const [vista, setVista] = useState<Vista>('frente')
  const [fecha, setFecha] = useState(hoyLocal())
  const [nota, setNota] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegida(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    setError(null)
    try {
      const foto = await prepararFoto(archivo, 'completa')
      await subirFotoProgreso(entrenadorId, clienteId, { fecha, vista, nota: nota.trim() || null }, foto)
      setNota('')
      alSubir()
    } catch (e) {
      setError(e instanceof ErrorDeFoto ? e.message : mensajeDeError(e))
    }
    setSubiendo(false)
  }

  return (
    <div className={pantalla.seccion}>
      <h2>Agregar foto</h2>
      <Segmentos etiqueta="Vista" opciones={VISTAS} valor={vista} onCambio={setVista} />
      <Campo etiqueta="Fecha" type="date" max={hoyLocal()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <Campo etiqueta="Nota (opcional)" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
      <label htmlFor={idArchivo} className={pantalla.botonLink} aria-disabled={subiendo}>
        {subiendo ? 'Subiendo…' : 'Sacar o elegir foto'}
      </label>
      <input
        id={idArchivo}
        className={styles.oculto}
        type="file"
        accept="image/*"
        disabled={subiendo}
        onChange={elegida}
      />
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}

function Galeria({ fotos, alBorrar }: { fotos: FotoProgreso[]; alBorrar: () => void }) {
  const [error, setError] = useState<string | null>(null)

  async function borrar(foto: FotoProgreso) {
    if (!window.confirm('¿Borrar esta foto?')) return
    try {
      await borrarFotoProgreso(foto)
      alBorrar()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {fechasConFotos(fotos).map((fecha) => (
        <div key={fecha} className={pantalla.seccion}>
          <h2>{formatearFecha(fecha)}</h2>
          <div className={styles.grilla}>
            {fotos
              .filter((f) => f.fecha === fecha)
              .map((foto) => (
                <figure key={foto.id} className={styles.foto}>
                  <Imagen foto={foto} />
                  <figcaption className={styles.pie}>
                    <span>{VISTAS.find((v) => v.valor === foto.vista)?.etiqueta}</span>
                    <button type="button" className={pantalla.linkPeligro} onClick={() => borrar(foto)}>
                      Borrar
                    </button>
                  </figcaption>
                  {foto.nota && <p className={pantalla.textoApagado}>{foto.nota}</p>}
                </figure>
              ))}
          </div>
        </div>
      ))}
    </>
  )
}

function Comparar({ fotos }: { fotos: FotoProgreso[] }) {
  const fechas = fechasConFotos(fotos)
  const [derecha, setDerecha] = useState(fechas[0])
  const [izquierda, setIzquierda] = useState(fechas.at(-1) ?? fechas[0])

  if (fechas.length < 2) {
    return <p className={pantalla.textoApagado}>Con fotos de dos fechas distintas se pueden comparar.</p>
  }

  const selector = (valor: string, onCambio: (v: string) => void, etiqueta: string) => (
    <label className={styles.selector}>
      {etiqueta}
      <select className={pantalla.buscador} value={valor} onChange={(e) => onCambio(e.target.value)}>
        {fechas.map((f) => (
          <option key={f} value={f}>
            {formatearFecha(f)}
          </option>
        ))}
      </select>
    </label>
  )

  const conAlguna = VISTAS.filter((v) =>
    fotos.some((f) => f.vista === v.valor && (f.fecha === izquierda || f.fecha === derecha)),
  )

  return (
    <div className={pantalla.seccion}>
      <div className={styles.selectores}>
        {selector(izquierda, setIzquierda, 'Antes')}
        {selector(derecha, setDerecha, 'Después')}
      </div>
      {conAlguna.length === 0 && <p className={pantalla.textoApagado}>No hay fotos en esas dos fechas.</p>}
      {conAlguna.map((v) => (
        <div key={v.valor}>
          <h3 className={styles.vista}>{v.etiqueta}</h3>
          <div className={styles.comparacion}>
            {[izquierda, derecha].map((fecha, i) => {
              const foto = fotos.find((f) => f.vista === v.valor && f.fecha === fecha)
              return (
                <figure key={i} className={styles.foto}>
                  {foto ? <Imagen foto={foto} /> : <p className={styles.sinFoto}>Sin foto</p>}
                  <figcaption className={pantalla.textoApagado}>{formatearFecha(fecha)}</figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Imagen({ foto }: { foto: FotoProgreso }) {
  if (!foto.url) return <p className={styles.sinFoto}>No se pudo cargar</p>
  return (
    <img
      className={styles.imagen}
      src={foto.url}
      alt={`${VISTAS.find((v) => v.valor === foto.vista)?.etiqueta} del ${formatearFecha(foto.fecha)}`}
      loading="lazy"
    />
  )
}
