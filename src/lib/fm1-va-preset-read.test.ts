import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { packDx7Voice } from '@/lib/dx7'
import {
  capturedOrgan3,
  capturedOrgan3AttackReply,
  capturedOrgan3EnvelopeOnReply,
  capturedOrgan3FilterOnReply,
  capturedOrgan3PresetFilterCutoffReply,
  capturedOrgan3PresetFilterOffReply,
  capturedOrgan3PresetFilterOnReply,
  capturedOrgan3Reply,
  capturedVirtualAnalog,
  capturedVirtualAnalogCutoffControllerReply,
  capturedVirtualAnalogCutoffReply,
  capturedVirtualAnalogDistortionReply,
  capturedVirtualAnalogDelayRateReply,
  capturedVirtualAnalogChorusDepthReply,
  capturedVirtualAnalogDistortionToneReply,
  capturedVirtualAnalogDistortionTypeReply,
  capturedVirtualAnalogEffectControllersReply,
  capturedVirtualAnalogFilterOnReply,
  capturedVirtualAnalogFilterTypeReply,
  capturedVirtualAnalogPhaserMixReply,
  capturedVirtualAnalogPhaserOnReply,
  capturedVirtualAnalogReorderedReply,
  capturedVirtualAnalogResonanceReply,
  capturedVirtualAnalogReverbMixReply,
  capturedVirtualAnalogReverbTypeReply,
} from '@/test/fm1-va-captures'
import { makeFm1VaPresetReply, makeFm1VaReply, makeStoredPresetData } from '@/test/fm1-va-replies'

import {
  Fm1VaPresetReadError,
  fm1VaPresetCount,
  makeFm1VaPresetReadRequest,
  readEveryFm1VaPreset,
  readFm1VaPreset,
  readsFm1VaPresets,
  type Fm1VaLink,
  type Fm1VaStoredPreset,
} from './fm1-va-preset-read'

type Hear = Parameters<Fm1VaLink['listen']>[0]

