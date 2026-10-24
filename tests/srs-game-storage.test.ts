import { Rating, State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { dayKey, levelFromXp, titleFor, updateStreak } from '../src/lib/game'
import { gradeAnswer, kindForReview, newCard, review, seedKnownCard, tierOf } from '../src/lib/srs'
import { DEFAULT_PROGRESS, parseProgress } from '../src/lib/storage'

const now = new Date('2026-10-24T10:00:00')

describe('gradeAnswer', () => {
  it('答錯一律 Again', () => expect(gradeAnswer('listen', false, 500)).toBe(Rating.Again))
  it('正常速度答對是 Good', () => expect(gradeAnswer('listen', true, 3000)).toBe(Rating.Good))
  it('想很久才答對是 Hard', () => expect(gradeAnswer('listen', true, 20_000)).toBe(Rating.Hard))
  it('選音題要聽完選項，門檻比較寬', () => expect(gradeAnswer('read', true, 20_000)).toBe(Rating.Good))
  it('快閃題秒答是 Easy', () => expect(gradeAnswer('flash', true, 3000)).toBe(Rating.Easy))
})

describe('FSRS 排程', () => {
  it('新卡答對後排到之後的日子', () => {
    const card = review(newCard(now), Rating.Good, now)
    expect(card.due.getTime()).toBeGreaterThan(now.getTime())
    expect(card.state).toBe(State.Review)
  })

  it('答錯的熟卡 stability 下降', () => {
    const known = seedKnownCard(now, 20, 20)
    const later = new Date(now.getTime() + 20 * 86_400_000)
    expect(review(known, Rating.Again, later).stability).toBeLessThan(known.stability)
  })

  it('題型隨熟練度變難', () => {
    expect(kindForReview(seedKnownCard(now, 2, 2))).toBe('listen')
    expect(kindForReview(seedKnownCard(now, 10, 10))).toBe('read')
    expect(kindForReview(seedKnownCard(now, 40, 40))).toBe('flash')
  })

  it('圖鑑稀有度', () => {
    expect(tierOf(undefined)).toBe('none')
    expect(tierOf(seedKnownCard(now, 3, 3))).toBe('bronze')
    expect(tierOf(seedKnownCard(now, 10))).toBe('silver')
    expect(tierOf(seedKnownCard(now, 40, 40))).toBe('gold')
  })
})

describe('遊戲數值', () => {
  it('等級曲線', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, span: 50 })
    expect(levelFromXp(50).level).toBe(2)
    expect(levelFromXp(199).level).toBe(2)
    expect(levelFromXp(200).level).toBe(3)
  })

  it('稱號', () => {
    expect(titleFor(1)).toBe('見習冒險者')
    expect(titleFor(12)).toBe('文字獵人')
  })

  it('連續天數：昨天有練 +1，中斷歸 1，同一天不變', () => {
    expect(updateStreak({ count: 3, lastDay: '2026-10-23' }, now)).toEqual({ count: 4, lastDay: '2026-10-24' })
    expect(updateStreak({ count: 3, lastDay: '2026-10-20' }, now)).toEqual({ count: 1, lastDay: '2026-10-24' })
    const same = { count: 3, lastDay: '2026-10-24' }
    expect(updateStreak(same, now)).toBe(same)
  })

  it('跨月的昨天', () => {
    const nov1 = new Date('2026-11-01T08:00:00')
    expect(updateStreak({ count: 1, lastDay: '2026-10-31' }, nov1).count).toBe(2)
    expect(dayKey(nov1)).toBe('2026-11-01')
  })
})

describe('進度存取', () => {
  it('JSON 來回後日期還原成 Date', () => {
    const progress = { ...DEFAULT_PROGRESS, cards: { 青: seedKnownCard(now, 5) } }
    const back = parseProgress(JSON.stringify(progress))
    expect(back.cards['青'].due).toBeInstanceOf(Date)
    expect(back.cards['青'].due.getTime()).toBe(progress.cards['青'].due.getTime())
  })

  it('舊版設定缺欄位時補預設值', () => {
    const back = parseProgress(JSON.stringify({ ...DEFAULT_PROGRESS, settings: { newPerDay: 3 } }))
    expect(back.settings).toEqual({ ...DEFAULT_PROGRESS.settings, newPerDay: 3 })
  })

  it('不是備份檔就報錯', () => {
    expect(() => parseProgress('{"foo":1}')).toThrow('進度檔格式不對')
  })
})

describe('複習頻率', () => {
  it('密集模式的間隔比標準短', () => {
    const card = seedKnownCard(now, 10)
    const later = new Date(now.getTime() + 10 * 86_400_000)
    const standard = review(card, Rating.Good, later, 0.9)
    const dense = review(card, Rating.Good, later, 0.95)
    expect(dense.scheduled_days).toBeLessThan(standard.scheduled_days)
  })

  it('舊進度沒有這個設定時預設用密集', () => {
    const old = { ...DEFAULT_PROGRESS, settings: { newPerDay: 8, maxReviews: 40, speechRate: 0.85 } }
    expect(parseProgress(JSON.stringify(old)).settings.retention).toBe(0.95)
  })
})
