/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  makeDx7BankFile,
  makeDx7VoiceNameEdits,
  makeDx7SingleVoicePayload,
  packDx7Voice,
  parseDx7Bank,
  unpackDx7Voice,
  updateDx7VoiceName,
  type Dx7Voice,
} from '@/lib/dx7'

function makeVoice(): Dx7Voice {
  const data = Uint8Array.from({ length: 128 }, (_, index) => index & 0x7f)
  for (let operator = 0; operator < 6; operator += 1) {
    const offset = operator * 17
    data[offset + 11] &= 0x0f
    data[offset + 13] &= 0x1f
    data[offset + 15] &= 0x3f
  }
  data[110] &= 0x1f
  data[111] &= 0x0f
  return updateDx7VoiceName({ data, name: '' }, 'ROUNDTRIP')
}

describe('DX7 edit-buffer conversion', () => {
  it('round-trips a packed voice without losing combined bitfields', () => {
    const original = makeVoice()

    expect(packDx7Voice(unpackDx7Voice(original))).toEqual(original)
  })

  it('preserves unrelated packed fields and voices after import, edit, export, and re-import', () => {
    const bankFile = Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx')))
    const imported = parseDx7Bank(bankFile.buffer)
    const parameters = unpackDx7Voice(imported[0])

    expect([parameters[11], parameters[12], parameters[13], parameters[20]]).toEqual([1, 1, 4, 7])

    parameters[11] = 3
    parameters[20] = 14
    const editedVoice = packDx7Voice(parameters)
    const expectedPackedVoice = imported[0].data.slice()
    expectedPackedVoice[11] = 0x07
    expectedPackedVoice[12] = 0x74

    expect(editedVoice.data).toEqual(expectedPackedVoice)

    const reimported = parseDx7Bank(
      makeDx7BankFile([editedVoice, ...imported.slice(1)]).buffer as ArrayBuffer,
    )

    expect(unpackDx7Voice(reimported[0])).toEqual(parameters)
    expect(reimported.slice(1)).toEqual(imported.slice(1))
  })

  it('ignores reserved high bits in the packed algorithm byte', () => {
    const voice = makeVoice()
    voice.data[110] = 0b1110_0101

    expect(unpackDx7Voice(voice)[134]).toBe(5)
  })

  it('rejects a malformed packed voice before creating a single-voice dump', () => {
    expect(() =>
      makeDx7SingleVoicePayload({
        data: new Uint8Array(127),
        name: 'TOO SHORT',
      }),
    ).toThrow('128')
  })
})

describe('DX7 live voice-name edits', () => {
  it('emits only the name bytes that changed', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUNDTWIP')).toEqual([[151, 0x57]])
  })

  it('pads a shortened name with spaces on the synth', () => {
    const parameters = unpackDx7Voice(makeVoice())

    expect(makeDx7VoiceNameEdits(parameters, 'ROUND')).toEqual([
      [150, 0x20],
      [151, 0x20],
      [152, 0x20],
      [153, 0x20],
    ])
  })
})
