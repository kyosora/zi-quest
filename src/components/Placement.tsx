import { useMemo, useState } from 'preact/hooks'
import type { Card } from 'ts-fsrs'
import {
  answerPlacement,
  BAND_SIZE,
  bandCount,
  currentChar,
  knownChars,
  PER_BAND,
  seedCards,
  startPlacement,
} from '../lib/placement'
import { makeQuestion, type Rng } from '../lib/quiz'
import type { CharIndex } from '../lib/types'
import { QuizCard } from './QuizCard'

interface Props {
  index: CharIndex
  rng: Rng
  onComplete: (cards: Record<string, Card>, knownCount: number) => void
}

export function Placement({ index, rng, onComplete }: Props) {
  const [started, setStarted] = useState(false)
  const [state, setState] = useState(() => startPlacement(index, rng))
  const [result, setResult] = useState<number | null>(null)
  const char = currentChar(state)
  const question = useMemo(() => {
    if (!char) return null
    const entry = index.byChar.get(char)!
    return makeQuestion('read', entry, index, rng, entry.w[0][0])
  }, [char, state.band])

  function handleAnswer(correct: boolean) {
    const next = answerPlacement(state, correct, index, rng)
    setState(next)
    if (next.finished) setResult(knownChars(next, index).length)
  }

  if (!started) {
    return (
      <div class="panel center">
        <h2>🗺️ 先探路</h2>
        <p>先看看你已經認得哪些字，之後就不會浪費時間學會的字。</p>
        <p>一題一個詞，點喇叭聽四個念法，選對的那個。</p>
        <p class="warn">不會就按「不知道」，不要用猜的，猜對反而會跳過你需要練的字。</p>
        <button class="primary wide" onClick={() => setStarted(true)}>
          出發
        </button>
      </div>
    )
  }

  if (result !== null) {
    return (
      <div class="panel center">
        <h2>🎯 探路完成</h2>
        <p class="big-number">{result}</p>
        <p>個字你已經認得了，收進圖鑑。</p>
        <p class="muted">之後會偶爾抽查，答錯的會自動回到學習清單。</p>
        <button
          class="primary wide"
          onClick={() => onComplete(seedCards(knownChars(state, index), new Date(), rng), result)}
        >
          開始冒險
        </button>
      </div>
    )
  }

  const asked = state.current.asked.length
  return (
    <div class="session">
      <header class="session-bar">
        <span class="floor">
          第 {state.band + 1} / {bandCount(index)} 層 · 字頻 {state.band * BAND_SIZE + 1}～
          {(state.band + 1) * BAND_SIZE}
        </span>
        <div class="progress-track">
          <div class="progress-fill" style={{ width: `${(asked / PER_BAND) * 100}%` }} />
        </div>
      </header>
      {question && (
        <QuizCard
          key={`${state.band}-${asked}`}
          question={question}
          entry={index.byChar.get(question.char)!}
          combo={0}
          quiet
          onDone={handleAnswer}
        />
      )}
    </div>
  )
}
