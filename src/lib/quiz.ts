import type { CharEntry, CharIndex, Question, QuestionKind } from './types'

export type Rng = () => number

const OPTION_COUNT = 4
const FALLBACK_RANK_WINDOW = 300

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function toneless(py: string): string {
  return py.replace(/\d/g, '')
}

/** 第一次學用最常見的詞；複習時在前三個常用詞裡輪，避免只記住某個詞的樣子 */
export function pickWord(entry: CharEntry, rng: Rng, varied: boolean): string {
  const pool = entry.w.slice(0, varied ? 3 : 1)
  return pool[Math.floor(rng() * pool.length)][0]
}

/**
 * 干擾字：優先用長得像的字（同聲旁、同部件），不夠再從字頻相近的字補。
 * 讀音相同的字一律排除，不然聽音題會有兩個正確答案。
 */
export function distractorChars(
  entry: CharEntry,
  index: CharIndex,
  word: string,
  rng: Rng,
  count = OPTION_COUNT - 1,
): string[] {
  const usable = (c: string) => {
    const other = index.byChar.get(c)
    return !!other && c !== entry.c && !word.includes(c) && toneless(other.py) !== toneless(entry.py)
  }
  const picked = entry.sim.filter(usable).slice(0, count)
  if (picked.length === count) return picked

  const nearby = index.list.filter(
    (e) => Math.abs(e.r - entry.r) <= FALLBACK_RANK_WINDOW && usable(e.c) && !picked.includes(e.c),
  )
  return [...picked, ...shuffle(nearby, rng).map((e) => e.c)].slice(0, count)
}

/** 干擾字自己的常用詞；不能含目標字，不然那個選項也算對 */
function ownWord(entry: CharEntry, target: string): string | undefined {
  return entry.w.map(([w]) => w).find((w) => !w.includes(target))
}

/**
 * listen：聽詞，從「把目標字換成形近字」的四個寫法裡選。只能靠看字分辨。
 * read／flash：只顯示單字，四個念法都是真的詞（眼睛／晴天／請問／清楚）。
 * 選項若用假詞，聽說好的人挑「聽起來像中文」的那個就會對，等於沒在考讀。
 */
export function makeQuestion(
  kind: QuestionKind,
  entry: CharEntry,
  index: CharIndex,
  rng: Rng,
  word = pickWord(entry, rng, kind !== 'listen'),
): Question {
  const fakeTexts =
    kind === 'listen'
      ? distractorChars(entry, index, word, rng).map((d) => word.split(entry.c).join(d))
      : realWordDistractors(entry, index, word, rng)
  const fakes = fakeTexts.map((text) => ({ text, correct: false }))
  return {
    kind,
    char: entry.c,
    word,
    options: shuffle([{ text: word, correct: true }, ...fakes], rng),
  }
}

function realWordDistractors(entry: CharEntry, index: CharIndex, word: string, rng: Rng): string[] {
  const seen = new Set([word])
  const out: string[] = []
  for (const c of distractorChars(entry, index, '', rng, OPTION_COUNT * 3)) {
    const w = ownWord(index.byChar.get(c)!, entry.c)
    if (!w || seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length === OPTION_COUNT - 1) break
  }
  return out
}
