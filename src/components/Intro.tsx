import { useEffect } from 'preact/hooks'
import type { Card } from 'ts-fsrs'
import { familyOf } from '../lib/data'
import { speak } from '../lib/speech'
import { isKnown } from '../lib/srs'
import type { CharEntry, CharIndex } from '../lib/types'
import { SpeakChip, Word } from './Word'

interface Props {
  entry: CharEntry
  index: CharIndex
  cards: Record<string, Card>
  onNext: () => void
}

const MAX_FAMILY = 6

export function Intro({ entry, index, cards, onNext }: Props) {
  const [mainWord, ...otherWords] = entry.w.map(([w]) => w)
  const knownFamily = familyOf(index, entry)
    .filter((e) => isKnown(cards[e.c]))
    .slice(0, MAX_FAMILY)
  const partChars = entry.parts.filter((p) => p !== entry.c)

  useEffect(() => {
    void speak(mainWord)
  }, [entry.c])

  return (
    <div class="intro">
      <p class="badge-new">✨ 新字解鎖</p>
      <button class="hero-char" onClick={() => void speak(mainWord)}>
        {entry.c}
      </button>
      <button class="hero-word" onClick={() => void speak(mainWord)}>
        <Word word={mainWord} target={entry.c} /> <span class="chip-icon">🔊</span>
      </button>

      <div class="intro-clues">
        {entry.ph && (
          <div class="clue">
            <span class="clue-tag sound">聲音提示</span>
            <span>
              <b>{entry.ph}</b> 念起來像它 <SpeakChip text={entry.ph} />
            </span>
          </div>
        )}
        {entry.hint && (
          <div class="clue">
            <span class="clue-tag meaning">意思提示</span>
            <span>
              <b>{entry.se}</b> 跟{entry.hint}有關
            </span>
          </div>
        )}
        {!entry.ph && partChars.length > 0 && (
          <div class="clue">
            <span class="clue-tag parts">拆開來看</span>
            <span>
              {entry.c} ＝ {partChars.join(' ＋ ')}
            </span>
          </div>
        )}
        {knownFamily.length > 0 && (
          <div class="clue column">
            <span class="clue-tag family">你會的同家族字</span>
            <div class="chips">
              {knownFamily.map((e) => (
                <SpeakChip key={e.c} text={e.w[0][0]} target={e.c} />
              ))}
            </div>
          </div>
        )}
        {otherWords.length > 0 && (
          <div class="clue column">
            <span class="clue-tag words">還會出現在</span>
            <div class="chips">
              {otherWords.map((w) => (
                <SpeakChip key={w} text={w} target={entry.c} />
              ))}
            </div>
          </div>
        )}
      </div>

      <button class="primary wide" onClick={onNext}>
        我記住了 ➜
      </button>
    </div>
  )
}
