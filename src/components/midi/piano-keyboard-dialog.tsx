import { ChevronLeft, ChevronRight, GripHorizontal, X } from 'lucide-react'
import { type MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PianoKeyButton } from '@/components/midi/piano-key'
import { type MidiController } from '@/hooks/use-midi'
import {
  makePianoKeys,
  mapComputerPianoKeys,
  PIANO_KEY_WIDTH,
  type PianoKey,
} from '@/lib/piano-keyboard'

type PianoKeyboardDialogProps = {
  midi: MidiController
}

function PianoKeysIcon() {
  return (
    <svg aria-hidden="true" className="!h-4 !w-6" fill="none" viewBox="0 0 30 20">
      <rect fill="white" height="18" rx="1.5" stroke="currentColor" width="28" x="1" y="1" />
      <path d="M10.3 1v18M19.7 1v18" stroke="currentColor" />
      <path d="M7.8 1h5v10h-5zM17.2 1h5v10h-5z" fill="currentColor" />
    </svg>
  )
}

export function PianoKeyboardDialog({ midi }: PianoKeyboardDialogProps) {
  const { t } = useTranslation()
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

  function openDialog() {
    const dialog = dialogRef.current

    if (dialog && !dialog.open) {
      setDialogPosition(null)
      dialog.show()
    }
  }

  function closeDialog() {
    releaseAllNotes()
    dialogRef.current?.close()
  }

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

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current?.open || isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()
        shiftOctave(-1)
        return
      }

      if (key === 'x') {
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
      const key = event.key.toLowerCase()
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
  }, [computerKeys, playNote, releaseNote, shiftOctave])

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

  function startMouseDrag(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || dragOffsetRef.current) {
      return
    }

    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    const rect = dialog.getBoundingClientRect()
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    setDialogPosition({ left: rect.left, top: rect.top })

    const moveDialogWithMouse = (moveEvent: MouseEvent) => {
      const currentRect = dialog.getBoundingClientRect()
      const left = Math.min(
        window.innerWidth - currentRect.width - 8,
        Math.max(8, moveEvent.clientX - offset.x),
      )
      const top = Math.min(
        window.innerHeight - currentRect.height - 8,
        Math.max(8, moveEvent.clientY - offset.y),
      )

      setDialogPosition({ left, top })
    }

    const stopMouseDrag = () => {
      window.removeEventListener('mousemove', moveDialogWithMouse)
      window.removeEventListener('mouseup', stopMouseDrag)
    }

    window.addEventListener('mousemove', moveDialogWithMouse)
    window.addEventListener('mouseup', stopMouseDrag)
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
    <>
      <Button
        className="font-vt323 ml-auto"
        disabled={!midi.hasMidiOutput}
        onClick={openDialog}
        title={!midi.hasMidiOutput ? t('midi.connectFirst') : undefined}
        type="button"
        variant="secondary"
      >
        <PianoKeysIcon />
        {t('ui.keyboard')}
      </Button>

      <dialog
        aria-label={t('ui.pianoKeyboard')}
        className="synthwave-keyboard fixed inset-0 z-50 m-auto max-h-[calc(100svh-1rem)] w-[min(1010px,calc(100vw-1rem))] overflow-auto rounded-xl bg-white p-0 whitespace-normal text-card-foreground"
        onCancel={releaseAllNotes}
        onClose={releaseAllNotes}
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
          onMouseDown={startMouseDrag}
        >
          <div className="flex items-center gap-3">
            <GripHorizontal className="size-5 opacity-60" />
            <div className="flex items-baseline gap-2.5">
              <span className="text-xs font-extrabold tracking-[0.24em]">
                {t('ui.performance')}
              </span>
              <span className="text-[0.62rem] font-bold tracking-[0.2em] opacity-70">
                {t('ui.keyboard').toUpperCase()}
              </span>
            </div>
          </div>
          <Button
            aria-label={t('ui.closeKeyboard')}
            autoFocus
            onClick={closeDialog}
            onMouseDown={(event) => event.stopPropagation()}
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
              keyboardKey="Z"
              onClick={() => shiftOctave(-1)}
            />

            <div className="synthwave-keybed relative h-56 overflow-hidden rounded-lg px-2 pt-2 pb-3">
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[color-mix(in_srgb,var(--fm1-accent)_20%,transparent)] to-transparent" />
              <div className="grid h-full grid-cols-[repeat(15,56px)]">
                {whiteKeys.map((key) => (
                  <PianoKeyButton
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
              keyboardKey="X"
              onClick={() => shiftOctave(1)}
            />
          </div>
        </div>
      </dialog>
    </>
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
