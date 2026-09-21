import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorDelEnlace } from '../lib/enlace.ts'
import { supabase } from '../lib/supabase.ts'
import { AuthContext, tipoDeCuenta, type EstadoAuth, type Ficha, type Rol } from './contexto.ts'

async function cargarRol(uid: string): Promise<Rol> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const [perfil, entrenador, fichas] = await Promise.all([
    supabase.from('perfiles').select('nombre').eq('id', uid).maybeSingle(),
    supabase.from('entrenadores').select('id').eq('id', uid).maybeSingle(),
    supabase.from('clientes').select('id, entrenador_id, nombre, estado').eq('usuario_id', uid),
  ])
  const error = perfil.error ?? entrenador.error ?? fichas.error
  if (error) throw error
  return {
    nombre: perfil.data?.nombre ?? '',
    esEntrenador: entrenador.data !== null,
    fichas: (fichas.data ?? []) as Ficha[],
  }
}

// El resultado de cargar el rol queda asociado a la cuenta que lo pidió: si
// cambia la sesión, el de la cuenta anterior deja de valer sin tener que
// limpiarlo.
type CargaDeRol = { uid: string; rol: Rol | null; error: boolean }

async function intentarCargar(uid: string): Promise<CargaDeRol> {
  try {
    return { uid, rol: await cargarRol(uid), error: false }
  } catch {
    return { uid, rol: null, error: true }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [iniciado, setIniciado] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [carga, setCarga] = useState<CargaDeRol | null>(null)
  const [recuperando, setRecuperando] = useState(false)
  const [errorEnlace, setErrorEnlace] = useState<string | null>(errorDelEnlace)

  useEffect(() => {
    if (!supabase) return
    // No llamar a Supabase dentro de este callback: supabase-js lo ejecuta
    // con un lock tomado y se trabaría. Por eso el rol se carga en otro efecto.
    const { data } = supabase.auth.onAuthStateChange((evento, nueva) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (evento === 'SIGNED_OUT') setRecuperando(false)
      setSession(nueva)
    })
    supabase.auth.initialize().then(({ error }) => {
      if (error) setErrorEnlace(error.code ?? 'error')
      setIniciado(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) return
    let vigente = true
    intentarCargar(uid).then((resultado) => vigente && setCarga(resultado))
    return () => {
      vigente = false
    }
  }, [uid])

  const recargarRol = useCallback(async () => {
    if (uid) setCarga(await intentarCargar(uid))
  }, [uid])

  const actual = uid && carga?.uid === uid ? carga : null
  const rol = actual?.rol ?? null

  const valor = useMemo<EstadoAuth>(
    () => ({
      cargando: !iniciado || (session !== null && actual === null),
      session,
      rol,
      errorRol: actual?.error ?? false,
      tipo: rol ? tipoDeCuenta(rol) : null,
      recuperando,
      errorEnlace,
      recargarRol,
      terminarRecuperacion: () => setRecuperando(false),
      borrarErrorEnlace: () => setErrorEnlace(null),
    }),
    [iniciado, session, actual, rol, recuperando, errorEnlace, recargarRol],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
