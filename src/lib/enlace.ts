// Cuando un link de un correo de Supabase falla (vencido, ya usado), vuelve a
// la app con el error en la URL: `?error_description=…` o `#error=…`. Con rutas
// por hash, ese `#error=…` lo tomaría el router como una ruta inexistente.
//
// Este módulo se importa primero en main.tsx: guarda el error y limpia la URL
// antes de que arranquen Supabase y el router. El `?code=…` de un link que sí
// funcionó no se toca: lo consume supabase-js.

function leerError(params: URLSearchParams): string | null {
  if (!params.has('error') && !params.has('error_code') && !params.has('error_description')) return null
  return params.get('error_code') ?? params.get('error') ?? 'error'
}

function capturar(): string | null {
  const url = new URL(window.location.href)
  const hash = url.hash.replace(/^#/, '')
  const enHash = hash.startsWith('/') ? null : leerError(new URLSearchParams(hash))
  const enQuery = leerError(url.searchParams)
  const codigo = enHash ?? enQuery
  if (!codigo) return null

  for (const clave of ['error', 'error_code', 'error_description']) url.searchParams.delete(clave)
  if (enHash) url.hash = '#/ingresar'
  window.history.replaceState(window.history.state, '', url.toString())
  return codigo
}

export const errorDelEnlace = capturar()
