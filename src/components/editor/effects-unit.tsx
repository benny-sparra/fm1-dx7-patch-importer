import { ArrowRight, Power } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { effectHelp, effectParameterHelp } from '@/data/control-help'
import { cn } from '@/lib/utils'

type EffectsUnitProps = {
  layout?: 'sidebar' | 'workspace'
  onChange: (controller: number, value: number) => void
  onGestureEnd: () => void
  onGestureStart: () => void
  values: Uint8Array
}

type EffectParameter = {
  controller: number
  label: string
  max: number
  options?: string[]
  suffix?: string
}

type EffectDefinition = {
  color: string
  name: string
  parameters: EffectParameter[]
  switchController: number
}

const effects: EffectDefinition[] = [
  {
    color: 'var(--fm1-accent)',
    name: 'Filter',
    parameters: [
      { controller: 1, label: 'Type', max: 2, options: ['Low pass', 'Band pass', 'High pass'] },
      { controller: 2, label: 'Cutoff', max: 107 },
      { controller: 3, label: 'Resonance', max: 10 },
    ],
    switchController: 0,
  },
  {
    color: '#a78bfa',
    name: 'Reverb',
    parameters: [
      { controller: 5, label: 'Space', max: 2, options: ['Room', 'Hall', 'Plate'] },
      { controller: 6, label: 'Decay', max: 100, suffix: '%' },
      { controller: 7, label: 'Mix', max: 100, suffix: '%' },
    ],
    switchController: 4,
  },
  {
    color: '#fb7185',
    name: 'Delay',
    parameters: [
      { controller: 9, label: 'Decay', max: 100, suffix: '%' },
      { controller: 10, label: 'Rate', max: 100, suffix: '%' },
      { controller: 11, label: 'Mix', max: 100, suffix: '%' },
    ],
    switchController: 8,
  },
  {
    color: '#f97316',
    name: 'Distortion',
    parameters: [
      { controller: 13, label: 'Gain', max: 100, suffix: '%' },
      { controller: 14, label: 'Tone', max: 100, suffix: '%' },
      { controller: 15, label: 'Level', max: 100, suffix: '%' },
    ],
    switchController: 12,
  },
  {
    color: '#2dd4bf',
    name: 'Chorus',
    parameters: [
      { controller: 17, label: 'Frequency', max: 100, suffix: '%' },
      { controller: 18, label: 'Depth', max: 100, suffix: '%' },
      { controller: 19, label: 'Mix', max: 100, suffix: '%' },
    ],
    switchController: 16,
  },
  {
    color: '#facc15',
    name: 'Phaser',
    parameters: [
      { controller: 21, label: 'Frequency', max: 100, suffix: '%' },
      { controller: 22, label: 'Depth', max: 100, suffix: '%' },
      { controller: 23, label: 'Mix', max: 100, suffix: '%' },
    ],
    switchController: 20,
  },
]

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
  const helpText = effectParameterHelp[`${effectName} ${parameter.label}`]

  if (parameter.options) {
    return (
      <label className="grid min-w-0 gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1">
          {parameter.label}
          {helpText ? <HelpPopover label={`${effectName} ${parameter.label}`} text={helpText} /> : null}
        </span>
        <select
          className="h-9 min-w-0 w-full rounded-md border bg-background px-2 text-sm font-semibold normal-case text-foreground disabled:opacity-50"
          disabled={disabled}
          onChange={(event) => onChange(parameter.controller, Number(event.target.value))}
          value={value}
        >
          {parameter.options.map((option, index) => (
            <option key={option} value={index}>{option}</option>
          ))}
        </select>
      </label>
    )
  }

  if (placement === 'header') {
    return (
      <label className="ml-auto flex w-1/2 min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="flex shrink-0 items-center gap-1">
          {parameter.label}
          {helpText ? <HelpPopover label={`${effectName} ${parameter.label}`} text={helpText} /> : null}
        </span>
        <input
          aria-label={`${effectName} ${parameter.label}`}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--effect-color)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          max={parameter.max}
          min={0}
          onChange={(event) => onChange(parameter.controller, Number(event.target.value))}
          onPointerCancel={onGestureEnd}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          type="range"
          value={value}
        />
        <output className="w-8 shrink-0 text-right font-mono text-xs text-foreground">
          {value}{parameter.suffix}
        </output>
      </label>
    )
  }

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          {parameter.label}
          {helpText ? <HelpPopover label={`${effectName} ${parameter.label}`} text={helpText} /> : null}
        </span>
        <output className="font-mono text-xs text-foreground">
          {value}{parameter.suffix}
        </output>
      </span>
      <input
        aria-label={parameter.label}
        className="h-2 w-full cursor-pointer accent-[var(--effect-color)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        max={parameter.max}
        min={0}
        onChange={(event) => onChange(parameter.controller, Number(event.target.value))}
        onPointerCancel={onGestureEnd}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
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
            const enabled = values[effect.switchController] > 0
            const mixParameter = effect.parameters.find((parameter) => parameter.label === 'Mix')
            const bodyParameters = effect.parameters.filter((parameter) => parameter !== mixParameter)
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
                      aria-label={`${enabled ? 'Bypass' : 'Enable'} ${effect.name}`}
                      aria-pressed={enabled}
                      className={cn(
                        'size-8 rounded-full border p-0',
                        enabled
                          ? 'border-[var(--effect-color)] bg-[var(--effect-color)] text-slate-950 hover:bg-[var(--effect-color)]'
                          : 'bg-background text-muted-foreground',
                      )}
                      onClick={() => onChange(effect.switchController, enabled ? 0 : 1)}
                      size="icon"
                      title={`${effect.name}: ${enabled ? 'on' : 'bypassed'}`}
                      type="button"
                      variant="outline"
                    >
                      <Power className="size-3.5" />
                    </Button>
                    <h3 className={cn('flex items-center gap-1 font-black', enabled && 'text-[var(--effect-color)]')}>
                      {effect.name}
                      <HelpPopover
                        label={effect.name}
                        text={effectHelp[effect.name as keyof typeof effectHelp]}
                      />
                    </h3>
                    {mixParameter ? (
                      <EffectControl
                        disabled={!enabled}
                        effectName={effect.name}
                        onChange={onChange}
                        onGestureEnd={onGestureEnd}
                        onGestureStart={onGestureStart}
                        parameter={mixParameter}
                        placement="header"
                        value={values[mixParameter.controller]}
                      />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'grid min-w-0 items-start gap-3',
                      bodyParameters.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]',
                    )}
                  >
                    {bodyParameters.map((parameter) => (
                      <EffectControl
                        disabled={!enabled}
                        effectName={effect.name}
                        key={parameter.controller}
                        onChange={onChange}
                        onGestureEnd={onGestureEnd}
                        onGestureStart={onGestureStart}
                        parameter={parameter}
                        value={values[parameter.controller]}
                      />
                    ))}
                  </div>
                </section>
                {!isSidebar && index < effects.length - 1 ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute -right-2 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-background text-primary 2xl:block"
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
