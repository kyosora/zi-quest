import type { CharEntry, CharIndex } from './types'

export function buildIndex(list: CharEntry[]): CharIndex {
  const byChar = new Map(list.map((e) => [e.c, e]))
  const families = new Map<string, CharEntry[]>()
  for (const e of list) {
    if (!e.ph) continue
    families.set(e.ph, [...(families.get(e.ph) ?? []), e])
  }
  return { list, byChar, families }
}

/** 同聲旁的其他字；聲旁本身也是常用字時一起列進來（青 → 清、請、晴） */
export function familyOf(index: CharIndex, entry: CharEntry): CharEntry[] {
  const key = entry.ph || (index.families.has(entry.c) ? entry.c : '')
  if (!key) return []
  const members = index.families.get(key) ?? []
  const base = index.byChar.get(key)
  const all = base ? [base, ...members] : members
  return all.filter((e) => e.c !== entry.c)
}

export async function loadChars(): Promise<CharIndex> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/chars.json`)
  if (!res.ok) throw new Error(`字表載入失敗（HTTP ${res.status}），請確認網路後重新整理`)
  return buildIndex((await res.json()) as CharEntry[])
}
