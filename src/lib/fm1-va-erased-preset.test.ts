import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize } from '@/lib/dx7'
import { fm1EffectParameters, FM1_EFFECT_PARAMETER_START } from '@/lib/fm1-parameters'
import { fm1VaRecordEngine } from '@/lib/fm1-va-engine'
import {
  erasableFm1VaEngines,
  makeErasedFm1VaPreset,
  type ErasedFm1VaPreset,
} from '@/lib/fm1-va-erased-preset'
import { fm1VaStoredVoice } from '@/lib/fm1-va-preset-message'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { isFm1VaVirtualAnalogVoice } from '@/lib/fm1-va-virtual-analog'
import { capturedErasedFmReply, capturedErasedVirtualAnalogReply } from '@/test/fm1-va-captures'

function capturedPreset(reply: Uint8Array) {
  const parsed = parseFm1VaReply(reply)
  if (!parsed) throw new Error('The captured erase did not parse.')
  return {
    record: parsed.data.slice(dx7PackedVoiceSize),
    voice: parsed.data.slice(0, dx7PackedVoiceSize),
  }
}

const capturedName = 'INIT      '

/** A blank's voice bytes, whichever engine it is. */
const voiceBytes = (preset: ErasedFm1VaPreset) =>
  preset.engine === 'fm' ? preset.voice.data : preset.voice

describe('makeErasedFm1VaPreset', () => {
  it('lists FM before Virtual Analog, as the FM1 does', () => {
    expect(erasableFm1VaEngines).toEqual(['fm', 'virtualAnalog'])
  })

  it('gives the FM preset FM-1_096 stores after Erase Preset to FM, byte for byte', () => {
    const captured = capturedPreset(capturedErasedFmReply)
    const preset = makeErasedFm1VaPreset('fm', capturedName)

    expect(preset.engine).toBe('fm')
    expect(voiceBytes(preset)).toEqual(captured.voice)
    expect(preset.record).toEqual(captured.record)
    expect(fm1VaRecordEngine(preset.record)).toBe('fm')
  })

  it('gives the Virtual Analog preset FM-1_096 stores after Erase Preset to VA, byte for byte', () => {
    const captured = capturedPreset(capturedErasedVirtualAnalogReply)
    const preset = makeErasedFm1VaPreset('virtualAnalog', capturedName)

    expect(preset.engine).toBe('virtualAnalog')
    expect(preset.voice).toEqual(captured.voice)
    expect(preset.record).toEqual(captured.record)
    expect(fm1VaRecordEngine(preset.record)).toBe('virtual-analog')
  })

  it('gives a Virtual Analog blank the library holds and a preset write stores exactly', () => {
    const voice = voiceBytes(makeErasedFm1VaPreset('virtualAnalog', 'PAD'))

    expect(isFm1VaVirtualAnalogVoice(voice)).toBe(true)
    expect(fm1VaStoredVoice(voice)).toEqual(voice)
  })

  it.each(erasableFm1VaEngines)('switches every effect Off for %s', (engine) => {
    const { effects } = makeErasedFm1VaPreset(engine, 'BLANK')
    const switches = fm1EffectParameters.filter(({ kind }) => kind === 'switch')

    expect(switches).toHaveLength(6)
    for (const { editorIndex } of switches) {
      expect(effects[editorIndex - FM1_EFFECT_PARAMETER_START]).toBe(0)
    }
  })

  it.each(erasableFm1VaEngines)(
    'names the %s blank, keeping only characters a voice name holds',
    (engine) => {
      const data = voiceBytes(makeErasedFm1VaPreset(engine, 'Pad→Lead™ extra'))

      expect(String.fromCharCode(...data.subarray(118, 128))).toBe('Pad Lead  ')
    },
  )

  it.each(erasableFm1VaEngines)('reports the name the %s blank holds', (engine) => {
    expect(makeErasedFm1VaPreset(engine, 'Pad→Lead™ extra').name).toBe('Pad Lead')
  })

  it('returns new copies, so changing one blank leaves the next as captured', () => {
    const first = makeErasedFm1VaPreset('fm', 'ONE')
    first.record[0] = 0
    voiceBytes(first)[0] = 0

    const second = makeErasedFm1VaPreset('fm', 'ONE')
    expect(second.record[0]).toBe(0x6b)
    expect(voiceBytes(second)[0]).toBe(0x63)
  })
})
