// Prepara un video antes de subirlo (RF-22): controla la duración y lo
// comprime en el teléfono a 720p y ~1 Mbps, para que un video de 30 s pese
// unos 4 MB en vez de 15-50 MB (ver P-01 y P-02 en los requisitos).
//
// mediabunny se importa recién acá adentro: pesa, y solo hace falta al subir.

export const DURACION_MAXIMA_S = 30
// Tope por archivo del plan gratis de Supabase; también es el del bucket.
export const PESO_MAXIMO = 50 * 1024 * 1024

const LADO_CORTO = 720
const BITRATE_VIDEO = 1_000_000
const BITRATE_AUDIO = 96_000

export class ErrorDeVideo extends Error {}

export type VideoListo = {
  archivo: Blob
  tipo: 'video/mp4' | 'video/quicktime'
  duracion: number
}

export async function prepararVideo(archivo: File, alAvanzar: (progreso: number) => void): Promise<VideoListo> {
  const mb = await import('mediabunny')
  const input = new mb.Input({ source: new mb.BlobSource(archivo), formats: mb.ALL_FORMATS })

  let duracion: number
  let pista: Awaited<ReturnType<typeof input.getPrimaryVideoTrack>>
  try {
    duracion = await input.computeDuration()
    pista = await input.getPrimaryVideoTrack()
  } catch {
    throw new ErrorDeVideo('No se pudo leer el archivo. Probá con otro video.')
  }
  if (!pista) throw new ErrorDeVideo('El archivo no tiene video.')
  if (duracion > DURACION_MAXIMA_S + 0.5) {
    throw new ErrorDeVideo(`El video dura ${Math.round(duracion)} s y el máximo es ${DURACION_MAXIMA_S} s. Recortalo y probá de nuevo.`)
  }

  // Sin codificador H.264 en este navegador: se sube el original si entra.
  if (!(await mb.canEncodeVideo('avc'))) return original(archivo, duracion)

  const vertical = pista.displayWidth <= pista.displayHeight
  const ladoCorto = Math.min(pista.displayWidth, pista.displayHeight)
  const escala = ladoCorto <= LADO_CORTO ? {} : vertical ? { width: LADO_CORTO } : { height: LADO_CORTO }

  const output = new mb.Output({
    // fastStart: los datos para empezar a reproducir van al principio del archivo.
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget(),
  })
  const conversion = await mb.Conversion.init({
    input,
    output,
    video: { ...escala, codec: 'avc', frameRate: 30, quality: new mb.Quality({ bitrate: BITRATE_VIDEO }) },
    audio: { quality: new mb.Quality({ bitrate: BITRATE_AUDIO }) },
    showWarnings: false,
  })
  if (!conversion.isValid) return original(archivo, duracion)

  conversion.onProgress = (progreso) => alAvanzar(progreso)
  try {
    await conversion.execute()
  } catch {
    return original(archivo, duracion)
  }

  const buffer = output.target.buffer
  if (!buffer) return original(archivo, duracion)
  const comprimido = new Blob([buffer], { type: 'video/mp4' })
  // Un video que ya venía liviano puede quedar más pesado al recomprimirlo.
  if (comprimido.size >= archivo.size && esTipoAceptado(archivo.type)) return original(archivo, duracion)
  return { archivo: comprimido, tipo: 'video/mp4', duracion }
}

function esTipoAceptado(tipo: string): tipo is VideoListo['tipo'] {
  return tipo === 'video/mp4' || tipo === 'video/quicktime'
}

function original(archivo: File, duracion: number): VideoListo {
  if (archivo.size > PESO_MAXIMO) {
    throw new ErrorDeVideo('El video pesa más de 50 MB y este navegador no lo puede comprimir. Probá con uno más corto.')
  }
  // Algunos Android no informan el tipo; lo que graba la cámara es MP4.
  const tipo = esTipoAceptado(archivo.type) ? archivo.type : archivo.type === '' ? 'video/mp4' : null
  if (!tipo) throw new ErrorDeVideo('Ese formato de video no se puede subir. Usá MP4 o MOV.')
  return { archivo, tipo, duracion }
}
