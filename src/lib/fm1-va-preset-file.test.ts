import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize, packDx7Voice, parseDx7Bank, unpackDx7Voice } from '@/lib/dx7'
import { readFm1VaMessageRecord } from '@/lib/fm1-va-preset-message'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'
import { fm1VaRecordEffects, fm1VaRecordWithEffects } from '@/lib/fm1-va-record-effects'
import { fm1VaChecksum, parseFm1VaReply } from '@/lib/fm1-va-sysex'
import {
  capturedOrgan3,
  capturedOrgan3Reply,
  capturedVirtualAnalog,
  capturedVirtualAnalogFilterOnReply,
} from '@/test/fm1-va-captures'

import {
  differsFromLibrary,
  Fm1VaPresetFileError,
  fm1VaPresetBanksFromRead,
  fm1VaPresetFileSize,
  importableSounds,
  parseFm1VaPresetFile,
  readFm1VaPresetFile,
} from './fm1-va-preset-file'
import { slotVoice } from '@/test/slot-voice'

const capturedRecord = capturedOrgan3.slice(161, 229)

// Yamaha's ROM1A factory cartridge fills the other presets.
const rom1a = parseDx7Bank(
  Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))).buffer,
)

function presetMessage(slot: number, voice: Uint8Array, record = capturedRecord) {
  const payload = Uint8Array.from([...voice, ...record])
  return Uint8Array.from([
    0xf0,
    0x43,
    0x00,
    0x7d,
    0x04,
    slot,
    ...payload,
    fm1VaChecksum(payload),
    0xf7,
  ])
}

/**
 * A backup with ORGAN 3 in preset 001, the Virtual Analog preset in 097, and ROM1A's voices, in
 * order, in the others.
 */
function backupFile() {
  const file = new Uint8Array(fm1VaPresetFileSize)
  for (let slot = 1; slot < 128; slot += 1) {
    file.set(presetMessage(slot, unpackDx7Voice(rom1a[slot % 32])), slot * 231)
  }
  file.set(capturedOrgan3, 0)
  file.set(capturedVirtualAnalog, 96 * 231)
  return file
}

/**
 * ORGAN 3's record as FM-1_096 marks an 8-Bit preset, `C3` in byte 18: its low bits in the third
 * group, and its high bit, bit 4, in that group's first byte.
 */
function eightBitRecord() {
  const record = capturedRecord.slice()
  record[2 * 8 + 1 + 4] = 0x43
  record[2 * 8] |= 1 << 4
  return record
}

/** `eightBitRecord` as a preset read gives it, eight bits a byte. */
function eightBitRecordBytes() {
  return readFm1VaMessageRecord(presetMessage(5, unpackDx7Voice(rom1a[5]), eightBitRecord()))
}

/** `backupFile`, with preset 006 marked as 8-Bit. */
function backupFileWithEightBit() {
  const file = backupFile()
  file.set(presetMessage(5, unpackDx7Voice(rom1a[5]), eightBitRecord()), 5 * 231)
  return file
}

function problemOf(bytes: Uint8Array) {
  try {
    parseFm1VaPresetFile(bytes.buffer as ArrayBuffer)
  } catch (error) {
    if (error instanceof Fm1VaPresetFileError) return error.problem
    throw error
  }
  return null
}

function parsedPresets(file: Uint8Array) {
  return parseFm1VaPresetFile(file.buffer as ArrayBuffer).flatMap(({ presets }) => presets)
}

function parsedVoices(file: Uint8Array) {
  return parseFm1VaPresetFile(file.buffer as ArrayBuffer)
    .flatMap(importableSounds)
    .map((sound) => (sound && 'voice' in sound ? slotVoice(sound) : null))
}

describe('fm1VaChecksum', () => {
  it('matches the checksum FM-1+VA wrote on a captured preset', () => {
    expect(fm1VaChecksum(capturedOrgan3.slice(6, 229))).toBe(capturedOrgan3[229])
    expect(fm1VaChecksum(capturedVirtualAnalog.slice(6, 229))).toBe(capturedVirtualAnalog[229])
  })

  it('rebuilds the captured preset from its voice and record', () => {
    expect(presetMessage(0, capturedOrgan3.slice(6, 161))).toEqual(capturedOrgan3)
  })
})

