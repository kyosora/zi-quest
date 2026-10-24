import { Rating, type Card, type Grade } from 'ts-fsrs'
import { makeQuestion, type Rng } from './quiz'
import { gradeAnswer, isDue, kindForReview } from './srs'
import type { CharIndex, Question, Settings } from './types'

export type Step = { type: 'intro'; char: string } | { type: 'quiz'; question: Question }

/** 每學一個新字，穿插幾題複習，讓新字有時間「忘一下」再考 */
const REVIEWS_PER_NEW = 3
/** 答錯的字隔幾題再考一次 */
const RETRY_GAP = 3

export interface SessionPlan {
  steps: Step[]
  newChars: string[]
  reviewChars: string[]
}

export function pickReviews(cards: Record<string, Card>, now: Date, limit: number): string[] {
  return Object.entries(cards)
    .filter(([, card]) => isDue(card, now))
    .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
    .slice(0, limit)
    .map(([c]) => c)
}

/** 使用者指定的字優先，再依字頻挑還沒學過的 */
export function pickNewChars(
  index: CharIndex,
  cards: Record<string, Card>,
  limit: number,
  wanted: string[] = [],
): string[] {
  const unlearned = (c: string) => !cards[c] && index.byChar.has(c)
  const byRank = index.list.map((e) => e.c)
  return [...new Set([...wanted, ...byRank])].filter(unlearned).slice(0, limit)
}

export function buildSession(
  index: CharIndex,
  cards: Record<string, Card>,
  settings: Settings,
  now: Date,
  rng: Rng,
  wanted: string[] = [],
): SessionPlan {
  const reviewChars = pickReviews(cards, now, settings.maxReviews)
  const newChars = pickNewChars(index, cards, settings.newPerDay, wanted)
  const entry = (c: string) => index.byChar.get(c)!

  const reviewSteps: Step[] = reviewChars.map((c) => ({
    type: 'quiz',
    question: makeQuestion(kindForReview(cards[c]), entry(c), index, rng),
  }))

  const steps: Step[] = []
  let r = 0
  for (const c of newChars) {
    steps.push({ type: 'intro', char: c })
    steps.push({ type: 'quiz', question: makeQuestion('listen', entry(c), index, rng) })
    steps.push(...reviewSteps.slice(r, r + REVIEWS_PER_NEW))
    r += REVIEWS_PER_NEW
  }
  steps.push(...reviewSteps.slice(r))
  // 新字在最後再用「看字選音」考一次，這題才是真的在練讀
  steps.push(
    ...newChars.map((c): Step => ({ type: 'quiz', question: makeQuestion('read', entry(c), index, rng) })),
  )
  return { steps, newChars, reviewChars }
}

export interface SessionState {
  steps: Step[]
  pos: number
  /** 每個字還剩幾題沒考完；歸零時才把結果寫進 FSRS */
  pending: Record<string, number>
  missed: Record<string, boolean>
  lastGrade: Record<string, Grade>
  combo: number
  maxCombo: number
  xp: number
  correct: number
  answered: number
}

export function startSession(plan: SessionPlan): SessionState {
  const pending: Record<string, number> = {}
  for (const step of plan.steps) {
    if (step.type === 'quiz') pending[step.question.char] = (pending[step.question.char] ?? 0) + 1
  }
  return {
    steps: plan.steps,
    pos: 0,
    pending,
    missed: {},
    lastGrade: {},
    combo: 0,
    maxCombo: 0,
    xp: 0,
    correct: 0,
    answered: 0,
  }
}

export function skipIntro(state: SessionState): SessionState {
  return { ...state, pos: state.pos + 1 }
}

export function comboBonus(combo: number): number {
  return Math.min(combo, 10)
}

export interface AnswerResult {
  state: SessionState
  /** 這個字這次 session 的題目全部考完，回傳要寫進 FSRS 的評分 */
  commit?: { char: string; grade: Grade }
}

export function answer(
  state: SessionState,
  correct: boolean,
  ms: number,
  makeRetry: (char: string) => Question,
): AnswerResult {
  const step = state.steps[state.pos]
  if (step?.type !== 'quiz') throw new Error(`第 ${state.pos} 步不是題目，不能作答`)
  const { char, kind } = step.question

  const combo = correct ? state.combo + 1 : 0
  const missed = state.missed[char] || !correct
  const retry: Step[] = correct ? [] : [{ type: 'quiz', question: makeRetry(char) }]
  const insertAt = Math.min(state.pos + 1 + RETRY_GAP, state.steps.length)
  const steps = [...state.steps.slice(0, insertAt), ...retry, ...state.steps.slice(insertAt)]
  const left = state.pending[char] - 1 + retry.length
  const grade = gradeAnswer(kind, correct, ms)

  const next: SessionState = {
    ...state,
    steps,
    pos: state.pos + 1,
    pending: { ...state.pending, [char]: left },
    missed: { ...state.missed, [char]: missed },
    lastGrade: { ...state.lastGrade, [char]: grade },
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    xp: state.xp + (correct ? 10 + comboBonus(combo) : 0),
    correct: state.correct + (correct ? 1 : 0),
    answered: state.answered + 1,
  }
  if (left > 0) return { state: next }
  // 這次只要錯過一次就算 Again；全對的話用最後一題的反應速度決定
  return { state: next, commit: { char, grade: missed ? Rating.Again : grade } }
}

export function isFinished(state: SessionState): boolean {
  return state.pos >= state.steps.length
}
