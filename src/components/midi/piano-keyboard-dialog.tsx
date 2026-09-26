import { ChevronLeft, ChevronRight, GripHorizontal, X } from 'lucide-react'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PhraseTransport } from '@/components/midi/phrase-transport'
import { PianoKeyButton } from '@/components/midi/piano-key'
import { useKeyboardKeyLabel } from '@/hooks/use-keyboard-key-label'
import type { MidiController } from '@/hooks/use-midi'
import {
  defaultAuditionPhraseId,
  findAuditionPhrase,
  maxPhraseTempo,
  minPhraseTempo,
} from '@/lib/audition-phrases'
import { createPhrasePlayer } from '@/lib/phrase-player'
import {
  makePianoKeys,
  mapComputerPianoKeys,
  octaveDownKeyCode,
  octaveUpKeyCode,
  PIANO_KEY_WIDTH,
  type PianoKey,
} from '@/lib/piano-keyboard'

type PianoKeyboardDialogProps = {
  midi: Pick<
    MidiController,
    | 'channel'
    | 'hasMidiOutput'
    | 'logAuditionPhrase'
    | 'midiPanicCount'
    | 'selectedOutputId'
    | 'startNote'
    | 'stopNote'
  >
  onClose: () => void
  open: boolean
  triggerRef: RefObject<HTMLButtonElement | null>
}