function makeLink(answer?: (request: Uint8Array) => Uint8Array | undefined) {
  const listeners = new Set<Hear>()
  const receive = (message: Uint8Array) => listeners.forEach((hear) => hear(Array.from(message)))
  const link = {
    listen: vi.fn((hear: Hear) => {
      listeners.add(hear)
      return () => listeners.delete(hear)
    }),
    send: vi.fn<(message: Uint8Array) => void | Promise<void>>((request) => {
      const reply = answer?.(request)
      if (reply) receive(reply)
    }),
  }
  return { link, listeners, receive }
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(Fm1VaPresetReadError)
  return error as Fm1VaPresetReadError
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('makeFm1VaPresetReadRequest', () => {
  it('asks for a slot with a checksum over the command and the slot', () => {
    expect(makeFm1VaPresetReadRequest(0)).toEqual(
      Uint8Array.of(0xf0, 0x43, 0x00, 0x7d, 0x10, 0x00, 0x6e, 0xf7),
    )
    expect(makeFm1VaPresetReadRequest(127)).toEqual(
      Uint8Array.of(0xf0, 0x43, 0x00, 0x7d, 0x10, 0x7f, 0x6f, 0xf7),
    )
  })

  it('refuses a slot outside 0 to 127', () => {
    expect(() => makeFm1VaPresetReadRequest(128)).toThrow(RangeError)
    expect(() => makeFm1VaPresetReadRequest(-1)).toThrow(RangeError)
    expect(() => makeFm1VaPresetReadRequest(1.5)).toThrow(RangeError)
  })
})

/**
 * The record in a backup's preset message, out of its 8-into-7 groups. Each group's first byte
 * carries the high bits of the seven after it, bit k for byte k (docs/fm1-research.md).
 */
function backupRecord(message: Uint8Array) {
  const groups = message.subarray(161, 229)
  return Uint8Array.from({ length: 59 }, (_, index) => {
    const group = Math.floor(index / 7) * 8
    const bit = index % 7
    return groups[group + 1 + bit] | (((groups[group] >> bit) & 1) << 7)
  })
}

describe('readFm1VaPreset', () => {
  it('reads the preset FM-1_093 sent as the backup holds it', async () => {
    const { link } = makeLink(() => capturedOrgan3Reply)

    const preset = await readFm1VaPreset(link, 0)

    expect(preset.voice).toEqual(packDx7Voice(capturedOrgan3.slice(6, 161)).data)
    expect(preset.record).toEqual(backupRecord(capturedOrgan3))
  })

  it('reads a Virtual Analog record as its backup holds it, with each high bit in place', async () => {
    const { link } = makeLink(() => capturedVirtualAnalogFilterOnReply)

    const preset = await readFm1VaPreset(link, 96)

    // Switching the Filter on between the backup and the read set record byte 28 alone.
    const expected = backupRecord(capturedVirtualAnalog)
    expected[28] = 0x01
    expect(preset.record).toEqual(expected)
    expect(preset.voice).toEqual(packDx7Voice(capturedVirtualAnalog.slice(6, 161)).data)
  })

  it('reads a change of effect order as a swap of the order bytes, leaving the switches', async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogFilterOnReply).link,
      96,
    )
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogReorderedReply).link,
      96,
    )

    // Filter (0) moved below Reverb (1); the Filter's switch, byte 28, stayed on.
    const expected = before.record.slice()
    expected[27] = 0x01
    expected[30] = 0x00
    expect(after.record).toEqual(expected)
    expect(after.record[28]).toBe(0x01)
  })

  it('reads the Filter switch of an FM preset in the same byte as a Virtual Analog one', async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedOrgan3Reply).link, 0)
    const after = await readFm1VaPreset(makeLink(() => capturedOrgan3FilterOnReply).link, 0)

    const expected = before.record.slice()
    expected[28] = 0x01
    expect(after.record).toEqual(expected)
    expect(after.voice).toEqual(before.voice)
  })

  it("reads the Filter's Cutoff in record byte 0", async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogReorderedReply).link,
      96,
    )
    const after = await readFm1VaPreset(makeLink(() => capturedVirtualAnalogCutoffReply).link, 96)

    // 6065 Hz on the FX screen before, 1686 Hz after.
    const expected = before.record.slice()
    expected[0] = 0x36
    expect(before.record[0]).toBe(0x50)
    expect(after.record).toEqual(expected)
  })

  it('reads a Cutoff sent as CC 2 and stored with SAVE as the value sent', async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedVirtualAnalogCutoffReply).link, 96)
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogCutoffControllerReply).link,
      96,
    )

    const expected = before.record.slice()
    expected[0] = 40
    expect(after.record).toEqual(expected)
  })

  it('reads a Resonance sent as CC 3 in record byte 1, as the value sent', async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogCutoffControllerReply).link,
      96,
    )
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogResonanceReply).link,
      96,
    )

    const expected = before.record.slice()
    expected[1] = 5
    expect(after.record).toEqual(expected)
  })

  it("reads a Filter Type sent as CC 1 in record byte 29, beside the Filter's switch", async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogResonanceReply).link,
      96,
    )
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogFilterTypeReply).link,
      96,
    )

    const expected = before.record.slice()
    expected[29] = 2
    expect(after.record).toEqual(expected)
  })

  it("reads Reverb's Mix sent as CC 7 in record byte 4", async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogFilterTypeReply).link,
      96,
    )
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogReverbMixReply).link,
      96,
    )

    const expected = before.record.slice()
    expected[4] = 77
    expect(after.record).toEqual(expected)
  })

  it("reads Phaser's Mix sent as CC 23 in record byte 17, the last effect setting", async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogReverbMixReply).link,
      96,
    )
    const after = await readFm1VaPreset(
      makeLink(() => capturedVirtualAnalogPhaserMixReply).link,
      96,
    )

    const expected = before.record.slice()
    expected[17] = 66
    expect(after.record).toEqual(expected)
  })

  // Each spot check sends one FX controller from the FX probe, stores it with SAVE, and reads the
  // preset again: only the byte the effects layout predicts changes, to the value sent.
  it.each([
    {
      after: capturedVirtualAnalogDelayRateReply,
      before: capturedVirtualAnalogPhaserMixReply,
      byte: 7,
      setting: 'Delay Rate, CC 10',
      value: 33,
    },
    {
      after: capturedVirtualAnalogDistortionToneReply,
      before: capturedVirtualAnalogDelayRateReply,
      byte: 10,
      setting: 'Distortion Tone, CC 14',
      value: 44,
    },
    {
      after: capturedVirtualAnalogChorusDepthReply,
      before: capturedVirtualAnalogDistortionToneReply,
      byte: 13,
      setting: 'Chorus Depth, CC 18',
      value: 55,
    },
    {
      // Sent as 127: the switch is stored as on, 1.
      after: capturedVirtualAnalogPhaserOnReply,
      before: capturedVirtualAnalogChorusDepthReply,
      byte: 43,
      setting: "the Phaser's switch, CC 20",
      value: 1,
    },
    {
      after: capturedVirtualAnalogReverbTypeReply,
      before: capturedVirtualAnalogPhaserOnReply,
      byte: 32,
      setting: 'Reverb Type, CC 5',
      value: 2,
    },
    {
      // Set on the FX screen: no controller sets Distortion Type.
      after: capturedVirtualAnalogDistortionTypeReply,
      before: capturedVirtualAnalogReverbTypeReply,
      byte: 38,
      setting: 'Distortion Type, Hard Clip',
      value: 1,
    },
  ])('reads $setting in record byte $byte', async ({ after, before, byte, value }) => {
    const read = (reply: Uint8Array) => readFm1VaPreset(makeLink(() => reply).link, 96)
    const expected = (await read(before)).record.slice()
    expected[byte] = value

    expect((await read(after)).record).toEqual(expected)
  })

  it('reads Envelope On, switched by holding ENV, as bit 6 of record byte 53', async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedOrgan3FilterOnReply).link, 0)
    const after = await readFm1VaPreset(makeLink(() => capturedOrgan3EnvelopeOnReply).link, 0)

    const expected = before.record.slice()
    expected[53] = 0x40
    expect(after.record).toEqual(expected)
  })

  it("reads the Envelope's Attack, set to 25, in record byte 54", async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedOrgan3EnvelopeOnReply).link, 0)
    const after = await readFm1VaPreset(makeLink(() => capturedOrgan3AttackReply).link, 0)

    const expected = before.record.slice()
    expected[54] = 25
    expect(after.record).toEqual(expected)
  })

  it("reads an FM preset's own Filter switched on as record byte 26 changing to 90", async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedOrgan3AttackReply).link, 0)
    const after = await readFm1VaPreset(makeLink(() => capturedOrgan3PresetFilterOnReply).link, 0)

    const expected = before.record.slice()
    expected[26] = 0x90
    expect(after.record).toEqual(expected)
  })

  it("reads an FM preset's own Filter Cutoff in record byte 23, as an eight-bit value", async () => {
    const before = await readFm1VaPreset(makeLink(() => capturedOrgan3PresetFilterOnReply).link, 0)
    const after = await readFm1VaPreset(
      makeLink(() => capturedOrgan3PresetFilterCutoffReply).link,
      0,
    )

    // 20 kHz, shown while the byte held 03, to 5 kHz.
    const expected = before.record.slice()
    expected[23] = 0xd0
    expect(after.record).toEqual(expected)
  })

  it("reads an FM preset's own Filter switched off as bit 4 of byte 26, keeping its Cutoff", async () => {
    const before = await readFm1VaPreset(
      makeLink(() => capturedOrgan3PresetFilterCutoffReply).link,
      0,
    )
    const after = await readFm1VaPreset(makeLink(() => capturedOrgan3PresetFilterOffReply).link, 0)

    const expected = before.record.slice()
    expected[26] = 0x80
    expect(after.record).toEqual(expected)
    expect(after.record[23]).toBe(0xd0)
  })

  it('reads eleven effect controllers sent together in the bytes the effects layout predicts', async () => {
    const read = (reply: Uint8Array) => readFm1VaPreset(makeLink(() => reply).link, 96)
    const expected = (await read(capturedVirtualAnalogDistortionTypeReply)).record.slice()
    // Byte: value sent, for CC 4, 6, 8, 9, 11, 15, 16, 17, 19, 21, and 22.
    const sent = {
      3: 11,
      6: 12,
      8: 13,
      11: 15,
      12: 16,
      14: 17,
      15: 18,
      16: 19,
      31: 1,
      34: 1,
      40: 1,
    }
    for (const [byte, value] of Object.entries(sent)) expected[Number(byte)] = value

    expect((await read(capturedVirtualAnalogEffectControllersReply)).record).toEqual(expected)
  })

  it("reads Distortion's switch and Gain, sent as CC 12 and 13, in record bytes 37 and 9", async () => {
    const read = (reply: Uint8Array) => readFm1VaPreset(makeLink(() => reply).link, 96)
    const expected = (await read(capturedVirtualAnalogEffectControllersReply)).record.slice()
    expected[9] = 14
    expected[37] = 1

    expect((await read(capturedVirtualAnalogDistortionReply)).record).toEqual(expected)
  })

  it('reads record byte 18 of a captured FM preset as 03', async () => {
    const { link } = makeLink(() => capturedOrgan3Reply)

    expect((await readFm1VaPreset(link, 0)).record[18]).toBe(0x03)
  })

  it('resolves with the voice and record exactly as read', async () => {
    const { link } = makeLink(() => makeFm1VaPresetReply(5))

    const preset = await readFm1VaPreset(link, 5)

    const { record, voice } = makeStoredPresetData()
    expect(preset.slot).toBe(5)
    expect(preset.voice).toEqual(Uint8Array.from(voice))
    expect(preset.record).toEqual(Uint8Array.from(record))
    expect(preset.reply).toEqual(makeFm1VaPresetReply(5))
  })

  it('stops listening once the preset arrives', async () => {
    const { link, listeners } = makeLink(() => makeFm1VaPresetReply(5))

    await readFm1VaPreset(link, 5)

    expect(listeners.size).toBe(0)
  })

  it('ignores a reply for another slot', async () => {
    const { link, receive } = makeLink()
    const read = readFm1VaPreset(link, 5)

    receive(makeFm1VaPresetReply(6))
    receive(makeFm1VaPresetReply(5, 1))

    expect((await read).voice[0]).toBe(1)
  })

  it('asks again when no answer comes in time', async () => {
    const { link, receive } = makeLink()
    const read = readFm1VaPreset(link, 5, { timeoutMs: 1000 })

    await vi.advanceTimersByTimeAsync(1000)
    receive(makeFm1VaPresetReply(5))

    await expect(read).resolves.toMatchObject({ slot: 5 })
    expect(link.send).toHaveBeenCalledTimes(2)
  })

  it('gives up after the last attempt goes unanswered', async () => {
    const { link, listeners } = makeLink()
    const read = rejection(readFm1VaPreset(link, 5, { attempts: 3, timeoutMs: 1000 }))

    await vi.advanceTimersByTimeAsync(3000)

    expect((await read).problem).toBe('no-reply')
    expect(link.send).toHaveBeenCalledTimes(3)
    expect(listeners.size).toBe(0)
  })

  it('asks again when the FM1 says the request arrived damaged', async () => {
    let answers = 0
    const { link } = makeLink(() =>
      answers++ === 0 ? makeFm1VaReply({ argument: 5, status: 2 }) : makeFm1VaPresetReply(5),
    )

    await expect(readFm1VaPreset(link, 5)).resolves.toMatchObject({ slot: 5 })
    expect(link.send).toHaveBeenCalledTimes(2)
  })

  it('reports a refused read', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, status: 1 }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('refused')
  })

  it('reports an FM1 too busy to read', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, status: 3 }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('busy')
  })

  it('reports a preset of a size it does not know rather than asking again', async () => {
    const { link } = makeLink(() => makeFm1VaReply({ argument: 5, data: [1, 2, 3] }))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('unexpected')
    expect(link.send).toHaveBeenCalledOnce()
  })

  it('reports a request that could not be sent', async () => {
    const { link, listeners } = makeLink()
    link.send.mockRejectedValueOnce(new Error('output gone'))

    expect((await rejection(readFm1VaPreset(link, 5))).problem).toBe('send-failed')
    expect(listeners.size).toBe(0)
  })

  it('stops listening and asking when cancelled', async () => {
    const { link, listeners } = makeLink()
    const controller = new AbortController()
    const read = rejection(readFm1VaPreset(link, 5, { signal: controller.signal }))

    controller.abort()
    await vi.advanceTimersByTimeAsync(5000)

    expect((await read).problem).toBe('cancelled')
    expect(link.send).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
  })

  it('sends nothing when already cancelled', async () => {
    const { link } = makeLink()
    const controller = new AbortController()
    controller.abort()

    expect((await rejection(readFm1VaPreset(link, 5, { signal: controller.signal }))).problem).toBe(
      'cancelled',
    )
    expect(link.send).not.toHaveBeenCalled()
  })
})

