import { buildIndex } from '../src/lib/data'
import type { CharEntry } from '../src/lib/types'

export function entry(c: string, r: number, py: string, w: string[], extra: Partial<CharEntry> = {}): CharEntry {
  return { c, r, py, st: 10, w: w.map((x) => [x, '']), ph: '', se: '', hint: '', parts: [], sim: [], ...extra }
}

/** 青家族加上一些填充字，夠測干擾選項和分段 */
export const sample = [
  entry('青', 1, 'qing1', ['青色']),
  entry('清', 2, 'qing1', ['清楚'], { ph: '青', se: '氵', sim: ['睛', '晴', '請', '情'] }),
  entry('睛', 3, 'jing1', ['眼睛'], { ph: '青', se: '目', hint: '眼睛', sim: ['晴', '精', '請', '清'] }),
  entry('晴', 4, 'qing2', ['晴天'], { ph: '青', sim: ['睛', '請'] }),
  entry('請', 5, 'qing3', ['請問'], { ph: '青', sim: ['清', '睛'] }),
  entry('精', 6, 'jing1', ['精神'], { ph: '青', sim: ['睛'] }),
  entry('情', 7, 'qing2', ['心情'], { ph: '青', sim: ['晴'] }),
  entry('天', 8, 'tian1', ['天氣']),
  entry('心', 9, 'xin1', ['開心']),
  entry('眼', 10, 'yan3', ['眼鏡']),
  entry('媽', 11, 'ma1', ['媽媽']),
  entry('嗎', 12, 'ma5', ['好嗎']),
]

export const index = buildIndex(sample)

/** 固定序列的假亂數，讓測試結果可重現 */
export function seqRng(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function bigIndex(n: number) {
  return buildIndex(Array.from({ length: n }, (_, i) => entry(String.fromCodePoint(0x4e00 + i), i + 1, `x${i}1`, [`詞${i}`])))
}
