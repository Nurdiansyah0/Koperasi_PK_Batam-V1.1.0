/**
 * Universal Zero-Asset Web Audio API Synthesizer
 * Feature: SCATTER HIGGS DOMINO JACKPOT SOUND EFFECT (High-Volume & Punchy)
 * 100% Zero-Asset (disintesis langsung via Web Audio Oscillator + DynamicsCompressor).
 * Dijamin nyaring, jelas, dan kompatibel di Chrome, Safari iOS/macOS, Firefox, Android PWA.
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
 * 🎰 SCATTER HIGGS DOMINO CASINO WIN SOUND SYNTHESIZER 🎰
 * Suara super nyaring, energik, dan khas:
 * 1. Rapid Ascending Coin Arpeggio (Ting-ting-ting-ting-ting)
 * 2. Grand Jackpot Fanfare Climax (JREEENG C-Major Shimmer Chord)
 */
export function playOrderAlertSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // ── MASTER DYNAMICS COMPRESSOR & PUNCHY BOOSTER ──
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-10, now)
    compressor.knee.setValueAtTime(12, now)
    compressor.ratio.setValueAtTime(12, now)
    compressor.attack.setValueAtTime(0.002, now)
    compressor.release.setValueAtTime(0.2, now)

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.95, now) // Max loud volume

    compressor.connect(masterGain)
    masterGain.connect(ctx.destination)

    // ── 1. RAPID SCATTER COIN ASCENDING ARPEGGIO ──
    // Frequencies: C5 -> E5 -> G5 -> C6 -> E6 -> G6 -> B6 -> C7
    const scatterNotes = [
      523.25,  // C5
      659.25,  // E5
      783.99,  // G5
      1046.50, // C6
      1318.51, // E6
      1567.98, // G6
      1975.53, // B6
      2093.00, // C7
      2637.02  // E7
    ]

    const noteDuration = 0.055 // 55ms per rapid coin drop

    scatterNotes.forEach((freq, idx) => {
      const noteStart = now + idx * noteDuration

      // Primary Crystal Bell (Sine)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.7, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.12)

      osc.connect(gain)
      gain.connect(compressor)

      osc.start(noteStart)
      osc.stop(noteStart + 0.12)

      // Sparkling Triangle Harmonic Overtone
      const overtone = ctx.createOscillator()
      const overGain = ctx.createGain()
      overtone.type = 'triangle'
      overtone.frequency.setValueAtTime(freq * 1.5, noteStart)
      overGain.gain.setValueAtTime(0.3, noteStart)
      overGain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.08)

      overtone.connect(overGain)
      overGain.connect(compressor)

      overtone.start(noteStart)
      overtone.stop(noteStart + 0.08)
    })

    // ── 2. CLIMAX: GRAND SCATTER JACKPOT CHORD (JREEENG!) ──
    const climaxStart = now + scatterNotes.length * noteDuration // ~0.50s mark
    const chordFrequencies = [
      523.25,  // C5 (Body)
      783.99,  // G5 (Richness)
      1046.50, // C6 (Bright lead)
      1318.51, // E6 (Major 3rd fanfare)
      1567.98, // G6 (High octave shimmer)
      2093.00, // C7 (Top crystal bell)
      3135.96  // G7 (Piercing presence)
    ]

    chordFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Mix saw/triangle on mid and sine on top for massive brass+bell punch
      osc.type = i < 3 ? 'triangle' : (i === 3 ? 'sawtooth' : 'sine')
      osc.frequency.setValueAtTime(freq, climaxStart)

      const volume = i >= 4 ? 0.65 : (i === 3 ? 0.35 : 0.8)
      gain.gain.setValueAtTime(volume, climaxStart)
      gain.gain.exponentialRampToValueAtTime(0.001, climaxStart + 0.85) // Long resonant ring

      osc.connect(gain)
      gain.connect(compressor)

      osc.start(climaxStart)
      osc.stop(climaxStart + 0.85)
    })

    // Haptic Vibration: Rhythm matching Scatter slot jackpot
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 60, 40, 80, 40, 100, 50, 350])
    }
  } catch (err) {
    console.warn('Audio chime playback error:', err)
  }
}
