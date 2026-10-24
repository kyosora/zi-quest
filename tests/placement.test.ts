import { describe, expect, it } from 'vitest'
import {
  answerPlacement,
  BAND_SIZE,
  currentChar,
  knownChars,
  PER_BAND,
  seedCards,
  startPlacement,
  type PlacementState,
} from '../src/lib/placement'
import { bigIndex, seqRng } from './fixtures'

const index = bigIndex(BAND_SIZE * 4)

function answerBand(state: PlacementState, correctCount: number): PlacementState {
  let s = state
  for (let i = 0; i < PER_BAND; i++) s = answerPlacement(s, i < correctCount, index, seqRng(i + 2))
  return s
}

describe('分級測驗', () => {
  it('每段出 PER_BAND 題，題目都在該段字頻範圍內', () => {
    const state = startPlacement(index, seqRng())
    expect(state.queue).toHaveLength(PER_BAND)
    for (const c of state.queue) expect(index.byChar.get(c)!.r).toBeLessThanOrEqual(BAND_SIZE)
  })

  it('連續兩段答得很差就結束', () => {
    let s = startPlacement(index, seqRng())
    s = answerBand(s, 6)
    s = answerBand(s, 2)
    expect(s.finished).toBe(false)
    s = answerBand(s, 1)
    expect(s.finished).toBe(true)
    expect(currentChar(s)).toBeUndefined()
  })

  it('通過的段落整段當作已會，答錯的字除外；沒通過的段落只算答對的字', () => {
    let s = startPlacement(index, seqRng())
    s = answerBand(s, 5)
    const missedInBand0 = s.done[0].asked.filter((c) => !s.done[0].correct.includes(c))
    s = answerBand(s, 3)
    s = answerBand(s, 0)
    s = answerBand(s, 0)
    const known = knownChars(s, index)
    expect(known).toHaveLength(BAND_SIZE - 1 + 3)
    expect(known).not.toContain(missedInBand0[0])
  })

  it('最後一段答完就結束', () => {
    let s = startPlacement(index, seqRng())
    for (let band = 0; band < 4; band++) s = answerBand(s, 6)
    expect(s.finished).toBe(true)
    expect(knownChars(s, index)).toHaveLength(BAND_SIZE * 4)
  })

  it('seed 的抽查日期分散在未來', () => {
    const now = new Date('2026-10-24T10:00:00')
    const cards = seedCards(['一', '丁', '七'], now, seqRng())
    for (const card of Object.values(cards)) expect(card.due.getTime()).toBeGreaterThan(now.getTime())
  })
})
