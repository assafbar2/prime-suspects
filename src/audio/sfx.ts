/**
 * Procedural sound engine — every sound synthesized on the fly.
 * No audio assets, no network. Lazy AudioContext so autoplay policies
 * are respected: the context wakes on the first user gesture.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

const MUTE_KEY = 'prime-suspects:muted'

if (typeof localStorage !== 'undefined') {
  muted = localStorage.getItem(MUTE_KEY) === '1'
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function playNoise(opts: {
  duration: number
  freq: number
  q?: number
  type?: BiquadFilterType
  gain?: number
  attack?: number
}) {
  const c = ac()
  if (!c || !master || muted) return
  const t0 = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, opts.duration)
  const filter = c.createBiquadFilter()
  filter.type = opts.type ?? 'bandpass'
  filter.frequency.value = opts.freq
  filter.Q.value = opts.q ?? 1
  const g = c.createGain()
  const peak = opts.gain ?? 0.2
  const atk = opts.attack ?? 0.002
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(peak, t0 + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration)
  src.connect(filter).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + opts.duration + 0.02)
}

function playTone(opts: {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
  slideTo?: number
  delay?: number
}) {
  const c = ac()
  if (!c || !master || muted) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + opts.duration)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.15, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.duration + 0.05)
}

export const sfx = {
  get muted() {
    return muted
  },
  toggleMute(): boolean {
    muted = !muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (!muted) sfx.click()
    return muted
  },

  click() {
    playTone({ freq: 1600, duration: 0.03, type: 'triangle', gain: 0.06 })
  },

  /** Card dealt into hand */
  flick() {
    playNoise({ duration: 0.07, freq: 2600, q: 0.8, gain: 0.16 })
    playTone({ freq: 700, duration: 0.04, type: 'triangle', gain: 0.05, slideTo: 500 })
  },

  /** Suspect walks — paper shuffle */
  walk() {
    playNoise({ duration: 0.16, freq: 1400, q: 0.6, gain: 0.12 })
  },

  /** The stamp comes down */
  stamp() {
    playTone({ freq: 130, duration: 0.18, type: 'sine', gain: 0.5, slideTo: 55 })
    playNoise({ duration: 0.09, freq: 300, q: 0.4, gain: 0.3, type: 'lowpass' })
  },

  /** Probe answered */
  reveal(yes: boolean) {
    playTone({ freq: yes ? 660 : 440, duration: 0.12, type: 'triangle', gain: 0.12 })
    playTone({ freq: yes ? 990 : 330, duration: 0.14, type: 'sine', gain: 0.08, delay: 0.06 })
  },

  /** Confession whisper */
  whisper() {
    playNoise({ duration: 0.5, freq: 900, q: 0.3, gain: 0.05, attack: 0.15 })
  },

  /** CASE CLOSED — brass-and-bells fanfare */
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      playTone({ freq: f, duration: 0.5, type: 'triangle', gain: 0.12, delay: i * 0.11 })
      playTone({ freq: f * 2, duration: 0.35, type: 'sine', gain: 0.05, delay: i * 0.11 })
    })
  },

  /** MISTRIAL — low minor sting */
  sting() {
    playTone({ freq: 220, duration: 0.7, type: 'sawtooth', gain: 0.1, slideTo: 110 })
    playTone({ freq: 261.63, duration: 0.7, type: 'sawtooth', gain: 0.08, slideTo: 130.81, delay: 0.05 })
  },

  /** Star pop on the verdict panel */
  star(i: number) {
    playTone({ freq: 880 + i * 220, duration: 0.22, type: 'triangle', gain: 0.14 })
    playTone({ freq: (880 + i * 220) * 1.5, duration: 0.3, type: 'sine', gain: 0.06, delay: 0.03 })
  },
}
