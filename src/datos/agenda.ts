import { supabase } from '../lib/supabase.ts'
import type { Dia } from './rutinas.ts'

// RF-80 y RF-81: los turnos del entrenador y las franjas en las que atiende.
// El turno guarda inicio y fin como instantes; la franja, día de la semana y
// hora local del entrenador.

export type Estado = 'pendiente' | 'confirmado' | 'cancelado'

export type Turno = {
  id: string
  entrenador_id: string
  cliente_id: string | null
  inicia_en: string
  termina_en: string
  estado: Estado
  lugar: string | null
  nota: string | null
}

export type TurnoConCliente = Turno & { cliente: { id: string; nombre: string } | null }

export type Franja = {
  id: string
  dia: Dia
  desde: string
  hasta: string
}

const columnas = 'id, entrenador_id, cliente_id, inicia_en, termina_en, estado, lugar, nota'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

// Los turnos que arrancan dentro del rango. La RLS decide de quién.
export async function listarTurnos(desde: Date, hasta: Date): Promise<TurnoConCliente[]> {
  const { data, error } = await db()
    .from('turnos')
    .select(`${columnas}, clientes(id, nombre)`)
    .gte('inicia_en', desde.toISOString())
    .lt('inicia_en', hasta.toISOString())
    .order('inicia_en')
  if (error) throw error
  return data.map(({ clientes, ...t }) => ({ ...t, estado: t.estado as Estado, cliente: clientes }))
}

export type DatosTurno = {
  cliente_id: string | null
  inicia_en: string
  termina_en: string
  estado?: Estado
  lugar?: string | null
  nota?: string | null
}

// El entrenador agenda: entrenador_id sale del default de la tabla.
export async function crearTurno(datos: DatosTurno): Promise<void> {
  const { error } = await db().from('turnos').insert(datos)
  if (error) throw error
}

// El cliente reserva: tiene que decir de qué entrenador, y la base comprueba
// que caiga en una franja y que quede pendiente.
export async function reservarTurno(
  entrenadorId: string,
  clienteId: string,
  iniciaEn: string,
  terminaEn: string,
  nota: string | null,
): Promise<void> {
  const { error } = await db().from('turnos').insert({
    entrenador_id: entrenadorId,
    cliente_id: clienteId,
    inicia_en: iniciaEn,
    termina_en: terminaEn,
    nota,
  })
  if (error) throw error
}

export async function cambiarEstado(id: string, estado: Estado): Promise<void> {
  const { error } = await db().from('turnos').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function moverTurno(id: string, iniciaEn: string, terminaEn: string): Promise<void> {
  const { error } = await db().from('turnos').update({ inicia_en: iniciaEn, termina_en: terminaEn }).eq('id', id)
  if (error) throw error
}

export async function borrarTurno(id: string): Promise<void> {
  const { error } = await db().from('turnos').delete().eq('id', id)
  if (error) throw error
}

export async function listarFranjas(entrenadorId?: string): Promise<Franja[]> {
  let consulta = db().from('disponibilidad').select('id, dia, desde, hasta').order('dia').order('desde')
  if (entrenadorId) consulta = consulta.eq('entrenador_id', entrenadorId)
  const { data, error } = await consulta
  if (error) throw error
  return data.map((f) => ({ ...f, dia: f.dia as Dia }))
}

export async function crearFranja(dia: Dia, desde: string, hasta: string): Promise<void> {
  const { error } = await db().from('disponibilidad').insert({ dia, desde, hasta })
  if (error) throw error
}

export async function borrarFranja(id: string): Promise<void> {
  const { error } = await db().from('disponibilidad').delete().eq('id', id)
  if (error) throw error
}

export async function obtenerZonaHoraria(entrenadorId: string): Promise<string> {
  const { data, error } = await db().from('entrenadores').select('zona_horaria').eq('id', entrenadorId).maybeSingle()
  if (error) throw error
  return data?.zona_horaria ?? 'America/Montevideo'
}

export async function guardarZonaHoraria(entrenadorId: string, zona: string): Promise<void> {
  const { error } = await db().from('entrenadores').update({ zona_horaria: zona }).eq('id', entrenadorId)
  if (error) throw error
}
