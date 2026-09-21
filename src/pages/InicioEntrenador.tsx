import { useAuth } from '../auth/useAuth.ts'
import { PaginaProvisoria } from '../components/PaginaProvisoria.tsx'

export function InicioEntrenador() {
  const { rol } = useAuth()
  return (
    <PaginaProvisoria
      titulo={rol?.nombre ? `Hola, ${rol.nombre.split(' ')[0]}` : 'Inicio'}
      descripcion="Acá va el panel del entrenador (RF-70): sesiones recientes, clientes que no entrenan y mediciones nuevas."
    />
  )
}
