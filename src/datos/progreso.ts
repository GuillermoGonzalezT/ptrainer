import { supabase } from '../lib/supabase.ts'

// Progreso por ejercicio (RF-60). Los números los calcula la base (ver
// ejercicios_realizados y progreso_ejercicio).

export type EjercicioRealizado = {
  ejercicio_id: string
  nombre: string
  sesiones: number
  ultima: string
  carga_max: number | null
}

export type SesionDeEjercicio = {
  sesion_id: string
  fecha: string
  series: number
  carga_max: number | null
  volumen: number
  reps_max: number | null
  reps_total: number | null
  segundos_max: number | null
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function ejerciciosRealizados(clienteId: string): Promise<EjercicioRealizado[]> {
  const { data, error } = await db().rpc('ejercicios_realizados', { p_cliente_id: clienteId })
  if (error) throw error
  return data
}

export async function progresoDeEjercicio(clienteId: string, ejercicioId: string): Promise<SesionDeEjercicio[]> {
  const { data, error } = await db().rpc('progreso_ejercicio', { p_cliente_id: clienteId, p_ejercicio_id: ejercicioId })
  if (error) throw error
  return data
}

// Qué se grafica según cómo se registró el ejercicio: con kilos, carga y
// volumen; sin kilos, repeticiones; por tiempo, segundos.
export type TipoDeProgreso = 'carga' | 'repeticiones' | 'tiempo'

export function tipoDeProgreso(sesiones: SesionDeEjercicio[]): TipoDeProgreso {
  if (sesiones.some((s) => (s.carga_max ?? 0) > 0)) return 'carga'
  if (sesiones.some((s) => (s.reps_max ?? 0) > 0)) return 'repeticiones'
  return 'tiempo'
}
