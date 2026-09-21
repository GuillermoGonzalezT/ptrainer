import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

export type Ficha = {
  id: string
  entrenador_id: string
  nombre: string
  estado: 'activo' | 'pausado' | 'baja'
}

export type Rol = {
  nombre: string
  esEntrenador: boolean
  fichas: Ficha[]
}

// Qué ve la persona al entrar. Si es entrenador y además cliente de alguien,
// gana entrenador.
export type TipoDeCuenta = 'entrenador' | 'cliente' | 'baja' | 'sin-entrenador'

export type EstadoAuth = {
  cargando: boolean
  session: Session | null
  rol: Rol | null
  // No se pudo leer el rol (sin conexión o error de la base).
  errorRol: boolean
  tipo: TipoDeCuenta | null
  // Entró por un link de "olvidé mi contraseña": falta elegir la nueva.
  recuperando: boolean
  // Error de un link de correo que falló (vencido, otro navegador).
  errorEnlace: string | null
  recargarRol: () => Promise<void>
  terminarRecuperacion: () => void
  borrarErrorEnlace: () => void
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function tipoDeCuenta(rol: Rol): TipoDeCuenta {
  if (rol.esEntrenador) return 'entrenador'
  if (rol.fichas.some((f) => f.estado !== 'baja')) return 'cliente'
  if (rol.fichas.length > 0) return 'baja'
  return 'sin-entrenador'
}
