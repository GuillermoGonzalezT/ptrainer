import type { Franja, Turno } from '../datos/agenda.ts'
import type { Dia } from '../datos/rutinas.ts'

// Cuentas de la agenda (RF-80 a RF-82). Las franjas están en la hora local del
// entrenador, que puede no ser la del teléfono de quien mira: todo lo que
// convierte entre una hora local y un instante pasa por `zona`.

const MINUTO = 60_000
const PASO = 30 * MINUTO

// Cuánto se corre esa zona respecto de UTC en ese instante, en ms.
function desfase(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? '0')
  // 24 aparece a la medianoche en algunos motores.
  const hora = valor('hour') % 24
  const comoUtc = Date.UTC(valor('year'), valor('month') - 1, valor('day'), hora, valor('minute'), valor('second'))
  return comoUtc - instante.getTime()
}

// El instante en que son las `hora` del día `fecha` en esa zona. Se corrige
// dos veces porque el desfase depende del instante que se está buscando (y
// cambia con el horario de verano).
export function instanteLocal(fecha: string, hora: string, zona: string): Date {
  const comoSiFueraUtc = new Date(`${fecha}T${hora.slice(0, 5)}:00Z`).getTime()
  let d = new Date(comoSiFueraUtc - desfase(new Date(comoSiFueraUtc), zona))
  d = new Date(comoSiFueraUtc - desfase(d, zona))
  return d
}

// La fecha (YYYY-MM-DD) y el día de la semana de un instante, en esa zona.
export function fechaEnZona(instante: Date, zona: string): string {
  const d = new Date(instante.getTime() + desfase(instante, zona))
  return d.toISOString().slice(0, 10)
}

export function diaDeLaSemana(fecha: string): Dia {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay()
  return (d === 0 ? 7 : d) as Dia
}

// El lunes de la semana de `fecha`, como YYYY-MM-DD.
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (diaDeLaSemana(fecha) - 1))
  return d.toISOString().slice(0, 10)
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function minutosDeTurno(turno: Pick<Turno, 'inicia_en' | 'termina_en'>): number {
  return Math.round((Date.parse(turno.termina_en) - Date.parse(turno.inicia_en)) / MINUTO)
}

// Los huecos de un día en los que el cliente puede reservar: dentro de una
// franja, del largo pedido, libres y todavía por venir.
export function huecosLibres(
  fecha: string,
  franjas: Franja[],
  turnos: Pick<Turno, 'inicia_en' | 'termina_en' | 'estado'>[],
  minutos: number,
  zona: string,
  ahora = new Date(),
): { inicia: Date; termina: Date }[] {
  const dia = diaDeLaSemana(fecha)
  const ocupados = turnos
    .filter((t) => t.estado !== 'cancelado')
    .map((t) => [Date.parse(t.inicia_en), Date.parse(t.termina_en)] as const)

  const huecos: { inicia: Date; termina: Date }[] = []
  for (const franja of franjas.filter((f) => f.dia === dia)) {
    const abre = instanteLocal(fecha, franja.desde, zona).getTime()
    const cierra = instanteLocal(fecha, franja.hasta, zona).getTime()
    // La grilla va cada media hora, no de a turnos enteros: en una franja de
    // 8 a 12 con algo tomado de 9 a 10, un turno de 90 minutos entra de 10 a
    // 11:30, y con pasos de 90 no se encontraría.
    for (let t = abre; t + minutos * MINUTO <= cierra; t += PASO) {
      const fin = t + minutos * MINUTO
      if (t < ahora.getTime()) continue
      if (ocupados.some(([desde, hasta]) => t < hasta && fin > desde)) continue
      huecos.push({ inicia: new Date(t), termina: new Date(fin) })
    }
  }
  return huecos.sort((a, b) => a.inicia.getTime() - b.inicia.getTime())
}

export function formatearHora(instante: string | Date, zona?: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: zona,
  }).format(new Date(instante))
}

export function formatearRango(turno: Pick<Turno, 'inicia_en' | 'termina_en'>, zona?: string): string {
  return `${formatearHora(turno.inicia_en, zona)}–${formatearHora(turno.termina_en, zona)}`
}

// RF-82: un .ics con los turnos, para abrir en cualquier calendario. Las horas
// van en UTC, que es lo que todos entienden sin discutir zonas.
export function aIcs(
  turnos: (Turno & { cliente?: { nombre: string } | null })[],
  // El entrenador quiere ver con quién entrena; al cliente, decirle su propio
  // nombre no le aporta nada.
  resumen: (t: Turno & { cliente?: { nombre: string } | null }) => string = (t) =>
    t.cliente?.nombre ? `Entrenamiento con ${t.cliente.nombre}` : 'Agenda bloqueada',
): string {
  const utc = (iso: string) => new Date(iso).toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}/, '')
  // Las comas, los punto y coma y los saltos de línea se escapan (RFC 5545).
  const texto = (s: string) => s.replaceAll('\\', '\\\\').replaceAll(/([,;])/g, '\\$1').replaceAll('\n', '\\n')

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PTrainer//Agenda//ES',
    'CALSCALE:GREGORIAN',
  ]
  for (const t of turnos.filter((t) => t.estado !== 'cancelado')) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@ptrainer`,
      `DTSTAMP:${utc(new Date().toISOString())}`,
      `DTSTART:${utc(t.inicia_en)}`,
      `DTEND:${utc(t.termina_en)}`,
      `SUMMARY:${texto(resumen(t))}`,
      `STATUS:${t.estado === 'confirmado' ? 'CONFIRMED' : 'TENTATIVE'}`,
    )
    if (t.lugar) lineas.push(`LOCATION:${texto(t.lugar)}`)
    if (t.nota) lineas.push(`DESCRIPTION:${texto(t.nota)}`)
    lineas.push('END:VEVENT')
  }
  lineas.push('END:VCALENDAR')
  // CRLF, como pide el formato.
  return `${lineas.join('\r\n')}\r\n`
}
