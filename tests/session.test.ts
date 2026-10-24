import { Rating, State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { makeQuestion } from '../src/lib/quiz'
import { answer, buildSession, isFinished, pickNewChars, pickReviews, skipIntro, startSession } from '../src/lib/session'
import { newCard, seedKnownCard } from '../src/lib/srs'
import { index, seqRng } from './fixtures'

const now = new Date('2026-10-24T10:00:00')
const settings = { newPerDay: 2, maxReviews: 5, speechRate: 1, retention: 0.9 }
const retry = (c: string) => makeQuestion('listen', index.byChar.get(c)!, index, seqRng())

function dueCard(daysAgo: number) {
  return { ...seedKnownCard(now, 1), due: new Date(now.getTime() - daysAgo * 86_400_000) }
}

describe('選字', () => {
  it('複習只挑到期的，最久沒複習的排前面', () => {
    const cards = { 青: dueCard(1), 清: dueCard(5), 睛: seedKnownCard(now, 3) }
    expect(pickReviews(cards, now, 10)).toEqual(['清', '青'])
  })

  it('新字依字頻挑還沒學過的', () => {
    const cards = { 青: newCard(now), 睛: dueCard(1) }
    expect(pickNewChars(index, cards, 3)).toEqual(['清', '晴', '請'])
  })
})

describe('buildSession', () => {
  it('每個新字：介紹 → 聽音題，最後再一題看字選音', () => {
    const plan = buildSession(index, {}, settings, now, seqRng())
    const shape = plan.steps.map((s) => (s.type === 'intro' ? `intro:${s.char}` : `${s.question.kind}:${s.question.char}`))
    expect(shape).toEqual(['intro:青', 'listen:青', 'intro:清', 'listen:清', 'read:青', 'read:清'])
  })

  it('複習題穿插在新字之間', () => {
    const cards = { 天: dueCard(1), 心: dueCard(2), 眼: dueCard(3), 媽: dueCard(4) }
    const plan = buildSession(index, cards, settings, now, seqRng())
    const kinds = plan.steps.map((s) => s.type)
    expect(kinds.slice(0, 5)).toEqual(['intro', 'quiz', 'quiz', 'quiz', 'quiz'])
    expect(plan.reviewChars).toHaveLength(4)
  })
})

describe('answer', () => {
  it('答對累積連擊與經驗', () => {
    const plan = buildSession(index, {}, settings, now, seqRng())
    let state = skipIntro(startSession(plan))
    state = answer(state, true, 2000, retry).state
    expect(state.combo).toBe(1)
    expect(state.xp).toBe(11)
  })

  it('答錯會在幾題後再考一次，最後評分是 Again', () => {
    const plan = buildSession(index, {}, settings, now, seqRng())
    let state = skipIntro(startSession(plan))
    const first = answer(state, false, 2000, retry)
    state = first.state
    expect(first.commit).toBeUndefined()
    expect(state.combo).toBe(0)
    expect(state.steps).toHaveLength(plan.steps.length + 1)

    const commits: { char: string; grade: number }[] = []
    while (!isFinished(state)) {
      const step = state.steps[state.pos]
      if (step.type === 'intro') {
        state = skipIntro(state)
        continue
      }
      const result = answer(state, true, 2000, retry)
      if (result.commit) commits.push(result.commit)
      state = result.state
    }
    expect(commits).toContainEqual({ char: '青', grade: Rating.Again })
    expect(commits).toContainEqual({ char: '清', grade: Rating.Good })
  })

  it('在介紹頁呼叫 answer 直接報錯', () => {
    const plan = buildSession(index, {}, settings, now, seqRng())
    expect(() => answer(startSession(plan), true, 1000, retry)).toThrow('不是題目')
  })
})

describe('srs 整合', () => {
  it('seed 出來的卡片是複習狀態', () => {
    expect(seedKnownCard(now, 10).state).toBe(State.Review)
  })
})
