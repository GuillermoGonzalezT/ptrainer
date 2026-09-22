// Cálculos de las calculadoras (RF-48).

// 1RM estimado con dos fórmulas conocidas; se muestra el promedio. Más allá
// de ~10 repeticiones las fórmulas pierden precisión.
export function unoRM(peso: number, reps: number): { epley: number; brzycki: number; promedio: number } {
  if (reps <= 1) return { epley: peso, brzycki: peso, promedio: peso }
  const epley = peso * (1 + reps / 30)
  const brzycki = reps < 37 ? (peso * 36) / (37 - reps) : epley
  return { epley, brzycki, promedio: (epley + brzycki) / 2 }
}

// Redondea al múltiplo de `paso` más cercano (2,5 kg: lo que se puede cargar
// en una barra con discos de 1,25).
export function redondear(peso: number, paso = 2.5): number {
  return Math.round(peso / paso) * paso
}

export const DISCOS_COMUNES = [25, 20, 15, 10, 5, 2.5, 1.25]

// Qué discos poner de cada lado para llegar al total, empezando por los más
// pesados. `resto` es lo que no se pudo armar con esos discos.
export function discosPorLado(total: number, barra: number, disponibles = DISCOS_COMUNES): { porLado: number[]; resto: number } {
  let lado = (total - barra) / 2
  const porLado: number[] = []
  if (lado <= 0) return { porLado, resto: Math.max(0, total - barra) }
  for (const disco of [...disponibles].sort((a, b) => b - a)) {
    while (lado + 1e-9 >= disco) {
      porLado.push(disco)
      lado -= disco
    }
  }
  return { porLado, resto: Math.round(lado * 2 * 100) / 100 }
}
