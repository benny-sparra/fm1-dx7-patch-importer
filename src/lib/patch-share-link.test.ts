import { describe, expect, it } from 'vitest'

import { fm1EffectParameterCount, fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import { emptyPatchLibrary, makeDemoVoices } from '@/lib/patch-library'

import {
  decodePatchSharePayload,
  encodePatchSharePayload,
  makePatchShareLink,
  PatchShareLinkError,
  type SharedPatch,
} from './patch-share-link'

const nameBytes = (text: string) => Array.from(text.padEnd(10), (letter) => letter.charCodeAt(0))
const voiceBytes = (seed: number, name: string) =>
  Uint8Array.from([
    ...Array.from({ length: 118 }, (_, index) => (index * seed) % 128),
    ...nameBytes(name),
  ])
const effects = Uint8Array.from(fm1EffectParameterMaximums, (max, index) => (index * 5) % (max + 1))
const record = (engineMarker: number) =>
  Uint8Array.from({ length: 59 }, (_, index) =>
    index === 18 ? engineMarker : (index * 37 + 200) & 0xff,
  )
const virtualAnalogMarker = 0x5a
const eightBitMarker = 0xc3

// Version 1 payloads exactly as the release that introduced share links wrote them, for the voices
// and records above. Links live for years, so every later release must still read these.
const version1Fixtures = {
  dx7: 'AQAABw4VHCMqMTg_Rk1UW2JpcHd-BQwTGiEoLzY9REtSWWBnbnV8AwoRGB8mLTQ7QklQV15lbHN6AQgPFh0kKzI5QEdOVVxjanF4fwYNFBsiKTA3PkVMU1phaG92fQQLEhkgJy41PENKUVhfZm10ewIJEBceJSwzU0hBUkUgRFg3IAACCgQAAR4jAC0yNwBBRksAVVpfAAQJDg',
  virtualAnalog:
    'AQEACxYhLDdCTVhjbnkEDxolMDtGUVxncn0IEx4pND9KVWBrdgEMFyItOENOWWRvegUQGyYxPEdSXWhzfgkUHyo1QEtWYWx3Ag0YIy45RE9aZXB7BhEcJzI9SFNeaXR_ChUgKzZBTFdibXgDDhkkLzpFUFtmcXwHU0hBUkUgVkEgIAACCgQAAR4jAC0yNwBBRksAVVpfAAQJDsjtEjdcgabL8BU6X4SpzvMYPVqHrNH2G0Bliq_U-R5DaI2y1_whRmuQtdr_JEluk7jdAidMcZa74AUq',
  eightBit:
    'AQIADRonNEFOW2h1Ag8cKTZDUF1qdwQRHis4RVJfbHkGEyAtOkdUYW57CBUiLzxJVmNwfQoXJDE-S1hlcn8MGSYzQE1aZ3QBDhsoNUJPXGl2AxAdKjdEUV5reAUSHyw5RlNgbXoHFCEuO0hVYm98CRYjMD1KV2RxU0hBUkUgOEJJVAACCgQAAR4jAC0yNwBBRksAVVpfAAQJDsjtEjdcgabL8BU6X4SpzvMYPcOHrNH2G0Bliq_U-R5DaI2y1_whRmuQtdr_JEluk7jdAidMcZa74AUq',
}

function bytesOf(payload: string) {
  const binary = atob(payload.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function payloadOf(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

/** A version 1 fixture with one byte changed. */
function withByte(payload: string, offset: number, value: number) {
  const bytes = bytesOf(payload)
  bytes[offset] = value
  return payloadOf(bytes)
}

/** What a link must bring back: the engine, its voice bytes, effects, and record. */
function soundOf(patch: SharedPatch) {
  const [engine, voice] =
    'voice' in patch
      ? ['dx7', patch.voice.data]
      : 'virtualAnalog' in patch
        ? ['virtual-analog', patch.virtualAnalog]
        : ['eight-bit', patch.eightBit]
  return { effects: patch.effects, engine, record: patch.record, voice }
}

function problemOf(payload: string) {
  try {
    decodePatchSharePayload(payload)
  } catch (error) {
    return error instanceof PatchShareLinkError ? error.problem : 'unexpected error'
  }
  return 'decoded'
}

describe('version 1 share links', () => {
  it('reads a DX7 voice and its effects as version 1 wrote them', () => {
    const shared = decodePatchSharePayload(version1Fixtures.dx7)

    expect(shared).toEqual({
      effects,
      name: 'SHARE DX7',
      record: undefined,
      voice: { data: voiceBytes(7, 'SHARE DX7'), name: 'SHARE DX7' },
    })
  })

  it('reads a Virtual Analog preset with its record as version 1 wrote it', () => {
    expect(decodePatchSharePayload(version1Fixtures.virtualAnalog)).toEqual({
      effects,
      name: 'SHARE VA',
      record: record(virtualAnalogMarker),
      virtualAnalog: voiceBytes(11, 'SHARE VA'),
    })
  })

  it('reads an 8-Bit preset with its record as version 1 wrote it', () => {
    expect(decodePatchSharePayload(version1Fixtures.eightBit)).toEqual({
      effects,
      eightBit: voiceBytes(13, 'SHARE 8BIT'),
      name: 'SHARE 8BIT',
      record: record(eightBitMarker),
    })
  })

  it('still writes version 1 for the effects it was made for', () => {
    // A release that adds an effect must give share links a new version rather than reshape this one.
    expect(fm1EffectParameterCount).toBe(24)
    expect(
      encodePatchSharePayload({
        effects,
        name: 'SHARE DX7',
        voice: { data: voiceBytes(7, 'SHARE DX7'), name: 'SHARE DX7' },
      }),
    ).toBe(version1Fixtures.dx7)
  })
})

describe('share link round trip', () => {
  const cases: [string, SharedPatch][] = [
    [
      'a DX7 voice without a record',
      { effects, name: 'X', voice: { data: voiceBytes(3, 'ROUND DX7'), name: 'X' } },
    ],
    [
      'a DX7 voice with an FM-1+VA record',
      {
        effects,
        name: 'X',
        record: record(0xa5),
        voice: { data: voiceBytes(5, 'ROUND REC'), name: 'X' },
      },
    ],
    [
      'a Virtual Analog preset',
      {
        effects,
        name: 'X',
        record: record(virtualAnalogMarker),
        virtualAnalog: voiceBytes(9, 'ROUND VA'),
      },
    ],
    [
      'an 8-Bit preset',
      {
        effects,
        eightBit: voiceBytes(17, 'ROUND 8B'),
        name: 'X',
        record: record(eightBitMarker),
      },
    ],
  ]

  it.each(cases)('brings back %s byte for byte', (_, patch) => {
    const shared = decodePatchSharePayload(encodePatchSharePayload(patch))

    expect(soundOf(shared)).toEqual(soundOf(patch))
  })

  it('fits a DX7 patch in a link short enough for any chat', () => {
    const library = { ...emptyPatchLibrary(), voices: { 'bank-A-1': makeDemoVoices()[0] } }
    const link = makePatchShareLink(library, 'bank-A-1', 'https://fm1-editor.com/')

    expect(link).toMatch(/^https:\/\/fm1-editor\.com\/#p=[A-Za-z0-9_-]+$/)
    expect(link?.length).toBeLessThan(250)
  })

  it('takes the slot’s effects, record, and preset bytes from the library', () => {
    const virtualAnalog = voiceBytes(9, 'LIB VA')
    const library = {
      ...emptyPatchLibrary(),
      effects: { 'bank-A-2': effects },
      records: { 'bank-A-2': record(virtualAnalogMarker) },
      virtualAnalog: { 'bank-A-2': virtualAnalog },
    }
    const link = makePatchShareLink(library, 'bank-A-2', 'https://fm1-editor.com/') ?? ''

    expect(decodePatchSharePayload(link.split('#p=')[1])).toEqual({
      effects,
      name: 'LIB VA',
      record: record(virtualAnalogMarker),
      virtualAnalog,
    })
  })

  it('gives an empty slot no link', () => {
    expect(
      makePatchShareLink(emptyPatchLibrary(), 'bank-A-1', 'https://fm1-editor.com/'),
    ).toBeNull()
  })
})

describe('rejected share links', () => {
  it('rejects a version newer than this release reads', () => {
    expect(problemOf(withByte(version1Fixtures.dx7, 0, 2))).toBe('newer-version')
  })

  it('rejects version 0, which never existed', () => {
    expect(problemOf(withByte(version1Fixtures.dx7, 0, 0))).toBe('damaged')
  })

  it('rejects a DX7 voice byte above seven bits', () => {
    expect(problemOf(withByte(version1Fixtures.dx7, 2 + 40, 0x80))).toBe('damaged')
  })

  it('rejects a Virtual Analog voice byte above seven bits', () => {
    expect(problemOf(withByte(version1Fixtures.virtualAnalog, 2 + 40, 0x80))).toBe('damaged')
  })

  it('rejects an 8-Bit voice byte above seven bits', () => {
    expect(problemOf(withByte(version1Fixtures.eightBit, 2 + 40, 0x80))).toBe('damaged')
  })

  it('rejects an effect setting beyond its maximum', () => {
    const offset = fm1EffectParameterMaximums.findIndex((max) => max < 0x7f)
    const value = fm1EffectParameterMaximums[offset] + 1

    expect(problemOf(withByte(version1Fixtures.dx7, 130 + offset, value))).toBe('damaged')
  })

  it('rejects a Virtual Analog preset without its record', () => {
    expect(problemOf(payloadOf(bytesOf(version1Fixtures.virtualAnalog).slice(0, 154)))).toBe(
      'damaged',
    )
  })

  it('rejects a Virtual Analog preset whose record names another engine', () => {
    expect(problemOf(withByte(version1Fixtures.virtualAnalog, 154 + 18, eightBitMarker))).toBe(
      'damaged',
    )
  })

  it('rejects an 8-Bit preset whose record names another engine', () => {
    expect(problemOf(withByte(version1Fixtures.eightBit, 154 + 18, virtualAnalogMarker))).toBe(
      'damaged',
    )
  })

  it('rejects an engine it does not know', () => {
    expect(problemOf(withByte(version1Fixtures.dx7, 1, 3))).toBe('damaged')
  })

  it('rejects a link cut short', () => {
    expect(problemOf(version1Fixtures.dx7.slice(0, 120))).toBe('damaged')
  })

  it('rejects a record cut short', () => {
    expect(problemOf(payloadOf(bytesOf(version1Fixtures.virtualAnalog).slice(0, 200)))).toBe(
      'damaged',
    )
  })

  it.each(['', 'not base64!', 'A', '%41%42'])('rejects text that is not a payload: %j', (text) => {
    expect(problemOf(text)).toBe('damaged')
  })
})
