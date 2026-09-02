/**
 * Zero-Asset Web Audio API Synthesizer
 * Generates an ultra-crisp POS Cashier Double Chime Alert (D5 -> A5)
 * Guaranteed 100% reliable without external audio file network dependencies.
 */
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playOrderAlertSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: 587.33 Hz (D5) - bright bell
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.4, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: 880 Hz (A5) - high alert ping (0.12s delay)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.00, now + 0.12)
    gain2.gain.setValueAtTime(0.5, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.6)

    // Tone 3: Harmonic overtone for rich cash-register chime (1174.66 Hz)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'triangle'
    osc3.frequency.setValueAtTime(1174.66, now + 0.14)
    gain3.gain.setValueAtTime(0.2, now + 0.14)
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(now + 0.14)
    osc3.stop(now + 0.7)

    // Vibrate device if supported on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 200])
    }
  } catch (err) {
    console.warn('Audio chime playback prevented:', err)
  }
}
