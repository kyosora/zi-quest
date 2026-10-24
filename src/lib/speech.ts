/**
 * 瀏覽器內建語音合成。iPad 上的中文（台灣）聲音是「美佳」。
 * iOS 有兩個坑：第一次 speak 必須在使用者點擊裡觸發；utterance 沒被參照住會被回收、念到一半斷掉。
 */
let voice: SpeechSynthesisVoice | null = null
let rate = 0.85
let current: SpeechSynthesisUtterance | null = null

const normalizeLang = (lang: string) => lang.replace('_', '-').toLowerCase()

function pickVoice(): void {
  const voices = speechSynthesis.getVoices()
  const zh = voices.filter((v) => normalizeLang(v.lang).startsWith('zh'))
  voice =
    zh.find((v) => normalizeLang(v.lang) === 'zh-tw' && /mei-?jia|美佳/i.test(v.name)) ??
    zh.find((v) => normalizeLang(v.lang) === 'zh-tw') ??
    zh.find((v) => normalizeLang(v.lang) === 'zh-hk') ??
    zh[0] ??
    null
}

export function initSpeech(): boolean {
  if (!('speechSynthesis' in window)) return false
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
  return true
}

export function hasChineseVoice(): boolean {
  return voice !== null
}

export function voiceName(): string {
  return voice ? `${voice.name}（${voice.lang}）` : '找不到中文語音'
}

export function setSpeechRate(value: number): void {
  rate = value
}

/** 念完才 resolve；有些瀏覽器不觸發 onend，最多等 5 秒 */
export function speak(text: string): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve()
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang ?? 'zh-TW'
  if (voice) utterance.voice = voice
  utterance.rate = rate
  current = utterance
  return new Promise((resolve) => {
    const done = () => {
      if (current === utterance) current = null
      resolve()
    }
    utterance.onend = done
    utterance.onerror = done
    setTimeout(done, 5000)
    speechSynthesis.speak(utterance)
  })
}