describe('parseFm1VaPresetFile', () => {
  it('reads the voice of a captured preset', () => {
    const [bankA] = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    const [organ] = importableSounds(bankA)

    expect(slotVoice(organ).name).toBe('ORGAN 3')
    expect(unpackDx7Voice(slotVoice(organ))).toEqual(capturedOrgan3.slice(6, 161))
  })

  it('divides the 128 presets into banks A to D of 32, in slot order', () => {
    const banks = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    expect(banks.map(({ bank, presets }) => [bank, presets.length])).toEqual([
      ['A', 32],
      ['B', 32],
      ['C', 32],
      ['D', 32],
    ])
    expect(slotVoice(importableSounds(banks[3])[31]).data).toEqual(rom1a[31].data)
  })

  it('reads each voice in the packed form the library stores', () => {
    const voices = parsedVoices(backupFile())

    expect(voices[33]?.data).toEqual(rom1a[1].data)
    expect(voices[33]?.name).toBe(rom1a[1].name)
  })

  it('reads a preset’s record as FM-1_093 answers a read of the same preset', () => {
    const [bankA] = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    expect(importableSounds(bankA)[0]?.record).toEqual(
      parseFm1VaReply(capturedOrgan3Reply)?.data.slice(128),
    )
  })

  it('puts each high bit of the record back on its own byte', () => {
    // 097's record, which sets 13 high bits, with its engine marker (byte 18, the fifth of the
    // third group) made FM so the preset is read. The read of 097 had its Filter switched on since.
    const encoded = capturedVirtualAnalog.slice(161, 229)
    encoded[16 + 1 + 4] = 0x03
    const file = backupFile()
    file.set(presetMessage(5, capturedVirtualAnalog.slice(6, 161), encoded), 5 * 231)
    const expected = parseFm1VaReply(capturedVirtualAnalogFilterOnReply)!.data.slice(128)
    expected[18] = 0x03
    expected[28] = 0x00

    expect(
      importableSounds(parseFm1VaPresetFile(file.buffer as ArrayBuffer)[0])[5]?.record,
    ).toEqual(expected)
  })

  it('recognises a Virtual Analog preset by its record', () => {
    expect(parsedPresets(backupFile())[96]).toMatchObject({
      kind: 'virtual-analog',
      name: 'VOICE 97',
    })
  })

  it('reads a Virtual Analog preset’s voice bytes as the FM1 reads them back', () => {
    const fromFile = parsedPresets(backupFile())[96]
    const fromRead = fm1VaPresetBanksFromRead(readPresets())[3].presets[0]

    if (fromFile.kind !== 'virtual-analog' || fromRead.kind !== 'virtual-analog') {
      throw new Error('Expected Virtual Analog presets.')
    }
    expect(fromFile.virtualAnalog).toEqual(fromRead.virtualAnalog)
  })

  it('recognises an 8-Bit preset by its record, keeping its voice bytes and record as read', () => {
    const preset = parsedPresets(backupFileWithEightBit())[5]

    expect(preset).toMatchObject({ kind: 'eight-bit', name: rom1a[5].name.trim() })
    if (preset.kind !== 'eight-bit') throw new Error('Expected an 8-Bit preset.')
    expect(preset.record).toEqual(eightBitRecordBytes())
    expect(preset.eightBit).toEqual(packDx7Voice(unpackDx7Voice(rom1a[5])).data)
  })

  it('reads an FM preset’s record as FM', () => {
    expect(parsedPresets(backupFile())[0].kind).toBe('fm')
  })

  it('reports a preset whose checksum does not match as damaged', () => {
    const file = backupFile()
    file[5 * 231 + 20] = (file[5 * 231 + 20] + 1) & 0x7f

    const presets = parsedPresets(file)

    expect(presets[5]).toEqual({ kind: 'damaged' })
    expect(presets.filter(({ kind }) => kind === 'damaged')).toHaveLength(1)
  })

  it('reports a preset with data above seven bits as damaged', () => {
    const file = backupFile()
    file[7 * 231 + 20] |= 0x80

    expect(parsedPresets(file)[7]).toEqual({ kind: 'damaged' })
  })

  it('reports a preset that names a different slot as damaged', () => {
    const file = backupFile()
    file.set(presetMessage(9, unpackDx7Voice(rom1a[0])), 8 * 231)

    const presets = parsedPresets(file)

    expect(presets[8]).toEqual({ kind: 'damaged' })
    expect(presets[9].kind).toBe('fm')
  })

  it('reports a preset without its closing byte as damaged', () => {
    const file = backupFile()
    file[3 * 231 + 230] = 0x00

    expect(parsedPresets(file)[3]).toEqual({ kind: 'damaged' })
  })

  it('refuses a file in which no preset can be read', () => {
    const file = backupFile()
    for (let slot = 0; slot < 128; slot += 1) file[slot * 231 + 229] ^= 0x01

    expect(problemOf(file)).toBe('damaged')
  })

  it('refuses a file that is not a whole number of presets', () => {
    expect(problemOf(backupFile().slice(0, 231 * 127 + 5))).toBe('size')
  })

  it('refuses a file of more presets than the FM1 holds', () => {
    const file = backupFile()
    const longer = new Uint8Array(file.length + 231)
    longer.set(file)
    longer.set(file.subarray(0, 231), file.length)

    expect(problemOf(longer)).toBe('size')
  })

  it('refuses a file of the right length that FM-1+VA did not write', () => {
    const file = backupFile()
    file[3] = 0x00

    expect(problemOf(file)).toBe('format')
  })

  it('refuses a DX7 bank', () => {
    const bank = readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))

    expect(problemOf(Uint8Array.from(bank))).toBe('size')
  })
})