export function PianoKeyboardDialog({ midi, onClose, open, triggerRef }: PianoKeyboardDialogProps) {
  const { t } = useTranslation()
  const keyLabel = useKeyboardKeyLabel()
  const {
    midiPanicCount,
    channel,
    hasMidiOutput,
    logAuditionPhrase,
    selectedOutputId,
    startNote: sendMidiNoteOn,
    stopNote: sendMidiNoteOff,
  } = midi
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const activeNotesRef = useRef<Set<number>>(new Set())
  const activeComputerKeysRef = useRef<Map<string, number>>(new Map())
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [baseOctave, setBaseOctave] = useState(3)
  const [phraseId, setPhraseId] = useState(defaultAuditionPhraseId)
  const [tempo, setTempo] = useState(
    () => findAuditionPhrase(defaultAuditionPhraseId)?.tempo ?? minPhraseTempo,
  )
  const [playingPhraseId, setPlayingPhraseId] = useState<string | null>(null)
  const [phraseNotes, setPhraseNotes] = useState<ReadonlySet<number>>(() => new Set())
  const [dialogPosition, setDialogPosition] = useState<{
    left: number
    top: number
  } | null>(null)

  const { blackKeys, whiteKeys } = useMemo(() => makePianoKeys(baseOctave), [baseOctave])

  const computerKeys = useMemo(
    () => mapComputerPianoKeys([...whiteKeys, ...blackKeys]),
    [blackKeys, whiteKeys],
  )

  /** A key lights whether the phrase is playing it or the player is. */
  const soundingNotes = useMemo(
    () => new Set([...activeNotes, ...phraseNotes]),
    [activeNotes, phraseNotes],
  )

  useEffect(() => {
    const dialog = dialogRef.current

    if (open && dialog && !dialog.open) {
      setDialogPosition(null)
      dialog.show()
    }
  }, [open])

  const playNote = useCallback(
    (key: PianoKey) => {
      if (activeNotesRef.current.has(key.note)) {
        return
      }

      activeNotesRef.current.add(key.note)
      setActiveNotes(new Set(activeNotesRef.current))
      sendMidiNoteOn(key.note, key.label)
    },
    [sendMidiNoteOn],
  )

  const releaseNote = useCallback(
    (note: number) => {
      if (!activeNotesRef.current.has(note)) {
        return
      }

      activeNotesRef.current.delete(note)
      setActiveNotes(new Set(activeNotesRef.current))
      sendMidiNoteOff(note)
    },
    [sendMidiNoteOff],
  )

  const releaseAllNotes = useCallback(() => {
    activeNotesRef.current.forEach((note) => sendMidiNoteOff(note))
    activeNotesRef.current = new Set()
    activeComputerKeysRef.current = new Map()
    setActiveNotes(new Set())
  }, [sendMidiNoteOff])

  // The route the phrase is playing on: the output and channel, and the controller's note
  // functions that reach them. The player always sends through this route's functions, so its
  // notes are released where they were struck.
  const noteRouteRef = useRef({
    channel,
    hasMidiOutput,
    outputId: selectedOutputId,
    sendMidiNoteOff,
    sendMidiNoteOn,
  })
  const playingPhraseRef = useRef<string | null>(null)

  const [player] = useState(() =>
    createPhrasePlayer({
      onActiveNotesChange: setPhraseNotes,
      startNote: (note, velocity) =>
        noteRouteRef.current.sendMidiNoteOn(note, `phrase note ${note}`, {
          quiet: true,
          velocity,
        }),
      stopNote: (note) => noteRouteRef.current.sendMidiNoteOff(note),
    }),
  )

  const stopPhrase = useCallback(() => {
    const playing = playingPhraseRef.current
    player.stop()
    playingPhraseRef.current = null
    setPlayingPhraseId(null)

    if (playing) {
      logAuditionPhrase(playing, 'stopped')
    }
  }, [logAuditionPhrase, player])

  const startPhrase = useCallback(
    (nextPhraseId: string, nextTempo: number) => {
      const phrase = findAuditionPhrase(nextPhraseId)

      if (!phrase) {
        return
      }

      const replaced = playingPhraseRef.current
      player.play(phrase, nextTempo)
      playingPhraseRef.current = phrase.id
      setPlayingPhraseId(phrase.id)

      if (replaced) {
        logAuditionPhrase(replaced, 'stopped')
      }
      logAuditionPhrase(phrase.id, 'started')
    },
    [logAuditionPhrase, player],
  )

  const togglePhrase = useCallback(() => {
    if (playingPhraseRef.current) {
      stopPhrase()
      return
    }

    startPhrase(phraseId, tempo)
  }, [phraseId, startPhrase, stopPhrase, tempo])

  /** Each phrase is written for its own tempo, so choosing one takes that tempo up with it. */
  const choosePhrase = useCallback(
    (nextPhraseId: string) => {
      const phrase = findAuditionPhrase(nextPhraseId)

      if (!phrase) {
        return
      }

      setPhraseId(phrase.id)
      setTempo(phrase.tempo)

      if (playingPhraseRef.current) {
        startPhrase(phrase.id, phrase.tempo)
      }
    },
    [startPhrase],
  )

  const changeTempo = useCallback(
    (nextTempo: number) => {
      if (!Number.isFinite(nextTempo)) {
        return
      }

      const bounded = Math.min(maxPhraseTempo, Math.max(minPhraseTempo, Math.round(nextTempo)))
      setTempo(bounded)
      player.setTempo(bounded)
    },
    [player],
  )

  // A phrase never moves to another output or channel, so a change of either stops it. While the
  // old output is still there, its notes are released through the old route before the new one
  // takes over; an output that has gone has nowhere to release them.
  useEffect(() => {
    const route = noteRouteRef.current
    const nextRoute = {
      channel,
      hasMidiOutput,
      outputId: selectedOutputId,
      sendMidiNoteOff,
      sendMidiNoteOn,
    }
    const routeChanged =
      route.channel !== channel ||
      route.outputId !== selectedOutputId ||
      (route.hasMidiOutput && !hasMidiOutput)

    if (routeChanged && hasMidiOutput) {
      stopPhrase()
    }

    noteRouteRef.current = nextRoute

    if (routeChanged && !hasMidiOutput) {
      stopPhrase()
    }
  }, [channel, hasMidiOutput, selectedOutputId, sendMidiNoteOff, sendMidiNoteOn, stopPhrase])

  // After a MIDI panic, the phrase must not strike the released notes again, and no key may stay
  // lit for a note the FM1 has already released.
  const midiPanicRef = useRef(midiPanicCount)

  useEffect(() => {
    if (midiPanicRef.current === midiPanicCount) {
      return
    }

    midiPanicRef.current = midiPanicCount
    releaseAllNotes()
    stopPhrase()
  }, [midiPanicCount, releaseAllNotes, stopPhrase])

  useEffect(() => () => player.stop(), [player])

  const closeKeyboard = useCallback(() => {
    releaseAllNotes()
    stopPhrase()
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }, [releaseAllNotes, stopPhrase, triggerRef])

  const shiftOctave = useCallback(
    (direction: -1 | 1) => {
      releaseAllNotes()
      setBaseOctave((current) => Math.min(5, Math.max(1, current + direction)))
    },
    [releaseAllNotes],
  )

  useEffect(() => {
    window.addEventListener('blur', releaseAllNotes)
    return () => {
      window.removeEventListener('blur', releaseAllNotes)
      releaseAllNotes()
    }
  }, [releaseAllNotes])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    }

    // A dialog opened over the keyboard owns key presses until it closes.
    function isCoveredByAnotherDialog() {
      return Array.from(document.querySelectorAll('dialog[open]')).some(
        (dialog) => dialog !== dialogRef.current,
      )
    }

    function releaseComputerKeyNotes() {
      activeComputerKeysRef.current.forEach((note) => releaseNote(note))
      activeComputerKeysRef.current = new Map()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        !dialogRef.current?.open ||
        isEditableTarget(event.target) ||
        isCoveredByAnotherDialog()
      ) {
        return
      }

      // Modified presses belong to the browser and the view's shortcuts. macOS
      // also drops the key-up of a letter released while Command is held, so a
      // held note is released here rather than left sounding.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        releaseComputerKeyNotes()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        closeKeyboard()
        return
      }

      // Matched by position, not by the letter typed, so every layout keeps the two-row piano.
      const key = event.code

      if (key === octaveDownKeyCode) {
        event.preventDefault()
        shiftOctave(-1)
        return
      }

      if (key === octaveUpKeyCode) {
        event.preventDefault()
        shiftOctave(1)
        return
      }

      if (event.repeat || activeComputerKeysRef.current.has(key)) {
        return
      }

      const pianoKey = computerKeys.get(key)

      if (!pianoKey) {
        return
      }

      event.preventDefault()
      activeComputerKeysRef.current.set(key, pianoKey.note)
      playNote(pianoKey)
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.code
      const note = activeComputerKeysRef.current.get(key)

      if (!note) {
        return
      }

      event.preventDefault()
      activeComputerKeysRef.current.delete(key)
      releaseNote(note)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [closeKeyboard, computerKeys, playNote, releaseNote, shiftOctave])

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    const rect = dialog.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    setDialogPosition({ left: rect.left, top: rect.top })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDialog(event: React.PointerEvent<HTMLDivElement>) {
    const offset = dragOffsetRef.current
    const dialog = dialogRef.current

    if (!offset || !dialog) {
      return
    }

    const rect = dialog.getBoundingClientRect()
    const left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, event.clientX - offset.x))
    const top = Math.min(
      window.innerHeight - rect.height - 8,
      Math.max(8, event.clientY - offset.y),
    )

    setDialogPosition({ left, top })
  }

  function stopDrag() {
    dragOffsetRef.current = null
  }

  return (
    <dialog
      aria-label={t('ui.pianoKeyboard')}
      className="synthwave-keyboard fixed inset-0 z-50 m-auto max-h-[calc(100svh-1rem)] w-[min(1010px,calc(100vw-1rem))] overflow-auto rounded-xl bg-card p-0 whitespace-normal text-card-foreground"
      data-plain-keys-only
      onCancel={() => {
        releaseAllNotes()
        stopPhrase()
      }}
      onClose={() => {
        releaseAllNotes()
        stopPhrase()
        onClose()
      }}
      ref={dialogRef}
      style={
        dialogPosition
          ? {
              inset: 'auto',
              left: `${dialogPosition.left}px`,
              margin: 0,
              top: `${dialogPosition.top}px`,
            }
          : undefined
      }
    >
      <div
        aria-label={t('ui.dragKeyboard')}
        className="synthwave-keyboard-header flex min-h-12 cursor-move touch-none flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5 select-none"
        onPointerCancel={stopDrag}
        onPointerDown={startDrag}
        onPointerMove={moveDialog}
        onPointerUp={stopDrag}
      >
        <div className="flex shrink-0 items-center gap-3">
          <GripHorizontal className="size-5 opacity-60" />
          <div className="flex items-baseline gap-2.5">
            <span className="text-xs font-extrabold tracking-[0.24em]">{t('ui.performance')}</span>
            <span className="text-[0.62rem] font-bold tracking-[0.2em] opacity-70">
              {t('ui.keyboard').toUpperCase()}
            </span>
          </div>
        </div>
        {/* The transport shares the drag handle, so using it must not start a drag. Where the
            header is too narrow for it, it takes a row of its own below the title. */}
        <div
          className="order-last flex basis-full cursor-auto justify-end lg:order-none lg:flex-1 lg:basis-auto"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <PhraseTransport
            onPhraseChange={choosePhrase}
            onTempoChange={changeTempo}
            onToggle={togglePhrase}
            phraseId={phraseId}
            playing={playingPhraseId !== null}
            tempo={tempo}
          />
        </div>
        <Button
          aria-label={t('ui.closeKeyboard')}
          autoFocus
          onClick={closeKeyboard}
          onPointerDown={(event) => event.stopPropagation()}
          size="icon"
          type="button"
          variant="bare"
          className="ml-auto text-current hover:bg-black/10 hover:text-current lg:ml-0"
        >
          <X />
        </Button>
      </div>

      <div className="synthwave-keyboard-stage overflow-x-auto p-4">
        <div
          className="grid items-stretch gap-3"
          style={{
            gridTemplateColumns: `56px ${whiteKeys.length * PIANO_KEY_WIDTH}px 56px`,
            width: `${whiteKeys.length * PIANO_KEY_WIDTH + 136}px`,
          }}
        >
          <OctaveButton
            direction="down"
            disabled={baseOctave <= 1}
            keyboardKey={keyLabel(octaveDownKeyCode)}
            onClick={() => shiftOctave(-1)}
          />

          <div className="synthwave-keybed relative h-56 overflow-hidden rounded-lg px-2 pt-2 pb-3">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[color-mix(in_srgb,var(--fm1-accent)_20%,transparent)] to-transparent" />
            <div className="grid h-full grid-cols-[repeat(15,56px)]">
              {whiteKeys.map((key) => (
                <PianoKeyButton
                  computerKeyLabel={key.computerKeyCode ? keyLabel(key.computerKeyCode) : undefined}
                  isActive={soundingNotes.has(key.note)}
                  key={key.note}
                  noteKey={key}
                  onStart={playNote}
                  onStop={releaseNote}
                />
              ))}
            </div>

            {blackKeys.map((key) => (
              <PianoKeyButton
                computerKeyLabel={key.computerKeyCode ? keyLabel(key.computerKeyCode) : undefined}
                isActive={soundingNotes.has(key.note)}
                key={key.note}
                noteKey={key}
                onStart={playNote}
                onStop={releaseNote}
              />
            ))}
          </div>

          <OctaveButton
            direction="up"
            disabled={baseOctave >= 5}
            keyboardKey={keyLabel(octaveUpKeyCode)}
            onClick={() => shiftOctave(1)}
          />
        </div>
      </div>
    </dialog>
  )
}

type OctaveButtonProps = {
  direction: 'down' | 'up'
  disabled: boolean
  keyboardKey: string
  onClick: () => void
}

function OctaveButton({ direction, disabled, keyboardKey, onClick }: OctaveButtonProps) {
  const { t } = useTranslation()
  const Icon = direction === 'down' ? ChevronLeft : ChevronRight

  return (
    <button
      aria-label={t('ui.shiftOctave', {
        direction: t(`ui.direction${direction === 'down' ? 'Down' : 'Up'}`),
      })}
      className="synthwave-octave-button group flex min-h-56 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="flex flex-col items-center gap-2">
        <Icon className="size-7 opacity-80 transition group-hover:opacity-100" />
        <span className="synthwave-key-hint rounded px-1.5 py-0.5 text-xs">{keyboardKey}</span>
      </span>
    </button>
  )
}
