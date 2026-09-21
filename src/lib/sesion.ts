import { supabase } from './supabase.ts'

// Al cerrar sesión, el cambio de sesión lleva solo a la pantalla de ingreso.
export async function cerrarSesion() {
  await supabase?.auth.signOut()
}
