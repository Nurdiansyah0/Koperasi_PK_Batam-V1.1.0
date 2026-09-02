/**
 * Universal Zero-Asset Web Audio API Synthesizer
 * Fully compatible with Chrome, Safari (iOS & macOS), Firefox, Edge, Android PWA.
 * Includes automatic user gesture audio unlocker for mobile Safari & Blink autoplay policy.
 */

let audioCtx: AudioContext | null = null
let isUnlocked = false

export function getAudioContext(): AudioContext | null {
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

/**
 * Automatically unlocks Web Audio on first user interaction
 * Essential for Mobile Safari (iOS) and Chrome Autoplay policies.
 */
export function initAudioUnlocker() {
  if (typeof window === 'undefined' || isUnlocked) return

  const unlock = () => {
    try {
      const ctx = getAudioContext()
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            isUnlocked = true
          }).catch(() => {})
        } else {
          isUnlocked = true
        }

        // Play an inaudible buffer to unlock hardware audio routing
        const buffer = ctx.createBuffer(1, 1, 22050)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)
      }
    } catch {
      // ignore
    } finally {
      // Remove listeners once unlocked
      ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock)
      })
    }
  }

  const options = { once: true, passive: true, capture: true }
  ;['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlock, options)
  })
}

// Auto-initialize unlocker on script load
if (typeof window !== 'undefined') {
  initAudioUnlocker()
}

/**
 * Plays ultra-crisp POS double-chime alert (D5 -> A5)
 */
export function playOrderAlertSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

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

    // Haptic feedback (Vibrate on Android/Supported mobile devices)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 200])
    }
  } catch (err) {
    console.warn('Audio chime playback error:', err)
  }
}
