import { Check, Play, Radio } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeviceSelect } from '@/components/midi/device-select'
import { MidiConnectionError } from '@/components/midi/midi-connection-error'
import { useWizardScreens, WizardFooter } from '@/components/patches/bank-wizard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import { useVoiceSetup } from '@/hooks/use-voice-setup'
import '@/i18n/voice-setup'
import '@/i18n/voices'
import { cn } from '@/lib/utils'

type VoiceSetupWizardProps = {
  midi: Pick<
    MidiController,
    | 'connectMidi'
    | 'effectChannel'
    | 'error'
    | 'hasMidiOutput'
    | 'isConnecting'
    | 'midiAccess'
    | 'midiPanicCount'
    | 'outputs'
    | 'selectedOutputId'
    | 'setSelectedOutputId'
    | 'startNote'
    | 'stopNote'
  >
  onClose: () => void
}

// One screen for each thing to do on the FM1, then the sound test that confirms it by ear.
type Screen = 'channels' | 'done' | 'fx' | 'save' | 'test'
const screens: Screen[] = ['channels', 'fx', 'save', 'test', 'done']

/** What the user said of a Voice's test note: heard on its own, not heard, joined by another, or skipped. */
type Answer = 'heard' | 'not-heard' | 'skipped' | 'two'

const voiceCount = 8
/** Middle C at a moderate strike, held long enough to hear. */
const testNote = 60
const testVelocity = 80
const testNoteMs = 400

const answerKeys = {
  heard: 'voiceSetup.test.stateHeard',
  'not-heard': 'voiceSetup.test.stateNotHeard',
  skipped: 'voiceSetup.test.stateSkipped',
  two: 'voiceSetup.test.stateTwo',
} as const

type StopNote = VoiceSetupWizardProps['midi']['stopNote']

/**
 * Plays one short note on a Voice's channel through the selected output, and releases it on the
 * channel and output it struck it on: after its time, when another note replaces it, and when the
 * screen goes, the output changes, MIDI goes offline, or a MIDI panic has released it already.
 */
function useTestNote(midi: VoiceSetupWizardProps['midi']) {
  const { hasMidiOutput, midiAccess, midiPanicCount, selectedOutputId, startNote, stopNote } = midi
  const [playing, setPlaying] = useState(false)
  const soundingRef = useRef<{ channel: number; stopNote: StopNote } | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const release = useCallback(() => {
    window.clearTimeout(timerRef.current)
    const sounding = soundingRef.current
    soundingRef.current = null
    sounding?.stopNote(testNote, sounding.channel)
    setPlaying(false)
  }, [])

  // The note's Note Off goes through the `stopNote` it was struck with, which is bound to the
  // output it went to. The cleanup runs as the route changes and as the screen unmounts.
  useEffect(() => release, [hasMidiOutput, midiAccess, midiPanicCount, release, selectedOutputId])

  const play = (channel: number) => {
    if (!hasMidiOutput) return
    release()
    startNote(testNote, 'C4', { channel, velocity: testVelocity })
    soundingRef.current = { channel, stopNote }
    setPlaying(true)
    timerRef.current = window.setTimeout(release, testNoteMs)
  }

  return { play, playing }
}

type SoundTestScreenProps = {
  answers: readonly (Answer | undefined)[]
  current: number
  lastAnswered: number | null
  midi: VoiceSetupWizardProps['midi']
  onAnswer: (answer: Answer) => void
  onSelect: (voice: number) => void
}

/**
 * The sound test: each Voice's note, played on its channel, and what the user heard. It needs
 * MIDI online and an output, and offers to fix either, as the receive wizard's listening screen does.
 */
