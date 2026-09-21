import { supabase } from '../lib/supabase.ts'
import type { Database } from './database.types.ts'

type Fila = Database['public']['Tables']['clientes']['Row']

export type EstadoCliente = 'activo' | 'pausado' | 'baja'
export type Modalidad = 'presencial' | 'online' | 'mixta'
export type Nivel = 'principiante' | 'intermedio' | 'avanzado'

// Los `check` de la base no pasan a los tipos generados: acá se acotan.
export type Cliente = Omit<Fila, 'estado' | 'modalidad' | 'nivel'> & {
  estado: EstadoCliente
  modalidad: Modalidad
  nivel: Nivel | null
}

// Lo que el entrenador completa en el formulario de la ficha (RF-11).
export type DatosCliente = Pick<
  Cliente,
  'nombre' | 'email' | 'telefono' | 'fecha_nacimiento' | 'objetivos' | 'nivel' | 'lesiones' | 'modalidad'
>

export type Nota = { id: string; texto: string; created_at: string }

export type Invitacion = { codigo: string; expira_en: string; created_at: string }

export const etiquetaEstado: Record<EstadoCliente, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  baja: 'Baja',
}

export const etiquetaModalidad: Record<Modalidad, string> = {
  presencial: 'Presencial',
  online: 'Online',
  mixta: 'Mixta',
}

export const etiquetaNivel: Record<Nivel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

// RLS ya limita a los clientes del entrenador que consulta.
export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await db().from('clientes').select('*').order('nombre')
  if (error) throw error
  return data as Cliente[]
}

export async function obtenerCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await db().from('clientes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Cliente | null
}

export async function crearCliente(entrenadorId: string, datos: DatosCliente): Promise<string> {
  const { data, error } = await db()
    .from('clientes')
    .insert({ ...datos, entrenador_id: entrenadorId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function actualizarCliente(id: string, datos: DatosCliente): Promise<void> {
  const { error } = await db().from('clientes').update(datos).eq('id', id)
  if (error) throw error
}

export async function cambiarEstado(id: string, estado: EstadoCliente): Promise<void> {
  const { error } = await db().from('clientes').update({ estado }).eq('id', id)
  if (error) throw error
}

// Notas privadas (RF-12)

export async function listarNotas(clienteId: string): Promise<Nota[]> {
  const { data, error } = await db()
    .from('notas_cliente')
    .select('id, texto, created_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function crearNota(clienteId: string, texto: string): Promise<void> {
  const { error } = await db().from('notas_cliente').insert({ cliente_id: clienteId, texto })
  if (error) throw error
}

export async function borrarNota(id: string): Promise<void> {
  const { error } = await db().from('notas_cliente').delete().eq('id', id)
  if (error) throw error
}

// Invitaciones (RF-02)

// La última invitación sin usar y sin vencer, si hay.
export async function invitacionVigente(clienteId: string): Promise<Invitacion | null> {
  const { data, error } = await db()
    .from('invitaciones')
    .select('codigo, expira_en, created_at')
    .eq('cliente_id', clienteId)
    .is('usada_en', null)
    .gt('expira_en', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Crea una invitación nueva y borra las anteriores sin usar, para que quede
// un solo código válido por cliente.
export async function crearInvitacion(clienteId: string): Promise<Invitacion> {
  const borrado = await db().from('invitaciones').delete().eq('cliente_id', clienteId).is('usada_en', null)
  if (borrado.error) throw borrado.error
  const { data, error } = await db()
    .from('invitaciones')
    .insert({ cliente_id: clienteId })
    .select('codigo, expira_en, created_at')
    .single()
  if (error) throw error
  return data
}
