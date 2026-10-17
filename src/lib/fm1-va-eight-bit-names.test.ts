import { describe, expect, it } from 'vitest'

import { eightBitKeyMarked, eightBitRow, type EightBitRowId } from '@/lib/fm1-va-eight-bit-editor'
import * as names from '@/lib/fm1-va-eight-bit-names'

describe('the FM1’s 8-Bit list names', () => {
  it('names every value of each list the editor shows', () => {
    const lists: [EightBitRowId, readonly string[]][] = [
      ['bassWave', names.eightBitWaveNames],
      ['drum0Wave', names.eightBitWaveNames],
      ['bassDutySequence', names.eightBitDutySequenceNames],
      ['bassArpeggio', names.eightBitArpeggioNames],
      ['bassArpSpeed', names.eightBitArpSpeedNames],
      ['bassChord', names.eightBitChordNames],
      ['bassPattern', names.eightBitPatternNames],
      ['scale', names.eightBitScaleNames],
      ['drum0Choke', names.eightBitChokeNames],
      ['accidentals', names.eightBitAccidentalsNames],
      ['voicing', names.eightBitVoicingNames],
      ['leadFollows', names.eightBitLeadFollowsNames],
      ['arpSync', names.eightBitArpSyncNames],
      ['tone', names.eightBitToneNames],
      ['tuning', names.eightBitTuningNames],
      ['bassNoteEngine', names.eightBitNoteEngineNames],
    ]
    for (const [id, list] of lists) {
      expect({ id, count: list.length }).toEqual({ id, count: eightBitRow(id).max + 1 })
      expect({ id, unique: new Set(list).size }).toEqual({ id, unique: list.length })
    }
    expect(names.eightBitKeyNames).toHaveLength(eightBitRow('key').max - eightBitKeyMarked + 1)
  })

  it('names the twelve drums by their keys, F0 to E1', () => {
    expect(names.eightBitDrumKeys).toHaveLength(12)
    expect([names.eightBitDrumKeys[0], names.eightBitDrumKeys[11]]).toEqual(['F0', 'E1'])
  })

  it('ends the Pattern list on User, the Pattern a part’s steps play', () => {
    expect(names.eightBitPatternNames[names.eightBitUserPattern]).toBe('User')
    expect(names.eightBitArpeggioNames.at(-1)).toBe('User')
  })
})
