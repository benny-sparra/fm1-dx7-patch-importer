import { ArrowRight, Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { type EffectParameterId, getEffectParameterDefinition } from '@/lib/fm1-parameters'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

type EffectsUnitProps = {
  layout?: 'sidebar' | 'workspace'
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

type EffectDefinition = {
  color: string
  name: string
  parameters: EffectParameter[]
  switchId: EffectParameterId
}

const effects: EffectDefinition[] = [
  {
    color: 'var(--fm1-accent)',
    name: 'Filter',
    parameters: [
      { id: 'effect.filter.type', label: 'Type' },
      { id: 'effect.filter.cutoff', label: 'Cutoff' },
      { id: 'effect.filter.resonance', label: 'Resonance' },
    ],
    switchId: 'effect.filter.enabled',
  },
  {
    color: '#a78bfa',
    name: 'Reverb',
    parameters: [
      { id: 'effect.reverb.space', label: 'Space' },
      { id: 'effect.reverb.decay', label: 'Decay', suffix: '%' },
      { id: 'effect.reverb.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.reverb.enabled',
  },
  {
    color: '#fb7185',
    name: 'Delay',
    parameters: [
      { id: 'effect.delay.decay', label: 'Decay', suffix: '%' },
      { id: 'effect.delay.rate', label: 'Rate', suffix: '%' },
      { id: 'effect.delay.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.delay.enabled',
  },
  {
    color: '#f97316',
    name: 'Distortion',
    parameters: [
      { id: 'effect.distortion.gain', label: 'Gain', suffix: '%' },
      { id: 'effect.distortion.tone', label: 'Tone', suffix: '%' },
      { id: 'effect.distortion.level', label: 'Level', suffix: '%' },
    ],
    switchId: 'effect.distortion.enabled',
  },
  {
    color: '#2dd4bf',
    name: 'Chorus',
    parameters: [
      { id: 'effect.chorus.frequency', label: 'Frequency', suffix: '%' },
      { id: 'effect.chorus.depth', label: 'Depth', suffix: '%' },
      { id: 'effect.chorus.mix', label: 'Mix', suffix: '%' },
    ],
    switchId: 'effect.chorus.enabled',
  },
  {
    color: '#facc15',
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

function EffectControl({
  disabled,
  effectName,
  placement = 'body',
  onChange,
  onGestureEnd,
  onGestureStart,
  parameter,
  value,
}: {
  disabled: boolean
  effectName: string
  placement?: 'body' | 'header'
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

  if (definition.optionIds) {
    return (
      <label className="grid min-w-0 gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          <span className="min-w-0 flex-1 truncate" title={translatedParameter}>
            {translatedParameter}
          </span>
          {helpText ? (
            <HelpPopover label={`${translatedEffect} ${translatedParameter}`} text={helpText} />
          ) : null}
        </span>
        <select
          className={cn(
            'h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm font-semibold text-foreground normal-case disabled:opacity-50',
            !disabled && 'border-[var(--effect-color)] bg-[var(--effect-color)] text-slate-950',
          )}
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

  if (placement === 'header') {
    return (
      <label className="ml-auto flex w-1/2 min-w-0 items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="min-w-0 flex-1 truncate" title={translatedParameter}>
            {translatedParameter}
          </span>
          {helpText ? (
            <HelpPopover label={`${translatedEffect} ${translatedParameter}`} text={helpText} />
          ) : null}
        </span>
        <input
          aria-label={`${translatedEffect} ${translatedParameter}`}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--effect-color)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          max={definition.max}
          min={0}
          onChange={(event) => onChange(definition.controller, Number(event.target.value))}
          onPointerCancel={onGestureEnd}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          style={rangeStyle(value, 0, definition.max, 'var(--effect-color)')}
          type="range"
          value={value}
        />
        <output className="font-vt323 w-8 shrink-0 text-right text-xs text-foreground">
          {value}
          {parameter.suffix}
        </output>
      </label>
    )
  }

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="min-w-0 flex-1 truncate" title={translatedParameter}>
            {translatedParameter}
          </span>
          {helpText ? (
            <HelpPopover label={`${translatedEffect} ${translatedParameter}`} text={helpText} />
          ) : null}
        </span>
        <output className="font-vt323 shrink-0 text-xs text-foreground">
          {value}
          {parameter.suffix}
        </output>
      </span>
      <input
        aria-label={translatedParameter}
        className="h-2 w-full cursor-pointer accent-[var(--effect-color)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        max={definition.max}
        min={0}
        onChange={(event) => onChange(definition.controller, Number(event.target.value))}
        onPointerCancel={onGestureEnd}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        style={rangeStyle(value, 0, definition.max, 'var(--effect-color)')}
        type="range"
        value={value}
      />
    </label>
  )
}

export function EffectsUnit({
  layout = 'workspace',
  onChange,
  onGestureEnd,
  onGestureStart,
  values,
}: EffectsUnitProps) {
  const { t } = useTranslation()
  const isSidebar = layout === 'sidebar'

  return (
    <Card
      className={cn(
        'overflow-hidden border-primary/25 bg-card/95',
        isSidebar && 'border-0 bg-transparent shadow-none',
      )}
    >
      <CardContent className={cn(isSidebar ? 'p-0' : 'p-4 sm:p-5')}>
        <div className={cn('grid gap-3', !isSidebar && 'md:grid-cols-2 2xl:grid-cols-6')}>
          {effects.map((effect, index) => {
            const switchController = getEffectParameterDefinition(effect.switchId).controller
            const enabled = values[switchController] > 0
            const translatedEffect = t(`ui.effects.${effect.name.toLowerCase()}`)
            const headerMixParameter = isSidebar
              ? undefined
              : effect.parameters.find((parameter) => parameter.label === 'Mix')
            const bodyParameters = effect.parameters.filter(
              (parameter) => parameter !== headerMixParameter,
            )
            return (
              <div className="relative flex min-w-0" key={effect.name}>
                <section
                  className={cn(
                    'grid w-full content-start gap-3 rounded-lg border bg-white p-3 transition',
                    enabled
                      ? 'border-[var(--effect-color)] shadow-[0_0_22px_color-mix(in_srgb,var(--effect-color)_12%,transparent)]'
                      : 'border-border',
                  )}
                  style={{ '--effect-color': effect.color } as React.CSSProperties}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                    <Button
                      aria-label={t(enabled ? 'ui.bypassEffect' : 'ui.enableEffect', {
                        effect: translatedEffect,
                      })}
                      aria-pressed={enabled}
                      className={cn(
                        'size-8 rounded-full border p-0',
                        enabled
                          ? 'border-[var(--effect-color)] bg-[var(--effect-color)] text-slate-950 hover:bg-[var(--effect-color)]'
                          : 'bg-background text-muted-foreground',
                      )}
                      onClick={() => onChange(switchController, enabled ? 0 : 1)}
                      size="icon"
                      title={t('ui.effectState', {
                        effect: translatedEffect,
                        state: t(enabled ? 'editor.on' : 'ui.bypassed'),
                      })}
                      type="button"
                      variant="outline"
                    >
                      <Power className="size-3.5" />
                    </Button>
                    <h3
                      className={cn(
                        'flex items-center gap-1 font-black',
                        enabled && 'text-[var(--effect-color)]',
                      )}
                    >
                      {translatedEffect}
                      <HelpPopover label={translatedEffect} text={t(`effectHelp.${effect.name}`)} />
                    </h3>
                    {headerMixParameter ? (
                      <EffectControl
                        disabled={!enabled}
                        effectName={effect.name}
                        onChange={onChange}
                        onGestureEnd={onGestureEnd}
                        onGestureStart={onGestureStart}
                        parameter={headerMixParameter}
                        placement="header"
                        value={
                          values[getEffectParameterDefinition(headerMixParameter.id).controller]
                        }
                      />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'grid min-w-0 items-start gap-3',
                      isSidebar
                        ? 'grid-cols-2 [&>*:first-child]:col-span-2'
                        : bodyParameters.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]',
                    )}
                  >
                    {bodyParameters.map((parameter) => (
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
                {!isSidebar && index < effects.length - 1 ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute top-1/2 -right-2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-background text-primary 2xl:block"
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
