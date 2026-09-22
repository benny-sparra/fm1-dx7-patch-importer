import { Play, Square } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { auditionPhrases, maxPhraseTempo, minPhraseTempo } from '@/lib/audition-phrases'
import { rangeStyle } from '@/lib/range-style'

type PhraseTransportProps = {
  onPhraseChange: (phraseId: string) => void
  onTempoChange: (tempo: number) => void
  onToggle: () => void
  phraseId: string
  playing: boolean
  tempo: number
}

/**
 * Picks one of the fixed audition phrases and loops it while a patch is edited. It is a listening
 * aid, not a sequencer: the phrases cannot be edited, recorded, or saved to the FM1.
 */
export function PhraseTransport({
  onPhraseChange,
  onTempoChange,
  onToggle,
  phraseId,
  playing,
  tempo,
}: PhraseTransportProps) {
  const { i18n, t } = useTranslation()
  const phraseSelectId = useId()
  const tempoNumber = new Intl.NumberFormat(i18n.resolvedLanguage).format(tempo)

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
      <Button
        aria-label={playing ? t('ui.stopPhrase') : t('ui.playPhrase')}
        className="font-vt323 min-w-24"
        onClick={onToggle}
        type="button"
        variant={playing ? 'destructive' : 'secondary'}
      >
        {playing ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
        <span>{playing ? t('ui.stop') : t('ui.play')}</span>
      </Button>

      <span className="flex items-center gap-2">
        <label
          className="text-[11px] tracking-[0.14em] text-[var(--crt-ink-3)] uppercase"
          htmlFor={phraseSelectId}
        >
          {t('ui.phrase')}
        </label>
        <select
          className="settings-option-select h-8 rounded-md border px-2 text-sm"
          id={phraseSelectId}
          onChange={(event) => onPhraseChange(event.target.value)}
          value={phraseId}
        >
          {auditionPhrases.map((phrase) => (
            <option key={phrase.id} value={phrase.id}>
              {t(`ui.phrases.${phrase.id}`)}
            </option>
          ))}
        </select>
      </span>

      <label className="flex min-w-48 flex-1 items-center gap-2">
        <span className="text-[11px] tracking-[0.14em] text-[var(--crt-ink-3)] uppercase">
          {t('ui.tempo')}
        </span>
        <input
          aria-label={t('ui.tempo')}
          aria-valuetext={t('ui.tempoValue', { tempo: tempoNumber })}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={maxPhraseTempo}
          min={minPhraseTempo}
          onChange={(event) => onTempoChange(Number(event.target.value))}
          step={1}
          style={rangeStyle(tempo, minPhraseTempo, maxPhraseTempo, 'var(--crt-acc)')}
          type="range"
          value={tempo}
        />
        <output className="font-vt323 w-20 text-right text-lg leading-none text-[var(--crt-led)]">
          {t('ui.tempoValue', { tempo: tempoNumber })}
        </output>
      </label>
    </div>
  )
}
