import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { sequencerNamespace } from '@/i18n/sequencer'
import {
  fm1SequenceMaxPitch,
  fm1SequenceMaxVelocity,
  fm1SequenceMinPitch,
  fm1SequenceMinVelocity,
  type Fm1SequenceStep,
} from '@/lib/fm1-sequence'
import { midiNoteName } from '@/lib/midi'

type SequencerStepRowProps = {
  index: number
  onChange: (step: Fm1SequenceStep) => void
  step: Fm1SequenceStep
}

/**
 * One step of the pattern.
 *
 * The number fields keep what the user has typed, including a half-finished value, and commit only
 * a number inside the allowed range. A field that snapped back to the previous value mid-edit would
 * make a two-digit pitch impossible to type.
 */
export function SequencerStepRow({ index, onChange, step }: SequencerStepRowProps) {
  const { t } = useTranslation(sequencerNamespace)
  const fieldId = useId()
  const pitch = step.kind === 'note' ? step.pitch : 60
  const velocity = step.kind === 'note' ? step.velocity : 90
  const [pitchText, setPitchText] = useState(String(pitch))
  const [velocityText, setVelocityText] = useState(String(velocity))

  useEffect(() => setPitchText(String(pitch)), [pitch])
  useEffect(() => setVelocityText(String(velocity)), [velocity])

  const commit = (nextPitch: number, nextVelocity: number) =>
    onChange({ kind: 'note', pitch: nextPitch, velocity: nextVelocity })

  return (
    <li className="crt-inset flex flex-wrap items-center gap-3 bg-[var(--crt-bg-1)] p-2">
      <span className="w-20 text-xs tracking-[0.08em]">
        {t('pattern.step', { number: index + 1 })}
      </span>
      <Button
        aria-label={
          step.kind === 'note'
            ? t('pattern.makeRest', { number: index + 1 })
            : t('pattern.makeNote', { number: index + 1 })
        }
        onClick={() =>
          onChange(step.kind === 'note' ? { kind: 'rest' } : { kind: 'note', pitch, velocity })
        }
        type="button"
        variant={step.kind === 'note' ? 'default' : 'secondary'}
      >
        <span>{step.kind === 'note' ? t('pattern.note') : t('pattern.rest')}</span>
      </Button>

      {step.kind === 'note' ? (
        <>
          <label className="flex items-center gap-2 text-xs" htmlFor={`${fieldId}-pitch`}>
            <span>{t('pattern.pitch')}</span>
          </label>
          <input
            className="crt-inset h-8 w-20 bg-[var(--crt-bg-2)] px-2 text-sm"
            id={`${fieldId}-pitch`}
            inputMode="numeric"
            max={fm1SequenceMaxPitch}
            min={fm1SequenceMinPitch}
            onChange={(event) => {
              setPitchText(event.target.value)
              const next = Number.parseInt(event.target.value, 10)
              if (next >= fm1SequenceMinPitch && next <= fm1SequenceMaxPitch) {
                commit(next, velocity)
              }
            }}
            type="number"
            value={pitchText}
          />
          <span className="font-vt323 w-10">{midiNoteName(pitch)}</span>

          <label className="flex items-center gap-2 text-xs" htmlFor={`${fieldId}-velocity`}>
            <span>{t('pattern.velocity')}</span>
          </label>
          <input
            className="crt-inset h-8 w-20 bg-[var(--crt-bg-2)] px-2 text-sm"
            id={`${fieldId}-velocity`}
            inputMode="numeric"
            max={fm1SequenceMaxVelocity}
            min={fm1SequenceMinVelocity}
            onChange={(event) => {
              setVelocityText(event.target.value)
              const next = Number.parseInt(event.target.value, 10)
              if (next >= fm1SequenceMinVelocity && next <= fm1SequenceMaxVelocity) {
                commit(pitch, next)
              }
            }}
            type="number"
            value={velocityText}
          />
        </>
      ) : null}
    </li>
  )
}
