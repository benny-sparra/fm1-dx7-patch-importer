import { ListChecks, RotateCcw, Sparkles, SlidersHorizontal, X } from 'lucide-react'
import {
  lazy,
  Suspense,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { VoiceChannelsDialog } from '@/components/midi/voice-channels-dialog'
import {
  voiceActionsCellClassName,
  voiceEffectsCellClassName,
  voiceNoticesCellClassName,
  voiceTabsCellClassName,
} from '@/components/midi/voice-bar-layout'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import type { VoiceSetupWizard as VoiceSetupWizardComponent } from '@/components/midi/voice-setup-wizard'
import type { PortalMenu } from '@/components/ui/portal-menu'
import { useToast } from '@/components/ui/toast'
import '@/i18n/voices'
import type { MidiController } from '@/hooks/use-midi'
import { useVoiceSetup } from '@/hooks/use-voice-setup'
import { midiActivity } from '@/lib/midi-activity'
import { cn } from '@/lib/utils'
import { getV16Effects } from '@/lib/v16-effects'
import { aimedVoice, aimVoice, setVoiceOn } from '@/lib/voice-setup'
import {
  getVoiceSetupGuided,
  markVoiceSetupGuided,
  subscribeVoiceSetupGuided,
} from '@/lib/voice-setup-guided'

// The wizard loads when it is first opened; the menu item and the first-time line stay here.
const VoiceSetupWizard = lazy(() =>
  import('@/components/midi/voice-setup-wizard').then((module) => ({
    default: module.VoiceSetupWizard,
  })),
)

type VoiceStripProps = {
  midi: Pick<MidiController, 'channel' | 'hasMidiOutput' | 'sendEffectSettings' | 'setChannel'> &
    ComponentProps<typeof VoiceSetupWizardComponent>['midi']
  /** Whether the Effects tab, after the Voices, is the one open: no Voice tab is then lit. */
  effectsOpen: boolean
  /** Opens the Effects tab, or closes it for the Voice a tab aims at. */
  onEffectsOpenChange: (open: boolean) => void
  /** Told which FM1 preset, 0–127, the Voice just aimed at plays, or null for none. */
  onAim: (preset: number | null) => void
  /** Recalls each Voice's preset as a Program Change on its channel, returning how many went. */
  onSendSetup: () => number
  /**
   * The help button beside the setup line. The page makes it, since importing `HelpPopover` here
   * made Rolldown split it out of the entry, about 1.2 KiB.
   */
  renderHelp: (label: string, text: string) => ReactNode
  /**
   * The ⋮ menu of the bar's actions. The page makes it, since importing `PortalMenu` here made
   * Rolldown split it out of the entry.
   */
  renderMenu: (props: Pick<ComponentProps<typeof PortalMenu>, 'items' | 'menuLabel'>) => ReactNode
  /**
   * An FM1 preset, 0–127, as banks A–D show it: its slot code and patch name, or the slot code
   * alone where the library holds no patch.
   */
  presetLabel: (preset: number) => string
}

/**
 * How a Voice's cell is drawn: a raised tab fused to the panel from `sm`, a grid cell below it.
 * In the one-row layout the Voices share the row equally, while the Effects tab (`grow` false)
 * takes its label's width, which is wider than a Voice's.
 */
function voiceCellClassName(isAimed: boolean, grow = true) {
  const width = grow ? 'min-[62rem]:flex-1' : 'min-[62rem]:flex-none'
  return cn(
    'flex min-w-0 items-center border',
    isAimed
      ? // The aimed tab is the panel's own face, open at the bottom and topped with the amber bar;
        // on a phone it is a lit grid cell with an amber ring.
        'crt-hatch h-10 border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] shadow-[inset_0_0_0_1px_var(--crt-led)] min-[62rem]:border-t-[var(--crt-bevel)] min-[62rem]:border-r-[var(--crt-bevel)] min-[62rem]:border-b-transparent min-[62rem]:border-l-[var(--crt-bevel)] min-[62rem]:bg-origin-border min-[62rem]:shadow-[inset_0_2px_0_var(--crt-led)] xl:flex-none'
      : 'h-10 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)] min-[62rem]:mb-0.5 min-[62rem]:h-[34px] xl:flex-none',
    width,
  )
}

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]'

