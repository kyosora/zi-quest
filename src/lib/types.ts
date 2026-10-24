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
}

export interface DayLog {
  day: string
  reviewed: number
  learned: number
}

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
