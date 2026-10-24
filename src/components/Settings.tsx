import { useState } from 'preact/hooks'
import { speak, voiceName } from '../lib/speech'
import { RETENTION } from '../lib/srs'
import { parseProgress } from '../lib/storage'
import type { Progress, Settings as SettingsType } from '../lib/types'

interface Props {
  progress: Progress
  onChange: (settings: SettingsType) => void
  onImport: (progress: Progress) => void
  onRedoPlacement: () => void
  onBack: () => void
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Settings({ progress, onChange, onImport, onRedoPlacement, onBack }: Props) {
  const { settings } = progress
  const [message, setMessage] = useState('')
  const [confirmRedo, setConfirmRedo] = useState(false)
  const set = (patch: Partial<SettingsType>) => onChange({ ...settings, ...patch })

  async function importFile(file: File | undefined) {
    if (!file) return
    try {
      onImport(parseProgress(await file.text()))
      setMessage('✅ 進度已還原')
    } catch (error) {
      setMessage(`❌ ${(error as Error).message}`)
    }
  }

  return (
    <div class="panel settings">
      <button class="ghost small" onClick={onBack}>
        ← 返回
      </button>
      <h2>⚙️ 設定</h2>

      <label class="setting">
        <span>
          每天新字 <b>{settings.newPerDay}</b> 個
        </span>
        <input
          type="range"
          min={3}
          max={20}
          value={settings.newPerDay}
          onInput={(e) => set({ newPerDay: Number(e.currentTarget.value) })}
        />
      </label>

      <label class="setting">
        <span>
          每天最多複習 <b>{settings.maxReviews}</b> 個
        </span>
        <input
          type="range"
          min={20}
          max={150}
          step={10}
          value={settings.maxReviews}
          onInput={(e) => set({ maxReviews: Number(e.currentTarget.value) })}
        />
      </label>

      <div class="setting">
        <span>複習頻率</span>
        <div class="row">
          <button
            class={settings.retention === RETENTION.dense ? 'primary' : 'secondary'}
            onClick={() => set({ retention: RETENTION.dense })}
          >
            密集
          </button>
          <button
            class={settings.retention === RETENTION.standard ? 'primary' : 'secondary'}
            onClick={() => set({ retention: RETENTION.standard })}
          >
            標準
          </button>
        </div>
        <span class="muted small-text">
          {settings.retention === RETENTION.dense
            ? '同一個字更早再出現，比較不會忘，每天複習題多三到五成'
            : '複習題比較少，適合已經記得很穩的時候'}
        </span>
      </div>

      <label class="setting">
        <span>
          念的速度 <b>{settings.speechRate.toFixed(2)}</b>
        </span>
        <input
          type="range"
          min={0.6}
          max={1.1}
          step={0.05}
          value={settings.speechRate}
          onInput={(e) => set({ speechRate: Number(e.currentTarget.value) })}
        />
      </label>
      <button class="secondary" onClick={() => void speak('今天天氣很好，我們去打球吧')}>
        🔊 試聽
      </button>
      <p class="muted small-text">目前語音：{voiceName()}</p>

      <h3>備份</h3>
      <p class="muted small-text">換 iPad 或清除 Safari 資料前先備份，存到「檔案」App。</p>
      <div class="row">
        <button
          class="secondary"
          onClick={() => download(`字遊備份-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(progress))}
        >
          匯出進度
        </button>
        <label class="secondary file-button">
          匯入進度
          <input type="file" accept="application/json,.json" onChange={(e) => void importFile(e.currentTarget.files?.[0])} />
        </label>
      </div>
      {message && <p>{message}</p>}

      <h3>重新探路</h3>
      {confirmRedo ? (
        <div class="row">
          <button class="danger" onClick={onRedoPlacement}>
            確定，清掉所有進度重測
          </button>
          <button class="ghost" onClick={() => setConfirmRedo(false)}>
            取消
          </button>
        </div>
      ) : (
        <button class="ghost" onClick={() => setConfirmRedo(true)}>
          清除進度、重新做分級測驗
        </button>
      )}

      <p class="muted small-text credits">
        字表資料：蔡志浩繁體字頻、CC-CEDICT（CC BY-SA 4.0）、Make Me a Hanzi、wordfreq
        <br />
        版本 {__BUILD__}
      </p>
    </div>
  )
}
