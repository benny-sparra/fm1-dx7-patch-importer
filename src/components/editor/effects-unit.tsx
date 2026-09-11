import { Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HelpPopover } from '@/components/ui/help-popover'
import { type EffectParameterId, getEffectParameterDefinition } from '@/lib/fm1-parameters'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'
type EffectsUnitProps = {
  onChange: (controller: number, value: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  values: Uint8Array
}

type EffectParameter = {
  id: EffectParameterId
  label: string
  suffix?: string
}

type EffectName = 'Filter' | 'Reverb' | 'Delay' | 'Distortion' | 'Chorus' | 'Phaser'

type EffectDefinition = {
  name: EffectName
  parameters: EffectParameter[]
  switchId: EffectParameterId
}

const effects: EffectDefinition[] = [
  {
    name: 'Filter',
    parameters: [
      { id: 'effect.filter.type', label: 'Type' },
      { id: 'effect.filter.cutoff', label: 'Cutoff' },
      { id: 'effect.filter.resonance', label: 'Resonance' },
    ],
    switchId: 'effect.filter.enabled',
  },
  {
    name: 'Reverb',
    parameters: [
      { id: 'effect.reverb.space', label: 'Space' },
      { id: 'effect.reverb.decay', label: 'Decay', suffix: '%' },
      { id: 'effect.reverb.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.reverb.enabled',
  },
  {
    name: 'Delay',
    parameters: [
      { id: 'effect.delay.decay', label: 'Decay', suffix: '%' },
      { id: 'effect.delay.rate', label: 'Rate', suffix: '%' },
      { id: 'effect.delay.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.delay.enabled',
  },
  {
    name: 'Distortion',
    parameters: [
      { id: 'effect.distortion.gain', label: 'Gain', suffix: '%' },
      { id: 'effect.distortion.tone', label: 'Tone', suffix: '%' },
      { id: 'effect.distortion.level', label: 'Level', suffix: '%' },
    ],
    switchId: 'effect.distortion.enabled',
  },
  {
    name: 'Chorus',
    parameters: [
      { id: 'effect.chorus.frequency', label: 'Frequency', suffix: '%' },
      { id: 'effect.chorus.depth', label: 'Depth', suffix: '%' },
      { id: 'effect.chorus.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.chorus.enabled',
  },
  {
    name: 'Phaser',
    parameters: [
      { id: 'effect.phaser.frequency', label: 'Frequency', suffix: '%' },
      { id: 'effect.phaser.depth', label: 'Depth', suffix: '%' },
      { id: 'effect.phaser.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.phaser.enabled',
  },
]

const optionKeys: Record<string, string> = {
  'Low pass': 'lowPass',
  'Band pass': 'bandPass',
  'High pass': 'highPass',
  Room: 'room',
  Hall: 'hall',
  Plate: 'plate',
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/*
  Each parameter is one rack row: caption, striped meter, LED value. The
  enumerated ones (filter type, reverb space) are a sunken select instead.
*/
function EffectControl({
  disabled,
  effectName,
  onChange,
  onGestureEnd,
  onGestureStart,
  parameter,
  value,
}: {
  disabled: boolean
  effectName: string
  onChange: (controller: number, value: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  parameter: EffectParameter
  value: number
}) {
  const { t } = useTranslation()
  const definition = getEffectParameterDefinition(parameter.id)
  const helpText = t(`effectParameterHelp.${effectName} ${parameter.label}`)
  const translatedEffect = t(`ui.effects.${effectName.toLowerCase()}`)
  const translatedParameter = t(`ui.parameters.${lowerFirst(parameter.label)}`)
  const caption = (
    <span className="flex min-w-0 items-center gap-1 overflow-hidden">
      <span className="min-w-0 truncate" title={translatedParameter}>
        {translatedParameter}
      </span>
      {helpText ? (
        <HelpPopover label={`${translatedEffect} ${translatedParameter}`} text={helpText} />
      ) : null}
    </span>
  )

  if (definition.optionIds) {
    return (
      <label className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
        {caption}
        <select
          aria-label={`${translatedEffect} ${translatedParameter}`}
          className="crt-inset h-7 w-full min-w-0 bg-[var(--crt-bg-well)] px-1.5 text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
          disabled={disabled}
          onChange={(event) => onChange(definition.controller, Number(event.target.value))}
          value={value}
        >
          {definition.optionIds.map((option, index) => (
            <option key={option} value={index}>
              {t(`ui.options.${optionKeys[option] ?? option}`)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
      {caption}
      <input
        aria-label={`${translatedEffect} ${translatedParameter}`}
        className="min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        max={definition.max}
        min={0}
        onChange={(event) => onChange(definition.controller, Number(event.target.value))}
        onPointerCancel={onGestureEnd}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        style={rangeStyle(
          value,
          0,
          definition.max,
          disabled ? 'var(--crt-line)' : 'var(--crt-acc)',
        )}
        type="range"
        value={value}
      />
      <output
        className={cn(
          'font-vt323 text-right text-lg leading-none',
          disabled ? 'text-[var(--crt-ink-4)]' : 'text-[var(--crt-led)]',
        )}
      >
        {value}
        {parameter.suffix}
      </output>
    </label>
  )
}

export function EffectsUnit({ onChange, onGestureEnd, onGestureStart, values }: EffectsUnitProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2 p-[9px] md:grid-cols-2 xl:grid-cols-3">
      {effects.map((effect) => {
        const switchController = getEffectParameterDefinition(effect.switchId).controller
        const enabled = values[switchController] > 0
        const translatedEffect = t(`ui.effects.${effect.name.toLowerCase()}`)
        return (
          <section
            aria-label={translatedEffect}
            className="crt-raised-thin flex min-w-0 flex-col bg-[var(--crt-bg-1)]"
            key={effect.name}
          >
            <div className="flex min-w-0 items-center gap-2 border-b border-[var(--crt-line-dk)] px-[7px] py-[5px]">
              <span aria-hidden="true" className="crt-led" data-state={enabled ? 'on' : 'off'} />
              <h3
                className={cn(
                  'flex min-w-0 items-center gap-1 text-[11px] font-normal tracking-[0.18em] uppercase',
                  enabled ? 'text-[var(--crt-acc-lt)]' : 'text-[var(--crt-ink-4)]',
                )}
              >
                <span className="truncate">{translatedEffect}</span>
                <HelpPopover label={translatedEffect} text={t(`effectHelp.${effect.name}`)} />
              </h3>
              <button
                aria-label={t(enabled ? 'ui.bypassEffect' : 'ui.enableEffect', {
                  effect: translatedEffect,
                })}
                aria-pressed={enabled}
                className={cn(
                  'ml-auto flex shrink-0 cursor-pointer items-center gap-1 border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2 py-0.5 text-[11px] tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                  enabled
                    ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                    : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                )}
                onClick={() => onChange(switchController, enabled ? 0 : 1)}
                title={t('ui.effectState', {
                  effect: translatedEffect,
                  state: t(enabled ? 'editor.on' : 'ui.bypassed'),
                })}
                type="button"
              >
                <Power aria-hidden="true" className="size-3" />
                {t(enabled ? 'editor.on' : 'editor.off')}
              </button>
            </div>
            <div className="grid min-w-0 gap-[5px] px-[7px] pt-1.5 pb-[7px]">
              {effect.parameters.map((parameter) => (
                <EffectControl
                  disabled={!enabled}
                  effectName={effect.name}
                  key={parameter.id}
                  onChange={onChange}
                  onGestureEnd={onGestureEnd}
                  onGestureStart={onGestureStart}
                  parameter={parameter}
                  value={values[getEffectParameterDefinition(parameter.id).controller]}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
