import { supabase } from '../lib/supabase.ts'

// Fotos de clientes (RF-11), en el bucket privado `imagenes`:
// {entrenador_id}/clientes/{cliente_id}/{archivo}. Las sube el entrenador; el
// cliente solo puede ver la suya (ver la migración de Storage).

const BUCKET = 'imagenes'
// Más largas que las de video: las fotos se ven en listas y conviene que el
// navegador las pueda reusar un rato.
const DURACION_URL_S = 6 * 60 * 60

function db() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

// Sube la nueva, la guarda en la ficha y después borra la anterior. Cada foto
// tiene un nombre nuevo, así el navegador nunca muestra una vieja de caché.
export async function subirFotoCliente(
  entrenadorId: string,
  cliente: { id: string; foto_path: string | null },
  foto: Blob,
): Promise<void> {
  const ruta = `${entrenadorId}/clientes/${cliente.id}/${crypto.randomUUID()}.jpg`
  const subida = await db().storage.from(BUCKET).upload(ruta, foto, { contentType: 'image/jpeg' })
  if (subida.error) throw subida.error
  const { error } = await db().from('clientes').update({ foto_path: ruta }).eq('id', cliente.id)
  if (error) {
    await db().storage.from(BUCKET).remove([ruta])
    throw error
  }
  if (cliente.foto_path) await db().storage.from(BUCKET).remove([cliente.foto_path])
}

export async function quitarFotoCliente(cliente: { id: string; foto_path: string | null }): Promise<void> {
  if (!cliente.foto_path) return
  const { error } = await db().from('clientes').update({ foto_path: null }).eq('id', cliente.id)
  if (error) throw error
  await db().storage.from(BUCKET).remove([cliente.foto_path])
}

// Una URL temporal por ruta. Las que no se pudieron firmar no aparecen.
export async function urlsDeFotos(rutas: string[]): Promise<Map<string, string>> {
  const resultado = new Map<string, string>()
  if (rutas.length === 0) return resultado
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(rutas, DURACION_URL_S)
  if (error) throw error
  for (const d of data) if (d.path && d.signedUrl) resultado.set(d.path, d.signedUrl)
  return resultado
}