describe('readsFm1VaPresets', () => {
  it('reads presets on FM-1+VA from FM-1_079, the release that added the read', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_079', kind: 'fm1-va' })).toBe(true)
    expect(readsFm1VaPresets({ identity: 'FM-1_093', kind: 'fm1-va' })).toBe(true)
  })

  it('does not read presets on an FM-1+VA release before FM-1_079', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_078', kind: 'fm1-va' })).toBe(false)
  })

  it('does not read presets on any other firmware, or before the firmware is known', () => {
    expect(readsFm1VaPresets({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
    expect(readsFm1VaPresets({ identity: 'FM-1_904', kind: 'felucca' })).toBe(false)
    expect(readsFm1VaPresets({ kind: 'unidentified' })).toBe(false)
    expect(readsFm1VaPresets({ kind: 'checking' })).toBe(false)
  })
})

describe('readEveryFm1VaPreset', () => {
  const storedPreset = (slot: number): Fm1VaStoredPreset => ({
    record: new Uint8Array(59),
    reply: new Uint8Array(),
    slot,
    voice: new Uint8Array(128),
  })

  it('reads all 128 presets one at a time, in slot order', async () => {
    const asked: number[] = []
    let reading = 0
    const read = vi.fn(async (slot: number) => {
      reading += 1
      expect(reading).toBe(1)
      asked.push(slot)
      await Promise.resolve()
      reading -= 1
      return storedPreset(slot)
    })

    const presets = await readEveryFm1VaPreset(read)

    expect(asked).toEqual(Array.from({ length: fm1VaPresetCount }, (_, slot) => slot))
    expect(presets.map(({ slot }) => slot)).toEqual(asked)
  })

  it('reports how many presets have arrived as each one does', async () => {
    const onRead = vi.fn<(count: number) => void>()

    await readEveryFm1VaPreset(async (slot) => storedPreset(slot), { onRead })

    expect(onRead).toHaveBeenCalledTimes(fm1VaPresetCount)
    expect(onRead).toHaveBeenNthCalledWith(1, 1)
    expect(onRead).toHaveBeenLastCalledWith(fm1VaPresetCount)
  })

  it('stops at the first preset that cannot be read', async () => {
    const refused = new Fm1VaPresetReadError('refused', 3, 'Refused.')
    const read = vi.fn(async (slot: number) => {
      if (slot === 3) throw refused
      return storedPreset(slot)
    })

    await expect(readEveryFm1VaPreset(read)).rejects.toBe(refused)
    expect(read).toHaveBeenCalledTimes(4)
  })

  it('hands each read the signal, so stopping ends the read in progress', async () => {
    const stop = new AbortController()
    const signals: (AbortSignal | undefined)[] = []

    await readEveryFm1VaPreset(
      async (slot, signal) => {
        signals.push(signal)
        return storedPreset(slot)
      },
      { signal: stop.signal },
    )

    expect(signals.every((signal) => signal === stop.signal)).toBe(true)
  })
})
