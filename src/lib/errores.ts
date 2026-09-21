// Mensajes en castellano para los errores de Supabase que puede ver un usuario.
const porCodigo: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Todavía no confirmaste tu correo. Buscá el mail que te mandamos.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Probá ingresar.',
  email_exists: 'Ya hay una cuenta con ese correo. Probá ingresar.',
  weak_password: 'La contraseña es muy débil. Usá al menos 8 caracteres.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  over_email_send_rate_limit: 'Mandamos demasiados correos seguidos. Esperá unos minutos y probá de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  validation_failed: 'Revisá los datos: algo no tiene el formato correcto.',
  otp_expired: 'El link venció o ya se usó. Pedí uno nuevo.',
  access_denied: 'El link venció o ya se usó. Pedí uno nuevo.',
  flow_state_not_found: 'Ese link se abrió en otro navegador. Si era para confirmar tu cuenta, ya está confirmada: ingresá con tu contraseña.',
  bad_code_verifier: 'Ese link se abrió en otro navegador. Si era para confirmar tu cuenta, ya está confirmada: ingresá con tu contraseña.',
}

type ErrorConCodigo = { code?: string; message?: string }

export function mensajeDeError(error: unknown): string {
  if (typeof error === 'string') return porCodigo[error] ?? 'Algo salió mal. Probá de nuevo.'
  const e = (error ?? {}) as ErrorConCodigo
  if (e.code && porCodigo[e.code]) return porCodigo[e.code]
  // Las funciones de la base (aceptar_invitacion) ya devuelven el mensaje en castellano.
  if (e.code === 'P0001' && e.message) return e.message
  if (e.message?.toLowerCase().includes('failed to fetch')) return 'No hay conexión. Revisá internet y probá de nuevo.'
  return 'Algo salió mal. Probá de nuevo.'
}
