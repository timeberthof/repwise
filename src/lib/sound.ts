/**
 * Signalton für den Pausentimer über die Web Audio API (funktioniert offline, ohne Audiodatei).
 * iOS erlaubt Ton nur nach einer Nutzeraktion – deshalb wird der Kontext beim ersten Tippen entsperrt.
 */
let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    // stiller Ton entsperrt die Ausgabe auf iOS
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = 0.0001
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.01)
  } catch {
    /* kein Ton möglich */
  }
}

/** Dreifacher Piepton am Ende der Pause. */
export function beep(times = 3) {
  try {
    if (!ctx) unlockAudio()
    if (!ctx) return
    const t0 = ctx.currentTime + 0.02
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = i === times - 1 ? 1320 : 880
      const t = t0 + i * 0.28
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.24)
    }
  } catch {
    /* ignorieren */
  }
}
