import type { Prescripcion, RutinaCompleta } from '../datos/rutinas.ts'
import type { SesionARegistrar, UltimaVez } from '../datos/sesiones.ts'

// Una sesión mientras se entrena (RF-41). Vive en el teléfono hasta que se
// guarda: así sobrevive a una recarga, a cerrar la app o a quedarse sin señal.

export type SerieEnCurso = {
  peso: string
  reps: string
  segundos: string
  rpe: string
  hecha: boolean
}

export type EjercicioEnCurso = {
  rutinaEjercicioId: string
  ejercicioId: string
  nombre: string
  prescripcion: Prescripcion
  series: SerieEnCurso[]
}

export type SesionEnCurso = {
  version: 1
  id: string
  rutinaId: string
  clienteId: string
  rutinaNombre: string
  iniciadaEn: string
  actual: number
  ejercicios: EjercicioEnCurso[]
}

const PREFIJO = 'ptrainer.entrenando.'
const clave = (rutinaId: string, clienteId: string) => `${PREFIJO}${clienteId}.${rutinaId}`

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

// Arma la sesión a partir de la rutina. Los kilos arrancan con lo que hizo la
// última vez en esa serie (o la carga indicada), y las repeticiones con el
// objetivo: si hizo eso, solo toca marcar la serie.
export function empezar(rutina: RutinaCompleta, clienteId: string, ultimas: Map<string, UltimaVez>): SesionEnCurso {
  return {
    version: 1,
    id: crypto.randomUUID(),
    rutinaId: rutina.id,
    clienteId,
    rutinaNombre: rutina.nombre,
    iniciadaEn: new Date().toISOString(),
    actual: 0,
    ejercicios: rutina.items.map((item) => {
      const previas = ultimas.get(item.ejercicio.id)?.series ?? []
      return {
        rutinaEjercicioId: item.id,
        ejercicioId: item.ejercicio.id,
        nombre: item.ejercicio.nombre,
        prescripcion: item,
        series: Array.from({ length: item.series }, (_, i) => ({
          peso: texto(previas[i]?.peso_kg ?? previas.at(-1)?.peso_kg ?? item.carga_kg),
          reps: texto(item.reps_max ?? item.reps_min),
          segundos: texto(item.segundos),
          rpe: '',
          hecha: false,
        })),
      }
    }),
  }
}

export function serieVacia(anterior?: SerieEnCurso): SerieEnCurso {
  return {
    peso: anterior?.peso ?? '',
    reps: anterior?.reps ?? '',
    segundos: anterior?.segundos ?? '',
    rpe: '',
    hecha: false,
  }
}

// localStorage puede fallar (navegación privada, sin espacio): en ese caso se
// entrena igual, solo que sin respaldo.
export function guardarLocal(sesion: SesionEnCurso) {
  try {
    localStorage.setItem(clave(sesion.rutinaId, sesion.clienteId), JSON.stringify(sesion))
  } catch {
    // sin respaldo
  }
}

export function leerLocal(rutinaId: string, clienteId: string): SesionEnCurso | null {
  try {
    const guardada = localStorage.getItem(clave(rutinaId, clienteId))
    const sesion = guardada ? (JSON.parse(guardada) as SesionEnCurso) : null
    return sesion?.version === 1 ? sesion : null
  } catch {
    return null
  }
}

export function borrarLocal(rutinaId: string, clienteId: string) {
  try {
    localStorage.removeItem(clave(rutinaId, clienteId))
  } catch {
    // nada que borrar
  }
}

// Para avisar en "Hoy" que quedó algo sin terminar.
export function sesionesSinTerminar(): SesionEnCurso[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .map((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as SesionEnCurso | null)
      .filter((s): s is SesionEnCurso => s?.version === 1)
  } catch {
    return []
  }
}

