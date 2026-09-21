import { useState, type FormEvent } from 'react'
import { Aviso, Boton, Campo } from '../../components/Formulario.tsx'
import type { Medicion, Metrica } from '../../datos/metricas.ts'
import { mensajeDeError } from '../../lib/errores.ts'
import pantalla from '../../styles/pantalla.module.css'
import { hoyLocal, leerNumero } from './formato.ts'
import styles from './metricas.module.css'

const MAX_INTENTOS = 10

type Props = {
  metrica: Metrica
  // Para editar una medición existente.
  medicion?: Medicion
  onGuardar: (fecha: string, intentos: number[], nota: string | null) => Promise<void>
  onCancelar?: () => void
}

// RF-52: una toma, con uno o varios intentos. Cuál vale lo decide la base.
export function FormularioMedicion({ metrica, medicion, onGuardar, onCancelar }: Props) {
  const [fecha, setFecha] = useState(medicion?.fecha ?? hoyLocal())
  const [intentos, setIntentos] = useState<string[]>(
    medicion ? medicion.intentos.map((v) => String(v).replace('.', ',')) : [''],
  )
  const [nota, setNota] = useState(medicion?.nota ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const escritos = intentos.filter((t) => t.trim() !== '')
    const valores = escritos.map(leerNumero)
    if (valores.length === 0) {
      setError('Anotá al menos un valor.')
      return
    }
    if (valores.some((v) => v === null)) {
      setError('Algún valor no es un número.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(fecha, valores as number[], nota.trim() || null)
      if (!medicion) {
        setIntentos([''])
        setNota('')
      }
    } catch (e) {
      setError(mensajeDeError(e))
    }
    setGuardando(false)
  }

  const ayudaIntentos =
    intentos.length > 1
      ? metrica.mejor === 'mayor'
        ? 'Cuenta el más alto.'
        : metrica.mejor === 'menor'
          ? 'Cuenta el más bajo.'
          : 'Cuenta el último.'
      : null

  return (
    <form className={pantalla.form} onSubmit={guardar}>
      <Campo
        etiqueta="Fecha"
        type="date"
        required
        max={hoyLocal()}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />
      <div className={styles.intentos}>
        <p className={pantalla.etiquetaCampo}>{intentos.length > 1 ? `Intentos (${metrica.unidad})` : `Valor (${metrica.unidad})`}</p>
        <div className={styles.filaIntentos}>
          {intentos.map((t, i) => (
            <input
              key={i}
              className={styles.intento}
              inputMode="decimal"
              aria-label={`Intento ${i + 1}`}
              value={t}
              onChange={(e) => setIntentos(intentos.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          {intentos.length < MAX_INTENTOS && (
            <button type="button" className={styles.masIntento} onClick={() => setIntentos([...intentos, ''])}>
              + intento
            </button>
          )}
        </div>
        {ayudaIntentos && <p className={pantalla.textoApagado}>{ayudaIntentos}</p>}
      </div>
      <Campo etiqueta="Nota (opcional)" maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className={pantalla.acciones}>
        <Boton type="submit" cargando={guardando}>
          {medicion ? 'Guardar' : 'Agregar medición'}
        </Boton>
        {onCancelar && (
          <Boton type="button" variante="secundario" onClick={onCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
  )
}
