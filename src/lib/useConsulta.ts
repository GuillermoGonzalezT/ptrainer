import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { mensajeDeError } from './errores.ts'

type Resultado<T> = { clave: string; datos?: T; error?: string }

// Carga datos al montar y cada vez que cambian `deps`. `recargar()` vuelve a
// pedirlos sin borrar los que ya se ven, para que la pantalla no parpadee.
export function useConsulta<T>(pedir: () => Promise<T>, deps: readonly unknown[]) {
  const clave = JSON.stringify(deps)
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)
  const [version, setVersion] = useState(0)

  // `pedir` es una función nueva en cada render: se guarda la última en una
  // ref, y lo que dispara la carga son las deps (vía `clave`).
  const pedirActual = useRef(pedir)
  useLayoutEffect(() => {
    pedirActual.current = pedir
  })

  useEffect(() => {
    let vigente = true
    pedirActual.current().then(
      (datos) => vigente && setResultado({ clave, datos }),
      (e: unknown) => vigente && setResultado({ clave, error: mensajeDeError(e) }),
    )
    return () => {
      vigente = false
    }
  }, [clave, version])

  const actual = resultado?.clave === clave ? resultado : null
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return { datos: actual?.datos, error: actual?.error, cargando: actual === null, recargar }
}
