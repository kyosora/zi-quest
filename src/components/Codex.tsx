import { useState } from 'preact/hooks'
import type { Card } from 'ts-fsrs'
import { familyOf } from '../lib/data'
import { BAND_SIZE } from '../lib/placement'
import { tierOf, type Tier } from '../lib/srs'
import type { CharEntry, CharIndex } from '../lib/types'
import { SpeakChip, Word } from './Word'

interface Props {
  index: CharIndex
  cards: Record<string, Card>
  onBack: () => void
}

const TIER_LABEL: Record<Tier, string> = {
  none: '未收集',
  bronze: '銅・剛學會',
  silver: '銀・熟悉',
  gold: '金・精通',
}

type Filter = 'all' | 'owned' | 'missing'

export function Codex({ index, cards, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<CharEntry | null>(null)
  const floors = Array.from({ length: Math.ceil(index.list.length / BAND_SIZE) }, (_, i) =>
    index.list.slice(i * BAND_SIZE, (i + 1) * BAND_SIZE),
  )
  const visible = (e: CharEntry) => {
    const owned = tierOf(cards[e.c]) !== 'none'
    return filter === 'all' || (filter === 'owned') === owned
  }

  return (
    <div class="codex">
      <header class="codex-bar">
        <button class="ghost small" onClick={onBack}>
          ← 返回
        </button>
        <h2>📖 文字圖鑑</h2>
        <div class="tabs">
          {(['all', 'owned', 'missing'] as Filter[]).map((f) => (
            <button key={f} class={filter === f ? 'tab active' : 'tab'} onClick={() => setFilter(f)}>
              {{ all: '全部', owned: '已收集', missing: '未收集' }[f]}
            </button>
          ))}
        </div>
      </header>

      {floors.map((floor, i) => {
        const shown = floor.filter(visible)
        if (shown.length === 0) return null
        const owned = floor.filter((e) => tierOf(cards[e.c]) !== 'none').length
        return (
          <section key={i} class="floor-section">
            <h3>
              第 {i + 1} 層 <span class="muted">{owned} / {floor.length}</span>
            </h3>
            <div class="codex-grid">
              {shown.map((e) => (
                <button key={e.c} class={`cell tier-${tierOf(cards[e.c])}`} onClick={() => setOpen(e)}>
                  {e.c}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {open && <CodexDetail entry={open} index={index} cards={cards} onClose={() => setOpen(null)} />}
    </div>
  )
}

function CodexDetail({
  entry,
  index,
  cards,
  onClose,
}: {
  entry: CharEntry
  index: CharIndex
  cards: Record<string, Card>
  onClose: () => void
}) {
  const tier = tierOf(cards[entry.c])
  const family = familyOf(index, entry).slice(0, 12)
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class={`modal tier-border-${tier}`} onClick={(e) => e.stopPropagation()}>
        <div class={`modal-char tier-${tier}`}>{entry.c}</div>
        <p class="muted">
          {TIER_LABEL[tier]} · 字頻第 {entry.r} 名
        </p>
        <div class="chips center">
          {entry.w.map(([w]) => (
            <SpeakChip key={w} text={w} target={entry.c} />
          ))}
        </div>
        {family.length > 0 && (
          <>
            <p>同家族（聲音提示「{entry.ph || entry.c}」）</p>
            <div class="chips center">
              {family.map((e) => (
                <span key={e.c} class={`family-cell tier-${tierOf(cards[e.c])}`}>
                  <Word word={e.c} />
                </span>
              ))}
            </div>
          </>
        )}
        <button class="primary wide" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>
  )
}
