// Si alguien abre un link de invitación sin tener cuenta, el código se guarda
// acá mientras se registra y confirma el correo, y se acepta al entrar.
// localStorage puede fallar (navegación privada): en ese caso se pierde el
// código y la persona lo tiene que volver a abrir o escribir.
const clave = 'ptrainer.invitacion'

export function guardarInvitacion(codigo: string) {
  try {
    localStorage.setItem(clave, codigo)
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

export function leerInvitacion(): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

export function borrarInvitacion() {
  try {
    localStorage.removeItem(clave)
  } catch {
    // sin almacenamiento: no pasa nada
  }
}
