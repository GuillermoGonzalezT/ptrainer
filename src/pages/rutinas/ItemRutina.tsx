import { AreaDeTexto, Campo } from '../../components/Formulario.tsx'
import { Segmentos } from '../../components/Segmentos.tsx'
import type { Borrador } from './borrador.ts'
import styles from './rutinas.module.css'

type Props = {
  numero: number
  // A1, A2… si está en una superserie (RF-33).
  superserie: string | null
  // Está unido al de abajo: el descanso va recién después del último de la vuelta.
  sinDescanso: boolean
  item: Borrador
  abierto: boolean
  esPrimero: boolean
  esUltimo: boolean
  onAbrir: () => void
  onCambio: (cambios: Partial<Borrador>) => void
  onMover: (direccion: -1 | 1) => void
  onQuitar: () => void
}

// Resumen corto para la tarjeta cerrada: "3 × 10 · 60 kg · 90 s".
function resumen(b: Borrador): string {
  const volumen =
    b.modo === 'tiempo'
      ? `${b.series} × ${b.segundos || '?'} s`
      : b.repsMax
        ? `${b.series} × ${b.repsMin}–${b.repsMax}`
        : b.repsMin
          ? `${b.series} × ${b.repsMin}`
          : `${b.series} series`
  const partes = [volumen]
  if (b.carga === 'kg' && b.cargaValor) partes.push(`${b.cargaValor} kg`)
  if (b.carga === 'pct' && b.cargaValor) partes.push(`${b.cargaValor} % 1RM`)
  if (b.rpe) partes.push(`RPE ${b.rpe}`)
  if (b.rir) partes.push(`RIR ${b.rir}`)
  if (b.descanso) partes.push(`${b.descanso} s`)
  return partes.join(' · ')
}

export function ItemRutina({
  numero,
  superserie,
  sinDescanso,
  item,
  abierto,
  esPrimero,
  esUltimo,
  onAbrir,
  onCambio,
  onMover,
  onQuitar,
}: Props) {
  return (
    <li className={styles.item}>
      <button type="button" className={styles.itemCabecera} aria-expanded={abierto} onClick={onAbrir}>
        <span className={styles.itemNumero}>{numero}</span>
        <span className={styles.itemTexto}>
          <span className={styles.itemNombre}>{item.ejercicio.nombre}</span>
          <span className={styles.itemResumen}>{resumen(item)}</span>
        </span>
        {superserie && <span className={styles.superserie}>{superserie}</span>}
        <span className={styles.itemFlecha} aria-hidden="true">
          {abierto ? '▴' : '▾'}
        </span>
      </button>

      {abierto && (
        <div className={styles.itemCuerpo}>
          <div className={styles.fila2}>
            <Campo
              etiqueta="Series"
              inputMode="numeric"
              required
              value={item.series}
              onChange={(e) => onCambio({ series: e.target.value })}
            />
            <Campo
              etiqueta="Descanso (s)"
              inputMode="numeric"
              ayuda={sinDescanso ? 'Va unido al de abajo: se pasa directo al siguiente y el descanso queda al final de la vuelta.' : undefined}
              value={item.descanso}
              onChange={(e) => onCambio({ descanso: e.target.value })}
            />
          </div>

          <Segmentos
            etiqueta="Repeticiones o tiempo"
            opciones={[
              { valor: 'reps', etiqueta: 'Repeticiones' },
              { valor: 'tiempo', etiqueta: 'Tiempo' },
            ]}
            valor={item.modo}
            onCambio={(modo) => onCambio({ modo })}
          />
          {item.modo === 'reps' ? (
            <div className={styles.fila2}>
              <Campo
                etiqueta="Repeticiones"
                inputMode="numeric"
                value={item.repsMin}
                onChange={(e) => onCambio({ repsMin: e.target.value })}
              />
              <Campo
                etiqueta="Hasta (opcional)"
                inputMode="numeric"
                ayuda="Para un rango: 8 a 12."
                value={item.repsMax}
                onChange={(e) => onCambio({ repsMax: e.target.value })}
              />
            </div>
          ) : (
            <Campo
              etiqueta="Segundos por serie"
              inputMode="numeric"
              value={item.segundos}
              onChange={(e) => onCambio({ segundos: e.target.value })}
            />
          )}

          <Segmentos
            etiqueta="Carga"
            opciones={[
              { valor: 'ninguna', etiqueta: 'Sin carga' },
              { valor: 'kg', etiqueta: 'Kilos' },
              { valor: 'pct', etiqueta: '% 1RM' },
            ]}
            valor={item.carga}
            onCambio={(carga) => onCambio({ carga })}
          />
          {item.carga !== 'ninguna' && (
            <Campo
              etiqueta={item.carga === 'kg' ? 'Kilos' : '% de 1RM'}
              inputMode="decimal"
              value={item.cargaValor}
              onChange={(e) => onCambio({ cargaValor: e.target.value })}
            />
          )}

          <div className={styles.fila3}>
            <Campo etiqueta="RPE" inputMode="decimal" value={item.rpe} onChange={(e) => onCambio({ rpe: e.target.value })} />
            <Campo etiqueta="RIR" inputMode="numeric" value={item.rir} onChange={(e) => onCambio({ rir: e.target.value })} />
            <Campo
              etiqueta="Tempo"
              maxLength={20}
              placeholder="3-1-1"
              value={item.tempo}
              onChange={(e) => onCambio({ tempo: e.target.value })}
            />
          </div>

          <label className={styles.casilla}>
            <input type="checkbox" checked={item.pedirRpe} onChange={(e) => onCambio({ pedirRpe: e.target.checked })} />
            Pedirle al cliente que anote el RPE de cada serie
          </label>

          <AreaDeTexto
            etiqueta="Notas para el cliente"
            maxLength={1000}
            rows={2}
            value={item.notas}
            onChange={(e) => onCambio({ notas: e.target.value })}
          />

          {!esUltimo && (
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={item.unidoConSiguiente}
                onChange={(e) => onCambio({ unidoConSiguiente: e.target.checked })}
              />
              Hacerlo seguido del de abajo, sin descanso en el medio
            </label>
          )}

          <div className={styles.itemAcciones}>
            <button type="button" className={styles.accion} disabled={esPrimero} onClick={() => onMover(-1)}>
              ↑ Subir
            </button>
            <button type="button" className={styles.accion} disabled={esUltimo} onClick={() => onMover(1)}>
              ↓ Bajar
            </button>
            <button type="button" className={styles.quitar} onClick={onQuitar}>
              Quitar
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
