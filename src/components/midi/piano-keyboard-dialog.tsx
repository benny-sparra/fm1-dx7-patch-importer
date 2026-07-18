import { ChevronLeft, ChevronRight, GripHorizontal, X } from 'lucide-react'
import { motion } from 'motion/react'
import { type MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type MidiController } from '@/hooks/use-midi'

type PianoKeyboardDialogProps = {
  midi: MidiController
}

function PianoKeysIcon() {
  return (
    <svg
      aria-hidden="true"
      className="!h-4 !w-6"
      fill="none"
      viewBox="0 0 30 20"
    >
      <rect fill="white" height="18" rx="1.5" stroke="currentColor" width="28" x="1" y="1" />
      <path d="M10.3 1v18M19.7 1v18" stroke="currentColor" />
      <path d="M7.8 1h5v10h-5zM17.2 1h5v10h-5z" fill="currentColor" />
    </svg>
  )
}

type PianoKey = {
  computerKey?: string
  label: string
  note: number
  kind: 'white' | 'black'
  position?: number
}

const keyWidth = 56
const whiteKeySteps = [0, 2, 4, 5, 7, 9, 11]
const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const blackKeyMap = [
  { name: 'C#', step: 1, position: 0 },
  { name: 'D#', step: 3, position: 1 },
  { name: 'F#', step: 6, position: 3 },
  { name: 'G#', step: 8, position: 4 },
  { name: 'A#', step: 10, position: 5 },
]
const computerKeyMap = [
  { key: 'a', step: 0 },
  { key: 'w', step: 1 },
  { key: 's', step: 2 },
  { key: 'e', step: 3 },
  { key: 'd', step: 4 },
  { key: 'f', step: 5 },
  { key: 't', step: 6 },
  { key: 'g', step: 7 },
  { key: 'y', step: 8 },
  { key: 'h', step: 9 },
  { key: 'u', step: 10 },
  { key: 'j', step: 11 },
  { key: 'k', step: 12 },
]

function makeKeys(baseOctave: number) {
  const whiteKeys = Array.from({ length: 15 }, (_, index): PianoKey => {
    const octaveOffset = Math.floor(index / 7)
    const noteIndex = index % 7
    const octave = baseOctave + octaveOffset

    const note = (octave + 1) * 12 + whiteKeySteps[noteIndex]

    return {
      computerKey: computerKeyMap.find(
        (mapping) => mapping.step === note - (baseOctave + 1) * 12,
      )?.key,
      kind: 'white',
      label: `${whiteKeyNames[noteIndex]}${octave}`,
      note,
    }
  })

  const blackKeys = [0, 1].flatMap((octaveOffset) => {
    const octave = baseOctave + octaveOffset

    return blackKeyMap.map(
      (key): PianoKey => ({
        kind: 'black',
        label: `${key.name}${octave}`,
        computerKey: computerKeyMap.find(
          (mapping) =>
            mapping.step === (octave + 1) * 12 + key.step - (baseOctave + 1) * 12,
        )?.key,
        note: (octave + 1) * 12 + key.step,
        position: key.position + octaveOffset * 7,
      }),
    )
  })

  return { blackKeys, whiteKeys }
}

