import { supabase } from '../lib/supabase.ts'
import type { Json } from './database.types.ts'

export type SerieHecha = {
  numero: number
  peso_kg: number | null
  reps: number | null
  segundos: number | null
  rpe: number | null
}

export type UltimaVez = { fecha: string; series: SerieHecha[] }

// Lo que se manda al terminar (ver registrar_sesion en la base).
export type SesionARegistrar = {
  id: string
  cliente_id: string
  rutina_id: string | null
  rutina_nombre: string
  iniciada_en: string
  finalizada_en: string
  esfuerzo: number | null
  comentario: string | null
  series: (SerieHecha & { ejercicio_id: string; rutina_ejercicio_id: string | null; orden_ejercicio: number })[]
}

export type SesionEnLista = {
  id: string
  cliente_id: string
  rutina_nombre: string
  iniciada_en: string
  finalizada_en: string | null
  esfuerzo: number | null
  comentario: string | null
  registrada_por: string | null
  series: number
  conDevolucion: boolean
}

export type SesionCompleta = Omit<SesionEnLista, 'series' | 'conDevolucion'> & {
  rutina_id: string | null
  cliente: { nombre: string; entrenador_id: string } | null
  ejercicios: { ejercicio_id: string; nombre: string; series: SerieHecha[] }[]
  devolucion: { texto: string; updated_at: string } | null
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function registrarSesion(sesion: SesionARegistrar): Promise<string> {
  const { data, error } = await db().rpc('registrar_sesion', { p_sesion: sesion as unknown as Json })
  if (error) throw error
  return data
}

// RF-43: por ejercicio, las series de la última sesión en que se hizo.
export async function ultimaVez(clienteId: string, ejercicioIds: string[]): Promise<Map<string, UltimaVez>> {
  const resultado = new Map<string, UltimaVez>()
  if (ejercicioIds.length === 0) return resultado
  const { data, error } = await db().rpc('ultima_vez', { p_cliente_id: clienteId, p_ejercicio_ids: ejercicioIds })
  if (error) throw error
  for (const fila of data) {
    const previa = resultado.get(fila.ejercicio_id) ?? { fecha: fila.fecha, series: [] }
    previa.series.push({
      numero: fila.numero,
      peso_kg: fila.peso_kg,
      reps: fila.reps,
      segundos: fila.segundos,
      rpe: fila.rpe,
    })
    resultado.set(fila.ejercicio_id, previa)
  }
  return resultado
}

// RF-46. Sin cliente, RLS devuelve las del usuario (el cliente ve las suyas).
export async function listarSesiones(clienteId?: string, limite = 50): Promise<SesionEnLista[]> {
  let consulta = db()
    .from('sesiones')
    .select(
      'id, cliente_id, rutina_nombre, iniciada_en, finalizada_en, esfuerzo, comentario, registrada_por, sesion_series(count), sesion_comentarios(sesion_id)',
    )
    .order('iniciada_en', { ascending: false })
    .limit(limite)
  if (clienteId) consulta = consulta.eq('cliente_id', clienteId)
  const { data, error } = await consulta
  if (error) throw error
  return data.map(({ sesion_series, sesion_comentarios, ...s }) => ({
    ...s,
    series: sesion_series[0]?.count ?? 0,
    conDevolucion: sesion_comentarios !== null,
  }))
}

export async function obtenerSesion(id: string): Promise<SesionCompleta | null> {
  const { data, error } = await db()
    .from('sesiones')
    .select(
      `id, cliente_id, rutina_id, rutina_nombre, iniciada_en, finalizada_en, esfuerzo, comentario, registrada_por,
       clientes(nombre, entrenador_id),
       sesion_comentarios(texto, updated_at),
       sesion_series(ejercicio_id, orden_ejercicio, numero, peso_kg, reps, segundos, rpe, ejercicios(nombre))`,
    )
    .eq('id', id)
    .order('orden_ejercicio', { referencedTable: 'sesion_series' })
    .order('numero', { referencedTable: 'sesion_series' })
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const { clientes, sesion_comentarios, sesion_series, ...sesion } = data
  // Agrupa las series por ejercicio, en el orden en que se hicieron.
  const ejercicios: SesionCompleta['ejercicios'] = []
  let clave = ''
  for (const s of sesion_series) {
    const esta = `${s.orden_ejercicio}:${s.ejercicio_id}`
    if (esta !== clave) {
      ejercicios.push({ ejercicio_id: s.ejercicio_id, nombre: s.ejercicios.nombre, series: [] })
      clave = esta
    }
    ejercicios.at(-1)!.series.push({ numero: s.numero, peso_kg: s.peso_kg, reps: s.reps, segundos: s.segundos, rpe: s.rpe })
  }
  return { ...sesion, cliente: clientes, devolucion: sesion_comentarios, ejercicios }
}

export async function borrarSesion(id: string): Promise<void> {
  const { error } = await db().from('sesiones').delete().eq('id', id)
  if (error) throw error
}

// RF-61: una devolución por sesión. Sin upsert: el upsert de PostgREST
// reescribe también sesion_id, que no se puede actualizar desde la API.
export async function guardarDevolucion(sesionId: string, texto: string, existe: boolean): Promise<void> {
  const { error } = existe
    ? await db().from('sesion_comentarios').update({ texto }).eq('sesion_id', sesionId)
    : await db().from('sesion_comentarios').insert({ sesion_id: sesionId, texto })
  if (error) throw error
}

export async function borrarDevolucion(sesionId: string): Promise<void> {
  const { error } = await db().from('sesion_comentarios').delete().eq('sesion_id', sesionId)
  if (error) throw error
}
