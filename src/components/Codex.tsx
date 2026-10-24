import { useState } from 'preact/hooks'
import { familyOf } from '../lib/data'
import { BAND_SIZE } from '../lib/placement'
import { displayTier } from '../lib/progress'
import type { Tier } from '../lib/srs'
import type { CharEntry, CharIndex, Progress } from '../lib/types'
import { SpeakChip, Word } from './Word'

interface Props {
  index: CharIndex
  progress: Progress
  onRequestLearn: (char: string) => void
  onBack: () => void
}

const TIER_LABEL: Record<Tier, string> = {
  none: '未收集',
  unverified: '待確認・之後會抽查',
  bronze: '銅・剛學會',
  silver: '銀・熟悉',
  gold: '金・精通',
}

type Filter = 'all' | 'owned' | 'unverified' | 'missing'

const FILTER_LABEL: Record<Filter, string> = {
  all: '全部',
  owned: '已收集',
  unverified: '待確認',
  missing: '未收集',
}

const isOwned = (tier: Tier) => tier !== 'none' && tier !== 'unverified'

function matches(filter: Filter, tier: Tier): boolean {
  if (filter === 'all') return true
  if (filter === 'owned') return isOwned(tier)
  if (filter === 'unverified') return tier === 'unverified'
  return tier === 'none'
}

export function Codex({ index, progress, onRequestLearn, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<CharEntry | null>(null)
  const tier = (c: string) => displayTier(progress, c)
  const floors = Array.from({ length: Math.ceil(index.list.length / BAND_SIZE) }, (_, i) =>
    index.list.slice(i * BAND_SIZE, (i + 1) * BAND_SIZE),
  )

  return (
    <div class="codex">
      <header class="codex-bar">
        <button class="ghost small" onClick={onBack}>
          ← 返回
        </button>
        <h2>📖 文字圖鑑</h2>
        <div class="tabs">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button key={f} class={filter === f ? 'tab active' : 'tab'} onClick={() => setFilter(f)}>
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
      </header>

      {floors.map((floor, i) => {
        const shown = floor.filter((e) => matches(filter, tier(e.c)))
        if (shown.length === 0) return null
        const owned = floor.filter((e) => isOwned(tier(e.c))).length
        return (
          <section key={i} class="floor-section">
            <h3>
              第 {i + 1} 層 <span class="muted">{owned} / {floor.length}</span>
            </h3>
            <div class="codex-grid">
              {shown.map((e) => (
                <button key={e.c} class={`cell tier-${tier(e.c)}`} onClick={() => setOpen(e)}>
                  {e.c}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {open && (
        <CodexDetail
          entry={open}
          index={index}
          progress={progress}
          onRequestLearn={() => onRequestLearn(open.c)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

interface DetailProps {
  entry: CharEntry
  index: CharIndex
  progress: Progress
  onRequestLearn: () => void
  onClose: () => void
}

/** 任何等級都能丟回去重學：學障者忘得快，看不懂就該讓他自己推回去，不用等抽查 */
function learnLabel(tier: Tier, queued: boolean): string | null {
  if (queued) return null
  if (tier === 'none') return '想先學這個'
  if (tier === 'unverified') return '這個我不會，排進學習'
  return '看不懂了，丟回未收集重學'
}

function CodexDetail({ entry, index, progress, onRequestLearn, onClose }: DetailProps) {
  const tier = displayTier(progress, entry.c)
  const family = familyOf(index, entry).slice(0, 12)
  const queued = progress.wantToLearn.includes(entry.c)
  const label = learnLabel(tier, queued)

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
                <span key={e.c} class={`family-cell tier-${displayTier(progress, e.c)}`}>
                  <Word word={e.c} />
                </span>
              ))}
            </div>
          </>
        )}
        {queued && <p class="queued">✅ 已排進學習清單，下次任務會先教這個字</p>}
        {label && (
          <button class="secondary wide" onClick={onRequestLearn}>
            {label}
          </button>
        )}
        <button class="primary wide" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>
  )
}
