export type PianoKey = {
  /** The physical key that plays this note, as `KeyboardEvent.code`. */
  computerKeyCode?: string
  label: string
  note: number
  kind: 'white' | 'black'
  position?: number
}

export const PIANO_KEY_WIDTH = 56

const whiteKeySteps = [0, 2, 4, 5, 7, 9, 11]
const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const blackKeyMap = [
  { name: 'C#', step: 1, position: 0 },
  { name: 'D#', step: 3, position: 1 },
  { name: 'F#', step: 6, position: 3 },
  { name: 'G#', step: 8, position: 4 },
  { name: 'A#', step: 10, position: 5 },
]
/*
  The note keys are chosen for where they sit, two rows like a piano, so they are matched by
  `KeyboardEvent.code` and keep their places on AZERTY, QWERTZ and other layouts.
*/
const computerKeyMap = [
  { code: 'KeyA', step: 0 },
  { code: 'KeyW', step: 1 },
  { code: 'KeyS', step: 2 },
  { code: 'KeyE', step: 3 },
  { code: 'KeyD', step: 4 },
  { code: 'KeyF', step: 5 },
  { code: 'KeyT', step: 6 },
  { code: 'KeyG', step: 7 },
  { code: 'KeyY', step: 8 },
  { code: 'KeyH', step: 9 },
  { code: 'KeyU', step: 10 },
  { code: 'KeyJ', step: 11 },
  { code: 'KeyK', step: 12 },
]

export const octaveDownKeyCode = 'KeyZ'
export const octaveUpKeyCode = 'KeyX'

/** Whether a MIDI note falls on a black key, so a keyboard or a grid can draw it as one. */
export function isBlackKey(note: number) {
  return blackKeyMap.some((key) => key.step === ((note % 12) + 12) % 12)
}

/** The letter a physical key carries on a QWERTY keyboard, such as `A` for `KeyA`. */
export function qwertyKeyLabel(code: string) {
  return code.replace(/^Key/, '')
}

export function makePianoKeys(baseOctave: number) {
  const baseNote = (baseOctave + 1) * 12
  const whiteKeys = Array.from({ length: 15 }, (_, index): PianoKey => {
    const octaveOffset = Math.floor(index / 7)
    const noteIndex = index % 7
    const octave = baseOctave + octaveOffset
    const note = (octave + 1) * 12 + whiteKeySteps[noteIndex]

    return {
      computerKeyCode: computerKeyMap.find((mapping) => mapping.step === note - baseNote)?.code,
      kind: 'white',
      label: `${whiteKeyNames[noteIndex]}${octave}`,
      note,
    }
  })

  const blackKeys = [0, 1].flatMap((octaveOffset) => {
    const octave = baseOctave + octaveOffset
    return blackKeyMap.map((key): PianoKey => ({
      computerKeyCode: computerKeyMap.find(
        (mapping) => mapping.step === (octave + 1) * 12 + key.step - baseNote,
      )?.code,
      kind: 'black',
      label: `${key.name}${octave}`,
      note: (octave + 1) * 12 + key.step,
      position: key.position + octaveOffset * 7,
    }))
  })

  return { blackKeys, whiteKeys }
}

export function mapComputerPianoKeys(keys: readonly PianoKey[]) {
  return keys.reduce((mapping, key) => {
    if (key.computerKeyCode) mapping.set(key.computerKeyCode, key)
    return mapping
  }, new Map<string, PianoKey>())
}
