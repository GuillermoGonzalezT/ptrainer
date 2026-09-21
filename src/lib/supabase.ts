import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Mientras no haya proyecto de Supabase configurado, la app arranca igual y el
// cliente queda en null. Las pantallas que necesiten datos lo tienen que chequear.
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null

export const isSupabaseConfigured = supabase !== null
