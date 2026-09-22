import type { VideoListo } from '../lib/comprimirVideo.ts'
import { supabase } from '../lib/supabase.ts'

export type Ejercicio = {
  id: string
  entrenador_id: string | null
  nombre: string
  grupo_muscular: string | null
  equipamiento: string | null
  descripcion: string | null
  consejos: string | null
  archivado: boolean
}

export type EjercicioEnLista = Ejercicio & { videos: number }

export type DatosEjercicio = Pick<Ejercicio, 'nombre' | 'grupo_muscular' | 'equipamiento' | 'descripcion' | 'consejos'>

export type VideoEjercicio = {
  id: string
  storage_path: string
  duracion_s: number | null
  orden: number
  principal: boolean
}

// Opciones fijas para poder filtrar (RF-20). "Otro" cubre lo que no entre.
export const gruposMusculares = [
  'Piernas',
  'Glúteos',
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cuerpo completo',
  'Cardio',
  'Movilidad',
  'Otro',
]

export const equipamientos = [
  'Peso corporal',
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Máquina',
  'Polea',
  'Banda elástica',
  'Balón medicinal',
  'TRX',
  'Otro',
]

const BUCKET = 'videos'
// Las URLs firmadas duran una hora: alcanza para mirar el video y vencen solas.
const DURACION_URL_S = 60 * 60

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

const columnas = 'id, entrenador_id, nombre, grupo_muscular, equipamiento, descripcion, consejos, archivado'

export async function listarEjercicios(): Promise<EjercicioEnLista[]> {
  const { data, error } = await db()
    .from('ejercicios')
    .select(`${columnas}, ejercicio_videos(count)`)
    .order('nombre')
  if (error) throw error
  return data.map(({ ejercicio_videos, ...e }) => ({ ...e, videos: ejercicio_videos[0]?.count ?? 0 }))
}

export async function obtenerEjercicio(id: string): Promise<Ejercicio | null> {
  const { data, error } = await db().from('ejercicios').select(columnas).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function crearEjercicio(entrenadorId: string, datos: DatosEjercicio): Promise<string> {
  const { data, error } = await db()
    .from('ejercicios')
    .insert({ ...datos, entrenador_id: entrenadorId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function actualizarEjercicio(id: string, datos: DatosEjercicio): Promise<void> {
  const { error } = await db().from('ejercicios').update(datos).eq('id', id)
  if (error) throw error
}

// RF-24: copia un ejercicio de la biblioteca base a la del entrenador, para
// poder editarlo y grabarle su propio video.
export async function copiarEjercicio(entrenadorId: string, ejercicio: Ejercicio): Promise<string> {
  return crearEjercicio(entrenadorId, {
    nombre: ejercicio.nombre,
    grupo_muscular: ejercicio.grupo_muscular,
    equipamiento: ejercicio.equipamiento,
    descripcion: ejercicio.descripcion,
    consejos: ejercicio.consejos,
  })
}

// RF-21: archivado no aparece al armar rutinas, pero sigue en el historial.
export async function archivarEjercicio(id: string, archivado: boolean): Promise<void> {
  const { error } = await db().from('ejercicios').update({ archivado }).eq('id', id)
  if (error) throw error
}

// Videos (RF-22, RF-23)

export async function listarVideos(ejercicioId: string): Promise<VideoEjercicio[]> {
  const { data, error } = await db()
    .from('ejercicio_videos')
    .select('id, storage_path, duracion_s, orden, principal')
    .eq('ejercicio_id', ejercicioId)
    .order('orden')
  if (error) throw error
  return data
}

// Una URL temporal por video, en el mismo orden. null si no se pudo firmar.
export async function urlsDeVideos(videos: VideoEjercicio[]): Promise<(string | null)[]> {
  if (videos.length === 0) return []
  const { data, error } = await db()
    .storage.from(BUCKET)
    .createSignedUrls(
      videos.map((v) => v.storage_path),
      DURACION_URL_S,
    )
  if (error) throw error
  return videos.map((v) => data.find((d) => d.path === v.storage_path)?.signedUrl ?? null)
}

// Sube el archivo a la carpeta del entrenador y después registra el video.
// Si falla el registro, borra el archivo para no dejarlo huérfano.
export async function subirVideo(
  entrenadorId: string,
  ejercicioId: string,
  video: VideoListo,
  existentes: VideoEjercicio[],
): Promise<void> {
  const extension = video.tipo === 'video/quicktime' ? 'mov' : 'mp4'
  const ruta = `${entrenadorId}/ejercicios/${ejercicioId}/${crypto.randomUUID()}.${extension}`
  const subida = await db().storage.from(BUCKET).upload(ruta, video.archivo, { contentType: video.tipo })
  if (subida.error) throw subida.error

  const { error } = await db()
    .from('ejercicio_videos')
    .insert({
      ejercicio_id: ejercicioId,
      storage_path: ruta,
      duracion_s: Math.round(video.duracion * 10) / 10,
      orden: existentes.reduce((max, v) => Math.max(max, v.orden + 1), 0),
      principal: !existentes.some((v) => v.principal),
    })
  if (error) {
    await db().storage.from(BUCKET).remove([ruta])
    throw error
  }
}

// Primero se borra el registro: si después falla borrar el archivo, queda un
// archivo sin usar, que es mejor que un registro apuntando a la nada.
export async function borrarVideo(video: VideoEjercicio): Promise<void> {
  const { error } = await db().from('ejercicio_videos').delete().eq('id', video.id)
  if (error) throw error
  await db().storage.from(BUCKET).remove([video.storage_path])
}

// Solo uno puede ser principal (índice único en la base): se desmarca el
// actual antes de marcar el nuevo.
export async function marcarPrincipal(ejercicioId: string, videoId: string): Promise<void> {
  const quitar = await db()
    .from('ejercicio_videos')
    .update({ principal: false })
    .eq('ejercicio_id', ejercicioId)
    .eq('principal', true)
  if (quitar.error) throw quitar.error
  const { error } = await db().from('ejercicio_videos').update({ principal: true }).eq('id', videoId)
  if (error) throw error
}

// Intercambia el orden de dos videos.
export async function intercambiarOrden(a: VideoEjercicio, b: VideoEjercicio): Promise<void> {
  const primero = await db().from('ejercicio_videos').update({ orden: b.orden }).eq('id', a.id)
  if (primero.error) throw primero.error
  const segundo = await db().from('ejercicio_videos').update({ orden: a.orden }).eq('id', b.id)
  if (segundo.error) throw segundo.error
}
