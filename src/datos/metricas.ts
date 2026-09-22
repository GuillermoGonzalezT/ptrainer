import type { VideoListo } from '../lib/comprimirVideo.ts'
import { supabase } from '../lib/supabase.ts'

export type Mejor = 'mayor' | 'menor' | 'ninguno'

export type Metrica = {
  id: string
  entrenador_id: string | null
  nombre: string
  unidad: string
  mejor: Mejor
  protocolo: string | null
  video_path: string | null
  archivada: boolean
}

export type MetricaEnLista = Metrica & { clientes: number }

export type DatosMetrica = Pick<Metrica, 'nombre' | 'unidad' | 'mejor' | 'protocolo'>

export type Medicion = {
  id: string
  fecha: string
  intentos: number[]
  valor: number
  nota: string | null
  registrada_por: string | null
}

// Una métrica asignada a un cliente (RF-51), con sus dos últimas mediciones
// para mostrar el último valor y cuánto cambió.
export type MetricaDeCliente = {
  id: string
  cliente_id: string
  cliente_puede_cargar: boolean
  // Valor al que se apunta (RF-56). Lo fija el entrenador.
  objetivo: number | null
  metrica: Metrica
  ultimas: Pick<Medicion, 'fecha' | 'valor'>[]
}

export type MetricaDeClienteCompleta = Omit<MetricaDeCliente, 'ultimas'> & {
  cliente: { nombre: string }
  // De la más vieja a la más nueva, para la gráfica.
  mediciones: Medicion[]
}

export const etiquetaMejor: Record<Mejor, string> = {
  mayor: 'Más es mejor',
  menor: 'Menos es mejor',
  ninguno: 'Depende del objetivo',
}

const BUCKET = 'videos'
const columnas = 'id, entrenador_id, nombre, unidad, mejor, protocolo, video_path, archivada'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

const aMetrica = (m: Omit<Metrica, 'mejor'> & { mejor: string }) => ({ ...m, mejor: m.mejor as Mejor })

// Las del entrenador y las predefinidas (RF-50, RF-55). Para un cliente,
// RLS devuelve además las de su entrenador.
export async function listarMetricas(): Promise<MetricaEnLista[]> {
  const { data, error } = await db()
    .from('metricas')
    .select(`${columnas}, cliente_metricas(count)`)
    .order('nombre')
  if (error) throw error
  return data.map(({ cliente_metricas, ...m }) => ({ ...aMetrica(m), clientes: cliente_metricas[0]?.count ?? 0 }))
}

export async function obtenerMetrica(id: string): Promise<Metrica | null> {
  const { data, error } = await db().from('metricas').select(columnas).eq('id', id).maybeSingle()
  if (error) throw error
  return data && aMetrica(data)
}

export async function crearMetrica(entrenadorId: string, datos: DatosMetrica): Promise<string> {
  const { data, error } = await db()
    .from('metricas')
    .insert({ ...datos, entrenador_id: entrenadorId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function actualizarMetrica(id: string, datos: DatosMetrica): Promise<void> {
  const { error } = await db().from('metricas').update(datos).eq('id', id)
  if (error) throw error
}

export async function archivarMetrica(id: string, archivada: boolean): Promise<void> {
  const { error } = await db().from('metricas').update({ archivada }).eq('id', id)
  if (error) throw error
}

// Video del protocolo de medición (RF-50): uno por métrica, en la carpeta
// del entrenador. Reemplazar sube el nuevo y después borra el anterior.
export async function subirVideoMetrica(entrenadorId: string, metrica: Metrica, video: VideoListo): Promise<void> {
  const extension = video.tipo === 'video/quicktime' ? 'mov' : 'mp4'
  const ruta = `${entrenadorId}/metricas/${metrica.id}/${crypto.randomUUID()}.${extension}`
  const subida = await db().storage.from(BUCKET).upload(ruta, video.archivo, { contentType: video.tipo })
  if (subida.error) throw subida.error
  const { error } = await db().from('metricas').update({ video_path: ruta }).eq('id', metrica.id)
  if (error) {
    await db().storage.from(BUCKET).remove([ruta])
    throw error
  }
  if (metrica.video_path) await db().storage.from(BUCKET).remove([metrica.video_path])
}

export async function quitarVideoMetrica(metrica: Metrica): Promise<void> {
  if (!metrica.video_path) return
  const { error } = await db().from('metricas').update({ video_path: null }).eq('id', metrica.id)
  if (error) throw error
  await db().storage.from(BUCKET).remove([metrica.video_path])
}

export async function urlDeVideoMetrica(ruta: string): Promise<string | null> {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(ruta, 60 * 60)
  if (error) return null
  return data.signedUrl
}

// Asignaciones (RF-51, RF-53)

const columnasAsignacion = `id, cliente_id, cliente_puede_cargar, objetivo, metricas(${columnas}), mediciones(fecha, valor)`

type FilaAsignacion = {
  id: string
  cliente_id: string
  cliente_puede_cargar: boolean
  objetivo: number | null
  metricas: Omit<Metrica, 'mejor'> & { mejor: string }
  mediciones: { fecha: string; valor: number }[]
}

const aAsignacion = ({ metricas, mediciones, ...a }: FilaAsignacion): MetricaDeCliente => ({
  ...a,
  metrica: aMetrica(metricas),
  ultimas: mediciones,
})

// Sin cliente, RLS devuelve las del usuario: el cliente ve las suyas.
export async function listarMetricasDeCliente(clienteId?: string): Promise<MetricaDeCliente[]> {
  let consulta = db()
    .from('cliente_metricas')
    .select(columnasAsignacion)
    .order('fecha', { referencedTable: 'mediciones', ascending: false })
    .order('created_at', { referencedTable: 'mediciones', ascending: false })
    .limit(2, { referencedTable: 'mediciones' })
  if (clienteId) consulta = consulta.eq('cliente_id', clienteId)
  const { data, error } = await consulta
  if (error) throw error
  return data.map(aAsignacion).sort((a, b) => a.metrica.nombre.localeCompare(b.metrica.nombre))
}

export async function obtenerMetricaDeCliente(id: string): Promise<MetricaDeClienteCompleta | null> {
  const { data, error } = await db()
    .from('cliente_metricas')
    .select(
      `id, cliente_id, cliente_puede_cargar, objetivo, clientes(nombre), metricas(${columnas}),
       mediciones(id, fecha, intentos, valor, nota, registrada_por, created_at)`,
    )
    .eq('id', id)
    .order('fecha', { referencedTable: 'mediciones' })
    .order('created_at', { referencedTable: 'mediciones' })
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { metricas, clientes, mediciones, ...a } = data
  return {
    ...a,
    metrica: aMetrica(metricas),
    cliente: clientes,
    mediciones: mediciones.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      intentos: m.intentos,
      valor: m.valor,
      nota: m.nota,
      registrada_por: m.registrada_por,
    })),
  }
}