describe('parseFm1VaPresetFile with fewer than 128 presets', () => {
  /** The presets of `backupFile` in `slots`, one write each, in the order given. */
  function presetsOf(...slots: number[]) {
    const file = backupFile()
    return Uint8Array.from(
      slots.flatMap((slot) => [...file.subarray(slot * 231, (slot + 1) * 231)]),
    )
  }

  it('places a single preset in the bank and slot it names, and holds no other bank', () => {
    const banks = parseFm1VaPresetFile(presetsOf(40).buffer as ArrayBuffer)

    expect(banks.map(({ bank }) => bank)).toEqual(['B'])
    expect(banks[0].presets[8]).toMatchObject({ kind: 'fm', voice: { name: rom1a[8].name } })
    expect(banks[0].presets.filter(({ kind }) => kind === 'absent')).toHaveLength(31)
  })

  it('places a preset pack’s 16 presets in the last half of bank D', () => {
    const slots = Array.from({ length: 16 }, (_, index) => 112 + index)

    const [bankD, ...others] = parseFm1VaPresetFile(presetsOf(...slots).buffer as ArrayBuffer)

    expect(others).toEqual([])
    expect(bankD.bank).toBe('D')
    expect(bankD.presets.slice(0, 16).every(({ kind }) => kind === 'absent')).toBe(true)
    expect(bankD.presets.slice(16).every(({ kind }) => kind === 'fm')).toBe(true)
  })

  it('places each preset by the slot it names, whatever its place in the file', () => {
    const [bankA] = parseFm1VaPresetFile(presetsOf(2, 0).buffer as ArrayBuffer)

    expect(bankA.presets.map(({ kind }) => kind).slice(0, 3)).toEqual(['fm', 'absent', 'fm'])
  })

  it('refuses a file that names one slot twice', () => {
    expect(problemOf(presetsOf(5, 5))).toBe('format')
  })

  it('leaves the slots the file does not hold out of the import', () => {
    const [bankB] = parseFm1VaPresetFile(presetsOf(40).buffer as ArrayBuffer)

    const sounds = importableSounds(bankB)

    expect(sounds.filter(Boolean)).toHaveLength(1)
    expect(sounds[8]).not.toBeNull()
  })

  it('does not mark a slot the file does not hold as differing from the library', () => {
    expect(differsFromLibrary({ kind: 'absent' }, {})).toBe(false)
  })

  it('reads a one-preset file the user chose', async () => {
    const banks = await readFm1VaPresetFile(new Blob([presetsOf(0)]))

    expect(banks.map(({ bank }) => bank)).toEqual(['A'])
  })
})

