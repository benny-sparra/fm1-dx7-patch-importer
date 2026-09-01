import { AudioWaveform, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import {
  ParameterControl,
  RadioParameterControl,
  RotaryParameterControl,
} from '@/components/editor/parameter-controls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { operatorColors } from '@/lib/editor-visuals'
import {
  displayToStoredValue,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
  storedToDisplayValue,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'
import { type ParameterEdit } from '@/lib/patch-editor'
import { type PatchSyncState } from '@/lib/patch-sync-coordinator'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

const curves = ['− Linear', '− Exponential', '+ Exponential', '+ Linear']
const oscillatorModes = ['Ratio', 'Fixed']

type FocusedOperatorPanelProps = {
  applyEdits: (edits: ParameterEdit[]) => void
  beginGesture: () => void
  endGesture: () => void
  onTabChange: (tab: 'oscillator' | 'scaling') => void
  onToggleMute: () => void
  onToggleSolo: () => void
  operatorPanelTab: 'oscillator' | 'scaling'
  parameters: Uint8Array
  selectedOperator: number
  selectedOperatorIsMuted: boolean
  selectedOperatorIsSoloed: boolean
  setParameter: (index: number, value: number, max?: number, min?: number, send?: boolean) => void
  syncState: PatchSyncState
}

export function FocusedOperatorPanel({
  applyEdits,
  beginGesture,
  endGesture,
  onTabChange,
  onToggleMute,
  onToggleSolo,
  operatorPanelTab,
  parameters,
  selectedOperator,
  selectedOperatorIsMuted,
  selectedOperatorIsSoloed,
  setParameter,
  syncState,
}: FocusedOperatorPanelProps) {
  const { t } = useTranslation()
  const operatorBase = resolveOperatorParameterIndex(selectedOperator, 'operator.envelope.rate1')
  const operatorIndex = (id: OperatorParameterId) =>
    resolveOperatorParameterIndex(selectedOperator, id)
  const operatorColor = operatorColors[selectedOperator - 1]
  const outputParameter = getOperatorParameterDefinition('operator.outputLevel')
  const oscillatorModeParameter = getOperatorParameterDefinition('operator.oscillatorMode')
  const coarseParameter = getOperatorParameterDefinition('operator.frequency.coarse')
  const fineParameter = getOperatorParameterDefinition('operator.frequency.fine')
  const detuneParameter = getOperatorParameterDefinition('operator.detune')
  const control = (
    label: string,
    id: OperatorParameterId,
    options?: string[],
    helpText?: string,
  ) => {
    const definition = getOperatorParameterDefinition(id)
    const index = operatorIndex(id)
    return (
      <ParameterControl
        helpText={helpText}
        key={`${selectedOperator}-${id}`}
        label={label}
        max={definition.max}
        onChange={(value) => setParameter(index, value, definition.max)}
        options={options}
        value={parameters[index]}
      />
    )
  }
  const rotaryControl = (label: string, id: OperatorParameterId, helpText?: string) => {
    const definition = getOperatorParameterDefinition(id)
    const index = operatorIndex(id)
    return (
      <RotaryParameterControl
        helpText={helpText}
        key={`${selectedOperator}-${id}`}
        label={label}
        max={definition.max}
        onChange={(value) => setParameter(index, value, definition.max)}
        onGestureEnd={endGesture}
        onGestureStart={beginGesture}
        value={parameters[index]}
      />
    )
  }
  return (
    <Card
      className="@container -mt-px min-w-0 rounded-t-none border-[var(--operator-color)] bg-card/95 shadow-[0_16px_48px_hsl(260_60%_5%_/_0.16)]"
      id="focused-operator-panel"
      role="tabpanel"
      style={{ '--operator-color': operatorColor } as React.CSSProperties}
    >
      <CardHeader className="editor-operator-header border-t border-b border-t-black px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            <span className="flex items-center gap-3">
              <span className="font-dot-matrix grid size-9 place-items-center rounded-full bg-[var(--operator-color)] text-lg font-black text-slate-950">
                {selectedOperator}
              </span>
              <span className="flex items-center gap-1 text-base text-foreground">
                {t('editor.operator', { number: selectedOperator })}
                <HelpPopover
                  className="text-muted-foreground hover:bg-accent hover:text-foreground"
                  label={t('editor.fmOperators')}
                  text={t('controlHelp.operator')}
                />
              </span>
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div
              aria-label={t('ui.auditionGroup', { number: selectedOperator })}
              className="flex items-center gap-1"
              role="group"
            >
              <Button
                aria-label={t('ui.auditionAction', {
                  action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                  number: selectedOperator,
                })}
                aria-pressed={selectedOperatorIsMuted}
                className={cn(
                  'h-8 w-[4.25rem] border-border bg-background px-3 text-xs font-black text-muted-foreground hover:bg-accent hover:text-foreground',
                  selectedOperatorIsMuted &&
                    'border-rose-400 bg-rose-400/20 text-rose-700 hover:bg-rose-400/25 hover:text-rose-800',
                )}
                disabled={syncState === 'sending'}
                onClick={() => onToggleMute()}
                size="sm"
                title={
                  syncState === 'local'
                    ? t('ui.auditionConnect', {
                        action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                        number: selectedOperator,
                      })
                    : t('ui.auditionTemporary', {
                        action: t(selectedOperatorIsMuted ? 'ui.unmute' : 'ui.mute'),
                        number: selectedOperator,
                      })
                }
                type="button"
                variant="outline"
              >
                {t('ui.mute')}
              </Button>
              <Button
                aria-label={t('ui.auditionAction', {
                  action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                  number: selectedOperator,
                })}
                aria-pressed={selectedOperatorIsSoloed}
                className={cn(
                  'h-8 w-[4.25rem] border-border bg-background px-3 text-xs font-black text-muted-foreground hover:bg-accent hover:text-foreground',
                  selectedOperatorIsSoloed &&
                    'border-amber-300 bg-amber-300/20 text-amber-800 hover:bg-amber-300/25 hover:text-amber-950',
                )}
                disabled={syncState === 'sending'}
                onClick={() => onToggleSolo()}
                size="sm"
                title={
                  syncState === 'local'
                    ? t('ui.auditionConnect', {
                        action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                        number: selectedOperator,
                      })
                    : t('ui.auditionTemporary', {
                        action: t(selectedOperatorIsSoloed ? 'ui.unsolo' : 'ui.solo'),
                        number: selectedOperator,
                      })
                }
                type="button"
                variant="outline"
              >
                {t('ui.solo')}
              </Button>
            </div>
            <label className="flex min-w-[10rem] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground sm:min-w-[13rem]">
              <span className="font-vt323 flex items-center gap-1 font-black tracking-wide uppercase">
                {t('editor.output')}
                <HelpPopover
                  className="text-muted-foreground hover:bg-accent hover:text-foreground"
                  label={t('editor.outputLevel')}
                  text={t('controlHelp.outputLevel')}
                />
              </span>
              <input
                aria-label={t('ui.operatorOutput', { number: selectedOperator })}
                className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--operator-color)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                max={99}
                min={0}
                onBlur={endGesture}
                onChange={(event) =>
                  setParameter(
                    operatorIndex('operator.outputLevel'),
                    Number(event.target.value),
                    outputParameter.max,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    [
                      'ArrowDown',
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'End',
                      'Home',
                      'PageDown',
                      'PageUp',
                    ].includes(event.key)
                  ) {
                    beginGesture()
                  }
                }}
                onKeyUp={endGesture}
                onPointerCancel={endGesture}
                onPointerDown={beginGesture}
                onPointerUp={endGesture}
                step={1}
                style={rangeStyle(
                  parameters[operatorIndex('operator.outputLevel')],
                  0,
                  99,
                  'var(--operator-color)',
                )}
                type="range"
                value={parameters[operatorIndex('operator.outputLevel')]}
              />
              <output className="font-vt323 w-6 text-right font-black text-foreground">
                {parameters[operatorIndex('operator.outputLevel')]}
              </output>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-5 p-4 sm:p-5 @3xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <EnvelopeEditor
          color="var(--fm1-accent)"
          helpText={t('controlHelp.amplitudeEnvelope')}
          levels={Array.from(parameters.slice(operatorBase + 4, operatorBase + 8))}
          onChange={(rate, level, point) => {
            applyEdits([
              [operatorBase + point, rate, 0, 99],
              [operatorBase + 4 + point, level, 0, 99],
            ])
          }}
          onGestureEnd={endGesture}
          onGestureStart={beginGesture}
          rates={Array.from(parameters.slice(operatorBase, operatorBase + 4))}
          title={t('editor.amplitudeEnvelope')}
        />

        <div className="grid min-w-0 content-start gap-3">
          <div
            aria-label={`${t('ui.oscillator')} / ${t('ui.keyboardScaling')}`}
            className="relative grid grid-cols-2 rounded-lg border border-[color-mix(in_srgb,var(--operator-color)_35%,var(--color-border))] bg-white p-1 shadow-sm"
            role="tablist"
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-[var(--operator-color)] shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none',
                operatorPanelTab === 'scaling' && 'translate-x-full',
              )}
            />
            <button
              aria-controls="operator-oscillator-panel"
              aria-selected={operatorPanelTab === 'oscillator'}
              className={cn(
                'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                operatorPanelTab === 'oscillator' &&
                  'text-slate-950 hover:bg-transparent hover:text-slate-950',
              )}
              id="operator-oscillator-tab"
              onClick={() => onTabChange('oscillator')}
              role="tab"
              type="button"
            >
              <AudioWaveform className="size-4 shrink-0" />
              <span className="truncate" title={t('ui.oscillator')}>
                {t('ui.oscillator')}
              </span>
            </button>
            <button
              aria-controls="operator-scaling-panel"
              aria-selected={operatorPanelTab === 'scaling'}
              className={cn(
                'relative z-10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                operatorPanelTab === 'scaling' &&
                  'text-slate-950 hover:bg-transparent hover:text-slate-950',
              )}
              id="operator-scaling-tab"
              onClick={() => onTabChange('scaling')}
              role="tab"
              type="button"
            >
              <SlidersHorizontal className="size-4 shrink-0" />
              <span className="truncate" title={t('ui.keyboardScaling')}>
                {t('ui.keyboardScaling')}
              </span>
            </button>
          </div>

          <section
            aria-labelledby="operator-oscillator-tab"
            className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--fm1-finish-tint)_30%,var(--color-border))] bg-white p-4 transition-colors"
            hidden={operatorPanelTab !== 'oscillator'}
            id="operator-oscillator-panel"
            role="tabpanel"
          >
            <div className="grid gap-4">
              <RadioParameterControl
                helpText={t('controlHelp.oscillatorMode')}
                label={t('ui.mode')}
                name={`oscillator-mode-${selectedOperator}`}
                onChange={(value) =>
                  setParameter(
                    operatorIndex('operator.oscillatorMode'),
                    value,
                    oscillatorModeParameter.max,
                  )
                }
                options={oscillatorModes}
                value={parameters[operatorIndex('operator.oscillatorMode')]}
              />
              <div className="grid grid-cols-3 gap-2">
                <RotaryParameterControl
                  helpText={t('controlHelp.coarse')}
                  key={`${selectedOperator}-18`}
                  label={t('ui.coarse')}
                  max={31}
                  onChange={(value) =>
                    setParameter(
                      operatorIndex('operator.frequency.coarse'),
                      value,
                      coarseParameter.max,
                    )
                  }
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[operatorIndex('operator.frequency.coarse')]}
                />
                <RotaryParameterControl
                  helpText={t('controlHelp.fine')}
                  key={`${selectedOperator}-19`}
                  label={t('ui.fine')}
                  max={99}
                  onChange={(value) =>
                    setParameter(operatorIndex('operator.frequency.fine'), value, fineParameter.max)
                  }
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={parameters[operatorIndex('operator.frequency.fine')]}
                />
                <RotaryParameterControl
                  helpText={t('controlHelp.detune')}
                  key={`${selectedOperator}-20`}
                  label={t('ui.detune')}
                  max={7}
                  min={-7}
                  onChange={(value) =>
                    setParameter(
                      operatorIndex('operator.detune'),
                      displayToStoredValue(detuneParameter, value),
                      detuneParameter.max,
                    )
                  }
                  onGestureEnd={endGesture}
                  onGestureStart={beginGesture}
                  value={storedToDisplayValue(
                    detuneParameter,
                    parameters[operatorIndex('operator.detune')],
                  )}
                  valueLabel={(value) => (value > 0 ? `+${value}` : String(value))}
                />
              </div>
            </div>
          </section>

          <section
            aria-labelledby="operator-scaling-tab"
            className="min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--fm1-finish-tint)_30%,var(--color-border))] bg-white p-4 transition-colors"
            hidden={operatorPanelTab !== 'scaling'}
            id="operator-scaling-panel"
            role="tabpanel"
          >
            <div className="grid gap-y-4">
              <div className="grid grid-cols-2 gap-2">
                {rotaryControl(
                  t('ui.breakpoint'),
                  'operator.keyboard.breakpoint',
                  t('controlHelp.breakpoint'),
                )}
                {rotaryControl(
                  t('ui.rateScaling'),
                  'operator.keyboard.rateScaling',
                  t('controlHelp.rateScaling'),
                )}
              </div>
              <div className="grid gap-y-1">
                <p className="text-center text-xs font-bold text-foreground">{t('ui.depth')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {rotaryControl(
                    t('ui.left'),
                    'operator.keyboard.leftDepth',
                    t('controlHelp.leftDepth'),
                  )}
                  {rotaryControl(
                    t('ui.right'),
                    'operator.keyboard.rightDepth',
                    t('controlHelp.rightDepth'),
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {control(
                  t('ui.leftCurve'),
                  'operator.keyboard.leftCurve',
                  curves,
                  t('controlHelp.curve'),
                )}
                {control(
                  t('ui.rightCurve'),
                  'operator.keyboard.rightCurve',
                  curves,
                  t('controlHelp.curve'),
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {rotaryControl(
                  t('ui.velocity'),
                  'operator.velocitySensitivity',
                  t('controlHelp.velocity'),
                )}
                {rotaryControl(
                  t('ui.ampModSensitivity'),
                  'operator.ampModSensitivity',
                  t('controlHelp.ampModSensitivity'),
                )}
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
