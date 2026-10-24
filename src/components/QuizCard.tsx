import { useEffect, useRef, useState } from 'preact/hooks'
import { playHit, playMiss } from '../lib/sfx'
import { speak } from '../lib/speech'
import type { CharEntry, Question } from '../lib/types'
import { SpeakChip, Word } from './Word'

const FLASH_MS = 1800
const CORRECT_PAUSE_MS = 650

interface Props {
  question: Question
  entry: CharEntry
  /** 答對時的連擊數，用來決定音效音高 */
  combo: number
  /** 分級測驗用：不顯示對錯、不放音效，直接下一題 */
  quiet?: boolean
  onDone: (correct: boolean, ms: number) => void
}

const PROMPTS = {
  listen: '聽聽看，是哪一個？',
  read: '這個字在哪個詞裡？點喇叭聽，選對的那個',
  flash: '看清楚，等一下就消失！',
}

export function QuizCard({ question, entry, combo, quiet = false, onDone }: Props) {
  const startedAt = useRef(performance.now())
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: boolean; ms: number; picked: number | null } | null>(null)
  const [hidden, setHidden] = useState(false)
  const { kind, word, options } = question
  const audioOptions = kind !== 'listen'

  useEffect(() => {
    if (kind === 'listen') void speak(word)
    if (kind !== 'flash') return
    const timer = setTimeout(() => setHidden(true), FLASH_MS)
    return () => clearTimeout(timer)
  }, [question])

  function submit(picked: number | null) {
    if (result) return
    const correct = picked !== null && options[picked].correct
    const ms = performance.now() - startedAt.current
    if (quiet) {
      onDone(correct, ms)
      return
    }
    setResult({ correct, ms, picked })
    setHidden(false)
    if (correct) {
      playHit(combo + 1)
      void speak(word)
      setTimeout(() => onDone(true, ms), CORRECT_PAUSE_MS)
    } else {
      playMiss()
      void speak(word)
    }
  }

  function tapOption(i: number) {
    if (result) return
    if (!audioOptions) {
      submit(i)
      return
    }
    setSelected(i)
    void speak(options[i].text)
  }

  const optionClass = (i: number) => {
    if (!result) return selected === i ? 'option selected' : 'option'
    if (options[i].correct) return 'option right'
    return result.picked === i ? 'option wrong' : 'option faded'
  }

  return (
    <div class={`quiz ${result ? (result.correct ? 'is-right' : 'is-wrong') : ''}`}>
      <p class="prompt">{PROMPTS[kind]}</p>

      {kind === 'listen' ? (
        <button class="big-speaker" onClick={() => void speak(word)} aria-label="再聽一次">
          🔊
        </button>
      ) : (
        <div class={`question-word ${hidden ? 'vanished' : ''}`}>
          {hidden ? <span class="mist">？</span> : <span class="single">{question.char}</span>}
        </div>
      )}

      <div class={`options ${audioOptions ? 'audio' : 'text'}`}>
        {options.map((option, i) => (
          <button key={i} class={optionClass(i)} onClick={() => tapOption(i)}>
            {audioOptions && !result ? (
              <span class="audio-label">🔊 {i + 1}</span>
            ) : (
              <Word word={option.text} target={option.correct ? question.char : undefined} />
            )}
          </button>
        ))}
      </div>

      {!result && (
        <div class="quiz-actions">
          <button class="ghost" onClick={() => submit(null)}>
            不知道
          </button>
          {audioOptions && (
            <button class="primary" disabled={selected === null} onClick={() => submit(selected)}>
              就是這個！
            </button>
          )}
        </div>
      )}

      {result && !result.correct && (
        <div class="feedback">
          <p>
            答案是 <SpeakChip text={word} target={question.char} />
          </p>
          {result.picked !== null && (
            <p class="hint">
              你選的是 <SpeakChip text={options[result.picked].text} />，聽聽看哪裡不一樣
            </p>
          )}
          {entry.ph && (
            <p class="hint">
              「{entry.ph}」是聲音提示 <SpeakChip text={entry.ph} /> → <SpeakChip text={word} target={entry.c} />
            </p>
          )}
          {entry.hint && (
            <p class="hint">
              「{entry.se}」跟{entry.hint}有關
            </p>
          )}
          <button class="primary" onClick={() => onDone(false, result.ms)}>
            記住了，繼續
          </button>
        </div>
      )}
    </div>
  )
}
