# 字遊

給閱讀障礙成人用的中文認字 PWA：常用 3,500 字、語音、FSRS 間隔重複、遊戲化。主要跑在 iPad Safari（加到主畫面）。

## 設計

- **以詞帶字**：每個字都放在口語熟悉的詞裡教（睛 → 眼睛），多音字的讀音由詞決定。
- **聲旁家族**：形聲字顯示聲音提示（青 → 清、請、晴），並列出已會的同家族字。
- **題型由易到難**：聽音選字 → 看字選音 → 快閃；干擾選項是長得像、讀音不同的字。
- **自動評分**：答對／答錯和反應時間換算成 FSRS 評分，不用自評。
- **分級測驗**：每 250 字一層抽 6 題，對 5 題以上整層視為已會，之後由 FSRS 抽查。
- 不顯示注音、拼音；所有讀音都靠語音。

## 開發

需要 Node 20.12+（工具鏈鎖在 Vite 6／Vitest 3）。

```sh
npm install
npm run dev        # 開發，--host 讓同網段的 iPad 也連得到
npm test
npm run build      # 輸出 dist/，可直接丟到任何靜態主機
```

重建字表（需要 Python 3、`pip install wordfreq jieba opencc-python-reimplemented`）：

```sh
sh scripts/fetch_raw.sh
npm run data       # 產生 public/data/chars.json
```

## 資料來源

- 蔡志浩《中文字頻與筆畫數》（繁體字頻）
- [CC-CEDICT](https://cc-cedict.org/)（CC BY-SA 4.0）
- [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)（字形拆解、聲旁、義符）
- [wordfreq](https://github.com/rspeer/wordfreq)（詞頻）
