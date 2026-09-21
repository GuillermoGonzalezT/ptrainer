import { useEffect } from 'react'

// Mientras se entrena, la pantalla no se apaga sola: el teléfono queda
// apoyado entre series. El navegador suelta el bloqueo al pasar a segundo
// plano, así que se vuelve a pedir al volver.
export function usePantallaEncendida() {
  useEffect(() => {
    let bloqueo: WakeLockSentinel | null = null
    let activo = true

    async function pedir() {
      try {
        if (activo && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          bloqueo = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Sin permiso o sin batería: la pantalla se apaga como siempre.
      }
    }

    void pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', pedir)
      void bloqueo?.release()
    }
  }, [])
}
