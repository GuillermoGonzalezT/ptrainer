import { createHashRouter } from 'react-router'
import { AppLayout } from './layouts/AppLayout.tsx'
import { Clientes } from './pages/Clientes.tsx'
import { Ejercicios } from './pages/Ejercicios.tsx'
import { Inicio } from './pages/Inicio.tsx'
import { NoEncontrada } from './pages/NoEncontrada.tsx'
import { Rutinas } from './pages/Rutinas.tsx'

// Rutas por hash (#/clientes): funcionan en GitHub Pages y en Capacitor sin
// configurar el servidor.
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'ejercicios', element: <Ejercicios /> },
      { path: 'rutinas', element: <Rutinas /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
