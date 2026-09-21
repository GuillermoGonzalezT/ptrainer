import { useAuth } from '../auth/useAuth.ts'
import { PaginaProvisoria } from '../components/PaginaProvisoria.tsx'

export function Hoy() {
  const { rol } = useAuth()
  return (
    <PaginaProvisoria
      titulo={rol?.nombre ? `Hola, ${rol.nombre.split(' ')[0]}` : 'Hoy'}
      descripcion='Acá va la pantalla "Hoy" (RF-40): la rutina que te toca y el modo entrenamiento.'
    />
  )
}