export function PianoKeyboardDialog({ midi }: PianoKeyboardDialogProps) {
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

  const { blackKeys, whiteKeys } = useMemo(
    () => makeKeys(baseOctave),
    [baseOctave],
  )

  const computerKeys = useMemo(
    () =>
      [...whiteKeys, ...blackKeys].reduce((keys, key) => {
        if (key.computerKey) {
          keys.set(key.computerKey, key)
        }

        return keys
      }, new Map<string, PianoKey>()),
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
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]'),
      )
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
    const left = Math.min(
      window.innerWidth - rect.width - 8,
      Math.max(8, event.clientX - offset.x),
    )
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
        className="ml-auto"
        disabled={!midi.hasMidiOutput}
        onClick={openDialog}
        title={!midi.hasMidiOutput ? 'Connect a MIDI output first' : undefined}
        type="button"
        variant="secondary"
      >
        <PianoKeysIcon />
        Keyboard
      </Button>

      <dialog
        aria-label="Piano keyboard"
        className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-1rem)] w-[min(1040px,calc(100vw-1rem))] overflow-hidden rounded-lg border border-primary/30 bg-[#151722] p-0 text-card-foreground shadow-2xl"
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
          aria-label="Drag keyboard"
          className="flex h-10 cursor-move touch-none items-center justify-between border-b border-white/10 bg-gradient-to-b from-[#303345] to-[#1d202d] px-3 text-white"
          onPointerCancel={stopDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDialog}
          onPointerUp={stopDrag}
          onMouseDown={startMouseDrag}
        >
          <GripHorizontal className="size-5 text-white/55" />
          <Button
            aria-label="Close keyboard"
            autoFocus
            onClick={closeDialog}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="overflow-x-auto p-4">
          <div
            className="grid items-stretch gap-3"
            style={{
              gridTemplateColumns: `56px ${whiteKeys.length * keyWidth}px 56px`,
              width: `${whiteKeys.length * keyWidth + 136}px`,
            }}
          >
            <OctaveButton
              direction="down"
              disabled={baseOctave <= 1}
              keyboardKey="Z"
              onClick={() => shiftOctave(-1)}
            />

            <div className="relative h-56 overflow-hidden rounded-md border border-black bg-[#0b0c11] px-2 pb-3 pt-2 shadow-inner">
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/12 to-transparent" />
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

function OctaveButton({
  direction,
  disabled,
  keyboardKey,
  onClick,
}: OctaveButtonProps) {
  const Icon = direction === 'down' ? ChevronLeft : ChevronRight

  return (
    <motion.button
      aria-label={`Shift octave ${direction}`}
      className="flex min-h-56 items-center justify-center rounded-md border border-black bg-gradient-to-b from-[#343746] to-[#12141d] text-white shadow-inner transition hover:from-[#3f4252] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
    >
      <span className="flex flex-col items-center gap-2">
        <Icon className="size-7" />
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
          {keyboardKey}
        </span>
      </span>
    </motion.button>
  )
}

type PianoKeyButtonProps = {
  isActive: boolean
  noteKey: PianoKey
  onStart: (key: PianoKey) => void
  onStop: (note: number) => void
}

function PianoKeyButton({
  isActive,
  noteKey,
  onStart,
  onStop,
}: PianoKeyButtonProps) {
  const isBlack = noteKey.kind === 'black'

  return (
    <motion.button
      aria-label={`Play ${noteKey.label}`}
      className={cn(
        'select-none touch-none border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isBlack
          ? 'absolute top-2 z-10 flex h-32 w-9 items-end justify-center rounded-b-[0.4rem] border-black bg-gradient-to-b from-[#2b2d33] via-[#111216] to-black pb-3 text-[0.7rem] text-white shadow-[inset_0_-8px_12px_rgb(255_255_255_/_0.08),0_5px_10px_rgb(0_0_0_/_0.45)] hover:from-[#383b43]'
          : 'relative flex h-52 items-end justify-center rounded-b-[0.45rem] border-x border-b border-[#b6bac8] bg-gradient-to-b from-white via-[#f8f8fb] to-[#d8dbe5] pb-4 text-xs text-[#20222d] shadow-[inset_0_-12px_18px_rgb(20_22_34_/_0.12)] hover:from-[#fff9df] hover:to-[#e9dfb8]',
        isActive &&
          (isBlack
            ? 'from-primary via-primary to-[#1b1b83]'
            : 'from-[#fff3b8] via-accent to-[#d4c46a]'),
      )}
      onKeyDown={(event) => {
        if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
          return
        }

        onStart(noteKey)
      }}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onStop(noteKey.note)
        }
      }}
      onPointerCancel={() => onStop(noteKey.note)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        onStart(noteKey)
      }}
      onPointerLeave={() => onStop(noteKey.note)}
      onPointerUp={() => onStop(noteKey.note)}
      style={
        isBlack
          ? {
              left: `${(noteKey.position ?? 0) * keyWidth + keyWidth - 10}px`,
            }
          : undefined
      }
      type="button"
      whileTap={{ y: isBlack ? 3 : 5 }}
    >
      <span className="flex flex-col items-center gap-1">
        {noteKey.computerKey ? (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[0.65rem] uppercase',
              isBlack ? 'bg-white/15 text-white/85' : 'bg-black/10 text-[#20222d]',
            )}
          >
            {noteKey.computerKey}
          </span>
        ) : null}
        <span>{noteKey.label}</span>
      </span>
    </motion.button>
  )
}
