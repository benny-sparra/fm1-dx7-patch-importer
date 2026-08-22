export type PianoKey = {
  computerKey?: string
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

export function makePianoKeys(baseOctave: number) {
  const baseNote = (baseOctave + 1) * 12
  const whiteKeys = Array.from({ length: 15 }, (_, index): PianoKey => {
    const octaveOffset = Math.floor(index / 7)
    const noteIndex = index % 7
    const octave = baseOctave + octaveOffset
    const note = (octave + 1) * 12 + whiteKeySteps[noteIndex]

    return {
      computerKey: computerKeyMap.find((mapping) => mapping.step === note - baseNote)?.key,
      kind: 'white',
      label: `${whiteKeyNames[noteIndex]}${octave}`,
      note,
    }
  })

  const blackKeys = [0, 1].flatMap((octaveOffset) => {
    const octave = baseOctave + octaveOffset
    return blackKeyMap.map((key): PianoKey => ({
      computerKey: computerKeyMap.find(
        (mapping) => mapping.step === (octave + 1) * 12 + key.step - baseNote,
      )?.key,
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
    if (key.computerKey) mapping.set(key.computerKey, key)
    return mapping
  }, new Map<string, PianoKey>())
}
