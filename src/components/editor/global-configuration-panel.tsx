import { Activity, Waves } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlgorithmPanel, RackPanelTitle } from '@/components/editor/editor-workspace'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { LfoScope } from '@/components/editor/lfo-scope'
import {
  LfoWaveControl,
  RotaryParameterControl,
  SliderParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import { HelpPopover } from '@/components/ui/help-popover'
import {
  displayToStoredValue,
  getGlobalParameterDefinition,
  storedToDisplayValue,
  type GlobalParameterId,
} from '@/lib/fm1-parameters'
import { pitchEnvelopePresets, type PitchEnvelopePresetId } from '@/lib/pitch-envelope-presets'

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

  // A preset is one edit: grouping the eight writes in a gesture keeps it to a
  // single undo step.
  const applyPitchEnvelopePreset = (id: PitchEnvelopePresetId) => {
    const preset = pitchEnvelopePresets.find((candidate) => candidate.id === id)
    if (!preset) return
    beginGesture()
    preset.rates.forEach((rate, point) =>
      setParameter(globalIndex('global.pitchEnvelope.rate1') + point, rate, 99),
    )
    preset.levels.forEach((level, point) =>
      setParameter(globalIndex('global.pitchEnvelope.level1') + point, level, 99),
    )
    endGesture()
  }

  /*
    The artboard's second rack row: algorithm, pitch envelope and the LFO
    side by side beneath the operators, wrapping to a stack when narrow.
    Below xl the LFO takes a row of its own, since a third of the width
    leaves its labels no room.
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
          {/* Always shows the placeholder: a preset is a starting point, not a mode. */}
          <label className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
            <span className="flex items-center gap-1">
              {t('editor.pitchEnvelopePresets')}
              <HelpPopover
                label={t('editor.pitchEnvelopePresets')}
                text={t('controlHelp.pitchEnvelopePresets')}
              />
            </span>
            <select
              className="crt-inset h-7 w-full min-w-0 bg-[var(--crt-bg-well)] px-1.5 text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
              onChange={(event) => {
                applyPitchEnvelopePreset(event.target.value as PitchEnvelopePresetId)
              }}
              value=""
            >
              <option disabled value="">
                {t('editor.pitchEnvelopePresetPlaceholder')}
              </option>
              {pitchEnvelopePresets.map(({ id }) => (
                <option key={id} value={id}>
                  {t(`editor.pitchEnvelopePresetOptions.${id}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section
        aria-labelledby="lfo-heading"
        className="synthwave-panel @container flex min-w-[15rem] flex-[1.25_1_100%] flex-col xl:flex-[1.25_1_0%]"
      >
        <RackPanelTitle icon={Waves} id="lfo-heading" title={t('editor.lfoGlobal')} />
        <div className="grid grid-cols-2 content-start gap-x-3 gap-y-2.5 p-[9px] @sm:grid-cols-3">
          <div className="col-span-full">
            <LfoScope
              ampModDepth={parameters[globalIndex('global.lfoAmpModDepth')]}
              pitchModDepth={parameters[globalIndex('global.lfoPitchModDepth')]}
              speed={parameters[globalIndex('global.lfoSpeed')]}
              wave={parameters[globalIndex('global.lfoWave')]}
            />
          </div>
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
