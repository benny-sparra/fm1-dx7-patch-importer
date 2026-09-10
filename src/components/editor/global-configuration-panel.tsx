import { useTranslation } from 'react-i18next'

import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import {
  LfoWaveControl,
  SliderParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
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
  return (
    <aside aria-label={t('editor.configuration')} className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-4" id="global-configuration-panel">
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

        <Card className="min-w-0 border-[var(--crt-line)] bg-card/95">
          <CardHeader className="flex-row items-center justify-between gap-2 border-b bg-card px-4 py-3">
            <CardTitle className="text-base text-foreground">{t('editor.lfoGlobal')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-3 gap-y-4 p-4">
            <SwitchParameterControl
              helpText={t('controlHelp.oscillatorSync')}
              label={t('editor.oscillatorSync')}
              onChange={(value) => setParameter(globalIndex('global.oscillatorSync'), value, 1)}
              value={parameters[globalIndex('global.oscillatorSync')]}
            />
            <SwitchParameterControl
              helpText={t('controlHelp.lfoSync')}
              label={t('editor.lfoSync')}
              onChange={(value) => setParameter(globalIndex('global.lfoKeySync'), value, 1)}
              value={parameters[globalIndex('global.lfoKeySync')]}
            />
            <LfoWaveControl
              onChange={(value) => setParameter(globalIndex('global.lfoWave'), value, 5)}
              value={parameters[globalIndex('global.lfoWave')]}
            />
            <SliderParameterControl
              helpText={t('controlHelp.lfoSpeed')}
              label={t('editor.lfoSpeed')}
              max={99}
              onChange={(value) => setParameter(globalIndex('global.lfoSpeed'), value, 99)}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={parameters[globalIndex('global.lfoSpeed')]}
            />
            <SliderParameterControl
              helpText={t('controlHelp.lfoDelay')}
              label={t('editor.lfoDelay')}
              max={99}
              onChange={(value) => setParameter(globalIndex('global.lfoDelay'), value, 99)}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={parameters[globalIndex('global.lfoDelay')]}
            />
            <SliderParameterControl
              helpText={t('controlHelp.pitchModDepth')}
              label={t('editor.pitchModDepth')}
              max={99}
              onChange={(value) => setParameter(globalIndex('global.lfoPitchModDepth'), value, 99)}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={parameters[globalIndex('global.lfoPitchModDepth')]}
            />
            <SliderParameterControl
              helpText={t('controlHelp.ampModDepth')}
              label={t('editor.ampModDepth')}
              max={99}
              onChange={(value) => setParameter(globalIndex('global.lfoAmpModDepth'), value, 99)}
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={parameters[globalIndex('global.lfoAmpModDepth')]}
            />
            <SliderParameterControl
              helpText={t('controlHelp.pitchModSensitivity')}
              label={t('editor.pitchModSensitivity')}
              max={7}
              onChange={(value) =>
                setParameter(globalIndex('global.pitchModSensitivity'), value, 7)
              }
              onGestureEnd={endGesture}
              onGestureStart={beginGesture}
              value={parameters[globalIndex('global.pitchModSensitivity')]}
            />
            <SliderParameterControl
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
          </CardContent>
        </Card>

        <Card className="min-w-0 border-[var(--crt-line)] bg-card/95">
          <CardHeader className="flex-row items-center justify-between gap-2 border-b bg-card px-4 py-3">
            <CardTitle className="flex min-w-0 items-center gap-1 text-base text-foreground">
              {t('editor.pitchEnvelope')}
              <HelpPopover
                label={t('editor.pitchEnvelope')}
                text={t('controlHelp.pitchEnvelope')}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <EnvelopeEditor
              color="var(--fm1-accent)"
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
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}
