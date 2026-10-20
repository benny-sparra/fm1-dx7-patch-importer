import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  makeOfficialOpenBeginExportRequest,
  makeOfficialOpenCancelRequest,
  makeOfficialOpenCapabilitiesRequest,
  makeOfficialOpenReadChunkRequest,
  makeOfficialOpenSlotNameRequest,
  OfficialOpenReadError,
  officialOpenCrc32,
  readOfficialOpenCapabilities,
  readOfficialOpenExport,
  readOfficialOpenSlotName,
} from './official-open-read'
import {
  officialOpenChecksum,
  officialOpenHeader,
  packSevenBitStream,
  type OfficialOpenLink,
} from './official-open-transfer'
import { unpackSevenBitStream } from './fm1-firmware'

// These requests are built by hand from the documented framing (docs/fm1-research.md, "The
// `7D 'FM' 02` protocol"); command 0's identical framing matches the capture of 2026-10-16. A
// captured run replaces them once the reads have been tried on an FM1.
// prettier-ignore
const beginVoiceTrack1Token1 = [0xf0, 0x7d, 0x46, 0x4d, 0x02, 0x01, 0x01, 0x00, 0x01, 0x00, 0x00, 0x6b, 0xf7]

function frame(command: number, token: number, payload: readonly number[]) {
  const body = [...officialOpenHeader.slice(1), command, token & 0x7f, token >> 7]
  body.push(...packSevenBitStream(payload))
  return [0xf0, ...body, officialOpenChecksum(body), 0xf7]
}

describe('the read request builders', () => {
  it('builds command 1 for a voice on track 1 as the framing gives it', () => {
    expect(Array.from(makeOfficialOpenBeginExportRequest(1, 'voice', 0))).toEqual(
      beginVoiceTrack1Token1,
    )
  })

  it('packs a chunk request as an offset, little-endian, and a count', () => {
    const request = makeOfficialOpenReadChunkRequest(5, 0x0140, 64)
    expect(Array.from(request.slice(0, 8))).toEqual([0xf0, 0x7d, 0x46, 0x4d, 0x02, 0x02, 5, 0])
    expect(Array.from(unpackSevenBitStream(request.slice(8, -2))).slice(0, 3)).toEqual([
      0x40, 0x01, 64,
    ])
    expect(officialOpenChecksum(Array.from(request.slice(1, -2)))).toBe(request.at(-2))
  })

  it('builds the commands with no payload as bare frames', () => {
    expect(Array.from(makeOfficialOpenCancelRequest(1))).toEqual(frame(6, 1, []))
    expect(Array.from(makeOfficialOpenCapabilitiesRequest(1))).toEqual(frame(22, 1, []))
  })

  it('refuses a kind target, offset, count, or slot out of range', () => {
    expect(() => makeOfficialOpenBeginExportRequest(1, 'voice', 8)).toThrow(RangeError)
    expect(() => makeOfficialOpenBeginExportRequest(1, 'sound', -1)).toThrow(RangeError)
    expect(() => makeOfficialOpenBeginExportRequest(1, 'bank', 4)).toThrow(RangeError)
    expect(() => makeOfficialOpenReadChunkRequest(1, 0x10000, 1)).toThrow(RangeError)
    expect(() => makeOfficialOpenReadChunkRequest(1, 0, 0)).toThrow(RangeError)
    expect(() => makeOfficialOpenReadChunkRequest(1, 0, 65)).toThrow(RangeError)
    expect(() => makeOfficialOpenSlotNameRequest(1, 16)).toThrow(RangeError)
    expect(() => makeOfficialOpenCancelRequest(0x4000)).toThrow(RangeError)
  })
})

