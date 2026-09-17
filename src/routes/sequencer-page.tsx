import { ArrowLeft, Ear, Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SequencerSendDialog } from '@/components/sequencer/sequencer-send-dialog'
import { SequencerGrid } from '@/components/sequencer/sequencer-grid'
import { Button } from '@/components/ui/button'
import { sequencerNamespace } from '@/i18n/sequencer'
import { type MidiController } from '@/hooks/use-midi'
import {
  createFm1Pattern,
  fm1SequenceMaxLoopLength,
  fm1SequenceMinLoopLength,
  padFm1PatternToLoopLength,
  setFm1PatternStep,
  type Fm1Pattern,
} from '@/lib/fm1-sequence'
import {
  Fm1PlaybackObserver,
  fm1PatternRotationsMatch,
  type Fm1PatternObservation,
} from '@/lib/fm1-sequence-observer'
import { transmitFm1Pattern, type Fm1PatternTransmitResult } from '@/lib/fm1-sequence-transmit'
import { midiNoteName } from '@/lib/midi'

const defaultLoopLength = 8

type SendOutcome = Fm1PatternTransmitResult | { outcome: 'no-output' } | { outcome: 'invalid' }

type SequencerPageProps = {
  midi: MidiController
  onBack: () => void
}

/**
 * The sequencer view: build a pattern, play it into the FM1's own recording, and read back what
 * the device plays.
 *
 * Everything the FM1 exposes no command for stays with the user, and the view says so rather than
 * implying otherwise: arming record mode, choosing the pattern, setting Step length and saving.
 */