// Los pasos del entrenamiento: cada ejercicio suelto es un paso, y una
// superserie (RF-33) es un paso con todos sus ejercicios. Devuelve los
// índices de los ejercicios de cada paso. Las sesiones guardadas antes de las
// superseries no traen el dato: van todas sueltas.
export function pasos(sesion: SesionEnCurso): number[][] {
  const resultado: number[][] = []
  sesion.ejercicios.forEach((e, i) => {
    const ss = e.prescripcion.superserie ?? null
    const anterior = resultado.at(-1)
    if (ss !== null && anterior && sesion.ejercicios[anterior[0]].prescripcion.superserie === ss) anterior.push(i)
    else resultado.push([i])
  })
  return resultado
}

export function seriesHechas(sesion: SesionEnCurso): number {
  return sesion.ejercicios.reduce((total, e) => total + e.series.filter((s) => s.hecha).length, 0)
}

class ErrorDeSerie extends Error {}

function numero(valor: string, campo: string, { min, max, entero }: { min: number; max: number; entero?: boolean }) {
  const limpio = valor.trim().replace(',', '.')
  if (!limpio) return null
  const n = Number(limpio)
  if (!Number.isFinite(n) || (entero && !Number.isInteger(n)) || n < min || n > max) {
    throw new ErrorDeSerie(`${campo}: poné ${entero ? 'un número entero' : 'un número'} entre ${min} y ${max}.`)
  }
  return n
}

// Valida una serie al marcarla. Devuelve el mensaje de error, o null si está bien.
export function problemaDeSerie(serie: SerieEnCurso, porTiempo: boolean): string | null {
  try {
    aSerieHecha(serie, porTiempo, 1)
    return null
  } catch (e) {
    if (e instanceof ErrorDeSerie) return e.message
    throw e
  }
}

function aSerieHecha(serie: SerieEnCurso, porTiempo: boolean, n: number) {
  return {
    numero: n,
    peso_kg: numero(serie.peso, 'Kilos', { min: 0, max: 9999 }),
    reps: porTiempo ? null : numero(serie.reps, 'Repeticiones', { min: 0, max: 999, entero: true }),
    segundos: porTiempo ? numero(serie.segundos, 'Segundos', { min: 0, max: 3600, entero: true }) : null,
    rpe: numero(serie.rpe, 'RPE', { min: 1, max: 10 }),
  }
}

export type RecordPersonal = { nombre: string; peso: number; anterior: number }

// RF-62: ejercicios en los que esta sesión superó la carga máxima de todas
// las anteriores. La primera vez con un ejercicio no cuenta como récord.
export function recordsDeLaSesion(sesion: SesionEnCurso, maximosAnteriores: Map<string, number>): RecordPersonal[] {
  const records: RecordPersonal[] = []
  const vistos = new Set<string>()
  for (const e of sesion.ejercicios) {
    if (vistos.has(e.ejercicioId)) continue
    const pesos = sesion.ejercicios
      .filter((x) => x.ejercicioId === e.ejercicioId)
      .flatMap((x) => x.series.filter((s) => s.hecha).map((s) => Number(s.peso.trim().replace(',', '.')) || 0))
    vistos.add(e.ejercicioId)
    const anterior = maximosAnteriores.get(e.ejercicioId)
    const peso = Math.max(0, ...pesos)
    if (anterior !== undefined && anterior > 0 && peso > anterior) records.push({ nombre: e.nombre, peso, anterior })
  }
  return records
}

// Lo que se manda a la base: solo las series marcadas, numeradas de nuevo
// (si se saltó la 2, la 3 pasa a ser la 2).
export function paraRegistrar(sesion: SesionEnCurso, esfuerzo: number | null, comentario: string): SesionARegistrar {
  return {
    id: sesion.id,
    cliente_id: sesion.clienteId,
    rutina_id: sesion.rutinaId,
    rutina_nombre: sesion.rutinaNombre,
    iniciada_en: sesion.iniciadaEn,
    finalizada_en: new Date().toISOString(),
    esfuerzo,
    comentario: comentario.trim() || null,
    series: sesion.ejercicios.flatMap((e, i) =>
      e.series
        .filter((s) => s.hecha)
        .map((s, n) => ({
          ...aSerieHecha(s, e.prescripcion.segundos !== null, n + 1),
          ejercicio_id: e.ejercicioId,
          rutina_ejercicio_id: e.rutinaEjercicioId,
          orden_ejercicio: i + 1,
        })),
    ),
  }
}
