import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatearFecha } from '../lib/formato.ts'
import styles from './GraficaEvolucion.module.css'

export type Punto = { fecha: string; valor: number }

type Props = {
  puntos: Punto[]
  unidad: string
  // Qué se grafica, para lectores de pantalla ("Salto vertical de Ana").
  descripcion: string
}

const ALTO = 200
const MARGEN = { arriba: 16, derecha: 20, abajo: 28, izquierda: 44 }

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const fechaCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

// Las fechas sin hora se leen como fecha local (ver lib/formato.ts).
const aMs = (fecha: string) => new Date(`${fecha}T00:00:00`).getTime()

// Marcas del eje con números redondos (0, 5, 10… o 0, 0,5, 1…).
function marcasRedondas(min: number, max: number, cantidad = 4): number[] {
  if (min === max) {
    const margen = Math.abs(min) * 0.1 || 1
    min -= margen
    max += margen
  }
  const bruto = (max - min) / cantidad
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto
  const desde = Math.floor(min / paso) * paso
  const hasta = Math.ceil(max / paso) * paso
  const marcas: number[] = []
  for (let v = desde; v <= hasta + paso / 2; v += paso) marcas.push(Math.round(v / paso) * paso)
  return marcas
}

// RF-54: evolución de una métrica en el tiempo. Una sola serie, así que no
// lleva leyenda: el título de la sección dice qué es. La lista de mediciones
// debajo hace de tabla.
export function GraficaEvolucion({ puntos, unidad, descripcion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(320)
  const [elegido, setElegido] = useState<number | null>(null)
  const idDescripcion = useId()

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.round(entrada.contentRect.width)))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  if (puntos.length === 0) return null

  const tiempos = puntos.map((p) => aMs(p.fecha))
  const valores = puntos.map((p) => p.valor)
  const marcas = marcasRedondas(Math.min(...valores), Math.max(...valores))
  const yMin = marcas[0]
  const yMax = marcas.at(-1)!
  const tMin = Math.min(...tiempos)
  const tMax = Math.max(...tiempos)

  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (t: number) => MARGEN.izquierda + (tMax === tMin ? anchoUtil / 2 : ((t - tMin) / (tMax - tMin)) * anchoUtil)
  const y = (v: number) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin)) * altoUtil

  const xs = tiempos.map(x)
  const ys = valores.map(y)
  const linea = xs.map((px, i) => `${i === 0 ? 'M' : 'L'}${px},${ys[i]}`).join(' ')
  const area = `${linea} L${xs.at(-1)},${y(yMin)} L${xs[0]},${y(yMin)} Z`
  const ultimo = puntos.length - 1

  // El cruce busca la medición más cercana en X: se apunta a una fecha, no a
  // un punto de 8px.
  function elegirCercano(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let mejor = 0
    xs.forEach((xi, i) => {
      if (Math.abs(xi - px) < Math.abs(xs[mejor] - px)) mejor = i
    })
    setElegido(mejor)
  }

  function teclado(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const actual = elegido ?? ultimo
      setElegido(Math.max(0, Math.min(ultimo, actual + (e.key === 'ArrowRight' ? 1 : -1))))
    } else if (e.key === 'Escape') {
      setElegido(null)
    }
  }

  const conUnidad = (v: number) => `${numero.format(v)} ${unidad}`
  const ultimoLejosDelBorde = xs[ultimo] < ancho - 60

  return (
    <div ref={contenedor} className={styles.contenedor}>
      <p id={idDescripcion} className={styles.oculto}>
        {descripcion}: {puntos.length} mediciones, de {formatearFecha(puntos[0].fecha)} a{' '}
        {formatearFecha(puntos[ultimo].fecha)}. Última: {conUnidad(valores[ultimo])}. Usá las flechas para recorrerlas.
      </p>
      <svg
        className={styles.svg}
        width={ancho}
        height={ALTO}
        role="img"
        tabIndex={0}
        aria-describedby={idDescripcion}
        onPointerMove={elegirCercano}
        onPointerDown={elegirCercano}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setElegido(null)}
        onKeyDown={teclado}
        onBlur={() => setElegido(null)}
      >
        {marcas.map((m) => (
          <g key={m}>
            <line className={styles.grilla} x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(m)} y2={y(m)} />
            <text className={styles.eje} x={MARGEN.izquierda - 8} y={y(m)} textAnchor="end" dominantBaseline="middle">
              {numero.format(m)}
            </text>
          </g>
        ))}
        <text className={styles.eje} x={xs[0]} y={ALTO - 8} textAnchor={puntos.length === 1 ? 'middle' : 'start'}>
          {fechaCorta.format(tiempos[0])}
        </text>
        {puntos.length > 1 && (
          <text className={styles.eje} x={xs[ultimo]} y={ALTO - 8} textAnchor="end">
            {fechaCorta.format(tiempos[ultimo])}
          </text>
        )}

        <path className={styles.area} d={area} />
        <path className={styles.linea} d={linea} />
        {elegido !== null && (
          <line className={styles.cruce} x1={xs[elegido]} x2={xs[elegido]} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} />
        )}
        {xs.map((px, i) => (
          <circle
            key={i}
            className={i === elegido ? `${styles.punto} ${styles.puntoElegido}` : styles.punto}
            cx={px}
            cy={ys[i]}
            r={i === elegido ? 6 : 4}
          />
        ))}
        {/* Etiqueta directa solo en el último valor; el resto, con el cruce o en la lista. */}
        {elegido === null && (
          <text
            className={styles.etiqueta}
            x={ultimoLejosDelBorde ? xs[ultimo] + 8 : xs[ultimo] - 8}
            y={ys[ultimo] - 10}
            textAnchor={ultimoLejosDelBorde ? 'start' : 'end'}
          >
            {numero.format(valores[ultimo])}
          </text>
        )}
      </svg>

      {elegido !== null && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(Math.max(xs[elegido], 70), ancho - 70),
            top: Math.max(0, ys[elegido] - 58),
          }}
          aria-live="polite"
        >
          <strong>{conUnidad(valores[elegido])}</strong>
          <span>{formatearFecha(puntos[elegido].fecha)}</span>
        </div>
      )}
    </div>
  )
}
