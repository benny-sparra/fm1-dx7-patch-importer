import { describe, expect, it, vi } from 'vitest'

import { decodeVoiceName, dx7PackedVoiceSize, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import type { Fm1VaStoredPreset } from '@/lib/fm1-va-preset-read'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { voiceId } from '@/lib/patch-library'
import { capturedOrgan3Reply } from '@/test/fm1-va-captures'
import { capturedEightBitRecord, capturedEightBitVoice } from '@/test/fm1-va-eight-bit'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'

import {
  Fm1VaWriteMismatchError,
  planFm1VaBankWrite,
  planFm1VaPatchesWrite,
  writeFm1VaPlannedPresets,
  type Fm1VaPlannedWrite,
} from './fm1-va-write-plan'

// ORGAN 3 as FM-1_093 stores it, in every one of the 128 slots.
const reply = parseFm1VaReply(capturedOrgan3Reply)
if (!reply) throw new Error('The captured reply did not parse.')
const storedVoice = reply.data.slice(0, dx7PackedVoiceSize)
const storedRecord = reply.data.slice(dx7PackedVoiceSize)
const organ3: Dx7Voice = { data: storedVoice, name: decodeVoiceName(storedVoice) }

function storedPresets(change: (slot: number) => Partial<Fm1VaStoredPreset> = () => ({})) {
  return Array.from({ length: 128 }, (_, slot) => ({
    record: storedRecord.slice(),
    reply: new Uint8Array(),
    slot,
    voice: storedVoice.slice(),
    ...change(slot),
  }))
}

/** A library whose bank holds ORGAN 3 with its stored effects and record in every slot. */
function libraryOf(
  bank: string,
  change: (index: number) => Partial<{ voice: Dx7Voice }> = () => ({}),
) {
  const ids = Array.from({ length: 32 }, (_, index) => [voiceId(bank, index + 1), index] as const)
  return {
    effects: Object.fromEntries(ids.map(([id]) => [id, fm1VaRecordEffects(storedRecord)])),
    records: Object.fromEntries(ids.map(([id]) => [id, storedRecord.slice()])),
    eightBit: {} as Record<string, Uint8Array>,
    virtualAnalog: {} as Record<string, Uint8Array>,
    voices: Object.fromEntries(ids.map(([id, index]) => [id, change(index).voice ?? organ3])),
  }
}

/** The library with the 8-Bit preset 097, NES ROCK, as read from the FM1, in slot `number`. */
function withEightBit(library: ReturnType<typeof libraryOf>, bank: string, number: number) {
  const id = voiceId(bank, number)
  delete library.voices[id]
  library.eightBit[id] = capturedEightBitVoice()
  library.records[id] = capturedEightBitRecord()
  library.effects[id] = fm1VaRecordEffects(capturedEightBitRecord())
  return library
}

/** The library with the Virtual Analog preset 097, as read from the FM1, in slot `number`. */
function withVirtualAnalog(library: ReturnType<typeof libraryOf>, bank: string, number: number) {
  const id = voiceId(bank, number)
  delete library.voices[id]
  library.virtualAnalog[id] = capturedVirtualAnalogVoice()
  library.records[id] = capturedVirtualAnalogRecord()
  library.effects[id] = fm1VaRecordEffects(capturedVirtualAnalogRecord())
  return library
}

describe('planFm1VaBankWrite', () => {
  it('leaves every preset alone when the library bank matches the FM1', () => {
    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', libraryOf('A'))

    expect(plan.every(({ kind }) => kind === 'same')).toBe(true)
  })

  it('writes only the presets whose library patch differs, to the FM1 bank chosen', () => {
    const renamed = updateDx7VoiceName(organ3, 'MY ORGAN')
    const library = libraryOf('C', (index) => (index === 4 ? { voice: renamed } : {}))

    const plan = planFm1VaBankWrite(storedPresets(), 'B', 'C', library)

    const writes = plan.filter(({ kind }) => kind === 'write')
    expect(writes).toEqual([
      expect.objectContaining({ name: 'MY ORGAN', replaces: 'ORGAN 3', slot: 36 }),
    ])
  })

  it('writes the library’s effects into the record, and keeps the record’s other bytes', () => {
    const library = libraryOf('A')
    const reverbOn = fm1VaRecordEffects(storedRecord)
    reverbOn[4] = 1
    library.effects[voiceId('A', 1)] = reverbOn

    const [first] = planFm1VaBankWrite(storedPresets(), 'A', 'A', library)

    if (first.kind !== 'write') throw new Error('Expected a write.')
    expect(fm1VaRecordEffects(first.record)).toEqual(reverbOn)
    const changed = Array.from(first.record.keys()).filter(
      (i) => first.record[i] !== storedRecord[i],
    )
    expect(changed).toEqual([31])
  })

  it('gives a patch without a record of its own the stored preset’s record', () => {
    const library = libraryOf('A')
    const record = storedRecord.slice()
    record[45] = 0x2a
    library.records = {}
    library.effects = { [voiceId('A', 1)]: fm1VaRecordEffects(storedRecord) }

    const plan = planFm1VaBankWrite(
      storedPresets(() => ({ record: record.slice() })),
      'A',
      'A',
      library,
    )

    expect(plan[0]).toEqual({ kind: 'same', slot: 0 })
    // Without effects of its own, a patch is written with the default effects.
    expect(plan[1]).toMatchObject({ kind: 'write' })
    if (plan[1].kind !== 'write') return
    expect(plan[1].record[45]).toBe(0x2a)
    expect(fm1VaRecordEffects(plan[1].record)).toEqual(makeDefaultFm1Effects())
  })

  it('never writes a DX7 patch over a Virtual Analog preset', () => {
    const virtualAnalog = storedRecord.slice()
    virtualAnalog[18] = 0x5a
    const library = libraryOf('A', () => ({ voice: updateDx7VoiceName(organ3, 'NEW') }))

    const plan = planFm1VaBankWrite(
      storedPresets((slot) => (slot === 2 ? { record: virtualAnalog } : {})),
      'A',
      'A',
      library,
    )

    expect(plan[2]).toEqual({ kind: 'virtual-analog', name: 'ORGAN 3', slot: 2 })
    expect(plan[3]).toMatchObject({ kind: 'write' })
  })

  it('never writes over an 8-Bit preset, not even with a Virtual Analog patch', () => {
    const eightBit = storedRecord.slice()
    eightBit[18] = 0xc3
    const library = withVirtualAnalog(
      libraryOf('A', () => ({ voice: updateDx7VoiceName(organ3, 'NEW') })),
      'A',
      4,
    )

    const plan = planFm1VaBankWrite(
      storedPresets((slot) => (slot === 2 || slot === 3 ? { record: eightBit } : {})),
      'A',
      'A',
      library,
    )

    expect(plan[2]).toEqual({ kind: 'eight-bit', name: 'ORGAN 3', slot: 2 })
    expect(plan[3]).toEqual({ kind: 'eight-bit', name: 'ORGAN 3', slot: 3 })
    expect(plan[4]).toMatchObject({ kind: 'write' })
  })

  it('never writes a patch read from an 8-Bit preset, whose voice is not a DX7 voice', () => {
    const eightBit = storedRecord.slice()
    eightBit[18] = 0xc3
    const library = libraryOf('A', () => ({ voice: updateDx7VoiceName(organ3, 'NES ROCK') }))
    library.records[voiceId('A', 1)] = eightBit

    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', library)

    expect(plan[0]).toEqual({ kind: 'eight-bit-patch', name: 'NES ROCK', slot: 0 })
    expect(plan[1]).toMatchObject({ kind: 'write' })
  })

  it('writes a Virtual Analog patch over an FM preset with its voice bytes as read', () => {
    const plan = planFm1VaBankWrite(
      storedPresets(),
      'A',
      'A',
      withVirtualAnalog(libraryOf('A'), 'A', 4),
    )

    expect(plan[3]).toMatchObject({
      expectedVoice: capturedVirtualAnalogVoice(),
      kind: 'write',
      name: 'VOICE 97',
      record: capturedVirtualAnalogRecord(),
      replaces: 'ORGAN 3',
      voice: capturedVirtualAnalogVoice(),
    })
  })

  it('writes a Virtual Analog patch over a Virtual Analog preset that differs', () => {
    const library = withVirtualAnalog(libraryOf('A'), 'A', 4)
    const stored = storedPresets((slot) =>
      slot === 3 ? { record: capturedVirtualAnalogRecord(), voice: storedVoice.slice() } : {},
    )

    expect(planFm1VaBankWrite(stored, 'A', 'A', library)[3]).toMatchObject({ kind: 'write' })
  })

  it('leaves a Virtual Analog preset alone when the library holds the same one', () => {
    const library = withVirtualAnalog(libraryOf('A'), 'A', 4)
    const stored = storedPresets((slot) =>
      slot === 3
        ? { record: capturedVirtualAnalogRecord(), voice: capturedVirtualAnalogVoice() }
        : {},
    )

    expect(planFm1VaBankWrite(stored, 'A', 'A', library)[3]).toEqual({ kind: 'same', slot: 3 })
  })

  it('does not write a Virtual Analog patch the FM1 would not store exactly', () => {
    const library = withVirtualAnalog(libraryOf('A'), 'A', 4)
    // Byte 110 keeps only the algorithm's five bits, so a write would drop these two.
    library.virtualAnalog[voiceId('A', 4)][110] |= 0x60

    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', library)

    expect(plan[3]).toEqual({ kind: 'inexact', name: 'VOICE 97', slot: 3 })
  })

  it('writes an 8-Bit patch over an FM preset with its voice bytes as read', () => {
    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', withEightBit(libraryOf('A'), 'A', 4))

    expect(plan[3]).toMatchObject({
      expectedVoice: capturedEightBitVoice(),
      kind: 'write',
      name: 'NES ROCK',
      record: capturedEightBitRecord(),
      replaces: 'ORGAN 3',
      voice: capturedEightBitVoice(),
    })
  })

  it('writes an 8-Bit patch over an 8-Bit preset that differs, and leaves the same one alone', () => {
    const library = withEightBit(withEightBit(libraryOf('A'), 'A', 4), 'A', 5)
    const stored = storedPresets((slot) =>
      slot === 3
        ? { record: capturedEightBitRecord(), voice: storedVoice.slice() }
        : slot === 4
          ? { record: capturedEightBitRecord(), voice: capturedEightBitVoice() }
          : {},
    )

    const plan = planFm1VaBankWrite(stored, 'A', 'A', library)

    expect(plan[3]).toMatchObject({ kind: 'write' })
    expect(plan[4]).toEqual({ kind: 'same', slot: 4 })
  })

  it('never writes an 8-Bit patch over a Virtual Analog preset', () => {
    const library = withEightBit(libraryOf('A'), 'A', 4)
    const stored = storedPresets((slot) =>
      slot === 3
        ? { record: capturedVirtualAnalogRecord(), voice: capturedVirtualAnalogVoice() }
        : {},
    )

    expect(planFm1VaBankWrite(stored, 'A', 'A', library)[3]).toEqual({
      kind: 'virtual-analog',
      name: 'VOICE 97',
      slot: 3,
    })
  })

  it('does not write an 8-Bit patch the FM1 would not store exactly', () => {
    const library = withEightBit(libraryOf('A'), 'A', 4)
    library.eightBit[voiceId('A', 4)][110] |= 0x60

    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', library)

    expect(plan[3]).toEqual({ kind: 'inexact', name: 'NES ROCK', slot: 3 })
  })

  it('leaves a preset alone where the library bank has no patch', () => {
    const library = libraryOf('A')
    delete library.voices[voiceId('A', 7)]

    const plan = planFm1VaBankWrite(storedPresets(), 'A', 'A', library)

    expect(plan[6]).toEqual({ kind: 'empty', slot: 6 })
  })
})

describe('planFm1VaPatchesWrite', () => {
  it('leaves every preset after the last patch alone, as a short Favourites does', () => {
    const patch = { voice: updateDx7VoiceName(organ3, 'FAVOURITE') }

    const plan = planFm1VaPatchesWrite(storedPresets(), 'D', [patch, patch, patch])

    expect(plan.map(({ kind }) => kind)).toEqual([
      ...Array.from({ length: 3 }, () => 'write'),
      ...Array.from({ length: 29 }, () => 'empty'),
    ])
    expect(plan[0]).toMatchObject({ name: 'FAVOURITE', replaces: 'ORGAN 3', slot: 96 })
  })

  it('writes a patch with its own record and effects', () => {
    const record = storedRecord.slice()
    record[45] ^= 1
    const effects = makeDefaultFm1Effects()

    const [write] = planFm1VaPatchesWrite(storedPresets(), 'A', [
      { effects, record, voice: organ3 },
    ])

    if (write.kind !== 'write') throw new Error('Expected a write.')
    expect(write.slot).toBe(0)
    expect(write.record[45]).toBe(record[45])
    expect(fm1VaRecordEffects(write.record)).toEqual(effects)
  })
})

describe('writeFm1VaPlannedPresets', () => {
  const planned = (slot: number): Fm1VaPlannedWrite => ({
    expectedVoice: storedVoice,
    name: 'ORGAN 3',
    record: storedRecord,
    replaces: 'ORGAN 3',
    slot,
    voice: storedVoice,
  })
  const readBack = (slot: number, voice = storedVoice) =>
    Promise.resolve({ record: storedRecord, reply: new Uint8Array(), slot, voice })

  it('writes each preset and reads it back, in order', async () => {
    const calls: string[] = []
    const onWritten = vi.fn()

    const written = await writeFm1VaPlannedPresets([planned(3), planned(9)], {
      onWritten,
      read: (slot) => {
        calls.push(`read ${slot}`)
        return readBack(slot)
      },
      write: (slot) => {
        calls.push(`write ${slot}`)
        return Promise.resolve()
      },
    })

    expect(written).toBe(2)
    expect(calls).toEqual(['write 3', 'read 3', 'write 9', 'read 9'])
    expect(onWritten.mock.calls).toEqual([[1], [2]])
  })

  it('stops at the first preset that does not read back as written', async () => {
    const write = vi.fn(() => Promise.resolve())

    const writing = writeFm1VaPlannedPresets([planned(3), planned(9)], {
      read: (slot) => readBack(slot, new Uint8Array(dx7PackedVoiceSize)),
      write,
    })

    await expect(writing).rejects.toBeInstanceOf(Fm1VaWriteMismatchError)
    await expect(writing).rejects.toMatchObject({ slot: 3 })
    expect(write).toHaveBeenCalledOnce()
  })

  it('stops before the next write once asked, confirming the one already sent', async () => {
    const stop = new AbortController()
    const write = vi.fn(() => Promise.resolve())

    const written = await writeFm1VaPlannedPresets([planned(3), planned(9)], {
      onWritten: () => stop.abort(),
      read: readBack,
      signal: stop.signal,
      write,
    })

    expect(written).toBe(1)
    expect(write).toHaveBeenCalledOnce()
  })
})
