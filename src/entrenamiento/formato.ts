import type { SerieHecha } from '../datos/sesiones.ts'

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

// "60 × 8", "30 s", "8 reps", "20 kg × 30 s"
export function formatearSerie(s: Pick<SerieHecha, 'peso_kg' | 'reps' | 'segundos'>): string {
  const cantidad = s.segundos !== null ? `${s.segundos} s` : s.reps !== null ? String(s.reps) : '?'
  if (s.peso_kg !== null && s.peso_kg > 0) return `${numero.format(s.peso_kg)} × ${cantidad}`
  return s.segundos !== null ? cantidad : `${cantidad} reps`
}

export function formatearSeries(series: SerieHecha[]): string {
  return series.map(formatearSerie).join(' · ')
}

export function formatearReloj(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatearDuracion(desde: string, hasta: string): string {
  const minutos = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000)
  if (minutos < 60) return `${minutos} min`
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`
}
