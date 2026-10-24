import { speak } from '../lib/speech'

interface WordProps {
  word: string
  target?: string
  className?: string
}

/** 把詞裡的目標字標成重點色，其餘字照常顯示 */
export function Word({ word, target, className = '' }: WordProps) {
  return (
    <span class={`word ${className}`}>
      {[...word].map((ch, i) => (
        <span key={i} class={ch === target ? 'target' : undefined}>
          {ch}
        </span>
      ))}
    </span>
  )
}

interface SpeakChipProps {
  text: string
  target?: string
  label?: string
}

/** 點一下就念出來的小按鈕 */
export function SpeakChip({ text, target, label }: SpeakChipProps) {
  return (
    <button class="chip" onClick={() => void speak(text)}>
      <span class="chip-icon">🔊</span>
      {label ?? <Word word={text} target={target} />}
    </button>
  )
}
