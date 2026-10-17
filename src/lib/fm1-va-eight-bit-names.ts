/**
 * The names an 8-Bit preset's lists show on the FM1, in the order of the values the engine reads,
 * as Baud Girl's Device Manager takes them from the firmware's `chip_names.h` (`app/chipnames.js`,
 * app build `ae8aabc48d56ccd3`, read 2026-10-17). The editor shows them as the FM1 prints them, in
 * every language, so its lists match the FM1's screen. The firmware marks the Arp Speed names, the
 * built-in Arpeggios, and the Duty Sequence names as not yet agreed, so a later release may rename
 * them without moving a value.
 */
export const eightBitWaveNames = [
  'Pulse 12.5',
  'Pulse 25',
  'Pulse 50',
  'Pulse 75',
  'Triangle',
  'Noise',
  'Metal',
  'GB Saw',
  'GB Sine',
  'GB Half',
  'GB Organ',
  'GB Twin',
  'GB Bass',
  'GB Bell',
  'GB Buzz',
] as const

/** The waves a Duty Sequence plays through: it changes the sound only on these four. */
export const eightBitPulseWaveCount = 4

export const eightBitArpeggioNames = [
  'Off',
  'Major',
  'Minor',
  'Major 8',
  'Minor 8',
  'Octave',
  '2 Octaves',
  'Fifth',
  'Fifth 8',
  'Sus 4',
  'Sus 2',
  'Dim',
  'Aug',
  'Major 7',
  'Minor 7',
  'Dom 7',
  'Major 6',
  'Minor 6',
  'Major Down',
  'Minor Down',
  'Major Up Down',
  'Minor Up Down',
  'Trill 1',
  'Trill 2',
  'Trill 3',
  'Trill 4',
  'Fourth',
  'Octave Down',
  'Power',
  'Major Wide',
  'Minor Wide',
  'Bounce',
  'User',
] as const

export const eightBitDutySequenceNames = [
  'Off',
  '12/25',
  '25/50',
  '12/50',
  'Sweep',
  'Wobble',
  'Slow Wobble',
  'Pluck 50>25',
  'Pluck 12>50',
  'Thin Out',
  'Fatten',
  '25/75',
  'Fast Sweep',
  'Slow 12/25',
  'Slow 25/50',
] as const

export const eightBitArpSpeedNames = [
  '1/8',
  '1/8T',
  '1/16',
  '1/16T',
  '1/32',
  '1/32T',
  '1/64T',
] as const

/** The twelve drums' keys, F0 to E1, on MIDI notes 17–28. */
export const eightBitDrumKeys = [
  'F0',
  'F#0',
  'G0',
  'G#0',
  'A0',
  'A#0',
  'B0',
  'C1',
  'C#1',
  'D1',
  'D#1',
  'E1',
] as const

export const eightBitKeyNames = [
  'Off',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export const eightBitScaleNames = [
  'Major',
  'Minor',
  'H. Minor Pract',
  'H. Minor Strict',
  'Dorian',
  'Mixolydian',
  'Phrygian',
  'Lydian',
  'Melodic Minor',
] as const

export const eightBitChordNames = [
  'Triad',
  'Seventh',
  'Sixth',
  'Sus 2',
  'Sus 4',
  'Add 9',
  'Power',
] as const

export const eightBitPatternNames = [
  'Off',
  'Up',
  'Down',
  'Up Down',
  'Up 8',
  'Down 8',
  'Up Down 8',
  'Wide',
  'Alberti',
  'Pedal',
  'Octave',
  'Octave Down',
  'Two Octaves',
  'Bounce',
  'Gallop',
  'Plink',
  'Trill',
  'User',
] as const

/** The Pattern whose notes the User Arpeggio's steps choose, so its Chord is not played. */
export const eightBitUserPattern = eightBitPatternNames.length - 1

export const eightBitChokeNames = ['Off', 'A', 'B', 'C'] as const

/** The two choices of each two-way setting, as the FM1 lists them. */
export const eightBitAccidentalsNames = ['Borrowed', 'Leading'] as const
export const eightBitVoicingNames = ['From Key', 'Close'] as const
export const eightBitLeadFollowsNames = ['Off', 'Bass'] as const
export const eightBitArpSyncNames = ['Key', 'Beat'] as const
export const eightBitToneNames = ['Raw', 'Smooth'] as const
export const eightBitTuningNames = ['Exact', 'Chip'] as const
export const eightBitNoteEngineNames = ['Auto-Arp', 'Auto-Chord'] as const

/** What a User Arpeggio step shows once the arpeggio ends there. */
export const eightBitUserArpeggioEnd = 'End'
