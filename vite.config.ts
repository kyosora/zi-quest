import preact from '@preact/preset-vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 相對路徑，部署到 GitHub Pages 子路徑或任何靜態主機都能用
  base: './',
  plugins: [
    // iPad Safari 會自動把區網網址升級成 https，開發時用自簽憑證；部署到正式主機時不影響
    basicSsl(),
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '字遊',
        short_name: '字遊',
        description: '用遊戲收集常用中文字',
        lang: 'zh-Hant-TW',
        display: 'standalone',
        background_color: '#12142b',
        theme_color: '#12142b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json}'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
