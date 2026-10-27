import { Send, SlidersHorizontal } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { VoiceChannelsDialog } from '@/components/midi/voice-channels-dialog'
import { bevelClassName } from '@/components/ui/bevel-radio'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/ui/error-notice'
import { useToast } from '@/components/ui/toast'
import '@/i18n/voices'
import type { MidiController } from '@/hooks/use-midi'
import { useVoiceSetup } from '@/hooks/use-voice-setup'
import { cn } from '@/lib/utils'
import { aimedVoice, aimVoice } from '@/lib/voice-setup'

type VoiceStripProps = {
  midi: Pick<MidiController, 'channel' | 'hasMidiOutput' | 'setChannel'>
  /** Sends each Voice's preset as a Program Change on its channel, returning how many went. */
  onSendSetup: () => number
  /**
   * An FM1 preset, 0–127, as banks A–D show it: its slot code and patch name, or the slot code
   * alone where the library holds no patch.
   */
  presetLabel: (preset: number) => string
}

/**
 * The eight Voices of M-VAVE's V16, with Send setup and Channels, as the cells of the bar above the
 * patch banks that the Multitimbral mode switch heads. Clicking a Voice aims at it, setting the note channel to its channel, so the keyboard plays it and a slot click
 * gives it that slot's preset. Each Voice points at an FM1 preset, never a copy of the patch.
 */
export function VoiceStrip({ midi, onSendSetup, presetLabel }: VoiceStripProps) {
  const { i18n, t } = useTranslation()
  const toast = useToast()
  const { aimed, setup } = useVoiceSetup()
  const aimedIndex = aimedVoice(setup, midi.channel, aimed)
  const [showsChannels, setShowsChannels] = useState(false)
  const [sendFailed, setSendFailed] = useState(false)
  const sendReasonId = useId()
  const assigned = setup.voices.filter((voice) => voice.preset !== null).length
  const sendBlockedReason = !midi.hasMidiOutput
    ? t('voices.sendSetupOffline')
    : assigned === 0
      ? t('voices.sendSetupEmpty')
      : null

  const sendSetup = () => {
    if (sendBlockedReason) return
    const sent = onSendSetup()
    setSendFailed(sent < assigned)
    if (sent < assigned) return
    const voices = setup.voices.flatMap((voice, index) =>
      voice.preset === null ? [] : [t('voices.voice', { number: index + 1 })],
    )
    toast.success(
      t('voices.setupSent', {
        voices: new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' }).format(voices),
      }),
    )
  }

  return (
    <>
      <span className="ml-auto flex items-center gap-2">
        <Button
          aria-describedby={sendBlockedReason ? sendReasonId : undefined}
          aria-disabled={sendBlockedReason ? true : undefined}
          onClick={sendSetup}
          size="sm"
          title={sendBlockedReason ?? undefined}
          type="button"
          variant="secondary"
        >
          <Send aria-hidden="true" />
          <span>{t('voices.sendSetup')}</span>
        </Button>
        {sendBlockedReason ? (
          <span className="sr-only" id={sendReasonId}>
            {sendBlockedReason}
          </span>
        ) : null}
        <Button
          aria-haspopup="dialog"
          onClick={() => setShowsChannels(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>{t('voices.channels')}</span>
        </Button>
      </span>
      {/* Eight numbers on a phone; from the small breakpoint each Voice names its channel and
          patch, four to a row until there is room for eight. */}
      <div
        aria-label={t('voices.strip')}
        className="grid w-full basis-full grid-cols-8 gap-1 sm:grid-cols-4 lg:grid-cols-8"
        role="group"
      >
        {setup.voices.map((voice, index) => {
          const number = index + 1
          const isAimed = index === aimedIndex
          const playing = voice.preset === null ? t('voices.noPatch') : presetLabel(voice.preset)
          const label = t('voices.aim', { channel: voice.channel, number, patch: playing })
          return (
            <button
              aria-label={label}
              aria-pressed={isAimed}
              className={cn(
                bevelClassName(isAimed),
                // The Voice aimed at is lit round its edge, as a lit slot's code is.
                isAimed && 'shadow-[inset_0_0_0_1px_var(--crt-led)]',
                'flex h-8 min-w-0 cursor-pointer flex-col items-center justify-center px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] sm:h-11 sm:items-stretch sm:gap-0.5 sm:px-2',
              )}
              key={number}
              onClick={() => {
                aimVoice(index)
                midi.setChannel(voice.channel)
              }}
              title={label}
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'font-vt323 text-[18px] leading-none sm:hidden',
                  isAimed ? 'text-[var(--crt-acc-br)]' : 'text-[var(--crt-acc-lt)]',
                )}
              >
                {number}
              </span>
              <span
                aria-hidden="true"
                className="hidden items-baseline justify-between gap-1 sm:flex"
              >
                <span
                  className={cn(
                    'font-vt323 truncate text-[16px] leading-none',
                    isAimed ? 'text-[var(--crt-acc-br)]' : 'text-[var(--crt-acc-lt)]',
                  )}
                >
                  {t('voices.voice', { number })}
                </span>
                <span className="shrink-0 text-[10px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase">
                  {t('voices.channelShort', { number: voice.channel })}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'font-dot-matrix hidden truncate text-left text-[12px] font-bold whitespace-pre sm:block',
                  voice.preset === null
                    ? 'text-[var(--crt-ink-4)]'
                    : isAimed
                      ? 'text-white'
                      : 'text-[var(--crt-ink)]',
                )}
              >
                {playing}
              </span>
            </button>
          )
        })}
      </div>
      {sendFailed ? (
        <div className="w-full basis-full">
          <ErrorNotice>{t('voices.sendSetupFailed')}</ErrorNotice>
        </div>
      ) : null}
      {showsChannels ? (
        <VoiceChannelsDialog midi={midi} onClose={() => setShowsChannels(false)} />
      ) : null}
    </>
  )
}
