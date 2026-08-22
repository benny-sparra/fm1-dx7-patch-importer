import { AudioWaveform, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { EffectsUnit } from '@/components/editor/effects-unit'
import {
  CollapseButton,
  LfoWaveControl,
  SliderParameterControl,
  SwitchParameterControl,
} from '@/components/editor/parameter-controls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpPopover } from '@/components/ui/help-popover'
import { getFm1EffectParameters } from '@/lib/fm1-effects'
import {
  displayToStoredValue,
  getGlobalParameterDefinition,
  storedToDisplayValue,
  type GlobalParameterId,
} from '@/lib/fm1-parameters'
import { cn } from '@/lib/utils'

type GlobalConfigurationPanelProps = {
  beginGesture: () => void
  endGesture: () => void
  isLfoGlobalOpen: boolean
  isPitchEnvelopeOpen: boolean
  leftPanelTab: 'effects' | 'global'
  onTabChange: (tab: 'effects' | 'global') => void
  onToggleLfoGlobal: () => void
  onTogglePitchEnvelope: () => void
  parameters: Uint8Array
  setEffectParameter: (controller: number, value: number) => void
  setParameter: (parameter: number, value: number, maximum: number) => void
}

const globalIndex = (id: GlobalParameterId) => getGlobalParameterDefinition(id).voiceIndex
const algorithmParameter = getGlobalParameterDefinition('global.algorithm')
const feedbackParameter = getGlobalParameterDefinition('global.feedback')
const transposeParameter = getGlobalParameterDefinition('global.transpose')

export function GlobalConfigurationPanel({
  beginGesture,
  endGesture,
  isLfoGlobalOpen,
  isPitchEnvelopeOpen,
  leftPanelTab,
  onTabChange,
  onToggleLfoGlobal,
  onTogglePitchEnvelope,
  parameters,
  setEffectParameter,
  setParameter,
}: GlobalConfigurationPanelProps) {
  const { t } = useTranslation()
  return (
    <aside aria-label={t('editor.configuration')} className="grid min-w-0 gap-4">
      <div
        aria-label={t('editor.sections')}
        className="relative grid grid-cols-2 rounded-lg border border-primary/20 bg-white p-1 shadow-sm"
        role="tablist"
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none',
            leftPanelTab === 'effects' && 'translate-x-full',
          )}
        />
        <button
          aria-controls="global-configuration-panel"
          aria-selected={leftPanelTab === 'global'}
          className={cn(
            'relative z-10 flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            leftPanelTab === 'global' &&
              'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
          )}
          id="global-configuration-tab"
          onClick={() => onTabChange('global')}
          role="tab"
          type="button"
        >
          <SlidersHorizontal className="size-4" />
          {t('editor.global')}
        </button>
        <button
          aria-controls="effects-configuration-panel"
          aria-selected={leftPanelTab === 'effects'}
          className={cn(
            'relative z-10 flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            leftPanelTab === 'effects' &&
              'text-primary-foreground hover:bg-transparent hover:text-primary-foreground',
          )}
          id="effects-configuration-tab"
          onClick={() => onTabChange('effects')}
          role="tab"
          type="button"
        >
          <AudioWaveform className="size-4" />
          {t('editor.effects')}
        </button>
      </div>

      <div
        aria-labelledby="global-configuration-tab"
        className="grid min-w-0 gap-4"
        hidden={leftPanelTab !== 'global'}
        id="global-configuration-panel"
        role="tabpanel"
      >
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

        <Card className="min-w-0 border-primary/20 bg-card/95">
          <CardHeader
            className={cn(
              'flex-row items-center justify-between gap-2 px-4 py-3',
              isPitchEnvelopeOpen && 'border-b',
            )}
          >
            <CardTitle className="flex min-w-0 items-center gap-1 text-base text-black">
              {t('editor.pitchEnvelope')}
              <HelpPopover
                label={t('editor.pitchEnvelope')}
                text={t('controlHelp.pitchEnvelope')}
              />
            </CardTitle>
            <CollapseButton
              controls="pitch-envelope-controls"
              expanded={isPitchEnvelopeOpen}
              label={t('editor.pitchEnvelope')}
              onClick={() => onTogglePitchEnvelope}
            />
          </CardHeader>
          <CardContent
            className="grid grid-cols-2 gap-x-3 gap-y-5 p-4"
            hidden={!isPitchEnvelopeOpen}
            id="pitch-envelope-controls"
          >
            {[0, 1, 2, 3].map((offset) => (
              <SliderParameterControl
                helpText={t('controlHelp.pitchEnvelopeRate')}
                key={`pr-${offset}`}
                label={t('editor.rate', { number: offset + 1 })}
                max={99}
                onChange={(value) =>
                  setParameter(globalIndex('global.pitchEnvelope.rate1') + offset, value, 99)
                }
                onGestureEnd={endGesture}
                onGestureStart={beginGesture}
                value={parameters[globalIndex('global.pitchEnvelope.rate1') + offset]}
              />
            ))}
            {[0, 1, 2, 3].map((offset) => (
              <SliderParameterControl
                helpText={t('controlHelp.pitchEnvelopeLevel')}
                key={`pl-${offset}`}
                label={t('editor.level', { number: offset + 1 })}
                max={99}
                onChange={(value) =>
                  setParameter(globalIndex('global.pitchEnvelope.level1') + offset, value, 99)
                }
                onGestureEnd={endGesture}
                onGestureStart={beginGesture}
                value={parameters[globalIndex('global.pitchEnvelope.level1') + offset]}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-primary/20 bg-card/95">
          <CardHeader
            className={cn(
              'flex-row items-center justify-between gap-2 px-4 py-3',
              isLfoGlobalOpen && 'border-b',
            )}
          >
            <CardTitle className="text-base text-black">{t('editor.lfoGlobal')}</CardTitle>
            <CollapseButton
              controls="lfo-global-controls"
              expanded={isLfoGlobalOpen}
              label={t('editor.lfoGlobal')}
              onClick={() => onToggleLfoGlobal}
            />
          </CardHeader>
          <CardContent
            className="grid grid-cols-2 gap-x-3 gap-y-4 p-4"
            hidden={!isLfoGlobalOpen}
            id="lfo-global-controls"
          >
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
      </div>

      <div
        aria-labelledby="effects-configuration-tab"
        hidden={leftPanelTab !== 'effects'}
        id="effects-configuration-panel"
        role="tabpanel"
      >
        <EffectsUnit
          layout="sidebar"
          onChange={setEffectParameter}
          onGestureEnd={endGesture}
          onGestureStart={beginGesture}
          values={getFm1EffectParameters(parameters)}
        />
      </div>
    </aside>
  )
}