describe('officialOpenCrc32', () => {
  it('is the standard CRC-32', () => {
    expect(officialOpenCrc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    expect(officialOpenCrc32(new Uint8Array())).toBe(0)
  })
})

/** What the fake FM1 holds, and how it answers. */
type FakeFm1 = {
  /** Commands received, in order. */
  commands: number[]
  link: OfficialOpenLink
  /** Requests received, as bytes. */
  requests: number[][]
  /** Drops this many answers before replying, to make the reader ask again. */
  silent: number
}

function fakeFm1({
  bank = new Uint8Array(4096).map((_, index) => (index * 7) & 0x7f),
  beginStatus = 0,
  chunkLength,
  size,
  sound = Uint8Array.from({ length: 223 }, (_, index) => index),
  voice = Uint8Array.from({ length: 156 }, (_, index) => (index * 3) & 0x7f),
}: {
  bank?: Uint8Array
  beginStatus?: number
  /** Sends chunks this long whatever was asked. */
  chunkLength?: number
  /** Reports this size for a begin whatever the kind. */
  size?: number
  sound?: Uint8Array
  voice?: Uint8Array
} = {}): FakeFm1 {
  const listeners = new Set<(message: readonly number[]) => void>()
  const device: FakeFm1 = { commands: [], link: undefined as never, requests: [], silent: 0 }
  let held: Uint8Array | null = null

  const reply = (request: number[], status: number, data: readonly number[]) => {
    const token = request[6] | (request[7] << 7)
    const message = frame(request[5] | 0x40, token, [status, ...data])
    for (const listener of listeners) listener(message)
  }

  device.link = {
    listen: (hear) => {
      listeners.add(hear)
      return () => listeners.delete(hear)
    },
    send: (request) => {
      const bytes = Array.from(request)
      device.requests.push(bytes)
      device.commands.push(bytes[5])
      if (device.silent > 0) {
        device.silent -= 1
        return
      }
      const payload = Array.from(unpackSevenBitStream(Uint8Array.from(bytes.slice(8, -2))))
      switch (bytes[5]) {
        case 1: {
          if (beginStatus) return reply(bytes, beginStatus, [])
          held = payload[0] === 1 ? voice : payload[0] === 2 ? sound : bank
          const reported = size ?? held.length
          return reply(bytes, 0, [reported & 0xff, reported >> 8])
        }
        case 2: {
          const offset = payload[0] | (payload[1] << 8)
          const length = chunkLength ?? payload[2]
          return reply(bytes, 0, Array.from(held?.slice(offset, offset + length) ?? []))
        }
        case 6:
          held = null
          return reply(bytes, 0, [])
        case 9:
          return payload[0] > 15
            ? reply(bytes, 64 + 3, [])
            : reply(bytes, 0, Array.from(new TextEncoder().encode('BASS ONE    ')))
        case 22:
          return reply(bytes, 0, [1, 128, 4, 1, 0x00, 0x00, 0x04, 0x00, 3])
      }
    },
  }
  return device
}

let nextToken = 1
const takeToken = () => nextToken++

beforeEach(() => {
  nextToken = 1
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('readOfficialOpenExport', () => {
  it('reads a track voice in three chunks, then frees the FM1 buffer', async () => {
    const fm1 = fakeFm1()
    const bytes = await readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 3 })

    expect(Array.from(bytes)).toEqual(Array.from({ length: 156 }, (_, index) => (index * 3) & 0x7f))
    expect(fm1.commands).toEqual([1, 2, 2, 2, 6])
  })

  it('reads a track sound of 223 bytes', async () => {
    const fm1 = fakeFm1()
    const bytes = await readOfficialOpenExport(fm1.link, { kind: 'sound', takeToken, target: 1 })

    expect(bytes).toHaveLength(223)
    expect(bytes[222]).toBe(222)
    expect(fm1.commands.filter((command) => command === 2)).toHaveLength(4)
  })

  it('reads a DX7 bank of 4096 bytes in 64 chunks', async () => {
    const fm1 = fakeFm1()
    const bytes = await readOfficialOpenExport(fm1.link, { kind: 'bank', takeToken, target: 0 })

    expect(bytes).toHaveLength(4096)
    expect(fm1.commands.filter((command) => command === 2)).toHaveLength(64)
    expect(bytes[4095]).toBe((4095 * 7) & 0x7f)
  })

  it('takes a new token for every request', async () => {
    const fm1 = fakeFm1()
    await readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 0 })

    const tokens = fm1.requests.map((request) => request[6] | (request[7] << 7))
    expect(new Set(tokens).size).toBe(tokens.length)
  })

  it('asks again with the same token when the FM1 is silent, then carries on', async () => {
    const fm1 = fakeFm1()
    fm1.silent = 1
    const read = readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 0 })
    await vi.advanceTimersByTimeAsync(1000)

    expect(await read).toHaveLength(156)
    expect(fm1.requests[0]).toEqual(fm1.requests[1])
  })

  it('gives up after three unanswered attempts without asking to cancel', async () => {
    const fm1 = fakeFm1()
    fm1.silent = 99
    const read = readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 0 })
    const outcome = read.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(3000)

    expect(await outcome).toMatchObject({ problem: 'no-reply' })
    expect(fm1.commands).toEqual([1, 1, 1])
  })

  it('rejects when the FM1 refuses the begin, and sends no chunk request', async () => {
    const fm1 = fakeFm1({ beginStatus: 67 })
    await expect(
      readOfficialOpenExport(fm1.link, { kind: 'bank', takeToken, target: 0 }),
    ).rejects.toMatchObject({ problem: 'refused', status: 67 })

    expect(fm1.commands).toEqual([1])
  })

  it('cancels the transfer when the size is not the kind’s', async () => {
    const fm1 = fakeFm1({ size: 200 })
    await expect(
      readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 0 }),
    ).rejects.toMatchObject({ problem: 'unexpected' })

    expect(fm1.commands).toEqual([1, 6])
  })

  it('cancels the transfer when a chunk comes back the wrong length', async () => {
    const fm1 = fakeFm1({ chunkLength: 10 })
    await expect(
      readOfficialOpenExport(fm1.link, { kind: 'voice', takeToken, target: 0 }),
    ).rejects.toMatchObject({ problem: 'unexpected' })

    expect(fm1.commands).toEqual([1, 2, 6])
  })

  it('stops without sending anything more when aborted, as the ports may have changed', async () => {
    const fm1 = fakeFm1()
    const controller = new AbortController()
    const read = readOfficialOpenExport(fm1.link, {
      kind: 'bank',
      signal: controller.signal,
      takeToken,
      target: 0,
    })
    const outcome = read.catch((error: unknown) => error)
    controller.abort()
    expect(await outcome).toMatchObject({ problem: 'cancelled' })

    expect(fm1.commands.at(-1)).not.toBe(6)
    const sent = fm1.commands.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(fm1.commands).toHaveLength(sent)
  })

  it('does not send when already aborted', async () => {
    const fm1 = fakeFm1()
    const controller = new AbortController()
    controller.abort()

    await expect(
      readOfficialOpenExport(fm1.link, {
        kind: 'voice',
        signal: controller.signal,
        takeToken,
        target: 0,
      }),
    ).rejects.toBeInstanceOf(OfficialOpenReadError)
    expect(fm1.commands).toEqual([])
  })

  it('ignores a reply with another token or a damaged checksum, and waits for its own', async () => {
    const fm1 = fakeFm1()
    const send = fm1.link.send
    const heard: Array<(message: readonly number[]) => void> = []
    const link: OfficialOpenLink = {
      listen: (hear) => {
        heard.push(hear)
        return fm1.link.listen(hear)
      },
      send: (request) => {
        const token = request[6] | (request[7] << 7)
        const stray = frame(request[5] | 0x40, (token + 1) & 0x3fff, [0, 0, 0])
        const damaged = frame(request[5] | 0x40, token, [0, 0, 0]).map((byte, index, all) =>
          index === all.length - 2 ? (byte + 1) & 0x7f : byte,
        )
        for (const hear of heard) {
          hear(stray)
          hear(damaged)
        }
        send(request)
      },
    }

    expect(
      await readOfficialOpenExport(link, { kind: 'voice', takeToken, target: 0 }),
    ).toHaveLength(156)
  })
})

