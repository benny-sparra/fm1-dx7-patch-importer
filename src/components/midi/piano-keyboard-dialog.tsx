import { ChevronLeft, ChevronRight, GripHorizontal, X } from 'lucide-react'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PianoKeyButton } from '@/components/midi/piano-key'
import { useKeyboardKeyLabel } from '@/hooks/use-keyboard-key-label'
import { type MidiController } from '@/hooks/use-midi'
import {
  makePianoKeys,
  mapComputerPianoKeys,
  octaveDownKeyCode,
  octaveUpKeyCode,
  PIANO_KEY_WIDTH,
  type PianoKey,
} from '@/lib/piano-keyboard'

type PianoKeyboardDialogProps = {
  midi: MidiController
  onClose: () => void
  open: boolean
  triggerRef: RefObject<HTMLButtonElement | null>
}

export function PianoKeyboardDialog({ midi, onClose, open, triggerRef }: PianoKeyboardDialogProps) {
  const { t } = useTranslation()
  const keyLabel = useKeyboardKeyLabel()
  const { startNote: sendMidiNoteOn, stopNote: sendMidiNoteOff } = midi
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const activeNotesRef = useRef<Set<number>>(new Set())
  const activeComputerKeysRef = useRef<Map<string, number>>(new Map())
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [baseOctave, setBaseOctave] = useState(3)
  const [dialogPosition, setDialogPosition] = useState<{
    left: number
    top: number
  } | null>(null)

  const { blackKeys, whiteKeys } = useMemo(() => makePianoKeys(baseOctave), [baseOctave])

  const computerKeys = useMemo(
    () => mapComputerPianoKeys([...whiteKeys, ...blackKeys]),
    [blackKeys, whiteKeys],
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

  const closeKeyboard = useCallback(() => {
    releaseAllNotes()
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }, [releaseAllNotes, triggerRef])

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
      onCancel={releaseAllNotes}
      onClose={() => {
        releaseAllNotes()
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
        className="synthwave-keyboard-header flex h-12 cursor-move touch-none items-center justify-between px-4"
        onPointerCancel={stopDrag}
        onPointerDown={startDrag}
        onPointerMove={moveDialog}
        onPointerUp={stopDrag}
      >
        <div className="flex items-center gap-3">
          <GripHorizontal className="size-5 opacity-60" />
          <div className="flex items-baseline gap-2.5">
            <span className="text-xs font-extrabold tracking-[0.24em]">{t('ui.performance')}</span>
            <span className="text-[0.62rem] font-bold tracking-[0.2em] opacity-70">
              {t('ui.keyboard').toUpperCase()}
            </span>
          </div>
        </div>
        <Button
          aria-label={t('ui.closeKeyboard')}
          autoFocus
          onClick={closeKeyboard}
          onPointerDown={(event) => event.stopPropagation()}
          size="icon"
          type="button"
          variant="ghost"
          className="text-current hover:bg-black/10 hover:text-current"
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
                  isActive={activeNotes.has(key.note)}
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
                isActive={activeNotes.has(key.note)}
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