describe('importableSounds', () => {
  it('gives each patch the effects its record holds', () => {
    const [bankA] = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    const [organ3] = importableSounds(bankA)

    expect(organ3?.effects).toEqual(fm1VaRecordEffects(organ3?.record ?? new Uint8Array()))
    // ORGAN 3's stored Filter Cutoff, the record's byte 0.
    expect(organ3?.effects?.[2]).toBe(80)
  })

  it('leaves out a damaged preset', () => {
    const file = backupFile()
    file[5 * 231 + 20] = (file[5 * 231 + 20] + 1) & 0x7f

    const sounds = parseFm1VaPresetFile(file.buffer as ArrayBuffer).flatMap(importableSounds)

    expect(sounds[5]).toBeNull()
    expect(sounds.filter((sound) => sound === null)).toHaveLength(1)
  })

  it('keeps an 8-Bit preset apart from DX7 voices, with its record', () => {
    const sounds = parseFm1VaPresetFile(backupFileWithEightBit().buffer as ArrayBuffer).flatMap(
      importableSounds,
    )

    expect(sounds[5]).toMatchObject({ record: eightBitRecordBytes() })
    expect(sounds[5]).toHaveProperty('eightBit')
    expect(sounds[5]).not.toHaveProperty('voice')
    expect(sounds.filter((sound) => sound === null)).toHaveLength(0)
  })

  it('keeps a Virtual Analog preset apart from DX7 voices, with its record and effects', () => {
    const sound = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer).flatMap(
      importableSounds,
    )[96]

    expect(sound && 'voice' in sound).toBe(false)
    expect(sound).toMatchObject({ virtualAnalog: expect.any(Uint8Array) })
    expect(sound?.record?.[18]).toBe(0x5a)
  })
})

describe('readFm1VaPresetFile', () => {
  it('reads a file the user chose', async () => {
    const banks = await readFm1VaPresetFile(new Blob([backupFile()]))

    expect(slotVoice(importableSounds(banks[0])[0]).name).toBe('ORGAN 3')
  })

  it('reports the length of a file of the wrong size before reading it', async () => {
    const error = await readFm1VaPresetFile(new Blob([new Uint8Array(4104)])).catch(
      (cause: unknown) => cause,
    )

    expect(error).toBeInstanceOf(Fm1VaPresetFileError)
    expect((error as Fm1VaPresetFileError).problem).toBe('size')
    expect((error as Fm1VaPresetFileError).receivedBytes).toBe(4104)
  })
})

/** The preset in a captured reply, as `readFm1VaPreset` resolves with it. */
function storedPreset(reply: Uint8Array, slot: number): Fm1VaStoredPreset {
  const data = parseFm1VaReply(reply)?.data ?? new Uint8Array()
  return {
    record: data.slice(dx7PackedVoiceSize),
    reply,
    slot,
    voice: data.slice(0, dx7PackedVoiceSize),
  }
}

/** 128 presets read from the FM1: ORGAN 3 in each slot, and the Virtual Analog preset in 097. */
function readPresets() {
  return Array.from({ length: 128 }, (_, slot) =>
    storedPreset(slot === 96 ? capturedVirtualAnalogFilterOnReply : capturedOrgan3Reply, slot),
  )
}

describe('fm1VaPresetBanksFromRead', () => {
  it('divides the presets read into banks A to D of 32, in slot order', () => {
    const banks = fm1VaPresetBanksFromRead(readPresets())

    expect(banks.map(({ bank }) => bank)).toEqual(['A', 'B', 'C', 'D'])
    expect(banks.every(({ presets }) => presets.length === 32)).toBe(true)
  })

  it('reads an FM preset’s voice, record, and effects', () => {
    const [bankA] = fm1VaPresetBanksFromRead(readPresets())
    const organ3 = storedPreset(capturedOrgan3Reply, 0)

    expect(bankA.presets[0]).toEqual({
      effects: fm1VaRecordEffects(organ3.record),
      kind: 'fm',
      record: organ3.record,
      voice: { data: organ3.voice, name: 'ORGAN 3' },
    })
  })

  it('reads the same voice and record as the backup file holds for the preset', () => {
    const [fromRead] = fm1VaPresetBanksFromRead(readPresets())
    const [fromFile] = parseFm1VaPresetFile(backupFile().buffer as ArrayBuffer)

    expect(fromRead.presets[0]).toEqual(fromFile.presets[0])
  })

  it('names a Virtual Analog preset by its record', () => {
    const banks = fm1VaPresetBanksFromRead(readPresets())

    expect(banks[3].presets[0]).toMatchObject({ kind: 'virtual-analog', name: 'VOICE 97' })
  })

  it('names an 8-Bit preset by its record rather than reading its voice as DX7', () => {
    const presets = readPresets()
    presets[5].record[18] = 0xc3

    expect(fm1VaPresetBanksFromRead(presets)[0].presets[5]).toMatchObject({
      eightBit: presets[5].voice,
      kind: 'eight-bit',
      name: 'ORGAN 3',
      record: presets[5].record,
    })
  })

  it('counts an FM preset whose voice holds a byte above seven bits as damaged', () => {
    const presets = readPresets()
    presets[5].voice[20] = 0x80

    expect(fm1VaPresetBanksFromRead(presets)[0].presets[5]).toEqual({ kind: 'damaged' })
  })
})

