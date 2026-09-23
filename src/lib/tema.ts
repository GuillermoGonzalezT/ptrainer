// RF-05: el tema sigue al del sistema, salvo que se elija uno a mano. La
// elección queda en este teléfono, no en la cuenta: el mismo usuario puede
// querer oscuro en el celular y claro en la computadora.

export const TEMAS = [
  { valor: 'auto', etiqueta: 'Automático' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
] as const

export type Tema = (typeof TEMAS)[number]['valor']

const CLAVE = 'ptrainer.tema'

function esTema(valor: string | null): valor is Tema {
  return valor === 'auto' || valor === 'claro' || valor === 'oscuro'
}

export function temaGuardado(): Tema {
  try {
    const valor = localStorage.getItem(CLAVE)
    return esTema(valor) ? valor : 'auto'
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue con el del sistema.
    return 'auto'
  }
}

// En 'auto' se saca el atributo y vuelve a mandar la media query del CSS.
export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'auto') raiz.removeAttribute('data-tema')
  else raiz.dataset.tema = tema
}

export function guardarTema(tema: Tema) {
  aplicarTema(tema)
  try {
    if (tema === 'auto') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, tema)
  } catch {
    // Se pierde al cerrar, pero esta sesión ya quedó con el tema puesto.
  }
}
