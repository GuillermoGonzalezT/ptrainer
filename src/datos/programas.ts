import { supabase } from '../lib/supabase.ts'
import type { Dia } from './rutinas.ts'

// RF-34: un programa agrupa plantillas en semanas, con un ajuste de carga por
// semana. Al asignarlo se copian todas las rutinas al cliente, ya ajustadas.

export type Programa = {
  id: string
  entrenador_id: string
  nombre: string
  descripcion: string | null
  semanas: number
  archivado: boolean
}

export type ProgramaEnLista = Programa & { rutinas: number }

// Una plantilla puesta en una semana del programa.
export type RutinaDePrograma = {
  id: string
  semana: number
  plantilla_id: string
  dias_semana: Dia[]
  ajuste_carga_pct: number
  plantilla: { id: string; nombre: string }
}

export type ProgramaCompleto = Programa & { rutinas: RutinaDePrograma[] }

export type Asignacion = {
  id: string
  programa_id: string
  cliente_id: string
  nombre: string
  semanas: number
  inicia_el: string
}

const columnas = 'id, entrenador_id, nombre, descripcion, semanas, archivado'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function listarProgramas(): Promise<ProgramaEnLista[]> {
  const { data, error } = await db()
    .from('programas')
    .select(`${columnas}, programa_rutinas(count)`)
    .order('nombre')
  if (error) throw error
  return data.map(({ programa_rutinas, ...p }) => ({ ...p, rutinas: programa_rutinas[0]?.count ?? 0 }))
}

export async function obtenerPrograma(id: string): Promise<ProgramaCompleto | null> {
  const { data, error } = await db()
    .from('programas')
    .select(
      `${columnas}, programa_rutinas(id, semana, plantilla_id, dias_semana, ajuste_carga_pct,
       rutinas(id, nombre))`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { programa_rutinas, ...programa } = data
  return {
    ...programa,
    rutinas: programa_rutinas
      .map(({ rutinas, ...r }) => ({ ...r, dias_semana: r.dias_semana as Dia[], plantilla: rutinas }))
      .sort((a, b) => a.semana - b.semana || a.plantilla.nombre.localeCompare(b.plantilla.nombre, 'es')),
  }
}

export type DatosPrograma = Pick<Programa, 'nombre' | 'descripcion' | 'semanas'>

export async function crearPrograma(datos: DatosPrograma): Promise<string> {
  const { data, error } = await db().from('programas').insert(datos).select('id').single()
  if (error) throw error
  return data.id
}

export async function guardarPrograma(id: string, datos: DatosPrograma): Promise<void> {
  const { error } = await db().from('programas').update(datos).eq('id', id)
  if (error) throw error
}

export async function archivarPrograma(id: string, archivado: boolean): Promise<void> {
  const { error } = await db().from('programas').update({ archivado }).eq('id', id)
  if (error) throw error
}

export async function agregarRutinaAlPrograma(
  programaId: string,
  datos: { semana: number; plantilla_id: string; dias_semana: Dia[]; ajuste_carga_pct: number },
): Promise<void> {
  const { error } = await db().from('programa_rutinas').insert({ programa_id: programaId, ...datos })
  if (error) throw error
}

export async function cambiarRutinaDePrograma(
  id: string,
  datos: Partial<{ semana: number; dias_semana: Dia[]; ajuste_carga_pct: number }>,
): Promise<void> {
  const { error } = await db().from('programa_rutinas').update(datos).eq('id', id)
  if (error) throw error
}

export async function quitarRutinaDePrograma(id: string): Promise<void> {
  const { error } = await db().from('programa_rutinas').delete().eq('id', id)
  if (error) throw error
}

export async function asignarPrograma(programaId: string, clienteIds: string[], iniciaEl: string): Promise<void> {
  const { error } = await db().rpc('asignar_programa', {
    p_programa_id: programaId,
    p_cliente_ids: clienteIds,
    p_inicia_el: iniciaEl,
  })
  if (error) throw error
}

// Las asignaciones que el cliente puede ver (las suyas) o el entrenador de
// sus clientes. La RLS ya decide cuáles.
export async function listarAsignaciones(clienteId?: string): Promise<Asignacion[]> {
  let consulta = db()
    .from('programa_asignaciones')
    .select('id, programa_id, cliente_id, nombre, semanas, inicia_el')
    .order('inicia_el', { ascending: false })
  if (clienteId) consulta = consulta.eq('cliente_id', clienteId)
  const { data, error } = await consulta
  if (error) throw error
  return data
}

export async function borrarAsignacion(id: string): Promise<void> {
  const { error } = await db().from('programa_asignaciones').delete().eq('id', id)
  if (error) throw error
}

// En qué semana está hoy una asignación: sale de la fecha de inicio, no de un
// contador. null si todavía no arrancó o si ya terminó. Es el mismo cálculo
// que hace public.semana_actual en la base.
export function semanaActual(asignacion: Pick<Asignacion, 'inicia_el' | 'semanas'>, hoy = new Date()): number | null {
  const inicio = new Date(`${asignacion.inicia_el}T00:00:00`)
  const dias = Math.floor((mediodia(hoy) - mediodia(inicio)) / 86_400_000)
  if (dias < 0) return null
  const semana = Math.floor(dias / 7) + 1
  return semana > asignacion.semanas ? null : semana
}

// Al mediodía: así el horario de verano no corre la cuenta un día.
function mediodia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime()
}
