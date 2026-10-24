/** 等級 n 需要的累計經驗：50·(n-1)²，前期升級快，之後慢慢拉長 */
export function levelFromXp(xp: number): { level: number; into: number; span: number } {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1
  const floor = 50 * (level - 1) ** 2
  const ceil = 50 * level ** 2
  return { level, into: xp - floor, span: ceil - floor }
}

export const NEW_CHAR_XP = 20
export const SESSION_XP = 50

export const TITLES: [number, string][] = [
  [1, '見習冒險者'],
  [5, '識字學徒'],
  [10, '文字獵人'],
  [20, '符文解讀者'],
  [30, '古籍守護者'],
  [45, '字海領主'],
  [60, '萬字之王'],
]

export function titleFor(level: number): string {
  return TITLES.filter(([min]) => level >= min).at(-1)![1]
}

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function updateStreak(
  streak: { count: number; lastDay: string },
  now: Date,
): { count: number; lastDay: string } {
  const today = dayKey(now)
  if (streak.lastDay === today) return streak
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  return { count: streak.lastDay === yesterday ? streak.count + 1 : 1, lastDay: today }
}
