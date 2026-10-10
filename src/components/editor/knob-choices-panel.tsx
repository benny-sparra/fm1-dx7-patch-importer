import { Gauge } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { RackPanelHelp } from '@/components/editor/editor-workspace'
import { KnobChoicePicture } from '@/components/editor/knob-choice-pictures'
import { knobChoiceEngineKeys } from '@/components/editor/knob-assign-menu'
import { PicturePickerControl } from '@/components/editor/parameter-controls'
import {
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/ui/rack-panel'
import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { fm1VaKnobChoiceIds } from '@/lib/fm1-va-knob-choices'

/** Draws a knob choice at the size the picture picker gives it. */
const knobPicture = (engine: Fm1VaEngine, choice: number) => (className: string) => (
  <KnobChoicePicture choice={choice} className={className} engine={engine} />
)

type KnobChoicesPanelProps = {
  engine: Fm1VaEngine
  /** What KNOB1–4 play, Knob 1 first, or null for a patch without a record, which has none. */
  choices: readonly number[] | null
  onChange: (knob: number, choice: number) => void
}

/*
  What FM-1+VA's KNOB1–4 play on its Preset knob bank, chosen from the engine's eight. No MIDI
  message sets a knob choice; it is stored with the patch and reaches the FM1 when the patch is
  written, which its help says.
*/
export function KnobChoicesPanel({ choices, engine, onChange }: KnobChoicesPanelProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const bodyId = useId()
  const [collapsed, setCollapsed] = useState(false)
  const ids = fm1VaKnobChoiceIds[engine]
  return (
    <section aria-labelledby={headingId} className="synthwave-panel min-w-0">
      <RackPanelTitle
        action={
          <RackPanelCollapseToggle
            collapsed={collapsed}
            controls={bodyId}
            onToggle={() => setCollapsed((current) => !current)}
            panel={t('knobChoices.title')}
          />
        }
        help={<RackPanelHelp label={t('knobChoices.title')} text={t('knobChoices.help')} />}
        icon={Gauge}
        id={headingId}
        title={t('knobChoices.title')}
      />
      <RackPanelCollapsibleBody collapsed={collapsed} id={bodyId} overflowWhenOpen>
        <div className="grid gap-2.5 p-[9px]">
          {/* Each knob's choice as a picture picker, as the oscillator's waveform is chosen. */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((knob) => (
              <PicturePickerControl
                disabled={choices === null}
                disabledText="—"
                icon={<Gauge aria-hidden="true" className="size-3.5 text-[var(--crt-acc)]" />}
                inline
                key={knob}
                label={t('knobChoices.knob', { number: knob + 1 })}
                onChange={(choice) => onChange(knob, choice)}
                options={ids.map((id, choice) => ({
                  label: t(`knobChoices.${knobChoiceEngineKeys[engine]}.${id}`),
                  picture: knobPicture(engine, choice),
                }))}
                value={choices?.[knob] ?? 0}
              />
            ))}
          </div>
          {choices === null ? (
            <p className="text-[11px] leading-4 text-[var(--crt-ink-3)]">
              {t('knobChoices.noRecord')}
            </p>
          ) : null}
        </div>
      </RackPanelCollapsibleBody>
    </section>
  )
}