/**
 * The eight Voices of M-VAVE's V16, with a menu of Recall voices and Voice channels…, as the cells the librarian page's
 * Voices bar holds (`voice-bar-layout`). A Voice's tab and its
 * own switch are two buttons: clicking the tab aims at the Voice, setting the note channel to its
 * channel, so the keyboard plays it and a slot click gives it that slot's preset; the switch says
 * whether the Voice is On and aims at nothing. Each Voice points at an FM1 preset, never a copy of
 * the patch.
 */
export function VoiceStrip({
  effectsOpen,
  midi,
  onEffectsOpenChange,
  onAim,
  onSendSetup,
  presetLabel,
  renderHelp,
  renderMenu,
}: VoiceStripProps) {
  const { i18n, t } = useTranslation()
  const toast = useToast()
  const { aimed, setup } = useVoiceSetup()
  const aimedIndex = effectsOpen ? null : aimedVoice(setup, midi.channel, aimed)
  const litChannels = useSyncExternalStore(midiActivity.subscribe, midiActivity.getChannelSnapshot)
  const [showsChannels, setShowsChannels] = useState(false)
  const [showsSetup, setShowsSetup] = useState(false)
  const [setupLoadFailed, setSetupLoadFailed] = useState(false)
  const guided = useSyncExternalStore(subscribeVoiceSetupGuided, getVoiceSetupGuided, () => true)
  const [sendFailed, setSendFailed] = useState(false)
  const assigned = setup.voices.filter((voice) => voice.preset !== null).length
  const sendBlockedReason = !midi.hasMidiOutput
    ? t('voices.recallOffline')
    : assigned === 0
      ? t('voices.recallEmpty')
      : null

  const openSetup = () => {
    setSetupLoadFailed(false)
    setShowsSetup(true)
  }

  const recallVoices = () => {
    if (sendBlockedReason) return
    const sent = onSendSetup()
    setSendFailed(sent < assigned)
    if (sent < assigned) return
    // The Voices share one FX group, which no Program Change sets, so the effects follow them.
    void midi.sendEffectSettings(getV16Effects()).then((sentEffects) => {
      if (!sentEffects) setSendFailed(true)
    })
    const voices = setup.voices.flatMap((voice, index) =>
      voice.preset === null ? [] : [t('voices.voice', { number: index + 1 })],
    )
    toast.success(
      t('voices.recalled', {
        voices: new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' }).format(voices),
      }),
    )
  }

  return (
    <>
      {/* The one-time FM1 setup is the first thing to do, in one line with its steps behind help. */}
      <div className={voiceNoticesCellClassName}>
        <div className="empty:hidden" role="status">
          {!guided ? (
            <div className="mb-2">
              <InfoNotice>
                <span className="flex items-center gap-2">
                  <button
                    className={cn('cursor-pointer text-left underline', focusRing)}
                    onClick={() => openSetup()}
                    type="button"
                  >
                    {t('voices.guidedPrompt')}
                  </button>
                  <button
                    aria-label={t('voices.guidedDismiss')}
                    className={cn(
                      'ml-auto grid size-6 shrink-0 cursor-pointer place-items-center',
                      focusRing,
                    )}
                    onClick={markVoiceSetupGuided}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </span>
              </InfoNotice>
            </div>
          ) : assigned === 0 ? (
            <div className="mb-2">
              <InfoNotice>
                <span className="flex items-center gap-1">
                  <span>{t('voices.setupShort')}</span>
                  {renderHelp(t('voices.setupHelpLabel'), t('voices.setupSteps'))}
                </span>
              </InfoNotice>
            </div>
          ) : null}
        </div>
        {setupLoadFailed ? <LoadFailedNotice message={t('voices.setupLoadFailed')} /> : null}
        {sendFailed ? (
          <div className="mb-2">
            <ErrorNotice>{t('voices.recallFailed')}</ErrorNotice>
          </div>
        ) : null}
      </div>
      {/* Not a tab list: ARIA keeps a switch out of one, so each Voice is a pair of buttons. */}
      <div aria-label={t('voices.strip')} className={voiceTabsCellClassName} role="group">
        {setup.voices.map((voice, index) => {
          const number = index + 1
          const isAimed = index === aimedIndex
          const playing = voice.preset === null ? t('voices.noPatch') : presetLabel(voice.preset)
          const label = t('voices.aim', {
            channel: voice.channel,
            number,
            patch: playing,
            state: t(voice.on ? 'voices.stateOn' : 'voices.stateOff'),
          })
          return (
            <div className={voiceCellClassName(isAimed)} key={number}>
              <button
                aria-label={label}
                aria-pressed={isAimed}
                className={cn(
                  'font-dot-matrix -ml-2 h-full min-w-0 flex-1 cursor-pointer truncate pr-1.5 pl-1.5 text-left text-[13px] leading-none font-bold whitespace-nowrap min-[26.25rem]:text-[14px] xl:pr-2.5',
                  focusRing,
                  !voice.on
                    ? 'text-[var(--crt-ink-4)]'
                    : isAimed
                      ? 'text-[var(--crt-acc-br)]'
                      : 'text-[var(--crt-acc-lt)]',
                )}
                onClick={() => {
                  onEffectsOpenChange(false)
                  aimVoice(index)
                  midi.setChannel(voice.channel)
                  onAim(voice.preset)
                }}
                title={label}
                type="button"
              >
                {t('voices.voice', { number })}
              </button>
              <button
                aria-checked={voice.on}
                aria-label={t('voices.voiceSwitch', { number })}
                className={cn(
                  'order-first grid size-6 shrink-0 cursor-pointer place-items-center',
                  focusRing,
                )}
                onClick={() => setVoiceOn(index, !voice.on)}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  data-lit={
                    voice.on && (litChannels & (1 << (voice.channel - 1))) !== 0 ? true : undefined
                  }
                  className={cn(
                    'block size-2.5 border transition-[box-shadow,filter] duration-150 data-[lit]:shadow-[0_0_10px_2px_var(--crt-led)] data-[lit]:brightness-125 data-[lit]:duration-0 motion-reduce:transition-none',
                    voice.on
                      ? 'border-[var(--crt-led)] bg-[var(--crt-led)] shadow-[0_0_6px_var(--crt-led-glow)]'
                      : 'border-t-[var(--crt-shadow)] border-r-[var(--crt-line-lt2)] border-b-[var(--crt-line-lt2)] border-l-[var(--crt-shadow)] bg-[var(--crt-bg-well)]',
                  )}
                />
              </button>
            </div>
          )
        })}
        {/* The Voices' shared effects: one more tab, which swaps the patch banks for the panel. */}
        <div className={cn(voiceCellClassName(effectsOpen, false), voiceEffectsCellClassName)}>
          <button
            aria-pressed={effectsOpen}
            className={cn(
              'font-dot-matrix flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 text-[13px] leading-none font-bold whitespace-nowrap min-[26.25rem]:text-[14px]',
              focusRing,
              effectsOpen ? 'text-[var(--crt-acc-br)]' : 'text-[var(--crt-acc-lt)]',
            )}
            onClick={() => onEffectsOpenChange(!effectsOpen)}
            type="button"
          >
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{t('voices.effectsTab')}</span>
          </button>
        </div>
      </div>
      <span className={voiceActionsCellClassName}>
        {renderMenu({
          items: [
            {
              disabled: sendBlockedReason !== null,
              hint: sendBlockedReason ?? t('voices.recallHint'),
              Icon: RotateCcw,
              label: t('voices.recall'),
              onSelect: recallVoices,
            },
            {
              Icon: ListChecks,
              label: t('voices.setupOpen'),
              onSelect: openSetup,
            },
            {
              Icon: SlidersHorizontal,
              label: t('voices.channels'),
              onSelect: () => setShowsChannels(true),
            },
          ],
          menuLabel: t('voices.menu'),
        })}
      </span>
      {showsSetup ? (
        <ErrorBoundary
          onError={() => {
            setShowsSetup(false)
            setSetupLoadFailed(true)
          }}
        >
          <Suspense fallback={null}>
            <VoiceSetupWizard midi={midi} onClose={() => setShowsSetup(false)} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {showsChannels ? (
        <VoiceChannelsDialog midi={midi} onClose={() => setShowsChannels(false)} />
      ) : null}
    </>
  )
}
