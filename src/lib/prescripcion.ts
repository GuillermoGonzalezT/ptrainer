import type { Dia, Prescripcion } from '../datos/rutinas.ts'
import { INTENSIDADES, inicialDia, nombreDia } from '../datos/rutinas.ts'

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

export function formatearDescanso(segundos: number): string {
  if (segundos < 60) return `${segundos} s`
  const min = Math.floor(segundos / 60)
  const resto = segundos % 60
  return resto ? `${min} min ${resto} s` : `${min} min`
}

// "4 × 6–8", "3 × 30 s"
export function formatearVolumen(p: Prescripcion): string {
  if (p.segundos) return `${p.series} × ${formatearDescanso(p.segundos)}`
  if (p.reps_min && p.reps_max && p.reps_max !== p.reps_min) return `${p.series} × ${p.reps_min}–${p.reps_max}`
  if (p.reps_min) return `${p.series} × ${p.reps_min}`
  return `${p.series} ${p.series === 1 ? 'serie' : 'series'}`
}

// El resto de la prescripción, en partes cortas: "60 kg", "RPE 8", "descanso 2 min".
export function detallesPrescripcion(p: Prescripcion): string[] {
  const partes: string[] = []
  if (p.carga_kg !== null) partes.push(`${numero.format(p.carga_kg)} kg`)
  if (p.carga_pct_1rm !== null) partes.push(`${numero.format(p.carga_pct_1rm)} % 1RM`)
  if (p.rpe !== null) partes.push(`RPE ${numero.format(p.rpe)}`)
  if (p.rir !== null) partes.push(`RIR ${p.rir}`)
  // RF-35: velocidad objetivo de la barra y corte por pérdida de velocidad.
  if (p.velocidad_ms !== null) partes.push(`${numero.format(p.velocidad_ms)} m/s`)
  if (p.perdida_vel_pct !== null) partes.push(`cortar al perder ${p.perdida_vel_pct} %`)
  if (p.intensidad) partes.push(INTENSIDADES.find((i) => i.valor === p.intensidad)!.etiqueta.toLowerCase())
  // Guiones que no cortan la línea: "3-1-1" no se parte en dos renglones.
  if (p.tempo) partes.push(`tempo ${p.tempo.replaceAll('-', '\u2011')}`)
  if (p.descanso_s !== null) partes.push(`descanso ${formatearDescanso(p.descanso_s)}`)
  return partes
}

export function resumenPrescripcion(p: Prescripcion): string {
  return [formatearVolumen(p), ...detallesPrescripcion(p)].join(' · ')
}

// "Lunes y jueves", "L · M · V", "Sin días fijos"
export function formatearDias(dias: Dia[], corto = false): string {
  if (dias.length === 0) return 'Sin días fijos'
  const ordenados = [...dias].sort()
  if (corto) return ordenados.map((d) => inicialDia[d]).join(' · ')
  const nombres = ordenados.map((d) => nombreDia[d].toLowerCase())
  const texto = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
  return texto[0].toUpperCase() + texto.slice(1)
}
