import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/editor-help'
import {
  ChorusScope,
  DelayScope,
  DistortionScope,
  FilterScope,
  PhaserScope,
  ReverbScope,
} from '@/components/editor/effect-scopes'
import { RackSelect, rangeControlKeys } from '@/components/editor/parameter-controls'
import { Button } from '@/components/ui/button'
import { HelpPopover } from '@/components/ui/help-popover'
import { Switch } from '@/components/ui/switch'
import { effectPresetsFor, type EffectPresetId } from '@/lib/effect-presets'
import {
  type EffectParameterId,
  FM1_VA_STOCK_EFFECT_ORDER,
  getEffectParameterDefinition,
} from '@/lib/fm1-parameters'
import {
  fm1VaBitcrushSampleRateHz,
  fm1VaBitcrushSettings,
  fm1VaDistortionTypes,
} from '@/lib/fm1-va-record-effects'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

type EffectsUnitProps = {
  /**
   * FM-1+VA's Bitcrush, offered while the FM1 runs FM-1_096 or later. `values` holds its switch,
   * Bits, Sample Rate, and Mix, or null for a patch without a settings record, which has nowhere to
   * keep them.
   */
  bitcrush?: {
    onChange: (setting: number, value: number, min: number, max: number) => void
    values: readonly number[] | null
  }
  /** Whether the patch keeps Bitcrush on for FM-1_096 while the FM1's firmware does not play it. */
  keepsBitcrush?: boolean
  /**
   * FM-1+VA's order of seven effects, offered with Bitcrush. `order` holds their numbers first to
   * last, or null for a patch without a settings record, which has nowhere to keep one.
   */
  effectOrder?: { onMove: (from: number, to: number) => void; order: readonly number[] | null }
  /** Whether the patch keeps a changed order while the FM1's firmware plays its own. */
  keepsEffectOrder?: boolean
  /**
   * A Distortion type the patch keeps for FM-1+VA that the FM1's firmware does not play, which a
   * line under Distortion names.
   */
  keptDistortionType?: number
  /**
   * FM-1+VA's Distortion type, offered while the FM1 runs a release that writes presets. `type` is
   * null for a patch without a settings record, which has nowhere to keep one.
   */
  distortionType?: { onChange: (type: number) => void; type: number | null }
  onApplyPreset: (id: EffectPresetId) => void
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

/** The live picture shown above an effect's controls. */
function EffectScope({
  enabled,
  name,
  values,
}: {
  enabled: boolean
  name: EffectName
  values: Uint8Array
}) {
  const value = (id: EffectParameterId) => values[getEffectParameterDefinition(id).controller]
  switch (name) {
    case 'Filter':
      return (
        <FilterScope
          cutoff={value('effect.filter.cutoff')}
          enabled={enabled}
          resonance={value('effect.filter.resonance')}
          type={value('effect.filter.type')}
        />
      )
    case 'Delay':
      return (
        <DelayScope
          decay={value('effect.delay.decay')}
          enabled={enabled}
          mix={value('effect.delay.mix')}
          rate={value('effect.delay.rate')}
        />
      )
    case 'Chorus':
      return (
        <ChorusScope
          depth={value('effect.chorus.depth')}
          enabled={enabled}
          frequency={value('effect.chorus.frequency')}
          mix={value('effect.chorus.mix')}
        />
      )
    case 'Reverb':
      return (
        <ReverbScope
          decay={value('effect.reverb.decay')}
          enabled={enabled}
          mix={value('effect.reverb.mix')}
          space={value('effect.reverb.space')}
        />
      )
    case 'Distortion':
      return (
        <DistortionScope
          enabled={enabled}
          gain={value('effect.distortion.gain')}
          level={value('effect.distortion.level')}
          tone={value('effect.distortion.tone')}
        />
      )
    case 'Phaser':
      return (
        <PhaserScope
          depth={value('effect.phaser.depth')}
          enabled={enabled}
          frequency={value('effect.phaser.frequency')}
          mix={value('effect.phaser.mix')}
        />
      )
  }
}

/*
  A starting point for one effect, in the same row layout as its enumerated
  controls, and disabled with them while the effect is bypassed. A rule sets
  it apart from the controls below, which change one value each.
*/
function EffectPresetControl({
  disabled,
  effectName,
  onApplyPreset,
}: {
  disabled: boolean
  effectName: EffectName
  onApplyPreset: (id: EffectPresetId) => void
}) {
  const { t } = useTranslation()
  const presets = effectPresetsFor(effectName.toLowerCase())

  const translatedEffect = t(`ui.effects.${effectName.toLowerCase()}`)
  const label = t('editor.effectPreset')
  return (
    <label className="mb-1 grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 border-b border-[var(--crt-bevel)] pb-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
        <HelpPopover label={`${translatedEffect} ${label}`} text={t('controlHelp.effectPresets')} />
      </span>
      {/* Always shows the placeholder: a preset is a starting point, not a mode. */}
      <RackSelect
        aria-label={`${translatedEffect} ${label}`}
        className="crt-inset h-7 min-w-0 bg-[var(--crt-bg-well)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onApplyPreset(event.target.value as EffectPresetId)}
        value=""
      >
        <option disabled value="">
          {t('editor.effectPresetPlaceholder')}
        </option>
        {presets.map(({ id }) => (
          <option key={id} value={id}>
            {t(`editor.effectPresetOptions.${id}`)}
          </option>
        ))}
      </RackSelect>
    </label>
  )
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
        <RackSelect
          aria-label={`${translatedEffect} ${translatedParameter}`}
          className="crt-inset h-7 min-w-0 bg-[var(--crt-bg-well)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
          disabled={disabled}
          onChange={(event) => onChange(definition.controller, Number(event.target.value))}
          value={value}
        >
          {definition.optionIds.map((option, index) => (
            <option key={option} value={index}>
              {t(`ui.options.${optionKeys[option] ?? option}`)}
            </option>
          ))}
        </RackSelect>
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
        onBlur={onGestureEnd}
        onChange={(event) => onChange(definition.controller, Number(event.target.value))}
        onKeyDown={(event) => {
          if (rangeControlKeys.includes(event.key)) onGestureStart()
        }}
        onKeyUp={onGestureEnd}
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

/** The name of a Distortion type as the record holds it, including a value no type is known for. */
function useDistortionTypeName() {
  const { t } = useTranslation()
  return (type: number) => {
    const id = fm1VaDistortionTypes[type]
    return id ? t(`distortionType.${id}`) : t('distortionType.unknown', { value: type })
  }
}

/*
  FM-1+VA's Distortion type, in the enumerated row layout. No MIDI message sets it, so it is
  heard once the patch is written to the FM1, which its help says.
*/
function DistortionTypeControl({
  disabled,
  onChange,
  type,
}: {
  disabled: boolean
  onChange: (type: number) => void
  type: number | null
}) {
  const { t } = useTranslation()
  const typeName = useDistortionTypeName()
  const translatedEffect = t('ui.effects.distortion')
  const translatedParameter = t('ui.parameters.type')
  const known = type === null || type < fm1VaDistortionTypes.length
  return (
    <>
      <label className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          <span className="min-w-0 truncate" title={translatedParameter}>
            {translatedParameter}
          </span>
          <HelpPopover
            label={`${translatedEffect} ${translatedParameter}`}
            text={t('effectParameterHelp.Distortion Type')}
          />
        </span>
        <RackSelect
          aria-label={`${translatedEffect} ${translatedParameter}`}
          className="crt-inset h-7 min-w-0 bg-[var(--crt-bg-well)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
          disabled={disabled || type === null}
          onChange={(event) => onChange(Number(event.target.value))}
          value={type ?? 0}
        >
          {fm1VaDistortionTypes.map((id, value) => (
            <option key={id} value={value}>
              {typeName(value)}
            </option>
          ))}
          {/* A value FM-1+VA may add later is shown and kept until another type is chosen. */}
          {known ? null : <option value={type}>{typeName(type)}</option>}
        </RackSelect>
      </label>
      {type === null ? (
        <p className="text-[11px] leading-4 text-[var(--crt-ink-3)]">
          {t('distortionType.noRecord')}
        </p>
      ) : null}
    </>
  )
}

type BitcrushSettingId = (typeof fm1VaBitcrushSettings)[number]['id']

/** Bitcrush's settings after its switch, each with its caption and the help that explains it. */
const bitcrushControls: {
  help: string
  id: Exclude<BitcrushSettingId, 'enabled'>
  label: string
}[] = [
  { help: 'Bitcrush Bits', id: 'bits', label: 'bits' },
  { help: 'Bitcrush Sample Rate', id: 'sampleRate', label: 'sampleRate' },
  { help: 'Bitcrush Mix', id: 'mix', label: 'mix' },
]

/** A Bitcrush setting as the FM1 shows it: Bits as a count, Sample Rate in hertz, Mix in percent. */
function useBitcrushValueText() {
  const { i18n, t } = useTranslation()
  return (id: BitcrushSettingId, value: number) => {
    if (id === 'mix') return `${value}%`
    if (id !== 'sampleRate') return String(value)
    const hertz = fm1VaBitcrushSampleRateHz(value)
    const format = (number: number, digits: number) =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(number)
    return hertz < 1000
      ? t('bitcrush.hertz', { value: format(hertz, 0) })
      : t('bitcrush.kilohertz', { value: format(hertz / 1000, 1) })
  }
}

/*
  FM-1+VA's Bitcrush, from FM-1_096, laid out as the other effects are, with its name as its
  switch's label. No MIDI message sets it, so it is heard once the patch is written to the FM1,
  which its help says. Each slider's drag is one undo step.
*/
function BitcrushSection({
  onChange,
  onGestureEnd,
  onGestureStart,
  values,
}: {
  onChange: (setting: number, value: number, min: number, max: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  values: readonly number[] | null
}) {
  const { t } = useTranslation()
  const valueText = useBitcrushValueText()
  const translatedEffect = t('ui.effects.bitcrush')
  const enabled = values !== null && values[0] > 0
  const settingIndex = (id: BitcrushSettingId) =>
    fm1VaBitcrushSettings.findIndex((setting) => setting.id === id)
  return (
    <section
      aria-label={translatedEffect}
      className="crt-raised-thin flex min-w-0 flex-col bg-[var(--crt-bg-1)]"
    >
      <div className="flex min-w-0 items-center border-b border-[var(--crt-line-dk)] px-[7px] py-[3px]">
        <h3 className="flex min-w-0 items-center gap-1 text-[11px] font-normal tracking-[0.18em] uppercase">
          <Switch
            checked={enabled}
            className="-ml-[3px] inline-flex min-h-6 min-w-0 items-center gap-2 px-1 transition-colors"
            disabled={values === null}
            onChange={(checked) => onChange(0, checked ? 1 : 0, 0, 1)}
          >
            <span className="truncate">{translatedEffect}</span>
          </Switch>
          <HelpPopover label={translatedEffect} text={t('effectHelp.Bitcrush')} />
        </h3>
      </div>
      <div className="grid min-w-0 gap-[5px] px-[7px] pt-1.5 pb-[7px]">
        {values === null ? (
          <p className="text-[11px] leading-4 text-[var(--crt-ink-3)]">{t('bitcrush.noRecord')}</p>
        ) : null}
        {bitcrushControls.map(({ help, id, label }) => {
          const index = settingIndex(id)
          const { max, min } = fm1VaBitcrushSettings[index]
          const value = values?.[index] ?? min
          const translatedParameter = t(`ui.parameters.${label}`)
          const disabled = !enabled
          return (
            <label
              className="grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)_3rem] items-center gap-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase"
              key={id}
            >
              <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                <span className="min-w-0 truncate" title={translatedParameter}>
                  {translatedParameter}
                </span>
                <HelpPopover
                  label={`${translatedEffect} ${translatedParameter}`}
                  text={t(`effectParameterHelp.${help}`)}
                />
              </span>
              <input
                aria-label={`${translatedEffect} ${translatedParameter}`}
                aria-valuetext={valueText(id, value)}
                className="min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={disabled}
                max={max}
                min={min}
                onBlur={onGestureEnd}
                onChange={(event) => onChange(index, Number(event.target.value), min, max)}
                onKeyDown={(event) => {
                  if (rangeControlKeys.includes(event.key)) onGestureStart()
                }}
                onKeyUp={onGestureEnd}
                onPointerCancel={onGestureEnd}
                onPointerDown={onGestureStart}
                onPointerUp={onGestureEnd}
                style={rangeStyle(value, min, max, disabled ? 'var(--crt-line)' : 'var(--crt-acc)')}
                type="range"
                value={value}
              />
              <output
                className={cn(
                  'font-vt323 text-right text-lg leading-none',
                  disabled ? 'text-[var(--crt-ink-4)]' : 'text-[var(--crt-led)]',
                )}
              >
                {valueText(id, value)}
              </output>
            </label>
          )
        })}
      </div>
    </section>
  )
}

/** The effects by their number in FM-1+VA's order, as the interface names them. */
const orderEffectKeys = [
  'filter',
  'reverb',
  'delay',
  'distortion',
  'chorus',
  'phaser',
  'bitcrush',
] as const

/*
  FM-1+VA's effect order, first at the left, each effect with buttons that move it one place.
  The list re-renders in its new order, so focus follows the moved effect's button, or its other
  button once it reaches an end. No MIDI message sets the order, so it is heard once the patch is
  written to the FM1, which its help says.
*/
function EffectOrderStrip({
  onMove,
  order,
}: {
  onMove: (from: number, to: number) => void
  order: readonly number[] | null
}) {
  const { t } = useTranslation()
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<{ effect: number; step: -1 | 1 } | null>(null)
  const title = t('effectOrder.title')

  useLayoutEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    pendingFocus.current = null
    const wanted = buttons.current.get(`${pending.effect}:${pending.step}`)
    const other = buttons.current.get(`${pending.effect}:${-pending.step}`)
    ;(wanted && !wanted.disabled ? wanted : other)?.focus()
  }, [order])

  const move = (place: number, step: -1 | 1) => {
    if (!order) return
    pendingFocus.current = { effect: order[place], step }
    onMove(place, place + step)
  }

  const shown = order ?? FM1_VA_STOCK_EFFECT_ORDER
  return (
    <section
      aria-label={title}
      className="crt-raised-thin flex min-w-0 flex-col bg-[var(--crt-bg-1)] md:col-span-2 xl:col-span-3"
    >
      <div className="flex min-w-0 items-center border-b border-[var(--crt-line-dk)] px-[7px] py-[3px]">
        <h3 className="flex min-w-0 items-center gap-1 px-1 text-[11px] font-normal tracking-[0.18em] uppercase">
          <span className="truncate">{title}</span>
          <HelpPopover label={title} text={t('effectOrder.help')} />
        </h3>
      </div>
      <div className="grid min-w-0 gap-[5px] px-[7px] pt-1.5 pb-[7px]">
        {order === null ? (
          <p className="text-[11px] leading-4 text-[var(--crt-ink-3)]">
            {t('effectOrder.noRecord')}
          </p>
        ) : null}
        <ol aria-label={t('effectOrder.list')} className="flex flex-wrap gap-1.5">
          {shown.map((effect, place) => {
            const name = t(`ui.effects.${orderEffectKeys[effect]}`)
            return (
              <li
                className="crt-inset flex min-w-0 items-center gap-1 bg-[var(--crt-bg-well)] py-0.5 pr-0.5 pl-1.5 text-[11px] tracking-[0.08em] text-[var(--crt-ink)] uppercase"
                key={effect}
              >
                <span
                  aria-hidden="true"
                  className="font-vt323 text-base leading-none text-[var(--crt-led)]"
                >
                  {place + 1}
                </span>
                <span className="truncate">{name}</span>
                {([-1, 1] as const).map((step) => (
                  <Button
                    aria-label={t(step < 0 ? 'effectOrder.moveEarlier' : 'effectOrder.moveLater', {
                      effect: name,
                    })}
                    className="size-6 p-0"
                    disabled={order === null || place + step < 0 || place + step >= shown.length}
                    key={step}
                    onClick={() => move(place, step)}
                    ref={(button) => {
                      const key = `${effect}:${step}`
                      if (button) buttons.current.set(key, button)
                      else buttons.current.delete(key)
                    }}
                    size="bare"
                    type="button"
                    variant="ghost"
                  >
                    {step < 0 ? (
                      <ChevronLeft aria-hidden="true" className="size-4" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="size-4" />
                    )}
                  </Button>
                ))}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export function EffectsUnit({
  bitcrush,
  distortionType,
  effectOrder,
  keepsBitcrush,
  keepsEffectOrder,
  keptDistortionType,
  onApplyPreset,
  onChange,
  onGestureEnd,
  onGestureStart,
  values,
}: EffectsUnitProps) {
  const { t } = useTranslation()
  const typeName = useDistortionTypeName()

  return (
    <div className="grid gap-2 p-[9px] md:grid-cols-2 xl:grid-cols-3">
      {effectOrder ? (
        <EffectOrderStrip onMove={effectOrder.onMove} order={effectOrder.order} />
      ) : null}
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
            {/* The effect's name is its switch's label, so the switch keeps one name and its
                checked state says whether the effect is on; the name lights with it. */}
            <div className="flex min-w-0 items-center border-b border-[var(--crt-line-dk)] px-[7px] py-[3px]">
              <h3 className="flex min-w-0 items-center gap-1 text-[11px] font-normal tracking-[0.18em] uppercase">
                <Switch
                  checked={enabled}
                  className="-ml-[3px] inline-flex min-h-6 min-w-0 items-center gap-2 px-1 transition-colors"
                  onChange={(checked) => onChange(switchController, checked ? 1 : 0)}
                >
                  <span className="truncate">{translatedEffect}</span>
                </Switch>
                <HelpPopover label={translatedEffect} text={t(`effectHelp.${effect.name}`)} />
              </h3>
            </div>
            <div className="grid min-w-0 gap-[5px] px-[7px] pt-1.5 pb-[7px]">
              <EffectScope enabled={enabled} name={effect.name} values={values} />
              <EffectPresetControl
                disabled={!enabled}
                effectName={effect.name}
                onApplyPreset={onApplyPreset}
              />
              {effect.name === 'Distortion' && distortionType ? (
                <DistortionTypeControl
                  disabled={!enabled}
                  onChange={distortionType.onChange}
                  type={distortionType.type}
                />
              ) : null}
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
              {effect.name === 'Distortion' && keptDistortionType !== undefined ? (
                <p className="text-[11px] leading-4 text-[var(--crt-ink-3)]">
                  {t('distortionType.otherFirmware', { type: typeName(keptDistortionType) })}
                </p>
              ) : null}
            </div>
          </section>
        )
      })}
      {bitcrush ? (
        <BitcrushSection
          onChange={bitcrush.onChange}
          onGestureEnd={onGestureEnd}
          onGestureStart={onGestureStart}
          values={bitcrush.values}
        />
      ) : null}
      {keepsBitcrush ? (
        <p className="text-[11px] leading-4 text-[var(--crt-ink-3)] md:col-span-2 xl:col-span-3">
          {t('bitcrush.otherFirmware')}
        </p>
      ) : null}
      {keepsEffectOrder ? (
        <p className="text-[11px] leading-4 text-[var(--crt-ink-3)] md:col-span-2 xl:col-span-3">
          {t('effectOrder.otherFirmware')}
        </p>
      ) : null}
    </div>
  )
}
