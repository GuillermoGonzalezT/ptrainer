import { PaginaProvisoria } from '../components/PaginaProvisoria.tsx'
import { isSupabaseConfigured } from '../lib/supabase.ts'

export function Inicio() {
  return (
    <PaginaProvisoria
      titulo="Inicio"
      descripcion={
        isSupabaseConfigured
          ? 'Acá va el panel del entrenador (RF-70) y la pantalla "Hoy" del cliente (RF-40).'
          : 'Supabase todavía no está configurado: completá .env.local a partir de .env.example.'
      }
    />
  )
}
