import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './styles.css'

const HOURLY = 60 * 60 * 1000

// 加到主畫面的 App 很少重新導覽，iOS 不會主動檢查新版。
// 每次切回前景、以及每小時檢查一次；有新版時 autoUpdate 會自動重新載入。
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => void registration.update().catch(() => {})
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    setInterval(check, HOURLY)
  },
})
render(<App />, document.getElementById('app')!)
