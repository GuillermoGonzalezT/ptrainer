import { createHashRouter } from 'react-router'
import { ConSesion, SoloCliente, SoloEntrenador, SoloSinSesion } from './auth/Guardias.tsx'
import { AuthLayout } from './layouts/AuthLayout.tsx'
import { Ejercicios } from './pages/Ejercicios.tsx'
import { Inicio } from './pages/Inicio.tsx'
import { NoEncontrada } from './pages/NoEncontrada.tsx'
import { Perfil } from './pages/Perfil.tsx'
import { Progreso } from './pages/Progreso.tsx'
import { Rutinas } from './pages/Rutinas.tsx'
import { Ingresar } from './pages/auth/Ingresar.tsx'
import { Invitacion } from './pages/auth/Invitacion.tsx'
import { NuevaContrasena } from './pages/auth/NuevaContrasena.tsx'
import { Recuperar } from './pages/auth/Recuperar.tsx'
import { Registrarse } from './pages/auth/Registrarse.tsx'
import { FichaCliente } from './pages/clientes/FichaCliente.tsx'
import { FormularioCliente } from './pages/clientes/FormularioCliente.tsx'
import { ListaClientes } from './pages/clientes/ListaClientes.tsx'

// Rutas por hash (#/clientes): funcionan en GitHub Pages y en Capacitor sin
// configurar el servidor.
export const router = createHashRouter([
  {
    element: <SoloSinSesion />,
    children: [
      { path: 'ingresar', element: <Ingresar /> },
      { path: 'registrarse', element: <Registrarse /> },
      { path: 'recuperar', element: <Recuperar /> },
    ],
  },
  // Estas dos funcionan con y sin sesión.
  {
    element: <AuthLayout />,
    children: [
      { path: 'nueva-contrasena', element: <NuevaContrasena /> },
      { path: 'invitacion/:codigo', element: <Invitacion /> },
    ],
  },
  {
    element: <ConSesion />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'perfil', element: <Perfil /> },
      {
        element: <SoloEntrenador />,
        children: [
          { path: 'clientes', element: <ListaClientes /> },
          { path: 'clientes/nuevo', element: <FormularioCliente /> },
          { path: 'clientes/:id', element: <FichaCliente /> },
          { path: 'clientes/:id/editar', element: <FormularioCliente /> },
          { path: 'ejercicios', element: <Ejercicios /> },
          { path: 'rutinas', element: <Rutinas /> },
        ],
      },
      {
        element: <SoloCliente />,
        children: [{ path: 'progreso', element: <Progreso /> }],
      },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
