import type { EjercicioDeRutina, Intensidad, ItemAGuardar } from '../../datos/rutinas.ts'

// Lo que se edita en pantalla. Los números van como texto para que el campo
// pueda quedar vacío o a medio escribir ("7,") sin pelearse con el teclado.
export type Borrador = {
  clave: string
  id?: string
  ejercicio: { id: string; nombre: string }
  series: string
  modo: 'reps' | 'tiempo'
  repsMin: string
  repsMax: string
  segundos: string
  carga: 'ninguna' | 'kg' | 'pct'
  cargaValor: string
  descanso: string
  rpe: string
  rir: string
  tempo: string
  pedirRpe: boolean
  notas: string
  // Superserie (RF-33): se hace seguido con el ejercicio de abajo.
  unidoConSiguiente: boolean
  // Entrenamiento deportivo (RF-36).
  velocidad: string
  perdidaVel: string
  intensidad: Intensidad | ''
}

const texto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

export function desdeGuardados(items: EjercicioDeRutina[]): Borrador[] {
  // Una rutina vieja puede traer un bloque con 3 series en un ejercicio y 4
  // en otro; se muestra con las del primero, que es como se entrena.
  return normalizarSeries(
    items.map((item, i) => ({
      ...desdeGuardado(item),
      unidoConSiguiente: item.superserie !== null && items[i + 1]?.superserie === item.superserie,
    })),
  )
}

function desdeGuardado(item: EjercicioDeRutina): Omit<Borrador, 'unidoConSiguiente'> {
  return {
    clave: item.id,
    id: item.id,
    ejercicio: { id: item.ejercicio.id, nombre: item.ejercicio.nombre },
    series: String(item.series),
    modo: item.segundos !== null ? 'tiempo' : 'reps',
    repsMin: texto(item.reps_min),
    repsMax: texto(item.reps_max),
    segundos: texto(item.segundos),
    carga: item.carga_kg !== null ? 'kg' : item.carga_pct_1rm !== null ? 'pct' : 'ninguna',
    cargaValor: texto(item.carga_kg ?? item.carga_pct_1rm),
    descanso: texto(item.descanso_s),
    rpe: texto(item.rpe),
    rir: texto(item.rir),
    tempo: item.tempo ?? '',
    pedirRpe: item.pedir_rpe,
    notas: item.notas ?? '',
    velocidad: texto(item.velocidad_ms),
    perdidaVel: texto(item.perdida_vel_pct),
    intensidad: item.intensidad ?? '',
  }
}

// Valores iniciales razonables para un ejercicio recién agregado.
export function nuevo(ejercicio: { id: string; nombre: string }): Borrador {
  return {
    clave: crypto.randomUUID(),
    ejercicio,
    series: '3',
    modo: 'reps',
    repsMin: '10',
    repsMax: '',
    segundos: '',
    carga: 'ninguna',
    cargaValor: '',
    descanso: '90',
    rpe: '',
    rir: '',
    tempo: '',
    pedirRpe: false,
    notas: '',
    unidoConSiguiente: false,
    velocidad: '',
    perdidaVel: '',
    intensidad: '',
  }
}

class ErrorDeCampo extends Error {}

// Acepta coma o punto como separador decimal.
function numero(valor: string, campo: string, { min, max, entero }: { min: number; max: number; entero?: boolean }) {
  const limpio = valor.trim().replace(',', '.')
  if (!limpio) return null
  const n = Number(limpio)
  if (!Number.isFinite(n) || (entero && !Number.isInteger(n)) || n < min || n > max) {
    throw new ErrorDeCampo(`${campo} tiene que ser ${entero ? 'un número entero' : 'un número'} entre ${min} y ${max}.`)
  }
  return n
}

