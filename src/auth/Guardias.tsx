import { Navigate, Outlet } from 'react-router'
import { Aviso } from '../components/Formulario.tsx'
import { AppLayout } from '../layouts/AppLayout.tsx'
import { AuthLayout } from '../layouts/AuthLayout.tsx'
import { leerInvitacion } from '../lib/invitacionPendiente.ts'
import { isSupabaseConfigured } from '../lib/supabase.ts'
import { Baja } from '../pages/auth/Baja.tsx'
import { ErrorDeCarga } from '../pages/auth/ErrorDeCarga.tsx'
import { SinEntrenador } from '../pages/auth/SinEntrenador.tsx'
import { useAuth } from './useAuth.ts'

// Pantallas sin sesión (ingresar, registrarse, recuperar). Con sesión, a la app.
export function SoloSinSesion() {
  const { cargando, session, recuperando } = useAuth()
  if (cargando) return null
  if (session && !recuperando) return <Navigate to="/" replace />
  return <AuthLayout />
}

// Toda la app. Decide qué ve cada cuenta según su rol.
export function ConSesion() {
  const { cargando, session, recuperando, errorRol, tipo } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout>
        <Aviso tipo="error">
          Supabase no está configurado: completá .env.local a partir de .env.example.
        </Aviso>
      </AuthLayout>
    )
  }
  if (cargando) return null
  if (!session) return <Navigate to="/ingresar" replace />
  if (recuperando) return <Navigate to="/nueva-contrasena" replace />

  const invitacion = leerInvitacion()
  if (invitacion) return <Navigate to={`/invitacion/${invitacion}`} replace />

  if (errorRol) return <AuthLayout><ErrorDeCarga /></AuthLayout>
  if (tipo === 'baja') return <AuthLayout><Baja /></AuthLayout>
  if (tipo === 'sin-entrenador') return <AuthLayout><SinEntrenador /></AuthLayout>
  return <AppLayout tipo={tipo === 'entrenador' ? 'entrenador' : 'cliente'} />
}

export function SoloEntrenador() {
  return useAuth().tipo === 'entrenador' ? <Outlet /> : <Navigate to="/" replace />
}

export function SoloCliente() {
  return useAuth().tipo === 'cliente' ? <Outlet /> : <Navigate to="/" replace />
}
