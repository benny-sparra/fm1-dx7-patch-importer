import { ChevronDown, Play, Square } from 'lucide-react'
import { useMemo } from 'react'
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
  const tempoNumber = new Intl.NumberFormat(i18n.resolvedLanguage).format(tempo)
  // Listed alphabetically in the interface language, so the order follows the names people read.
  const phraseOptions = useMemo(() => {
    const collator = new Intl.Collator(i18n.resolvedLanguage)
    return auditionPhrases
      .map((phrase) => ({ id: phrase.id, name: t(`ui.phrases.${phrase.id}`) }))
      .sort((a, b) => collator.compare(a.name, b.name))
  }, [i18n.resolvedLanguage, t])

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
      <Button
        aria-label={playing ? t('ui.stopPhrase') : t('ui.playPhrase')}
        className="font-vt323 min-w-20"
        onClick={onToggle}
        size="sm"
        type="button"
        variant={playing ? 'destructive' : 'secondary'}
      >
        {playing ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
        <span>{playing ? t('ui.stop') : t('ui.play')}</span>
      </Button>

      <span className="relative">
        <select
          aria-label={t('ui.phrase')}
          className="settings-option-select h-7 appearance-none rounded-md border py-0 pr-7 pl-2 text-xs"
          onChange={(event) => onPhraseChange(event.target.value)}
          value={phraseId}
        >
          {phraseOptions.map((phrase) => (
            <option key={phrase.id} value={phrase.id}>
              {phrase.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>

      <label className="flex items-center gap-2">
        <span className="text-[11px] tracking-[0.14em] text-[var(--crt-ink-3)] uppercase">
          {t('ui.tempo')}
        </span>
        <input
          aria-label={t('ui.tempo')}
          aria-valuetext={t('ui.tempoValue', { tempo: tempoNumber })}
          className="w-24 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={maxPhraseTempo}
          min={minPhraseTempo}
          onChange={(event) => onTempoChange(Number(event.target.value))}
          step={1}
          style={rangeStyle(tempo, minPhraseTempo, maxPhraseTempo, 'var(--crt-acc)')}
          type="range"
          value={tempo}
        />
        <output className="font-vt323 w-16 text-right text-base leading-none text-[var(--crt-led)]">
          {t('ui.tempoValue', { tempo: tempoNumber })}
        </output>
      </label>
    </div>
  )
}