export function SequencerPage({ midi, onBack }: SequencerPageProps) {
  const { t } = useTranslation(sequencerNamespace)
  // The shell's MIDI hints live in the eager namespace, so a disabled control can explain itself
  // without waiting for anything.
  const { t: tShell } = useTranslation()
  const headingId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const loopLengthRef = useRef(defaultLoopLength)
  const [pattern, setPattern] = useState(() => createFm1Pattern(defaultLoopLength))
  const [listening, setListening] = useState(false)
  const [observation, setObservation] = useState<Fm1PatternObservation | null>(null)
  const [sending, setSending] = useState(false)
  const [stepsSent, setStepsSent] = useState(0)
  const [result, setResult] = useState<SendOutcome | null>(null)
  const [sentPattern, setSentPattern] = useState<Fm1Pattern | null>(null)

  loopLengthRef.current = pattern.loopLength

  const { subscribeToInput } = midi

  useEffect(() => {
    if (!listening) return

    const observer = new Fm1PlaybackObserver()

    // Reading after each note keeps the view in step with the device without a timer: a pattern
    // appears as soon as the pass that completes it arrives.
    return subscribeToInput((data, atMs) => {
      if (!observer.ingest(data, atMs)) return
      setObservation(observer.observe({ loopLength: loopLengthRef.current }))
    })
  }, [listening, subscribeToInput])

  // A pass that is still running when the view goes away would keep sending notes into a device
  // nobody is watching.
  useEffect(() => () => abortRef.current?.abort(), [])

  const changeLoopLength = (loopLength: number) => {
    setPattern((current) =>
      loopLength < current.steps.length
        ? { ...current, loopLength, steps: current.steps.slice(0, loopLength) }
        : padFm1PatternToLoopLength({ ...current, loopLength }),
    )
  }

  const send = useCallback(async () => {
    const output = midi.selectedOutput

    if (!output) {
      setResult({ outcome: 'no-output' })
      dialogRef.current?.close()
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setSending(true)
    setStepsSent(0)
    setResult(null)
    setObservation(null)

    try {
      const transmitted = await transmitFm1Pattern(
        output,
        pattern,
        { channel: midi.channel },
        { onStepSent: (steps) => setStepsSent(steps), signal: controller.signal },
      )
      setResult(transmitted)
      setSentPattern(transmitted.stepsSent > 0 ? pattern : null)
    } catch {
      // Only a pattern the domain refused reaches here, and its text is never shown to the user.
      setResult({ outcome: 'invalid' })
    } finally {
      abortRef.current = null
      setSending(false)
      dialogRef.current?.close()
      sendButtonRef.current?.focus()
    }
  }, [midi.channel, midi.selectedOutput, pattern])

  const closeDialog = () => {
    if (sending) {
      abortRef.current?.abort()
      return
    }
    dialogRef.current?.close()
    sendButtonRef.current?.focus()
  }

  const heardPattern = observation?.status === 'observed' ? observation.pattern : null
  const comparison =
    heardPattern && sentPattern
      ? fm1PatternRotationsMatch(sentPattern, heardPattern)
        ? 'match'
        : 'mismatch'
      : null

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto grid max-w-5xl gap-4 px-4 py-5 sm:px-5 lg:px-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onBack} type="button" variant="outline">
          <ArrowLeft aria-hidden="true" />
          <span>{t('back')}</span>
        </Button>
        <h2 className="text-lg tracking-[0.12em]" id={headingId}>
          {t('title')}
        </h2>
      </div>

      <p className="crt-inset bg-card p-3 text-sm leading-6">{t('intro')}</p>

      <div className="crt-raised grid gap-3 bg-card p-4">
        <h3 className="text-sm tracking-[0.12em]">{t('pattern.heading')}</h3>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs tracking-[0.08em]" htmlFor={`${headingId}-length`}>
            {t('pattern.stepLength')}
          </label>
          <select
            className="crt-inset h-8 w-20 bg-[var(--crt-bg-1)] px-2 text-sm"
            id={`${headingId}-length`}
            onChange={(event) => changeLoopLength(Number.parseInt(event.target.value, 10))}
            value={pattern.loopLength}
          >
            {Array.from(
              { length: fm1SequenceMaxLoopLength - fm1SequenceMinLoopLength + 1 },
              (_unused, offset) => fm1SequenceMinLoopLength + offset,
            ).map((length) => (
              <option key={length} value={length}>
                {length}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--crt-ink-3)]">{t('pattern.stepLengthHint')}</span>
        </div>

        <SequencerGrid
          onChangeStep={(index, step) =>
            setPattern((current) => setFm1PatternStep(current, index, step))
          }
          pattern={pattern}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPattern(createFm1Pattern(pattern.loopLength))}
            type="button"
            variant="outline"
          >
            <Trash2 aria-hidden="true" />
            <span>{t('pattern.clear')}</span>
          </Button>
          <Button
            disabled={!midi.hasMidiOutput}
            onClick={() => {
              setResult(null)
              dialogRef.current?.showModal()
            }}
            ref={sendButtonRef}
            title={
              !midi.midiAccess
                ? tShell('midi.switchOnFirst')
                : !midi.hasMidiOutput
                  ? tShell('midi.chooseOutput')
                  : undefined
            }
            type="button"
          >
            <Send aria-hidden="true" />
            <span>{t('send.button')}</span>
          </Button>
        </div>

        {result ? (
          <div className="grid gap-1 text-sm" role="status">
            {result.outcome === 'no-output' ? <p>{t('send.noOutput')}</p> : null}
            {result.outcome === 'invalid' ? <p>{t('send.invalid')}</p> : null}
            {result.outcome === 'sent' ? (
              <>
                <p>{t('send.sent', { steps: result.stepsSent, total: result.stepCount })}</p>
                <p>{t('send.unsaved')}</p>
              </>
            ) : null}
            {result.outcome === 'cancelled' ? (
              <p>{t('send.cancelled', { steps: result.stepsSent, total: result.stepCount })}</p>
            ) : null}
            {result.outcome === 'interrupted' ? (
              <p>{t('send.interrupted', { steps: result.stepsSent, total: result.stepCount })}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="crt-raised grid gap-3 bg-card p-4">
        <h3 className="text-sm tracking-[0.12em]">{t('listen.heading')}</h3>
        <p className="text-xs text-[var(--crt-ink-3)]">{t('listen.hint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!midi.hasMidiInput}
            onClick={() => {
              setObservation(null)
              setListening((current) => !current)
            }}
            title={
              !midi.midiAccess
                ? tShell('midi.switchOnFirst')
                : !midi.hasMidiInput
                  ? tShell('midi.chooseInput')
                  : undefined
            }
            type="button"
            variant={listening ? 'default' : 'secondary'}
          >
            <Ear aria-hidden="true" />
            <span>{listening ? t('listen.stop') : t('listen.start')}</span>
          </Button>
          {heardPattern ? (
            <Button
              onClick={() => {
                setPattern(heardPattern)
                setObservation(null)
                setListening(false)
              }}
              type="button"
              variant="outline"
            >
              {t('listen.use')}
            </Button>
          ) : null}
        </div>

        <div aria-live="polite" className="grid gap-1 text-sm">
          {listening && !observation ? <p>{t('listen.waiting')}</p> : null}
          {observation?.status === 'incomplete' ? (
            <p>
              {observation.problem === 'too-few-notes'
                ? t('listen.problem.tooFewNotes')
                : observation.problem === 'no-repeat'
                  ? t('listen.problem.noRepeat')
                  : observation.problem === 'inconsistent-passes'
                    ? t('listen.problem.inconsistentPasses')
                    : observation.problem === 'loop-length-unresolved'
                      ? t('listen.problem.loopLengthUnresolved')
                      : t('listen.problem.offGrid')}
            </p>
          ) : null}
          {observation?.status === 'observed' ? (
            <>
              <p>
                {t('listen.heard', {
                  count: observation.pattern.loopLength,
                  passes: observation.passes,
                })}
              </p>
              <p className="text-[var(--crt-ink-3)]">{t('listen.rotation')}</p>
              <ol className="font-vt323 flex flex-wrap gap-2 text-base">
                {observation.pattern.steps.map((step, index) => (
                  <li key={index}>{step.kind === 'note' ? midiNoteName(step.pitch) : '·'}</li>
                ))}
              </ol>
            </>
          ) : null}
          {comparison === 'match' ? <p>{t('listen.match')}</p> : null}
          {comparison === 'mismatch' ? (
            <p className="text-destructive">{t('listen.mismatch')}</p>
          ) : null}
        </div>
      </div>

      <SequencerSendDialog
        dialogRef={dialogRef}
        onCancel={closeDialog}
        onConfirm={() => void send()}
        sending={sending}
        stepCount={pattern.steps.length}
        stepsSent={stepsSent}
      />
    </section>
  )
}
