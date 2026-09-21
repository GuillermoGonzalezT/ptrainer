import { useContext } from 'react'
import { AuthContext } from './contexto.ts'

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return auth
}
