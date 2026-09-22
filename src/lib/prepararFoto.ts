// Prepara la foto de un cliente (RF-11): recorta el cuadrado del centro y la
// achica a 512 px en JPEG. Una foto de teléfono de 3-5 MB queda en ~50 KB,
// que es lo que hace falta para una foto de perfil.

const LADO = 512
const CALIDAD = 0.85

export class ErrorDeFoto extends Error {}

export async function prepararFoto(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) throw new ErrorDeFoto('Ese archivo no es una imagen.')

  let imagen: ImageBitmap
  try {
    // from-image: respeta la rotación que guarda la cámara en la foto.
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorDeFoto('No se pudo abrir la imagen. Probá con otra foto.')
  }

  const lado = Math.min(imagen.width, imagen.height)
  const salida = Math.min(LADO, lado)
  const canvas = document.createElement('canvas')
  canvas.width = salida
  canvas.height = salida
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ErrorDeFoto('Este navegador no puede procesar la imagen.')
  ctx.drawImage(
    imagen,
    (imagen.width - lado) / 2,
    (imagen.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    salida,
    salida,
  )
  imagen.close()

  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', CALIDAD))
  if (!blob) throw new ErrorDeFoto('No se pudo procesar la imagen.')
  return blob
}