function SoundTestScreen({
  answers,
  current,
  lastAnswered,
  midi,
  onAnswer,
  onSelect,
}: SoundTestScreenProps) {
  const { t } = useTranslation()
  const { setup } = useVoiceSetup()
  const { play, playing } = useTestNote(midi)
  const [played, setPlayed] = useState<ReadonlySet<number>>(new Set())
  const playRef = useRef<HTMLButtonElement>(null)
  const voice = setup.voices[current]
  const voiceName = t('voices.voice', { number: current + 1 })
  const channelName = t('voices.channelShort', { number: voice.channel })
  const hasPlayed = played.has(current)
  const lastVoiceName = t('voices.voice', { number: (lastAnswered ?? 0) + 1 })
  const lastChannelName = t('voices.channelShort', {
    number: setup.voices[lastAnswered ?? 0].channel,
  })

  // Moving to another Voice, by answering or by its chip, leaves the note to play for it.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) firstRender.current = false
    else playRef.current?.focus({ preventScroll: true })
  }, [current])

  const answer = (next: Answer) => {
    onAnswer(next)
  }
  const answerButtonProps = (next: Answer) => ({
    'aria-disabled': !midi.hasMidiOutput || undefined,
    onClick: midi.hasMidiOutput ? () => answer(next) : undefined,
    type: 'button' as const,
    variant: 'ghost' as const,
  })

  return (
    <>
      {midi.midiAccess ? (
        <DeviceSelect
          devices={midi.outputs}
          icon={<Radio />}
          label={t('settings.output')}
          onChange={midi.setSelectedOutputId}
          value={midi.selectedOutputId}
        />
      ) : (
        <Button
          aria-disabled={midi.isConnecting || undefined}
          className="justify-self-start"
          onClick={midi.isConnecting ? undefined : () => void midi.connectMidi()}
          type="button"
        >
          {/* Keyed by state: a page translator's replaced text would otherwise stay behind. */}
          <span key={midi.isConnecting ? 'connecting' : 'connect'}>
            {midi.isConnecting ? t('midi.connecting') : t('voiceSetup.test.connect')}
          </span>
        </Button>
      )}
      <MidiConnectionError midi={midi} />
      <section aria-labelledby={`voice-setup-test-${current}`} className="grid gap-3">
        <h3 className="text-sm font-semibold" id={`voice-setup-test-${current}`}>
          {t('voiceSetup.test.heading', { channel: channelName, voice: voiceName })}
        </h3>
        <p className="text-sm">{t('voiceSetup.test.instruction', { voice: voiceName })}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            aria-disabled={!midi.hasMidiOutput || playing || undefined}
            onClick={
              midi.hasMidiOutput && !playing
                ? () => {
                    setPlayed((already) => new Set(already).add(current))
                    play(voice.channel)
                  }
                : undefined
            }
            ref={playRef}
            type="button"
          >
            <Play />
            {/* Keyed by state: a page translator's replaced text would otherwise stay behind. */}
            <span key={playing ? 'playing' : hasPlayed ? 'again' : 'play'}>
              {playing
                ? t('voiceSetup.test.playing')
                : t(hasPlayed ? 'voiceSetup.test.playAgain' : 'voiceSetup.test.play')}
            </span>
          </Button>
          <Button {...answerButtonProps('heard')}>
            <span>{t('voiceSetup.test.heard')}</span>
          </Button>
          <Button {...answerButtonProps('not-heard')}>
            <span>{t('voiceSetup.test.notHeard')}</span>
          </Button>
          {current > 0 ? (
            <Button {...answerButtonProps('two')}>
              <span>{t('voiceSetup.test.heardTwo')}</span>
            </Button>
          ) : null}
          <Button onClick={() => answer('skipped')} type="button" variant="ghost">
            <span>{t('voiceSetup.test.skip')}</span>
          </Button>
        </div>
      </section>
      {/* Stays mounted, so a screen reader hears what the last answer means. */}
      <div className="text-sm text-[var(--crt-ink-3)]" role="status">
        {lastAnswered !== null && answers[lastAnswered] === 'not-heard' ? (
          <p>
            {t('voiceSetup.test.notHeardHint', { channel: lastChannelName, voice: lastVoiceName })}
          </p>
        ) : null}
        {lastAnswered !== null && answers[lastAnswered] === 'two' ? (
          <p>{t('voiceSetup.test.heardTwoHint', { voice: lastVoiceName })}</p>
        ) : null}
      </div>
      <ul
        aria-label={t('voiceSetup.test.progress')}
        className="grid grid-cols-2 gap-1 sm:grid-cols-4"
      >
        {setup.voices.map((_, index) => {
          const result = answers[index]
          return (
            <li key={index}>
              <button
                aria-pressed={index === current}
                className={cn(
                  'flex w-full cursor-pointer items-baseline justify-between gap-2 border px-2 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                  index === current
                    ? 'border-[var(--crt-led)] bg-[var(--crt-bg-head)]'
                    : 'border-[var(--crt-line)] bg-[var(--crt-bg-panel3)]',
                )}
                onClick={() => onSelect(index)}
                type="button"
              >
                <span>{t('voices.voice', { number: index + 1 })}</span>
                <span className="text-[var(--crt-ink-3)]">
                  {t(result ? answerKeys[result] : 'voiceSetup.test.stateNone')}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/**
 * Sets up V16's eight Voices on the FM1 by hand, once, and confirms it by ear. The editor cannot
 * read or set a Voice's channel or On/Off, so each screen says what to do on the FM1; the last
 * checks the result with one short Note On and Note Off on each Voice's channel, nothing else.
 * The librarian mounts it only while it is wanted, so it opens itself as it appears.
 */
export function VoiceSetupWizard({ midi, onClose }: VoiceSetupWizardProps) {
  const { t } = useTranslation()
  const { setup } = useVoiceSetup()
  const toast = useToast()
  const formId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [answers, setAnswers] = useState<(Answer | undefined)[]>(() =>
    Array.from({ length: voiceCount }, () => undefined),
  )
  const [current, setCurrent] = useState(0)
  const [lastAnswered, setLastAnswered] = useState<number | null>(null)
  const { focusFirstControl, formRef, goToScreen, isLastScreen, screen, screenIndex } =
    useWizardScreens(screens)

  useEffect(() => {
    const dialog = dialogRef.current
    // It can open without a click, so check the dialog can be shown, as the guide does.
    if (!dialog || dialog.open || !dialog.isConnected || typeof dialog.showModal !== 'function') {
      return
    }
    dialog.showModal()
  }, [])

  const heard = answers.filter((answer) => answer === 'heard').length

  const answer = (next: Answer) => {
    setAnswers((previous) => previous.map((item, index) => (index === current ? next : item)))
    setLastAnswered(current)
    if (current < voiceCount - 1) setCurrent(current + 1)
  }

  const finish = () => {
    toast.success(t('voiceSetup.done.toast', { heard }))
    dialogRef.current?.close()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLastScreen) finish()
    else goToScreen(screenIndex + 1)
  }

  const voiceName = (index: number) => t('voices.voice', { number: index + 1 })
  const channelName = (index: number) =>
    t('voices.channelShort', { number: setup.voices[index].channel })
  const problems = answers.flatMap((result, index) =>
    result === 'heard'
      ? []
      : [
          result === 'not-heard'
            ? t('voiceSetup.test.notHeardHint', {
                channel: channelName(index),
                voice: voiceName(index),
              })
            : result === 'two'
              ? t('voiceSetup.test.heardTwoHint', { voice: voiceName(index) })
              : t('voiceSetup.done.notTested', { voice: voiceName(index) }),
        ],
  )

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(focusFirstControl)
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('voiceSetup.title')}</DialogTitle>
        <DialogCloseButton
          label={t('voiceSetup.close')}
          onClick={() => dialogRef.current?.close()}
        />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
          {t('voiceSetup.stepOf', { current: screenIndex + 1, total: screens.length })}
          {': '}
          {t(`voiceSetup.steps.${screen}`)}
        </p>
        <form className="grid gap-4 p-5" id={formId} noValidate onSubmit={submit} ref={formRef}>
          {screen === 'channels' ? (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>{t('voiceSetup.channels.step1')}</li>
                <li>{t('voiceSetup.channels.step2')}</li>
                <li>{t('voiceSetup.channels.step3')}</li>
              </ol>
              <section aria-labelledby={`${formId}expected`} className="grid gap-2">
                <h3 className="text-sm font-semibold" id={`${formId}expected`}>
                  {t('voiceSetup.channels.expected')}
                </h3>
                <ul className="dither-well grid grid-cols-2 gap-1 border border-[var(--crt-line-dk)] p-2 text-xs sm:grid-cols-4">
                  {setup.voices.map((_, index) => (
                    <li key={index}>
                      {t('voiceSetup.channels.voiceOnChannel', {
                        channel: channelName(index),
                        voice: voiceName(index),
                      })}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
          {screen === 'fx' ? (
            <>
              <p className="text-sm font-semibold">
                {t('voiceSetup.fx.step', { channel: midi.effectChannel })}
              </p>
              <p className="text-sm text-[var(--crt-ink-3)]">{t('voiceSetup.fx.why')}</p>
            </>
          ) : null}
          {screen === 'save' ? (
            <>
              <p className="text-sm font-semibold">{t('voiceSetup.save.step')}</p>
              <p className="text-sm text-[var(--crt-ink-3)]">{t('voiceSetup.save.why')}</p>
            </>
          ) : null}
          {screen === 'test' ? (
            <SoundTestScreen
              answers={answers}
              current={current}
              lastAnswered={lastAnswered}
              midi={midi}
              onAnswer={answer}
              onSelect={setCurrent}
            />
          ) : null}
          {screen === 'done' ? (
            <div className="grid gap-2 text-sm">
              <p className="font-semibold">
                {t(problems.length === 0 ? 'voiceSetup.done.allHeard' : 'voiceSetup.done.issues')}
              </p>
              {problems.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </DialogBody>
      <WizardFooter
        action={isLastScreen ? { icon: <Check />, label: t('voiceSetup.done.finish') } : null}
        disabled={false}
        formId={formId}
        onBack={() => goToScreen(screenIndex - 1)}
        screenIndex={screenIndex}
        working={false}
      />
    </Dialog>
  )
}
