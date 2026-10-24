import type { Card } from 'ts-fsrs'
import { shuffle, type Rng } from './quiz'
import { seedKnownCard } from './srs'
import type { CharIndex } from './types'

/**
 * 分級測驗：每 250 字一段，每段抽 6 字。
 * 6 題對 5 題以上 → 整段當作已經會；連續兩段只對 2 題以下 → 停止，後面都當新字。
 * 四選一猜對的機率是 25%，6 題猜中 5 題的機率不到 0.5%，所以門檻設 5。
 */
export const BAND_SIZE = 250
export const PER_BAND = 6
const PASS_SCORE = 5
const FAIL_SCORE = 2
const FAILS_TO_STOP = 2
/** 判定已會的字，第一次抽查平均分散在這幾天內，避免同一天湧進上千題 */
const SEED_SPREAD_DAYS = 60

export interface BandResult {
  band: number
  asked: string[]
  correct: string[]
}

export interface PlacementState {
  band: number
  queue: string[]
  current: BandResult
  done: BandResult[]
  fails: number
  finished: boolean
}

export function bandCount(index: CharIndex): number {
  return Math.ceil(index.list.length / BAND_SIZE)
}

function sampleBand(index: CharIndex, band: number, rng: Rng): string[] {
  const chars = index.list.slice(band * BAND_SIZE, (band + 1) * BAND_SIZE).map((e) => e.c)
  return shuffle(chars, rng).slice(0, PER_BAND)
}

function openBand(index: CharIndex, band: number, rng: Rng): Pick<PlacementState, 'band' | 'queue' | 'current'> {
  return { band, queue: sampleBand(index, band, rng), current: { band, asked: [], correct: [] } }
}

export function startPlacement(index: CharIndex, rng: Rng): PlacementState {
  return { ...openBand(index, 0, rng), done: [], fails: 0, finished: false }
}

export function currentChar(state: PlacementState): string | undefined {
  return state.finished ? undefined : state.queue[0]
}

export function answerPlacement(
  state: PlacementState,
  correct: boolean,
  index: CharIndex,
  rng: Rng,
): PlacementState {
  const [char, ...queue] = state.queue
  const current: BandResult = {
    ...state.current,
    asked: [...state.current.asked, char],
    correct: correct ? [...state.current.correct, char] : state.current.correct,
  }
  if (queue.length > 0) return { ...state, queue, current }

  const done = [...state.done, current]
  const fails = current.correct.length <= FAIL_SCORE ? state.fails + 1 : 0
  const nextBand = state.band + 1
  if (fails >= FAILS_TO_STOP || nextBand >= bandCount(index)) {
    return { ...state, queue: [], current, done, fails, finished: true }
  }
  return { ...state, ...openBand(index, nextBand, rng), done, fails }
}

export function knownChars(state: PlacementState, index: CharIndex): string[] {
  return state.done.flatMap((result) => {
    if (result.correct.length < PASS_SCORE) return result.correct
    const missed = new Set(result.asked.filter((c) => !result.correct.includes(c)))
    return index.list
      .slice(result.band * BAND_SIZE, (result.band + 1) * BAND_SIZE)
      .map((e) => e.c)
      .filter((c) => !missed.has(c))
  })
}

export function seedCards(chars: string[], now: Date, rng: Rng): Record<string, Card> {
  return Object.fromEntries(
    chars.map((c) => [c, seedKnownCard(now, 1 + Math.floor(rng() * SEED_SPREAD_DAYS))]),
  )
}
