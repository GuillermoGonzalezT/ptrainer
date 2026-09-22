// Semanas de lunes a domingo (hora local) para la adherencia (RF-63).

export const SEMANAS = 8

// Lunes 00:00 (hora local) de la semana de `fecha`.
function lunesDe(fecha: Date): Date {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  return lunes
}

export type Semana = { desde: Date; hechas: number }

export function semanasRecientes(fechasSesiones: string[], hoy = new Date()): Semana[] {
  const estaSemana = lunesDe(hoy)
  const semanas: Semana[] = Array.from({ length: SEMANAS }, (_, i) => {
    const desde = new Date(estaSemana)
    desde.setDate(desde.getDate() - 7 * (SEMANAS - 1 - i))
    return { desde, hechas: 0 }
  })
  for (const f of fechasSesiones) {
    const lunes = lunesDe(new Date(f)).getTime()
    const semana = semanas.find((s) => s.desde.getTime() === lunes)
    if (semana) semana.hechas += 1
  }
  return semanas
}
