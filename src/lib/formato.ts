const fechaCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Las fechas sin hora (`2026-09-21`) se leen como fecha local; si no,
// `new Date` las toma en UTC y en Uruguay mostraría el día anterior.
function aFecha(valor: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor)
}

export function formatearFecha(valor: string): string {
  return fechaCorta.format(aFecha(valor))
}

export function formatearFechaHora(valor: string): string {
  return fechaHora.format(aFecha(valor))
}

export function edad(fechaNacimiento: string, hoy = new Date()): number {
  const nacimiento = aFecha(fechaNacimiento)
  let anios = hoy.getFullYear() - nacimiento.getFullYear()
  const cumpleEsteAnio = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
  if (hoy < cumpleEsteAnio) anios -= 1
  return anios
}

// Para buscar sin que importen tildes ni mayúsculas: "Martín" encuentra "martin".
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
