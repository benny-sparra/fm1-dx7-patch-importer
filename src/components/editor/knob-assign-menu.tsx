import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import { PortalMenu } from '@/components/ui/portal-menu'
import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { fm1VaKnobChoiceIds } from '@/lib/fm1-va-knob-choices'
import { cn } from '@/lib/utils'

/** Each engine's section of `knobChoices` in the locale files. */
export const knobChoiceEngineKeys: Record<Fm1VaEngine, string> = {
  'eight-bit': 'eightBit',
  fm: 'fm',
  'virtual-analog': 'virtualAnalog',
}

/** What a control needs to offer putting its parameter on one of FM-1+VA's four knobs. */
export type KnobAssignment = {
  engine: Fm1VaEngine
  /** What KNOB1–4 play now, Knob 1 first. */
  choices: readonly number[]
  onAssign: (knob: number, choice: number) => void
}

type KnobAssignMenuProps = KnobAssignment & {
  /** The knob choice that turns this control's parameter. */
  choice: number
  /** The control's name. */
  parameter: string
}

/*
  A small knob beside a control a knob on FM-1+VA's Preset bank can play. It lights, with the
  knob's number, while one does, and opens the four knobs to put the parameter on one of them.
*/
export function KnobAssignMenu({
  choice,
  choices,
  engine,
  onAssign,
  parameter,
}: KnobAssignMenuProps) {
  const { t } = useTranslation()
  const engineKey = knobChoiceEngineKeys[engine]
  const knobs = choices.flatMap((current, knob) => (current === choice ? [knob + 1] : []))
  const label = t('knobChoices.assign', { parameter })
  return (
    <span className="inline-block align-middle">
      <PortalMenu
        items={choices.map((current, knob) => ({
          checked: current === choice,
          label: t('knobChoices.menuItem', {
            choice: t(`knobChoices.${engineKey}.${fm1VaKnobChoiceIds[engine][current]}`),
            number: knob + 1,
          }),
          onSelect: () => onAssign(knob, choice),
        }))}
        menuLabel={label}
        triggerClassName="relative"
        triggerContent={
          <>
            <Gauge
              aria-hidden="true"
              className={cn('size-3.5', knobs.length > 0 && 'text-[var(--crt-led)]')}
            />
            {knobs.length > 0 ? (
              <span
                aria-hidden="true"
                className="font-vt323 absolute -right-0.5 -bottom-0.5 text-xs leading-none text-[var(--crt-led)]"
              >
                {knobs.join(',')}
              </span>
            ) : null}
          </>
        }
        triggerLabel={label}
        triggerTitle={label}
      />
    </span>
  )
}
