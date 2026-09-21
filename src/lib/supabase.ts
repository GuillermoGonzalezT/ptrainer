import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Mientras no haya proyecto de Supabase configurado, la app arranca igual y el
// cliente queda en null. Las pantallas que necesiten datos lo tienen que chequear.
//
// flowType 'pkce': los links de los correos vuelven con `?code=…` antes del
// hash, en vez de mandar la sesión en el hash, que es donde viven las rutas.
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey, { auth: { flowType: 'pkce' } }) : null

export const isSupabaseConfigured = supabase !== null

// Adónde vuelven los links de los correos: la raíz de la app. En producción
// coincide con el Site URL de Supabase. En desarrollo, localhost tiene que
// estar en Authentication → URL Configuration → Redirect URLs; si no está,
// Supabase manda al Site URL.
export function urlDeLaApp(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}
