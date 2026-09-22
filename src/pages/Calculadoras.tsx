import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Encabezado } from '../components/Encabezado.tsx'
import { Campo } from '../components/Formulario.tsx'
import { Segmentos } from '../components/Segmentos.tsx'
import { discosPorLado, redondear, unoRM } from '../lib/calculos.ts'
import pantalla from '../styles/pantalla.module.css'
import { conUnidad, leerNumero } from './metricas/formato.ts'
import styles from './Calculadoras.module.css'

const PORCENTAJES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

// RF-48: 1RM estimado, porcentajes y discos por lado. Todo se calcula en el
// teléfono, sin conexión.
export function Calculadoras() {
  const navigate = useNavigate()
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [rm, setRm] = useState('')
  const [total, setTotal] = useState('')
  const [barra, setBarra] = useState<'20' | '15' | '10'>('20')

  const p = leerNumero(peso)
  const r = leerNumero(reps)
  const estimado = p !== null && p > 0 && r !== null && r >= 1 && Number.isInteger(r) ? unoRM(p, r) : null
  const base = leerNumero(rm) ?? (estimado ? redondear(estimado.promedio) : null)
  const t = leerNumero(total)
  const discos = t !== null && t > 0 ? discosPorLado(t, Number(barra)) : null

  return (
    <section className={pantalla.pantalla}>
      {/* Se llega desde el perfil o desde un entrenamiento: vuelve a donde estaba. */}
      <Encabezado titulo="Calculadoras" />
      <button type="button" className={styles.volver} onClick={() => navigate(-1)}>
        ‹ Volver
      </button>

      <div className={pantalla.seccion}>
        <h2>1RM estimado</h2>
        <p className={pantalla.textoApagado}>El peso máximo para una repetición, a partir de una serie hasta el fallo.</p>
        <div className={styles.fila}>
          <Campo etiqueta="Kilos" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
          <Campo etiqueta="Repeticiones" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
        {estimado && (
          <>
            <p className={styles.resultado}>≈ {conUnidad(Math.round(estimado.promedio * 10) / 10, 'kg')}</p>
            <p className={pantalla.textoApagado}>
              Epley {conUnidad(Math.round(estimado.epley * 10) / 10, 'kg')} · Brzycki{' '}
              {conUnidad(Math.round(estimado.brzycki * 10) / 10, 'kg')}
              {r !== null && r > 10 && '. Con más de 10 repeticiones la estimación es poco precisa.'}
            </p>
          </>
        )}
      </div>

      <div className={pantalla.seccion}>
        <h2>Porcentajes de 1RM</h2>
        <Campo
          etiqueta="1RM (kg)"
          inputMode="decimal"
          placeholder={estimado ? String(redondear(estimado.promedio)).replace('.', ',') : ''}
          ayuda={estimado && !rm ? 'Usando el 1RM estimado de arriba.' : undefined}
          value={rm}
          onChange={(e) => setRm(e.target.value)}
        />
        {base !== null && base > 0 && (
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">%</th>
                <th scope="col">Kilos</th>
              </tr>
            </thead>
            <tbody>
              {PORCENTAJES.map((pct) => (
                <tr key={pct}>
                  <td>{pct} %</td>
                  <td>{conUnidad(redondear((base * pct) / 100), 'kg')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {base !== null && base > 0 && <p className={pantalla.textoApagado}>Redondeado a 2,5 kg.</p>}
      </div>

      <div className={pantalla.seccion}>
        <h2>Discos por lado</h2>
        <Campo etiqueta="Peso total (kg)" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        <div>
          <p className={pantalla.etiquetaCampo}>Barra</p>
          <Segmentos
            etiqueta="Peso de la barra"
            opciones={[
              { valor: '20', etiqueta: '20 kg' },
              { valor: '15', etiqueta: '15 kg' },
              { valor: '10', etiqueta: '10 kg' },
            ]}
            valor={barra}
            onCambio={setBarra}
          />
        </div>
        {discos && t !== null && (
          <>
            {t < Number(barra) ? (
              <p className={pantalla.textoApagado}>El total es menor que la barra.</p>
            ) : discos.porLado.length === 0 ? (
              <p className={styles.resultado}>Solo la barra</p>
            ) : (
              <p className={styles.resultado}>{discos.porLado.map((d) => String(d).replace('.', ',')).join(' + ')}</p>
            )}
            {discos.porLado.length > 0 && <p className={pantalla.textoApagado}>De cada lado, del más pesado al más liviano.</p>}
            {discos.resto > 0 && (
              <p className={pantalla.textoApagado}>
                Faltan {conUnidad(discos.resto, 'kg')} que no se pueden armar con discos de 1,25 kg o más.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
