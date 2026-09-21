import { AudioWaveform, type LucideIcon, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import {
  ParameterControl,
  RadioParameterControl,
  RotaryParameterControl,
  SliderParameterControl,
} from '@/components/editor/parameter-controls'
import {
  displayToStoredValue,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
  storedToDisplayValue,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'
import type { ParameterEdit } from '@/lib/patch-editor'

const curveKeys = [
  'ui.curves.negativeLinear',
  'ui.curves.negativeExponential',
  'ui.curves.positiveExponential',
  'ui.curves.positiveLinear',
] as const
const oscillatorModeKeys = ['ui.oscillatorModes.ratio', 'ui.oscillatorModes.fixed'] as const

type FocusedOperatorPanelProps = {
  applyEdits: (edits: ParameterEdit[]) => void
  beginGesture: () => void
  endGesture: () => void
  parameters: Uint8Array
  selectedOperator: number
  setParameter: (index: number, value: number, max?: number, min?: number, send?: boolean) => void
}

export function FocusedOperatorPanel({
  applyEdits,
  beginGesture,
  endGesture,
  parameters,
  selectedOperator,
  setParameter,
}: FocusedOperatorPanelProps) {
  const { t } = useTranslation()
  const operatorBase = resolveOperatorParameterIndex(selectedOperator, 'operator.envelope.rate1')
  const operatorIndex = (id: OperatorParameterId) =>
    resolveOperatorParameterIndex(selectedOperator, id)
  const oscillatorModeParameter = getOperatorParameterDefinition('operator.oscillatorMode')
  const coarseParameter = getOperatorParameterDefinition('operator.frequency.coarse')
  const fineParameter = getOperatorParameterDefinition('operator.frequency.fine')
  const detuneParameter = getOperatorParameterDefinition('operator.detune')
  const envelopeMax = getOperatorParameterDefinition('operator.envelope.rate1').max
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
  const sliderControl = (label: string, id: OperatorParameterId, helpText?: string) => {
    const definition = getOperatorParameterDefinition(id)
    const index = operatorIndex(id)
    return (
      <SliderParameterControl
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
  /*
    The artboard's open operator column: the envelope on top, then the
    oscillator and keyboard-scaling sections under hatched sub-headings.
    Identity, output level, mute and solo live on the column itself.
  */
  return (
    <div
      className="@container grid min-w-0 gap-[9px]"
      id="focused-operator-panel"
      style={{ '--operator-color': 'var(--crt-acc)' } as React.CSSProperties}
    >
      <EnvelopeEditor
        color="var(--crt-acc)"
        helpText={t('controlHelp.amplitudeEnvelope')}
        levels={Array.from(parameters.slice(operatorBase + 4, operatorBase + 8))}
        onChange={(rate, level, point) => {
          applyEdits([
            [operatorBase + point, rate, 0, envelopeMax],
            [operatorBase + 4 + point, level, 0, envelopeMax],
          ])
        }}
        onGestureEnd={endGesture}
        onGestureStart={beginGesture}
        rates={Array.from(parameters.slice(operatorBase, operatorBase + 4))}
        title={t('editor.amplitudeEnvelope')}
      />

      <section
        aria-labelledby="operator-oscillator-heading"
        className="grid min-w-0 gap-[9px]"
        id="operator-oscillator-panel"
      >
        <RackSubheading
          action={
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
              options={oscillatorModeKeys.map((key) => t(key))}
              showLabel={false}
              value={parameters[operatorIndex('operator.oscillatorMode')]}
            />
          }
          icon={AudioWaveform}
          id="operator-oscillator-heading"
          title={t('ui.oscillator')}
        />
        <div className="grid grid-cols-3 gap-2">
          <RotaryParameterControl
            helpText={t('controlHelp.coarse')}
            key={`${selectedOperator}-18`}
            label={t('ui.coarse')}
            max={coarseParameter.max}
            onChange={(value) =>
              setParameter(operatorIndex('operator.frequency.coarse'), value, coarseParameter.max)
            }
            onGestureEnd={endGesture}
            onGestureStart={beginGesture}
            value={parameters[operatorIndex('operator.frequency.coarse')]}
          />
          <RotaryParameterControl
            helpText={t('controlHelp.fine')}
            key={`${selectedOperator}-19`}
            label={t('ui.fine')}
            max={fineParameter.max}
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
            max={storedToDisplayValue(detuneParameter, detuneParameter.max)}
            min={storedToDisplayValue(detuneParameter, detuneParameter.min)}
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
      </section>

      <section
        aria-labelledby="operator-scaling-heading"
        className="grid min-w-0 gap-[9px]"
        id="operator-scaling-panel"
      >
        <RackSubheading
          icon={SlidersHorizontal}
          id="operator-scaling-heading"
          title={t('ui.keyboardScaling')}
        />
        {/* Four across only once each knob has room for its caption. */}
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
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
          {rotaryControl(
            t('ui.leftDepth'),
            'operator.keyboard.leftDepth',
            t('controlHelp.leftDepth'),
          )}
          {rotaryControl(
            t('ui.rightDepth'),
            'operator.keyboard.rightDepth',
            t('controlHelp.rightDepth'),
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {control(
            t('ui.leftCurve'),
            'operator.keyboard.leftCurve',
            curveKeys.map((key) => t(key)),
            t('controlHelp.curve'),
          )}
          {control(
            t('ui.rightCurve'),
            'operator.keyboard.rightCurve',
            curveKeys.map((key) => t(key)),
            t('controlHelp.curve'),
          )}
          {sliderControl(
            t('ui.velocity'),
            'operator.velocitySensitivity',
            t('controlHelp.velocity'),
          )}
          {sliderControl(
            t('ui.ampModSensitivity'),
            'operator.ampModSensitivity',
            t('controlHelp.ampModSensitivity'),
          )}
        </div>
      </section>
    </div>
  )
}

/** A hatched sub-heading inside the open operator column. */
function RackSubheading({
  action,
  icon: Icon,
  id,
  title,
}: {
  action?: ReactNode
  icon: LucideIcon
  id: string
  title: string
}) {
  return (
    <div className="crt-hatch crt-raised-thin flex min-h-7 min-w-0 items-center gap-2 px-1.5 py-1">
      <h3
        className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal tracking-[0.22em] text-[var(--crt-acc-lt)] uppercase"
        id={id}
      >
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{title}</span>
      </h3>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  )
}
