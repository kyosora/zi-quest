import { levelFromXp, titleFor } from '../lib/game'
import { collectionStats } from '../lib/progress'
import type { Progress } from '../lib/types'

interface Props {
  progress: Progress
  total: number
  dueCount: number
  newCount: number
  /** 還沒學過的字數；0 代表全部收集完 */
  unlearned: number
  onStart: () => void
  onExtra: () => void
  onCodex: () => void
  onSettings: () => void
}

export function Home({ progress, total, dueCount, newCount, unlearned, onStart, onExtra, onCodex, onSettings }: Props) {
  const { level, into, span } = levelFromXp(progress.xp)
  const { collected, unverified } = collectionStats(progress)
  const pct = Math.round((collected / total) * 1000) / 10
  const questDone = dueCount === 0 && newCount === 0

  return (
    <div class="home">
      <header class="player">
        <div class="level-badge">Lv.{level}</div>
        <div class="player-info">
          <div class="player-title">{titleFor(level)}</div>
          <div class="xp-track">
            <div class="xp-fill" style={{ width: `${(into / span) * 100}%` }} />
          </div>
          <div class="muted small-text">
            {into} / {span} XP
          </div>
        </div>
        <div class="streak" title="連續天數">
          🔥 {progress.streak.count}
        </div>
      </header>

      <section class="collection-stat" onClick={onCodex}>
        <div class="ring" style={{ '--pct': `${pct}%` }}>
          <div class="ring-inner">
            <span class="big-number">{collected}</span>
            <span class="muted">/ {total}</span>
          </div>
        </div>
        <p>已收集的字 · {pct}%</p>
        {unverified > 0 && <p class="muted small-text">還有 {unverified} 字待確認，抽查答對就收進來</p>}
      </section>

      <section class="quest">
        <h2>⚔️ 今日任務</h2>
        {questDone ? (
          <>
            <p>今天的任務完成了！</p>
            {unlearned > 0 ? (
              <button class="secondary wide" onClick={onExtra}>
                加碼挑戰：再學 {Math.min(5, unlearned)} 個新字
              </button>
            ) : (
              <p class="muted">3,500 字全部收集完成，接下來只剩到期的抽查。</p>
            )}
          </>
        ) : (
          <>
            <p>
              複習 <b>{dueCount}</b> 字 · 新字 <b>{newCount}</b> 字
            </p>
            <button class="primary wide pulse" onClick={onStart}>
              開始
            </button>
          </>
        )}
      </section>

      <nav class="home-nav">
        <button class="secondary" onClick={onCodex}>
          📖 圖鑑
        </button>
        <button class="secondary" onClick={onSettings}>
          ⚙️ 設定
        </button>
      </nav>
    </div>
  )
}
