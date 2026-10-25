import type { Card } from 'ts-fsrs'

/** chars.json 的一筆，由 scripts/build_data.py 產生 */
export interface CharEntry {
  c: string
  /** 字頻名次，1 = 最常用 */
  r: number
  /** 主要讀音（CEDICT 數字聲調），只用來判斷同音字，不顯示給使用者 */
  py: string
  st: number
  /** 例詞 [詞, 拼音]，第一個是最常用的；拼音可能是空字串 */
  w: [string, string][]
  /** 聲旁（形聲字才有） */
  ph: string
  /** 義符 */
  se: string
  /** 義符的口語提示，例如 目 → 眼睛 */
  hint: string
  parts: string[]
  /** 長得像、讀音不同的字，當干擾選項 */
  sim: string[]
}

export interface CharIndex {
  list: CharEntry[]
  byChar: Map<string, CharEntry>
  /** 聲旁 → 用這個聲旁的字（依字頻排序） */
  families: Map<string, CharEntry[]>
}

export interface Settings {
  newPerDay: number
  maxReviews: number
  speechRate: number
  /** 目標記憶率：0.9 標準、0.95 密集（間隔較短、複習較多） */
  retention: number
}

export interface DayLog {
  day: string
  reviewed: number
  learned: number
}

/**
 * 一筆作答紀錄，之後拿來訓練他專屬的 FSRS 參數。用 tuple 省空間（一年約一萬五千筆）。
 * [字, 時間（Unix 秒）, 評分 1–4（0 = 圖鑑丟回重學）, 1 = 分級測驗推估字的第一次抽查]
 */
export type ReviewEntry = [char: string, at: number, rating: number, seeded?: 1]

export interface Progress {
  version: 1
  cards: Record<string, Card>
  xp: number
  streak: { count: number; lastDay: string }
  placementDone: boolean
  /** 分級測驗推估會、還沒被抽查證實的字；抽查一次後移除 */
  unverified: Record<string, true>
  /** 使用者在圖鑑指定要學的字，排在字頻順序前面 */
  wantToLearn: string[]
  settings: Settings
  history: DayLog[]
  /** 只增不刪；分級測驗 seed 的卡片不是真的複習，不記 */
  reviewLog: ReviewEntry[]
}

export type QuestionKind = 'listen' | 'read' | 'flash'

export interface Option {
  text: string
  correct: boolean
}

export interface Question {
  kind: QuestionKind
  char: string
  /** 題目用的詞，target 字在詞裡 */
  word: string
  options: Option[]
}
