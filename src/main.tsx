// Primero: guarda y limpia un error de link de correo antes de que lo vean
// Supabase y el router (ver lib/enlace.ts).
import './lib/enlace.ts'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { router } from './router.tsx'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
