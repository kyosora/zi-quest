import { useEffect, useState } from 'preact/hooks'
import type { Grade } from 'ts-fsrs'
import { Codex } from './components/Codex'
import { Home } from './components/Home'
import { Placement } from './components/Placement'
import { Result } from './components/Result'
import { Session, type SessionSummary } from './components/Session'
import { Settings } from './components/Settings'
import { loadChars } from './lib/data'
import { dayKey, levelFromXp, NEW_CHAR_XP, SESSION_XP, updateStreak } from './lib/game'
import { buildSession, pickReviews, type SessionPlan } from './lib/session'
import { unlockAudio } from './lib/sfx'
import { hasChineseVoice, initSpeech, setSpeechRate, speak } from './lib/speech'
import { applyPlacement, applyReview, requestLearn, resetForPlacement, todayLog } from './lib/progress'
import { DEFAULT_PROGRESS, loadProgress, requestPersistence, saveProgress } from './lib/storage'
import type { CharIndex, Progress } from './lib/types'

type Screen =
  | { name: 'welcome' }
  | { name: 'placement' }
  | { name: 'home' }
  | { name: 'session'; plan: SessionPlan }
  | { name: 'result'; summary: SessionSummary; totalXp: number; leveledUp: boolean }
  | { name: 'codex' }
  | { name: 'settings' }

const EXTRA_NEW = 5
const rng = Math.random

export function App() {
  const [index, setIndex] = useState<CharIndex | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [screen, setScreen] = useState<Screen>(() =>
    progress.placementDone ? { name: 'home' } : { name: 'welcome' },
  )

  useEffect(() => {
    initSpeech()
    loadChars().then(setIndex, (e: Error) => setError(e.message))
  }, [])
  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => setSpeechRate(progress.settings.speechRate), [progress.settings.speechRate])

  if (error) return <div class="panel center">❌ {error}</div>
  if (!index) return <div class="panel center loading">載入字庫中…</div>

  const now = new Date()
  const today = dayKey(now)
  const newLeft = Math.max(0, progress.settings.newPerDay - todayLog(progress.history, today).learned)
  const dueCount = pickReviews(progress.cards, now, progress.settings.maxReviews).length
  const unlearned = index.list.filter((e) => !progress.cards[e.c]).length
  const newCount = Math.min(newLeft, unlearned)

  function startSession(newPerDay: number, maxReviews: number) {
    const settings = { ...progress.settings, newPerDay, maxReviews }
    const plan = buildSession(index!, progress.cards, settings, new Date(), rng, progress.wantToLearn)
    if (plan.steps.length > 0) setScreen({ name: 'session', plan })
  }

  function commit(char: string, grade: Grade) {
    setProgress((p) => applyReview(p, char, grade, new Date()))
  }

  function endSession(summary: SessionSummary) {
    if (summary.answered === 0) {
      setScreen({ name: 'home' })
      return
    }
    const bonus = summary.completed ? SESSION_XP + summary.newChars.length * NEW_CHAR_XP : 0
    const totalXp = summary.xp + bonus
    const leveledUp = levelFromXp(progress.xp + totalXp).level > levelFromXp(progress.xp).level
    setProgress((p) => ({ ...p, xp: p.xp + totalXp, streak: updateStreak(p.streak, new Date()) }))
    setScreen({ name: 'result', summary, totalXp, leveledUp })
  }

  switch (screen.name) {
    case 'welcome':
      return (
        <div class="panel center welcome">
          <h1 class="logo">字遊</h1>
          <p>每天十幾分鐘，把常用的 3,500 個字收進圖鑑。</p>
          <p class="muted">建議先在 Safari 按「分享 → 加入主畫面」，進度才不會被清掉。</p>
          <button
            class="primary wide"
            onClick={() => {
              unlockAudio()
              void requestPersistence()
              void speak('歡迎來到字遊')
              setScreen({ name: 'placement' })
            }}
          >
            開始
          </button>
          {!hasChineseVoice() && (
            <p class="warn">
              找不到中文語音：請到 iPad「設定 → 輔助使用 → 朗讀內容 → 聲音 → 中文（台灣）」下載語音。
            </p>
          )}
        </div>
      )
    case 'placement':
      return (
        <Placement
          index={index}
          rng={rng}
          onComplete={(cards) => {
            setProgress((p) => applyPlacement(p, cards))
            setScreen({ name: 'home' })
          }}
        />
      )
    case 'session':
      return (
        <Session
          index={index}
          cards={progress.cards}
          plan={screen.plan}
          rng={rng}
          onCommit={commit}
          onEnd={endSession}
        />
      )
    case 'result':
      return (
        <Result
          summary={screen.summary}
          totalXp={screen.totalXp}
          leveledUp={screen.leveledUp}
          index={index}
          onHome={() => setScreen({ name: 'home' })}
        />
      )
    case 'codex':
      return (
        <Codex
          index={index}
          progress={progress}
          onRequestLearn={(char) => setProgress((p) => requestLearn(p, char, new Date()))}
          onBack={() => setScreen({ name: 'home' })}
        />
      )
    case 'settings':
      return (
        <Settings
          progress={progress}
          onChange={(settings) => setProgress((p) => ({ ...p, settings }))}
          onImport={setProgress}
          onRedoPlacement={() => {
            setProgress((p) => resetForPlacement(p, DEFAULT_PROGRESS, new Date()))
            setScreen({ name: 'placement' })
          }}
          onBack={() => setScreen({ name: 'home' })}
        />
      )
    case 'home':
      return (
        <Home
          progress={progress}
          total={index.list.length}
          dueCount={dueCount}
          newCount={newCount}
          unlearned={unlearned}
          onStart={() => {
            unlockAudio()
            startSession(newLeft, progress.settings.maxReviews)
          }}
          onExtra={() => {
            unlockAudio()
            startSession(EXTRA_NEW, 0)
          }}
          onCodex={() => setScreen({ name: 'codex' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )
  }
}
