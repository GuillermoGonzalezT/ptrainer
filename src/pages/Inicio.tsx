import { useAuth } from '../auth/useAuth.ts'
import { Hoy } from './Hoy.tsx'
import { InicioEntrenador } from './InicioEntrenador.tsx'

// La misma ruta "/" muestra el panel al entrenador y "Hoy" al cliente.
export function Inicio() {
  return useAuth().tipo === 'entrenador' ? <InicioEntrenador /> : <Hoy />
}
