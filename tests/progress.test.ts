import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import {
  applyPlacement,
  applyReview,
  collectionStats,
  displayTier,
  requestLearn,
  resetForPlacement,
} from '../src/lib/progress'
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
    const p = requestLearn(applyPlacement(DEFAULT_PROGRESS, seeded), '清', now)
    expect(p.cards['清']).toBeUndefined()
    expect(displayTier(p, '清')).toBe('none')
    expect(p.wantToLearn).toEqual(['清'])
    expect(pickNewChars(index, p.cards, 2, p.wantToLearn)).toEqual(['清', '睛'])
  })

  it('學過之後從清單移除', () => {
    const p = applyReview(requestLearn(DEFAULT_PROGRESS, '情', now),'情', Rating.Good, now)
    expect(p.wantToLearn).toEqual([])
  })

  it('指定的字不在字表裡就略過', () => {
    expect(pickNewChars(index, {}, 2, ['龘'])).toEqual(['青', '清'])
  })
})

describe('作答紀錄', () => {
  const t = (iso: string) => new Date(iso)

  it('每次寫進 FSRS 都記一筆：字、秒數時間戳、評分', () => {
    const p = applyReview(DEFAULT_PROGRESS, '青', Rating.Good, now)
    expect(p.reviewLog).toEqual([['青', now.getTime() / 1000, Rating.Good]])
  })

  it('待確認字的第一次抽查加上標記，訓練參數時可以排除', () => {
    let p = applyPlacement(DEFAULT_PROGRESS, seeded)
    p = applyReview(p, '青', Rating.Good, t('2026-10-30T10:00:00'))
    p = applyReview(p, '青', Rating.Hard, t('2026-11-20T10:00:00'))
    expect(p.reviewLog.map((e) => e.length)).toEqual([4, 3])
    expect(p.reviewLog[0][3]).toBe(1)
  })

  it('丟回重學記一筆 Manual，有卡片才記', () => {
    let p = applyReview(DEFAULT_PROGRESS, '青', Rating.Good, now)
    p = requestLearn(p, '青', t('2026-10-26T10:00:00'))
    p = requestLearn(p, '清', t('2026-10-26T10:00:00'))
    expect(p.reviewLog.map(([c, , g]) => [c, g])).toEqual([
      ['青', Rating.Good],
      ['青', Rating.Manual],
    ])
  })

  it('重新探路清掉進度但保留紀錄，每張舊卡補一筆重置', () => {
    let p = applyReview(DEFAULT_PROGRESS, '青', Rating.Good, now)
    p = { ...p, settings: { ...p.settings, newPerDay: 5 } }
    const r = resetForPlacement(p, DEFAULT_PROGRESS, t('2026-10-26T10:00:00'))
    expect(r.cards).toEqual({})
    expect(r.settings.newPerDay).toBe(5)
    expect(r.reviewLog.map(([c, , g]) => [c, g])).toEqual([
      ['青', Rating.Good],
      ['青', Rating.Manual],
    ])
  })

  it('舊進度沒有紀錄欄位時從空的開始', () => {
    const old = { ...DEFAULT_PROGRESS } as Record<string, unknown>
    delete old.reviewLog
    expect(parseProgress(JSON.stringify(old)).reviewLog).toEqual([])
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
