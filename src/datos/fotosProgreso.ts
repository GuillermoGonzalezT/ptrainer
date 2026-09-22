import { supabase } from '../lib/supabase.ts'
import { urlsDeFotos } from './fotos.ts'

// Fotos de progreso (RF-64). Van al mismo bucket privado que la foto de la
// ficha, en {entrenador_id}/clientes/{cliente_id}/progreso/.

export type Vista = 'frente' | 'perfil' | 'espalda'

export const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: 'frente', etiqueta: 'Frente' },
  { valor: 'perfil', etiqueta: 'Perfil' },
  { valor: 'espalda', etiqueta: 'Espalda' },
]

export type FotoProgreso = {
  id: string
  cliente_id: string
  fecha: string
  vista: Vista
  storage_path: string
  nota: string | null
  subida_por: string | null
  url: string | null
}

const BUCKET = 'imagenes'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function listarFotosProgreso(clienteId: string): Promise<FotoProgreso[]> {
  const { data, error } = await db()
    .from('fotos_progreso')
    .select('id, cliente_id, fecha, vista, storage_path, nota, subida_por')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })
  if (error) throw error
  const urls = await urlsDeFotos(data.map((f) => f.storage_path))
  return data.map((f) => ({ ...f, vista: f.vista as Vista, url: urls.get(f.storage_path) ?? null }))
}

// Sube el archivo y después lo registra. Si falla el registro, borra el
// archivo para no dejarlo huérfano.
export async function subirFotoProgreso(
  entrenadorId: string,
  clienteId: string,
  datos: { fecha: string; vista: Vista; nota: string | null },
  foto: Blob,
): Promise<void> {
  const ruta = `${entrenadorId}/clientes/${clienteId}/progreso/${crypto.randomUUID()}.jpg`
  const subida = await db().storage.from(BUCKET).upload(ruta, foto, { contentType: 'image/jpeg' })
  if (subida.error) throw subida.error
  const { error } = await db()
    .from('fotos_progreso')
    .insert({ cliente_id: clienteId, storage_path: ruta, ...datos })
  if (error) {
    await db().storage.from(BUCKET).remove([ruta])
    throw error
  }
}

export async function borrarFotoProgreso(foto: Pick<FotoProgreso, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await db().from('fotos_progreso').delete().eq('id', foto.id)
  if (error) throw error
  await db().storage.from(BUCKET).remove([foto.storage_path])
}

// Las fechas con fotos, de la más nueva a la más vieja.
export function fechasConFotos(fotos: FotoProgreso[]): string[] {
  return [...new Set(fotos.map((f) => f.fecha))]
}
