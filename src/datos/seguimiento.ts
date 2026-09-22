import { lunesDe } from '../lib/adherencia.ts'
import { supabase } from '../lib/supabase.ts'
import type { Json } from './database.types.ts'

// Cuestionario inicial (RF-13) y check-in semanal (RF-65).

// Las 7 preguntas del PAR-Q, el cuestionario estándar para saber si alguien
// puede empezar a entrenar sin consultar antes a un médico.
export const PREGUNTAS_PARQ = [
  '¿Alguna vez un médico te dijo que tenías un problema del corazón o presión alta?',
  '¿Sentís dolor en el pecho, en reposo o al hacer actividad física?',
  '¿Perdés el equilibrio por mareos, o perdiste el conocimiento en los últimos 12 meses?',
  '¿Tenés alguna enfermedad crónica diagnosticada (además del corazón o la presión)?',
  '¿Tomás alguna medicación recetada de forma habitual?',
  '¿Tenés algún problema de huesos o articulaciones que empeore al hacer actividad física?',
  '¿Un médico te dijo alguna vez que solo deberías hacer actividad física supervisada?',
] as const

export type Respuestas = {
  // Una por pregunta del PAR-Q: true = sí, false = no, undefined = sin contestar.
  parq?: (boolean | null)[]
  detalleParq?: string
  experiencia?: string
  disponibilidad?: string
  lesiones?: string
  otros?: string
}

export type Cuestionario = {
  cliente_id: string
  respuestas: Respuestas
  completado_en: string | null
  updated_at: string
}

export type Checkin = {
  id: string
  cliente_id: string
  // Lunes de esa semana, como 'AAAA-MM-DD'.
  semana: string
  sueno: number | null
  estres: number | null
  energia: number | null
  cumplimiento: number | null
  comentario: string | null
  registrado_por: string | null
}

export type DatosCheckin = Pick<Checkin, 'sueno' | 'estres' | 'energia' | 'cumplimiento' | 'comentario'>

// Las escalas del check-in, con qué significa cada punta.
export const ESCALAS = [
  { campo: 'sueno', etiqueta: 'Sueño', bajo: 'Muy mal', alto: 'Muy bien' },
  { campo: 'energia', etiqueta: 'Energía', bajo: 'Muy baja', alto: 'Muy alta' },
  { campo: 'estres', etiqueta: 'Estrés', bajo: 'Muy bajo', alto: 'Muy alto' },
  { campo: 'cumplimiento', etiqueta: 'Cumplimiento del plan', bajo: 'Nada', alto: 'Todo' },
] as const satisfies readonly { campo: keyof DatosCheckin; etiqueta: string; bajo: string; alto: string }[]

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

// El lunes de la semana de `fecha`, como 'AAAA-MM-DD' en hora local.
export function semanaDe(fecha = new Date()): string {
  const lunes = lunesDe(fecha)
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`
}

export async function obtenerCuestionario(clienteId: string): Promise<Cuestionario | null> {
  const { data, error } = await db().from('cuestionarios').select('*').eq('cliente_id', clienteId).maybeSingle()
  if (error) throw error
  return data && { ...data, respuestas: (data.respuestas ?? {}) as Respuestas }
}

// Guarda (o crea) el cuestionario. `completado` marca cuándo se terminó de
// llenar, para poder avisar a quien todavía no lo hizo.
export async function guardarCuestionario(clienteId: string, respuestas: Respuestas, completado: boolean): Promise<void> {
  const fila = {
    cliente_id: clienteId,
    respuestas: respuestas as unknown as Json,
    completado_en: completado ? new Date().toISOString() : null,
  }
  const { error } = await db().from('cuestionarios').upsert(fila, { onConflict: 'cliente_id' })
  if (error) throw error
}

export async function listarCheckins(clienteId: string, limite = 12): Promise<Checkin[]> {
  const { data, error } = await db()
    .from('checkins')
    .select('id, cliente_id, semana, sueno, estres, energia, cumplimiento, comentario, registrado_por')
    .eq('cliente_id', clienteId)
    .order('semana', { ascending: false })
    .limit(limite)
  if (error) throw error
  return data
}

export async function obtenerCheckin(clienteId: string, semana: string): Promise<Checkin | null> {
  const { data, error } = await db()
    .from('checkins')
    .select('id, cliente_id, semana, sueno, estres, energia, cumplimiento, comentario, registrado_por')
    .eq('cliente_id', clienteId)
    .eq('semana', semana)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function guardarCheckin(
  clienteId: string,
  semana: string,
  datos: DatosCheckin,
  existente: Checkin | null,
): Promise<void> {
  const { error } = existente
    ? await db().from('checkins').update(datos).eq('id', existente.id)
    : await db().from('checkins').insert({ ...datos, cliente_id: clienteId, semana })
  if (error) throw error
}

// Para el panel del entrenador: quiénes ya hicieron el check-in de una semana.
export async function clientesConCheckin(semana: string): Promise<Set<string>> {
  const { data, error } = await db().from('checkins').select('cliente_id').eq('semana', semana)
  if (error) throw error
  return new Set(data.map((c) => c.cliente_id))
}
