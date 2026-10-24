/** 合成音效，不用音檔。答對的音高隨連擊往上爬（五聲音階），像音遊打出 combo 的感覺 */
let ctx: AudioContext | null = null

const PENTATONIC = [0, 2, 4, 7, 9]
const BASE_HZ = 523.25 // C5

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, length: number, type: OscillatorType, volume: number): void {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const t = ac.currentTime + start
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + length)
}

function noteHz(step: number): number {
  const octave = Math.floor(step / PENTATONIC.length)
  const semis = PENTATONIC[step % PENTATONIC.length] + 12 * octave
  return BASE_HZ * 2 ** (semis / 12)
}

/** 在第一次點擊時呼叫，iOS 才允許之後播放 */
export function unlockAudio(): void {
  audio()
}

export function playHit(combo: number): void {
  const step = Math.min(combo - 1, 14)
  tone(noteHz(step), 0, 0.18, 'triangle', 0.25)
  tone(noteHz(step) * 2, 0.02, 0.12, 'sine', 0.08)
}

export function playMiss(): void {
  tone(160, 0, 0.25, 'square', 0.08)
  tone(120, 0.08, 0.3, 'square', 0.06)
}

export function playFanfare(): void {
  ;[0, 2, 4, 5, 7].forEach((step, i) => tone(noteHz(step), i * 0.09, 0.3, 'triangle', 0.22))
}