describe('readOfficialOpenCapabilities', () => {
  it('reads V14’s nine bytes', async () => {
    const fm1 = fakeFm1()

    expect(await readOfficialOpenCapabilities(fm1.link, { takeToken })).toEqual({
      bankCount: 4,
      features: 3,
      libraryAvailable: true,
      programCount: 128,
      sampleBankLimit: 0x040000,
      version: 1,
    })
  })

  it('rejects an answer in another layout', async () => {
    const link: OfficialOpenLink = {
      listen: (hear) => {
        listeners.push(hear)
        return () => {}
      },
      send: (request) => {
        const token = request[6] | (request[7] << 7)
        for (const hear of listeners) hear(frame(22 | 0x40, token, [0, 2, 128]))
      },
    }
    const listeners: Array<(message: readonly number[]) => void> = []

    await expect(readOfficialOpenCapabilities(link, { takeToken })).rejects.toMatchObject({
      problem: 'unexpected',
    })
  })
})

describe('readOfficialOpenSlotName', () => {
  it('reads a name and trims its padding', async () => {
    const fm1 = fakeFm1()

    expect(await readOfficialOpenSlotName(fm1.link, 2, { takeToken })).toBe('BASS ONE')
  })

  it('rejects a slot the FM1 refuses', async () => {
    const link: OfficialOpenLink = {
      listen: (hear) => {
        listeners.push(hear)
        return () => {}
      },
      send: (request) => {
        const token = request[6] | (request[7] << 7)
        for (const hear of listeners) hear(frame(9 | 0x40, token, [64 + 3]))
      },
    }
    const listeners: Array<(message: readonly number[]) => void> = []

    await expect(readOfficialOpenSlotName(link, 4, { takeToken })).rejects.toMatchObject({
      problem: 'refused',
      status: 67,
    })
  })

  it('rejects a name with characters the FM1 never stores', async () => {
    const link: OfficialOpenLink = {
      listen: (hear) => {
        listeners.push(hear)
        return () => {}
      },
      send: (request) => {
        const token = request[6] | (request[7] << 7)
        for (const hear of listeners) hear(frame(9 | 0x40, token, [0, ...Array(12).fill(7)]))
      },
    }
    const listeners: Array<(message: readonly number[]) => void> = []

    await expect(readOfficialOpenSlotName(link, 0, { takeToken })).rejects.toMatchObject({
      problem: 'unexpected',
    })
  })
})