// Asigna la métrica a varios clientes. Si alguno ya la tenía, se saltea.
export async function asignarMetrica(metricaId: string, clienteIds: string[], clientePuedeCargar: boolean): Promise<void> {
  const { error } = await db()
    .from('cliente_metricas')
    .upsert(
      clienteIds.map((cliente_id) => ({ cliente_id, metrica_id: metricaId, cliente_puede_cargar: clientePuedeCargar })),
      { onConflict: 'cliente_id,metrica_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function cambiarPermisoDeCarga(id: string, clientePuedeCargar: boolean): Promise<void> {
  const { error } = await db().from('cliente_metricas').update({ cliente_puede_cargar: clientePuedeCargar }).eq('id', id)
  if (error) throw error
}

export async function guardarObjetivo(id: string, objetivo: number | null): Promise<void> {
  const { error } = await db().from('cliente_metricas').update({ objetivo }).eq('id', id)
  if (error) throw error
}

// Borra también sus mediciones (cascada en la base).
export async function quitarAsignacion(id: string): Promise<void> {
  const { error } = await db().from('cliente_metricas').delete().eq('id', id)
  if (error) throw error
}

// Mediciones (RF-52). El valor lo calcula la base según la métrica.

export async function crearMedicion(asignacionId: string, fecha: string, intentos: number[], nota: string | null): Promise<void> {
  const fila = { cliente_metrica_id: asignacionId, fecha, intentos, nota }
  // `valor` es obligatorio en la tabla, así que los tipos generados lo piden,
  // pero lo completa el trigger calcular_valor_medicion y la API no deja
  // mandarlo. Se omite a propósito.
  const { error } = await db()
    .from('mediciones')
    .insert(fila as typeof fila & { valor: number })
  if (error) throw error
}

export async function actualizarMedicion(id: string, fecha: string, intentos: number[], nota: string | null): Promise<void> {
  const { error } = await db().from('mediciones').update({ fecha, intentos, nota }).eq('id', id)
  if (error) throw error
}

export async function borrarMedicion(id: string): Promise<void> {
  const { error } = await db().from('mediciones').delete().eq('id', id)
  if (error) throw error
}

// Estadísticas (RF-54)

export function mejorMarca(metrica: Pick<Metrica, 'mejor'>, mediciones: Pick<Medicion, 'valor' | 'fecha'>[]) {
  if (metrica.mejor === 'ninguno' || mediciones.length === 0) return null
  return mediciones.reduce((mejor, m) =>
    (metrica.mejor === 'mayor' ? m.valor > mejor.valor : m.valor < mejor.valor) ? m : mejor,
  )
}

// Cómo leer un cambio: si subió, ¿es bueno o malo? ('neutro' si no hay "mejor").
export function sentidoDelCambio(metrica: Pick<Metrica, 'mejor'>, diferencia: number): 'mejora' | 'empeora' | 'neutro' {
  if (diferencia === 0 || metrica.mejor === 'ninguno') return 'neutro'
  return (diferencia > 0) === (metrica.mejor === 'mayor') ? 'mejora' : 'empeora'
}

// RF-62: las mediciones que superaron a todas las anteriores (van en orden
// de fecha). La primera no cuenta: no tiene con qué compararse.
export function recordsDeMetrica(metrica: Pick<Metrica, 'mejor'>, mediciones: Pick<Medicion, 'id' | 'valor'>[]): Set<string> {
  const records = new Set<string>()
  if (metrica.mejor === 'ninguno') return records
  let mejor: number | null = null
  for (const m of mediciones) {
    if (mejor !== null && (metrica.mejor === 'mayor' ? m.valor > mejor : m.valor < mejor)) records.add(m.id)
    if (mejor === null || (metrica.mejor === 'mayor' ? m.valor > mejor : m.valor < mejor)) mejor = m.valor
  }
  return records
}

// El valor que va a calcular la base para una toma (ver calcular_valor_medicion).
export function valorDeIntentos(metrica: Pick<Metrica, 'mejor'>, intentos: number[]): number {
  if (metrica.mejor === 'mayor') return Math.max(...intentos)
  if (metrica.mejor === 'menor') return Math.min(...intentos)
  return intentos[intentos.length - 1]
}