// Convierte los borradores en lo que se guarda, o devuelve el primer error
// con el número de ejercicio, para mostrarlo arriba del botón de guardar.
export function paraGuardar(borradores: Borrador[]): { items: ItemAGuardar[] } | { error: string } {
  const items: ItemAGuardar[] = []
  const superseries = numerarSuperseries(borradores)
  for (const [i, b] of borradores.entries()) {
    try {
      const series = numero(b.series, 'Series', { min: 1, max: 20, entero: true })
      if (series === null) throw new ErrorDeCampo('Faltan las series.')
      const repsMin = b.modo === 'reps' ? numero(b.repsMin, 'Repeticiones', { min: 1, max: 999, entero: true }) : null
      const repsMax = b.modo === 'reps' ? numero(b.repsMax, 'Repeticiones', { min: 1, max: 999, entero: true }) : null
      if (repsMax !== null && (repsMin === null || repsMax < repsMin)) {
        throw new ErrorDeCampo('El máximo de repeticiones tiene que ser mayor que el mínimo.')
      }
      const cargaValor =
        b.carga === 'kg'
          ? numero(b.cargaValor, 'La carga', { min: 0, max: 9999 })
          : b.carga === 'pct'
            ? numero(b.cargaValor, 'El % de 1RM', { min: 1, max: 150 })
            : null
      if (b.tempo.trim().length > 20) throw new ErrorDeCampo('El tempo es muy largo.')
      items.push({
        id: b.id,
        ejercicio_id: b.ejercicio.id,
        series,
        reps_min: repsMin,
        // "8 a 8" se guarda como 8 fijo.
        reps_max: repsMax === repsMin ? null : repsMax,
        segundos: b.modo === 'tiempo' ? numero(b.segundos, 'Los segundos', { min: 1, max: 3600, entero: true }) : null,
        carga_kg: b.carga === 'kg' ? cargaValor : null,
        carga_pct_1rm: b.carga === 'pct' ? cargaValor : null,
        descanso_s: numero(b.descanso, 'El descanso', { min: 0, max: 3600, entero: true }),
        rpe: numero(b.rpe, 'El RPE', { min: 1, max: 10 }),
        rir: numero(b.rir, 'El RIR', { min: 0, max: 10, entero: true }),
        tempo: b.tempo.trim() || null,
        pedir_rpe: b.pedirRpe,
        notas: b.notas.trim() || null,
        superserie: superseries[i],
        velocidad_ms: numero(b.velocidad, 'La velocidad', { min: 0.1, max: 9 }),
        perdida_vel_pct: numero(b.perdidaVel, 'La pérdida de velocidad', { min: 1, max: 90, entero: true }),
        intensidad: b.intensidad || null,
      })
    } catch (e) {
      if (e instanceof ErrorDeCampo) return { error: `Ejercicio ${i + 1} (${b.ejercicio.nombre}): ${e.message}` }
      throw e
    }
  }
  return { items }
}

// Primer y último índice del tramo de ejercicios unidos al que pertenece
// `indice`. Un ejercicio suelto es un tramo de uno solo.
function bloqueDe(items: Pick<Borrador, 'unidoConSiguiente'>[], indice: number): [number, number] {
  let inicio = indice
  while (inicio > 0 && items[inicio - 1].unidoConSiguiente) inicio -= 1
  let fin = indice
  while (fin < items.length - 1 && items[fin].unidoConSiguiente) fin += 1
  return [inicio, fin]
}

// Las series son del bloque entero: en una superserie o un circuito se hace
// una vuelta de todos, así que no puede haber uno con 3 y otro con 4. Cada
// tramo toma las del primero. Se usa al unir, al separar y al reordenar.
export function normalizarSeries(items: Borrador[]): Borrador[] {
  return items.map((b, i) => {
    const [inicio] = bloqueDe(items, i)
    return b.series === items[inicio].series ? b : { ...b, series: items[inicio].series }
  })
}

// Un cambio en un ejercicio del editor. Las series se copian a todo su
// bloque, venga el cambio del primero o del último.
export function cambiarBorrador(items: Borrador[], clave: string, parcial: Partial<Borrador>): Borrador[] {
  const indice = items.findIndex((b) => b.clave === clave)
  if (indice === -1) return items

  let resultado = items.map((b, i) => (i === indice ? { ...b, ...parcial } : b))
  if (parcial.series !== undefined) {
    const [inicio, fin] = bloqueDe(resultado, indice)
    resultado = resultado.map((b, i) => (i >= inicio && i <= fin ? { ...b, series: parcial.series as string } : b))
  }
  return normalizarSeries(resultado)
}

// Los enlaces "unido con el siguiente" se convierten en números de
// superserie: cada tramo de ejercicios unidos recibe un número (1, 2…). El
// enlace del último ejercicio no une con nada y se ignora.
export function numerarSuperseries(borradores: Pick<Borrador, 'unidoConSiguiente'>[]): (number | null)[] {
  const numeros: (number | null)[] = []
  let actual = 0
  borradores.forEach((b, i) => {
    const conAnterior = i > 0 && borradores[i - 1].unidoConSiguiente
    const conSiguiente = b.unidoConSiguiente && i < borradores.length - 1
    if (!conAnterior && !conSiguiente) {
      numeros.push(null)
      return
    }
    if (!conAnterior) actual += 1
    numeros.push(actual)
  })
  return numeros
}
