// Aviso de fin de descanso (RF-42): vibración y un pitido corto.
//
// El AudioContext se crea en el toque que marca la serie (los navegadores
// solo dejan sonar audio si arrancó con un gesto del usuario) y se reusa.

let audio: AudioContext | null = null

export function prepararSonido() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function avisarFinDeDescanso() {
  navigator.vibrate?.([200, 100, 200])
  if (!audio) return
  try {
    const ahora = audio.currentTime
    for (const [inicio, frecuencia] of [
      [0, 880],
      [0.25, 1175],
    ]) {
      const oscilador = audio.createOscillator()
      const volumen = audio.createGain()
      oscilador.frequency.value = frecuencia
      volumen.gain.setValueAtTime(0.25, ahora + inicio)
      volumen.gain.exponentialRampToValueAtTime(0.001, ahora + inicio + 0.2)
      oscilador.connect(volumen).connect(audio.destination)
      oscilador.start(ahora + inicio)
      oscilador.stop(ahora + inicio + 0.2)
    }
  } catch {
    // sin sonido: queda la vibración
  }
}
