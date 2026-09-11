import { Activity, Waves } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlgorithmPanel, RackPanelTitle } from '@/components/editor/editor-workspace'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import {
  LfoWaveControl,
  RotaryParameterControl,
  SliderParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import {
  displayToStoredValue,
  getGlobalParameterDefinition,
  storedToDisplayValue,
  type GlobalParameterId,
} from '@/lib/fm1-parameters'

type GlobalConfigurationPanelProps = {
  beginGesture: () => void
  endGesture: () => void
  parameters: Uint8Array
  setParameter: (parameter: number, value: number, maximum: number) => void
}

const globalIndex = (id: GlobalParameterId) => getGlobalParameterDefinition(id).voiceIndex
const algorithmParameter = getGlobalParameterDefinition('global.algorithm')
const feedbackParameter = getGlobalParameterDefinition('global.feedback')
const transposeParameter = getGlobalParameterDefinition('global.transpose')

export function GlobalConfigurationPanel({
  beginGesture,
  endGesture,
  parameters,
  setParameter,
}: GlobalConfigurationPanelProps) {
  const { t } = useTranslation()
  const slider = (label: string, id: GlobalParameterId, max: number, helpText: string) => (
    <SliderParameterControl
      helpText={helpText}
      label={label}
      max={max}
      onChange={(value) => setParameter(globalIndex(id), value, max)}
      onGestureEnd={endGesture}
      onGestureStart={beginGesture}
      value={parameters[globalIndex(id)]}
    />
  )

  /*
    The artboard's second rack row: algorithm, pitch envelope and the LFO
    side by side beneath the operators, wrapping to a stack when narrow.
  */
  return (
    <aside
      aria-label={t('editor.configuration')}
      className="flex min-w-0 flex-wrap items-stretch gap-1.5"
      id="global-configuration-panel"
    >
      <div className="flex min-w-[15rem] flex-[1.15_1_0%] [&>section]:flex-1">
        <AlgorithmPanel
          algorithm={parameters[algorithmParameter.voiceIndex]}
          feedback={parameters[feedbackParameter.voiceIndex]}
          onAlgorithmChange={(algorithm) =>
            setParameter(algorithmParameter.voiceIndex, algorithm, algorithmParameter.max)
          }
          onFeedbackChange={(feedback) =>
            setParameter(feedbackParameter.voiceIndex, feedback, feedbackParameter.max)
          }
          onFeedbackGestureEnd={endGesture}
          onFeedbackGestureStart={beginGesture}
        />
      </div>

      <section
        aria-labelledby="pitch-envelope-heading"
        className="synthwave-panel flex min-w-[14rem] flex-[1_1_0%] flex-col"
      >
        <RackPanelTitle
          help={{ label: t('editor.pitchEnvelope'), text: t('controlHelp.pitchEnvelope') }}
          icon={Activity}
          id="pitch-envelope-heading"
          title={t('editor.pitchEnvelope')}
        />
        <div className="flex flex-1 flex-col p-[9px]">
          <EnvelopeEditor
            color="var(--crt-acc)"
            helpText={t('controlHelp.pitchEnvelope')}
            levels={Array.from(
              parameters.slice(
                globalIndex('global.pitchEnvelope.level1'),
                globalIndex('global.pitchEnvelope.level1') + 4,
              ),
            )}
            onChange={(rate, level, point) => {
              setParameter(globalIndex('global.pitchEnvelope.rate1') + point, rate, 99)
              setParameter(globalIndex('global.pitchEnvelope.level1') + point, level, 99)
            }}
            onGestureEnd={endGesture}
            onGestureStart={beginGesture}
            rates={Array.from(
              parameters.slice(
                globalIndex('global.pitchEnvelope.rate1'),
                globalIndex('global.pitchEnvelope.rate1') + 4,
              ),
            )}
            showTitle={false}
            title={t('editor.pitchEnvelope')}
            variant="pitch"
          />
        </div>
      </section>

      <section
        aria-labelledby="lfo-heading"
        className="synthwave-panel @container flex min-w-[15rem] flex-[1.25_1_0%] flex-col"
      >
        <RackPanelTitle icon={Waves} id="lfo-heading" title={t('editor.lfoGlobal')} />
        <div className="grid grid-cols-2 content-start gap-x-3 gap-y-2.5 p-[9px] @sm:grid-cols-3">
          <LfoWaveControl
            onChange={(value) => setParameter(globalIndex('global.lfoWave'), value, 5)}
            value={parameters[globalIndex('global.lfoWave')]}
          />
          {slider(t('editor.lfoSpeed'), 'global.lfoSpeed', 99, t('controlHelp.lfoSpeed'))}
          {slider(t('editor.lfoDelay'), 'global.lfoDelay', 99, t('controlHelp.lfoDelay'))}
          {slider(
            t('editor.pitchModDepth'),
            'global.lfoPitchModDepth',
            99,
            t('controlHelp.pitchModDepth'),
          )}
          {slider(
            t('editor.ampModDepth'),
            'global.lfoAmpModDepth',
            99,
            t('controlHelp.ampModDepth'),
          )}
          {slider(
            t('editor.pitchModSensitivity'),
            'global.pitchModSensitivity',
            7,
            t('controlHelp.pitchModSensitivity'),
          )}
          <div className="col-span-full grid grid-cols-3 items-start gap-3 border-t border-[var(--crt-line-dk)] pt-2">
            <RotaryParameterControl
              helpText={t('controlHelp.transpose')}
              label={t('editor.transpose')}
              max={24}
              min={-24}
              onChange={(value) =>
                setParameter(
                  transposeParameter.voiceIndex,
                  displayToStoredValue(transposeParameter, value),
                  transposeParameter.max,
                )
              }
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={storedToDisplayValue(
                transposeParameter,
                parameters[transposeParameter.voiceIndex],
              )}
              valueLabel={(value) => (value > 0 ? `+${value}` : String(value))}
            />
            <SwitchParameterControl
              helpText={t('controlHelp.lfoSync')}
              label={t('editor.lfoSync')}
              onChange={(value) => setParameter(globalIndex('global.lfoKeySync'), value, 1)}
              value={parameters[globalIndex('global.lfoKeySync')]}
            />
            <SwitchParameterControl
              helpText={t('controlHelp.oscillatorSync')}
              label={t('editor.oscillatorSync')}
              onChange={(value) => setParameter(globalIndex('global.oscillatorSync'), value, 1)}
              value={parameters[globalIndex('global.oscillatorSync')]}
            />
          </div>
        </div>
      </section>
    </aside>
  )
}
