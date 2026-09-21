import type { EjercicioDeRutina, ItemAGuardar } from '../../datos/rutinas.ts'

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
}

const texto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

export function desdeGuardado(item: EjercicioDeRutina): Borrador {
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
      })
    } catch (e) {
      if (e instanceof ErrorDeCampo) return { error: `Ejercicio ${i + 1} (${b.ejercicio.nombre}): ${e.message}` }
      throw e
    }
  }
  return { items }
}
