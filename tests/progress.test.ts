import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { applyPlacement, applyReview, collectionStats, displayTier, requestLearn } from '../src/lib/progress'
import { pickNewChars } from '../src/lib/session'
import { newCard, review, seedKnownCard } from '../src/lib/srs'
import { DEFAULT_PROGRESS, parseProgress } from '../src/lib/storage'
import { index } from './fixtures'

const now = new Date('2026-10-25T10:00:00')
const seeded = { 青: seedKnownCard(now, 5), 清: seedKnownCard(now, 9) }

describe('分級測驗推估的字', () => {
  it('標成待確認，不算進已收集', () => {
    const p = applyPlacement(DEFAULT_PROGRESS, seeded)
    expect(displayTier(p, '青')).toBe('unverified')
    expect(collectionStats(p)).toEqual({ collected: 0, unverified: 2 })
    expect(p.placementDone).toBe(true)
  })

  it('抽查答對升銀，答錯降成銅（重學），兩種都不再是待確認', () => {
    let p = applyPlacement(DEFAULT_PROGRESS, seeded)
    p = applyReview(p, '青', Rating.Good, new Date('2026-10-30T10:00:00'))
    p = applyReview(p, '清', Rating.Again, new Date('2026-11-03T10:00:00'))
    expect(displayTier(p, '青')).toBe('silver')
    expect(displayTier(p, '清')).toBe('bronze')
    expect(collectionStats(p)).toEqual({ collected: 2, unverified: 0 })
  })

  it('重測不會把已經學過的字蓋回待確認', () => {
    const learned = applyReview(DEFAULT_PROGRESS, '青', Rating.Good, now)
    const p = applyPlacement(learned, seeded)
    expect(displayTier(p, '青')).not.toBe('unverified')
    expect(displayTier(p, '清')).toBe('unverified')
  })
})

describe('我不會／想學', () => {
  it('清掉排程、排到新字清單最前面', () => {
    const p = requestLearn(applyPlacement(DEFAULT_PROGRESS, seeded), '清')
    expect(p.cards['清']).toBeUndefined()
    expect(displayTier(p, '清')).toBe('none')
    expect(p.wantToLearn).toEqual(['清'])
    expect(pickNewChars(index, p.cards, 2, p.wantToLearn)).toEqual(['清', '睛'])
  })

  it('學過之後從清單移除', () => {
    const p = applyReview(requestLearn(DEFAULT_PROGRESS, '情'), '情', Rating.Good, now)
    expect(p.wantToLearn).toEqual([])
  })

  it('指定的字不在字表裡就略過', () => {
    expect(pickNewChars(index, {}, 2, ['龘'])).toEqual(['青', '清'])
  })
})

describe('舊版進度轉換', () => {
  it('沒有 unverified 欄位時，用 seed 特徵認出待確認的字', () => {
    const reviewed = review(newCard(now), Rating.Good, now)
    const old = { ...DEFAULT_PROGRESS, cards: { ...seeded, 睛: reviewed } } as Record<string, unknown>
    delete old.unverified
    delete old.wantToLearn
    const p = parseProgress(JSON.stringify(old))
    expect(Object.keys(p.unverified).sort()).toEqual(['清', '青'].sort())
    expect(p.wantToLearn).toEqual([])
  })
})
