import { useEffect, useState } from 'preact/hooks'
import type { Card, Grade } from 'ts-fsrs'
import { makeQuestion, type Rng } from '../lib/quiz'
import { answer, isFinished, skipIntro, startSession, type SessionPlan } from '../lib/session'
import type { CharIndex } from '../lib/types'
import { Intro } from './Intro'
import { QuizCard } from './QuizCard'

export interface SessionSummary {
  xp: number
  correct: number
  answered: number
  maxCombo: number
  newChars: string[]
  completed: boolean
}

interface Props {
  index: CharIndex
  cards: Record<string, Card>
  plan: SessionPlan
  rng: Rng
  onCommit: (char: string, grade: Grade) => void
  onEnd: (summary: SessionSummary) => void
}

export function Session({ index, cards, plan, rng, onCommit, onEnd }: Props) {
  const [state, setState] = useState(() => startSession(plan))
  const finished = isFinished(state)

  const summary = (completed: boolean): SessionSummary => ({
    xp: state.xp,
    correct: state.correct,
    answered: state.answered,
    maxCombo: state.maxCombo,
    newChars: plan.newChars,
    completed,
  })

  useEffect(() => {
    if (finished) onEnd(summary(true))
  }, [finished])

  if (finished) return null
  const step = state.steps[state.pos]
  const retry = (c: string) => makeQuestion('listen', index.byChar.get(c)!, index, rng)

  function handleAnswer(correct: boolean, ms: number) {
    const result = answer(state, correct, ms, retry)
    if (result.commit) onCommit(result.commit.char, result.commit.grade)
    setState(result.state)
  }

  return (
    <div class="session">
      <header class="session-bar">
        <button class="ghost small" onClick={() => onEnd(summary(false))}>
          ✕ 離開
        </button>
        <div class="progress-track">
          <div class="progress-fill" style={{ width: `${(state.pos / state.steps.length) * 100}%` }} />
        </div>
        <span class={`combo ${state.combo >= 3 ? 'hot' : ''}`} key={state.combo}>
          {state.combo >= 2 ? `${state.combo} COMBO` : ''}
        </span>
        <span class="xp-gain">+{state.xp} XP</span>
      </header>

      {step.type === 'intro' ? (
        <Intro
          entry={index.byChar.get(step.char)!}
          index={index}
          cards={cards}
          onNext={() => setState(skipIntro(state))}
        />
      ) : (
        <QuizCard
          key={state.pos}
          question={step.question}
          entry={index.byChar.get(step.question.char)!}
          combo={state.combo}
          onDone={handleAnswer}
        />
      )}
    </div>
  )
}
