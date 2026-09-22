import { supabase } from '../lib/supabase.ts'
import type { Json } from './database.types.ts'

// 1 = lunes … 7 = domingo, como en la base.
export type Dia = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Rutina = {
  id: string
  entrenador_id: string
  cliente_id: string | null
  plantilla_id: string | null
  nombre: string
  descripcion: string | null
  dias_semana: Dia[]
  archivada: boolean
}

export type RutinaEnLista = Rutina & { ejercicios: number }

// La prescripción de un ejercicio dentro de una rutina (RF-30).
export type Prescripcion = {
  series: number
  reps_min: number | null
  reps_max: number | null
  segundos: number | null
  carga_kg: number | null
  carga_pct_1rm: number | null
  descanso_s: number | null
  rpe: number | null
  rir: number | null
  tempo: string | null
  pedir_rpe: boolean
  notas: string | null
  // Ejercicios seguidos con el mismo número se hacen uno atrás del otro (RF-33).
  superserie: number | null
  // Entrenamiento deportivo (RF-35): velocidad objetivo de la barra en m/s,
  // corte por pérdida de velocidad, y esfuerzo en palabras.
  velocidad_ms: number | null
  perdida_vel_pct: number | null
  intensidad: Intensidad | null
}

export const INTENSIDADES = [
  { valor: 'suave', etiqueta: 'Suave' },
  { valor: 'moderado', etiqueta: 'Moderado' },
  { valor: 'fuerte', etiqueta: 'Fuerte' },
  { valor: 'maximo', etiqueta: 'Máximo' },
] as const

export type Intensidad = (typeof INTENSIDADES)[number]['valor']

export type EjercicioDeRutina = Prescripcion & {
  id: string
  orden: number
  ejercicio: { id: string; nombre: string; grupo_muscular: string | null; archivado: boolean }
}

export type RutinaCompleta = Rutina & { items: EjercicioDeRutina[] }

export type DatosRutina = Pick<Rutina, 'nombre' | 'descripcion' | 'dias_semana'>

// Lo que manda el editor: `id` si el ejercicio ya estaba en la rutina.
export type ItemAGuardar = Prescripcion & { id?: string; ejercicio_id: string }

export const nombreDia: Record<Dia, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const inicialDia: Record<Dia, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }

export function diaDeHoy(hoy = new Date()): Dia {
  const d = hoy.getDay()
  return (d === 0 ? 7 : d) as Dia
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

const columnas = 'id, entrenador_id, cliente_id, plantilla_id, nombre, descripcion, dias_semana, archivada'

function conConteo(filas: (Omit<Rutina, 'dias_semana'> & { dias_semana: number[]; rutina_ejercicios: { count: number }[] })[]) {
  return filas.map(({ rutina_ejercicios, ...r }) => ({
    ...r,
    dias_semana: r.dias_semana as Dia[],
    ejercicios: rutina_ejercicios[0]?.count ?? 0,
  }))
}

// Plantillas: rutinas del entrenador sin cliente (RF-31).
export async function listarPlantillas(): Promise<RutinaEnLista[]> {
  const { data, error } = await db()
    .from('rutinas')
    .select(`${columnas}, rutina_ejercicios(count)`)
    .is('cliente_id', null)
    .order('nombre')
  if (error) throw error
  return conConteo(data)
}

export async function listarRutinasDeCliente(clienteId: string): Promise<RutinaEnLista[]> {
  const { data, error } = await db()
    .from('rutinas')
    .select(`${columnas}, rutina_ejercicios(count)`)
    .eq('cliente_id', clienteId)
    .order('nombre')
  if (error) throw error
  return conConteo(data)
}

// Para el cliente: RLS ya devuelve solo las suyas, y nunca plantillas.
export async function misRutinas(): Promise<RutinaEnLista[]> {
  const { data, error } = await db()
    .from('rutinas')
    .select(`${columnas}, rutina_ejercicios(count)`)
    .not('cliente_id', 'is', null)
    .eq('archivada', false)
    .order('nombre')
  if (error) throw error
  return conConteo(data)
}

export async function obtenerRutina(id: string): Promise<RutinaCompleta | null> {
  const { data, error } = await db()
    .from('rutinas')
    .select(
      `${columnas}, rutina_ejercicios(id, orden, series, reps_min, reps_max, segundos, carga_kg,
       carga_pct_1rm, descanso_s, rpe, rir, tempo, pedir_rpe, notas, superserie,
       velocidad_ms, perdida_vel_pct, intensidad,
       ejercicios(id, nombre, grupo_muscular, archivado))`,
    )
    .eq('id', id)
    .order('orden', { referencedTable: 'rutina_ejercicios' })
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { rutina_ejercicios, ...rutina } = data
  return {
    ...rutina,
    dias_semana: rutina.dias_semana as Dia[],
    items: rutina_ejercicios.map(({ ejercicios, ...item }) => ({
      ...item,
      // La base ya limita los valores con un check; el tipo generado es text.
      intensidad: item.intensidad as Intensidad | null,
      ejercicio: ejercicios,
    })),
  }
}

export async function crearRutina(
  entrenadorId: string,
  clienteId: string | null,
  datos: DatosRutina,
): Promise<string> {
  const { data, error } = await db()
    .from('rutinas')
    .insert({ ...datos, entrenador_id: entrenadorId, cliente_id: clienteId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// Guarda los datos de la rutina y su lista de ejercicios. La lista va en una
// sola llamada a la base, que la aplica toda junta o nada.
export async function guardarRutina(id: string, datos: DatosRutina, items: ItemAGuardar[]): Promise<void> {
  const { error } = await db().from('rutinas').update(datos).eq('id', id)
  if (error) throw error
  const guardado = await db().rpc('guardar_ejercicios_rutina', {
    p_rutina_id: id,
    p_ejercicios: items as unknown as Json,
  })
  if (guardado.error) throw guardado.error
}

// Copia una rutina como plantilla (clienteId null) o para un cliente
// (RF-35). Son dos pasos: si falla el segundo, se borra la copia a medias.
export async function duplicarRutina(
  entrenadorId: string,
  rutina: RutinaCompleta,
  clienteId: string | null,
): Promise<string> {
  const mismoLugar = clienteId === rutina.cliente_id
  const datos: DatosRutina = {
    nombre: mismoLugar ? `${rutina.nombre} (copia)`.slice(0, 120) : rutina.nombre,
    descripcion: rutina.descripcion,
    dias_semana: rutina.dias_semana,
  }
  const items: ItemAGuardar[] = rutina.items.map(({ id: _id, orden: _orden, ejercicio, ...prescripcion }) => ({
    ...prescripcion,
    ejercicio_id: ejercicio.id,
  }))
  const nuevaId = await crearRutina(entrenadorId, clienteId, datos)
  try {
    await guardarRutina(nuevaId, datos, items)
  } catch (e) {
    await db().from('rutinas').delete().eq('id', nuevaId)
    throw e
  }
  return nuevaId
}

export async function archivarRutina(id: string, archivada: boolean): Promise<void> {
  const { error } = await db().from('rutinas').update({ archivada }).eq('id', id)
  if (error) throw error
}

// Copia la plantilla a cada cliente (RF-31) con los días elegidos (RF-32).
export async function asignarPlantilla(plantillaId: string, clienteIds: string[], dias: Dia[]): Promise<void> {
  const { data, error } = await db().rpc('asignar_plantilla', {
    p_rutina_id: plantillaId,
    p_cliente_ids: clienteIds,
  })
  if (error) throw error
  const copias = data ?? []
  if (copias.length === 0) return
  const actualizacion = await db().from('rutinas').update({ dias_semana: dias }).in('id', copias)
  if (actualizacion.error) throw actualizacion.error
}

// Etiquetas de superserie al estilo gimnasio: A1, A2 para la primera, B1, B2
// para la segunda… null para los ejercicios que van solos.
export function etiquetasSuperserie(items: Pick<Prescripcion, 'superserie'>[]): (string | null)[] {
  const etiquetas: (string | null)[] = []
  let letra = -1
  let posicion = 0
  items.forEach((item, i) => {
    const ss = item.superserie
    const conAnterior = ss !== null && i > 0 && items[i - 1].superserie === ss
    const conSiguiente = ss !== null && i < items.length - 1 && items[i + 1].superserie === ss
    if (!conAnterior && !conSiguiente) {
      etiquetas.push(null)
      return
    }
    if (!conAnterior) {
      letra += 1
      posicion = 0
    }
    posicion += 1
    etiquetas.push(`${String.fromCharCode(65 + (letra % 26))}${posicion}`)
  })
  return etiquetas
}
