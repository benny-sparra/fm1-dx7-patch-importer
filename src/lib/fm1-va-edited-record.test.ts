import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize } from '@/lib/dx7'
import type { Fm1VaEngine } from '@/lib/fm1-va-engine'
import { fm1VaRecordKnobChoices } from '@/lib/fm1-va-knob-choices'
import {
  fm1VaRecordBitcrush,
  fm1VaRecordDistortionType,
  fm1VaRecordEffectOrder,
} from '@/lib/fm1-va-record-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { capturedOrgan3Reply } from '@/test/fm1-va-captures'

import { fm1VaEditedRecord } from './fm1-va-edited-record'

describe.each<Fm1VaEngine>(['fm', 'virtual-analog', 'eight-bit'])(
  'edited %s settings record',
  (engine) => {
    it('preserves the captured record when all settings are unchanged', () => {
      const parsed = parseFm1VaReply(capturedOrgan3Reply)
      if (!parsed) throw new Error('Invalid fixture')
      const record = parsed.data.slice(dx7PackedVoiceSize)
      const before = record.slice()
      const result = fm1VaEditedRecord(record, engine, {
        bitcrush: fm1VaRecordBitcrush(record),
        distortionType: fm1VaRecordDistortionType(record),
        effectOrder: fm1VaRecordEffectOrder(record),
        knobChoices: fm1VaRecordKnobChoices(record, engine),
      })
      expect(result).toEqual(before)
      expect(record).toEqual(before)
    })
    it('combines edited fields while leaving every unrelated byte and the source intact', () => {
      const parsed = parseFm1VaReply(capturedOrgan3Reply)
      if (!parsed) throw new Error('Invalid fixture')
      const record = parsed.data.slice(dx7PackedVoiceSize)
      const before = record.slice()
      const result = fm1VaEditedRecord(record, engine, {
        bitcrush: [1, 4, 10, 50],
        distortionType: 2,
        effectOrder: [5, 0, 1, 2, 3, 6, 4],
        knobChoices: [0, 1, 2, 3],
      })
      expect(fm1VaRecordBitcrush(result)).toEqual([1, 4, 10, 50])
      expect(fm1VaRecordDistortionType(result)).toBe(2)
      expect(fm1VaRecordEffectOrder(result)).toEqual([5, 0, 1, 2, 3, 6, 4])
      expect(fm1VaRecordKnobChoices(result, engine)).toEqual([0, 1, 2, 3])
      const edited = new Set([5, 27, 30, 33, 35, 36, 38, 39, 41, 42, 44, 52, 53])
      expect(Array.from(result).filter((_, index) => !edited.has(index))).toEqual(
        Array.from(before).filter((_, index) => !edited.has(index)),
      )
      expect(record).toEqual(before)
    })
  },
)
