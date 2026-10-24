import { useEffect } from 'preact/hooks'
import { playFanfare } from '../lib/sfx'
import type { CharIndex } from '../lib/types'
import type { SessionSummary } from './Session'
import { SpeakChip } from './Word'

interface Props {
  summary: SessionSummary
  totalXp: number
  leveledUp: boolean
  index: CharIndex
  onHome: () => void
}

export function Result({ summary, totalXp, leveledUp, index, onHome }: Props) {
  const accuracy = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0

  useEffect(() => {
    if (summary.completed) playFanfare()
  }, [])

  return (
    <div class="panel center result">
      <h2>{summary.completed ? '🏆 任務完成' : '🏕️ 先休息一下'}</h2>
      {leveledUp && <p class="level-up">LEVEL UP!</p>}
      <div class="result-stats">
        <div>
          <span class="big-number">+{totalXp}</span>
          <span class="muted">XP</span>
        </div>
        <div>
          <span class="big-number">{accuracy}%</span>
          <span class="muted">正確率</span>
        </div>
        <div>
          <span class="big-number">{summary.maxCombo}</span>
          <span class="muted">最高連擊</span>
        </div>
      </div>
      {summary.completed && summary.newChars.length > 0 && (
        <>
          <p>今天收集的新字</p>
          <div class="chips center">
            {summary.newChars.map((c) => (
              <SpeakChip key={c} text={index.byChar.get(c)!.w[0][0]} target={c} />
            ))}
          </div>
        </>
      )}
      <button class="primary wide" onClick={onHome}>
        回基地
      </button>
    </div>
  )
}
