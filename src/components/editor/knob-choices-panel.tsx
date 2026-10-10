import { Gauge } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { RackPanelHelp } from '@/components/editor/editor-workspace'
import { RackSelect } from '@/components/editor/parameter-controls'
import {
  RackPanelCollapseToggle,
  RackPanelCollapsibleBody,
  RackPanelTitle,
} from '@/components/ui/rack-panel'
import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { fm1VaKnobChoiceIds } from '@/lib/fm1-va-knob-choices'

/** Each engine's section of `knobChoices` in the locale files. */
const engineKeys: Record<Fm1VaEngine, string> = {
  'eight-bit': 'eightBit',
  fm: 'fm',
  'virtual-analog': 'virtualAnalog',
}

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
      <RackPanelCollapsibleBody collapsed={collapsed} id={bodyId}>
        <div className="grid gap-2.5 p-[9px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((knob) => {
              const label = t('knobChoices.knob', { number: knob + 1 })
              return (
                <label
                  className="grid min-w-0 gap-1 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase"
                  key={knob}
                >
                  <span className="min-w-0 truncate">{label}</span>
                  <RackSelect
                    className="crt-inset h-7 min-w-0 bg-[var(--crt-bg-well)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
                    disabled={choices === null}
                    onChange={(event) => onChange(knob, Number(event.target.value))}
                    value={choices?.[knob] ?? 0}
                  >
                    {ids.map((id, choice) => (
                      <option key={id} value={choice}>
                        {t(`knobChoices.${engineKeys[engine]}.${id}`)}
                      </option>
                    ))}
                  </RackSelect>
                </label>
              )
            })}
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
