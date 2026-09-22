// Prepara una foto antes de subirla, en JPEG:
// * 'perfil' (RF-11): recorta el cuadrado del centro y achica a 512 px.
// * 'completa' (RF-64): mantiene la foto entera, con el lado más largo en
//   1024 px, para poder comparar dos fechas.
// Una foto de teléfono de 3-5 MB queda en menos de 200 KB.

const LADO_PERFIL = 512
const LADO_COMPLETA = 1024
const CALIDAD = 0.85

export class ErrorDeFoto extends Error {}

export type ModoFoto = 'perfil' | 'completa'

export async function prepararFoto(archivo: File, modo: ModoFoto = 'perfil'): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) throw new ErrorDeFoto('Ese archivo no es una imagen.')

  let imagen: ImageBitmap
  try {
    // from-image: respeta la rotación que guarda la cámara en la foto.
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorDeFoto('No se pudo abrir la imagen. Probá con otra foto.')
  }

  // Recorte: el cuadrado del centro, o la foto entera.
  const recorte =
    modo === 'perfil'
      ? (() => {
          const lado = Math.min(imagen.width, imagen.height)
          return { x: (imagen.width - lado) / 2, y: (imagen.height - lado) / 2, ancho: lado, alto: lado }
        })()
      : { x: 0, y: 0, ancho: imagen.width, alto: imagen.height }
  const maximo = modo === 'perfil' ? LADO_PERFIL : LADO_COMPLETA
  const escala = Math.min(1, maximo / Math.max(recorte.ancho, recorte.alto))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(recorte.ancho * escala)
  canvas.height = Math.round(recorte.alto * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ErrorDeFoto('Este navegador no puede procesar la imagen.')
  ctx.drawImage(imagen, recorte.x, recorte.y, recorte.ancho, recorte.alto, 0, 0, canvas.width, canvas.height)
  imagen.close()

  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, 'image/jpeg', CALIDAD))
  if (!blob) throw new ErrorDeFoto('No se pudo procesar la imagen.')
  return blob
}
