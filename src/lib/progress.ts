import { Rating, type Card, type Grade } from 'ts-fsrs'
import { dayKey } from './game'
import { newCard, review, tierOf, type Tier } from './srs'
import type { DayLog, Progress, ReviewEntry } from './types'

const HISTORY_DAYS = 90

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _, ...rest } = record
  return rest
}

export function todayLog(history: DayLog[], day: string): DayLog {
  return history.find((h) => h.day === day) ?? { day, reviewed: 0, learned: 0 }
}

function logCommit(history: DayLog[], day: string, isNew: boolean): DayLog[] {
  const log = todayLog(history, day)
  const updated = isNew ? { ...log, learned: log.learned + 1 } : { ...log, reviewed: log.reviewed + 1 }
  return [...history.filter((h) => h.day !== day), updated].slice(-HISTORY_DAYS)
}

function entry(char: string, at: Date, rating: number, seeded: boolean): ReviewEntry {
  const t = Math.floor(at.getTime() / 1000)
  return seeded ? [char, t, rating, 1] : [char, t, rating]
}

/** 一個字在 session 裡考完：寫進 FSRS；不管對錯，都不再是「待確認」 */
export function applyReview(p: Progress, char: string, grade: Grade, at: Date): Progress {
  const card: Card = p.cards[char] ?? newCard(at)
  return {
    ...p,
    cards: { ...p.cards, [char]: review(card, grade, at, p.settings.retention) },
    unverified: omit(p.unverified, char),
    wantToLearn: p.wantToLearn.filter((c) => c !== char),
    history: logCommit(p.history, dayKey(at), !p.cards[char]),
    reviewLog: [...p.reviewLog, entry(char, at, grade, !!p.unverified[char])],
  }
}

export function applyPlacement(p: Progress, seeded: Record<string, Card>): Progress {
  const fresh = Object.keys(seeded).filter((c) => !p.cards[c])
  return {
    ...p,
    cards: { ...seeded, ...p.cards },
    unverified: { ...p.unverified, ...Object.fromEntries(fresh.map((c) => [c, true as const])) },
    placementDone: true,
  }
}

/** 圖鑑裡按「我不會」或「想學」：清掉排程，排到新字清單最前面 */
export function requestLearn(p: Progress, char: string, at: Date): Progress {
  const reset = p.cards[char] ? [entry(char, at, Rating.Manual, !!p.unverified[char])] : []
  return {
    ...p,
    cards: omit(p.cards, char),
    unverified: omit(p.unverified, char),
    wantToLearn: [char, ...p.wantToLearn.filter((c) => c !== char)],
    reviewLog: [...p.reviewLog, ...reset],
  }
}

/** 重新探路：進度歸零，但作答紀錄留著，每張舊卡補一筆重置，訓練時才接得起來 */
export function resetForPlacement(p: Progress, blank: Progress, at: Date): Progress {
  const resets = Object.keys(p.cards).map((c) => entry(c, at, Rating.Manual, !!p.unverified[c]))
  return { ...blank, settings: p.settings, reviewLog: [...p.reviewLog, ...resets] }
}

export function displayTier(p: Progress, char: string): Tier {
  return p.unverified[char] ? 'unverified' : tierOf(p.cards[char])
}

/** 和圖鑑同一套標準：銅銀金算收集（答錯重學的字也是銅），待確認的另外算 */
export function collectionStats(p: Progress): { collected: number; unverified: number } {
  const tiers = Object.keys(p.cards).map((c) => displayTier(p, c))
  return {
    collected: tiers.filter((t) => t !== 'none' && t !== 'unverified').length,
    unverified: tiers.filter((t) => t === 'unverified').length,
  }
}