describe('differsFromLibrary', () => {
  const [organ3] = fm1VaPresetBanksFromRead(readPresets())[0].presets
  if (organ3.kind !== 'fm') throw new Error('Expected an FM preset.')
  const sameSlot = { effects: organ3.effects, record: organ3.record, voice: organ3.voice }

  it('does not mark a slot holding the same voice, effects, and record', () => {
    expect(differsFromLibrary(organ3, sameSlot)).toBe(false)
  })

  it('compares an 8-Bit preset’s voice bytes as read, and only with another 8-Bit preset', () => {
    const presets = readPresets()
    presets[5].record[18] = 0xc3
    const eightBit = fm1VaPresetBanksFromRead(presets)[0].presets[5]
    if (eightBit.kind !== 'eight-bit') throw new Error('Expected an 8-Bit preset.')
    const slot = { effects: eightBit.effects, eightBit: eightBit.eightBit, record: eightBit.record }
    const changed = eightBit.eightBit.slice()
    changed[0] ^= 1

    expect(differsFromLibrary(eightBit, slot)).toBe(false)
    expect(differsFromLibrary(eightBit, { ...slot, eightBit: changed })).toBe(true)
    expect(differsFromLibrary(eightBit, { ...slot, eightBit: undefined, voice: rom1a[5] })).toBe(
      true,
    )
  })

  it('marks a slot whose effects differ', () => {
    const effects = organ3.effects.slice()
    effects[0] = 1

    expect(differsFromLibrary(organ3, { ...sameSlot, effects })).toBe(true)
  })

  it('does not mark a slot whose effects changed after import, once they are written', () => {
    const effects = organ3.effects.slice()
    effects[4] = 1
    const written = {
      ...organ3,
      effects,
      record: fm1VaRecordWithEffects(organ3.record, effects),
    }

    // The library keeps the record as first imported, with its edited effects beside it.
    expect(differsFromLibrary(written, { ...sameSlot, effects })).toBe(false)
  })

  it('does not mark a library voice with stray unused bits, which the FM1 stores without them', () => {
    // Bits 4 to 6 of a packed voice's byte 11 hold nothing; the FM1 stores them clear.
    const data = organ3.voice.data.slice()
    data[11] |= 0x40

    expect(differsFromLibrary(organ3, { ...sameSlot, voice: { ...organ3.voice, data } })).toBe(
      false,
    )
  })

  it('does not mark a record whose effect byte is above its range, as the library holds it', () => {
    const record = organ3.record.slice()
    record[0] = 200
    const fm1 = { ...organ3, effects: fm1VaRecordEffects(record), record }

    expect(differsFromLibrary(fm1, { ...sameSlot, effects: fm1.effects, record })).toBe(false)
  })

  it('marks a slot whose record differs in a setting other than the effects', () => {
    const record = organ3.record.slice()
    record[54] = 0x19

    expect(differsFromLibrary(organ3, { ...sameSlot, record })).toBe(true)
  })

  it('marks a slot holding the same voice without the record', () => {
    expect(differsFromLibrary(organ3, { ...sameSlot, record: undefined })).toBe(true)
  })

  it('marks a slot the library has no patch in', () => {
    expect(differsFromLibrary(organ3, {})).toBe(true)
  })

  it('does not mark a preset the import leaves out', () => {
    expect(differsFromLibrary({ kind: 'damaged' }, {})).toBe(false)
  })

  it('compares a Virtual Analog preset with the slot’s Virtual Analog bytes', () => {
    const preset = fm1VaPresetBanksFromRead(readPresets())[3].presets[0]
    if (preset.kind !== 'virtual-analog') throw new Error('Expected a Virtual Analog preset.')
    const slot = {
      effects: preset.effects,
      record: preset.record,
      virtualAnalog: preset.virtualAnalog.slice(),
    }

    expect(differsFromLibrary(preset, slot)).toBe(false)
    expect(differsFromLibrary(preset, { effects: preset.effects, record: preset.record })).toBe(
      true,
    )
  })
})
