import { Link } from 'react-router'
import { PaginaProvisoria } from '../components/PaginaProvisoria.tsx'

export function NoEncontrada() {
  return (
    <>
      <PaginaProvisoria titulo="Página no encontrada" descripcion="Esta dirección no existe." />
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </>
  )
}
