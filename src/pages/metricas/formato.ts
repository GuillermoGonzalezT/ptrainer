import { sentidoDelCambio, type Metrica } from '../../datos/metricas.ts'

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

export function conUnidad(valor: number, unidad: string): string {
  return `${numero.format(valor)} ${unidad}`
}

// "+3 cm", "−0,5 kg" y si ese cambio es una mejora (para el color del aviso).
export function describirCambio(metrica: Pick<Metrica, 'mejor' | 'unidad'>, actual: number, anterior: number) {
  const diferencia = Math.round((actual - anterior) * 1000) / 1000
  const signo = diferencia > 0 ? '+' : diferencia < 0 ? '−' : '±'
  return {
    texto: `${signo}${numero.format(Math.abs(diferencia))} ${metrica.unidad}`,
    sentido: sentidoDelCambio(metrica, diferencia),
  }
}

// Acepta coma o punto. null si no es un número.
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

// Hoy como 'AAAA-MM-DD' en la hora local (toISOString daría la fecha en UTC).
export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
