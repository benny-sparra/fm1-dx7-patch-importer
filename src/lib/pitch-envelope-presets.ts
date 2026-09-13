/*
  Starting shapes for the global pitch envelope. Level 50 is the played
  pitch; the envelope rests at L4 between notes, so every shape keeps L4 at
  50 except the release fall, whose whole point is to leave the note there.
*/
export type PitchEnvelopePresetId = 'flat' | 'blipUp' | 'attackDrop' | 'scoop' | 'releaseFall'

type PitchEnvelopePreset = {
  id: PitchEnvelopePresetId
  levels: [number, number, number, number]
  rates: [number, number, number, number]
}

export const pitchEnvelopePresets: PitchEnvelopePreset[] = [
  { id: 'flat', rates: [99, 99, 99, 99], levels: [50, 50, 50, 50] },
  { id: 'blipUp', rates: [99, 80, 99, 99], levels: [58, 50, 50, 50] },
  { id: 'attackDrop', rates: [99, 55, 99, 99], levels: [74, 50, 50, 50] },
  { id: 'scoop', rates: [99, 50, 99, 99], levels: [42, 50, 50, 50] },
  { id: 'releaseFall', rates: [99, 99, 99, 55], levels: [50, 50, 50, 36] },
]
