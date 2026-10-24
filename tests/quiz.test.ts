import { describe, expect, it } from 'vitest'
import { distractorChars, makeQuestion, shuffle } from '../src/lib/quiz'
import { familyOf } from '../src/lib/data'
import { index, seqRng } from './fixtures'

const get = (c: string) => index.byChar.get(c)!

describe('distractorChars', () => {
  it('同音字不能當干擾選項', () => {
    // 睛 jing1 和 精 jing1 同音，一定要排除
    const picked = distractorChars(get('睛'), index, '眼睛', seqRng())
    expect(picked).not.toContain('精')
    expect(picked).toHaveLength(3)
  })

  it('優先用長得像的字', () => {
    const picked = distractorChars(get('睛'), index, '眼睛', seqRng())
    expect(picked.slice(0, 3)).toEqual(['晴', '請', '清'])
  })

  it('相似字不夠時從字頻相近的字補滿', () => {
    const picked = distractorChars(get('晴'), index, '晴天', seqRng())
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    expect(picked).not.toContain('天') // 詞裡已經有的字不能用
  })
})

describe('makeQuestion', () => {
  it('四個選項、只有一個正確、文字都不同', () => {
    const q = makeQuestion('listen', get('睛'), index, seqRng())
    expect(q.options).toHaveLength(4)
    expect(q.options.filter((o) => o.correct)).toEqual([{ text: '眼睛', correct: true }])
    expect(new Set(q.options.map((o) => o.text)).size).toBe(4)
  })

  it('聽音題：干擾選項只換掉目標字', () => {
    const q = makeQuestion('listen', get('睛'), index, seqRng(), '眼睛')
    for (const o of q.options) expect(o.text[0]).toBe('眼')
  })

  it('選音題：選項全是真的詞，干擾詞來自形近字、不含目標字', () => {
    const q = makeQuestion('read', get('睛'), index, seqRng(), '眼睛')
    const realWords = new Set(index.list.flatMap((e) => e.w.map(([w]) => w)))
    expect(q.options).toHaveLength(4)
    for (const o of q.options) expect(realWords.has(o.text)).toBe(true)
    for (const o of q.options.filter((x) => !x.correct)) expect(o.text).not.toContain('睛')
    expect(q.options.map((o) => o.text)).toEqual(expect.arrayContaining(['晴天', '請問', '清楚']))
  })

  it('疊字詞兩個字都換掉', () => {
    const q = makeQuestion('listen', get('媽'), index, seqRng(), '媽媽')
    for (const o of q.options.filter((x) => !x.correct)) expect(o.text[0]).toBe(o.text[1])
  })
})

describe('shuffle', () => {
  it('不改動原陣列', () => {
    const input = [1, 2, 3, 4]
    shuffle(input, seqRng())
    expect(input).toEqual([1, 2, 3, 4])
  })
})

describe('familyOf', () => {
  it('列出同聲旁的字和聲旁本身', () => {
    const family = familyOf(index, get('睛')).map((e) => e.c)
    expect(family).toContain('青')
    expect(family).toContain('清')
    expect(family).not.toContain('睛')
  })

  it('聲旁字本身也能查到家族', () => {
    expect(familyOf(index, get('青')).map((e) => e.c)).toContain('晴')
  })
})
