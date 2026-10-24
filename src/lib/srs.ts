import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { QuestionKind } from './types'

// 同一天內的重複由 session 自己排（答錯會再出一題），FSRS 只管跨天的間隔
const scheduler = fsrs({
  request_retention: 0.9,
  enable_short_term: false,
  enable_fuzz: true,
  maximum_interval: 365,
})

const DAY_MS = 86_400_000
/** 分級測驗判定已會的字一律從「熟悉」（銀）起跳，抽查答對再升金 */
const SEED_STABILITY = 10

/** 答得很慢代表還在想，給 Hard；各題型的門檻不同，因為選音題要先把四個選項聽完 */
const SLOW_MS: Record<QuestionKind, number> = { listen: 12_000, read: 25_000, flash: 15_000 }
const FAST_FLASH_MS = 6_000

export function newCard(now: Date): Card {
  return createEmptyCard(now)
}

export function gradeAnswer(kind: QuestionKind, correct: boolean, ms: number): Grade {
  if (!correct) return Rating.Again
  if (ms > SLOW_MS[kind]) return Rating.Hard
  if (kind === 'flash' && ms < FAST_FLASH_MS) return Rating.Easy
  return Rating.Good
}

export function review(card: Card, grade: Grade, now: Date): Card {
  return scheduler.next(card, now, grade).card
}

/**
 * 分級測驗判定「已經會」的字：直接當成複習中的卡片，
 * 第一次抽查排在 dueInDays 天後，答錯 FSRS 自然會把它拉回來重學。
 */
export function seedKnownCard(now: Date, dueInDays: number, stability = SEED_STABILITY): Card {
  return {
    ...createEmptyCard(now),
    state: State.Review,
    stability,
    difficulty: 5,
    reps: 1,
    scheduled_days: dueInDays,
    last_review: now,
    due: new Date(now.getTime() + dueInDays * DAY_MS),
  }
}

export type Tier = 'none' | 'bronze' | 'silver' | 'gold'

/** 圖鑑稀有度：還沒學／剛學會／熟悉（一週以上記得住）／精通（一個月以上） */
export function tierOf(card: Card | undefined): Tier {
  if (!card || card.state === State.New) return 'none'
  if (card.state !== State.Review || card.stability < 7) return 'bronze'
  return card.stability < 30 ? 'silver' : 'gold'
}

export function isKnown(card: Card | undefined): boolean {
  return card?.state === State.Review
}

export function isDue(card: Card, now: Date): boolean {
  return card.state !== State.New && card.due.getTime() <= now.getTime()
}

/** 複習題型隨熟練度變難：先聽音選字，熟了改看字選音，很熟就快閃 */
export function kindForReview(card: Card): QuestionKind {
  if (card.state !== State.Review || card.stability < 4) return 'listen'
  return card.stability < 30 ? 'read' : 'flash'
}
