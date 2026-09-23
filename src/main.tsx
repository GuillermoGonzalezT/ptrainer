// Primero: guarda y limpia un error de link de correo antes de que lo vean
// Supabase y el router (ver lib/enlace.ts).
import './lib/enlace.ts'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { aplicarTema, temaGuardado } from './lib/tema.ts'
import { router } from './router.tsx'
import './styles/global.css'

// Antes de pintar nada: si no, se ve un fogonazo claro al abrir en oscuro.
aplicarTema(temaGuardado())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
