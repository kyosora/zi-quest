import type { Card } from 'ts-fsrs'
import type { Progress } from './types'

const KEY = 'zi-quest.progress.v1'

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  cards: {},
  xp: 0,
  streak: { count: 0, lastDay: '' },
  placementDone: false,
  settings: { newPerDay: 8, maxReviews: 40, speechRate: 0.85 },
  history: [],
}

/** JSON 會把 Date 變成字串，讀回來要還原，FSRS 才算得了間隔 */
function reviveCard(raw: Card): Card {
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  }
}

export function parseProgress(json: string): Progress {
  const raw = JSON.parse(json) as Progress
  if (raw?.version !== 1 || typeof raw.cards !== 'object') {
    throw new Error('進度檔格式不對：不是字遊的備份，或版本不相容')
  }
  const cards = Object.fromEntries(Object.entries(raw.cards).map(([c, card]) => [c, reviveCard(card)]))
  return {
    ...DEFAULT_PROGRESS,
    ...raw,
    settings: { ...DEFAULT_PROGRESS.settings, ...raw.settings },
    cards,
  }
}

export function loadProgress(): Progress {
  try {
    const json = localStorage.getItem(KEY)
    return json ? parseProgress(json) : DEFAULT_PROGRESS
  } catch (error) {
    console.error('讀取進度失敗，改用空白進度', error)
    return DEFAULT_PROGRESS
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('儲存進度失敗（儲存空間滿了或被瀏覽器封鎖）', error)
  }
}

/** iPad Safari 會清掉太久沒開的網站資料；加到主畫面的 App 和申請 persist 過的不會 */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // 不支援就算了，備份功能還在
  }
}
