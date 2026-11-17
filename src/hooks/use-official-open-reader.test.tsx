// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
import {
  officialOpenChecksum,
  officialOpenHeader,
  packSevenBitStream,
} from '@/lib/official-open-transfer'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { answerFromOfficialOpenCapture } from '@/test/official-open-v14-capture'

import { useOfficialOpenReader } from './use-official-open-reader'

afterEach(cleanup)

type Midi = Parameters<typeof useOfficialOpenReader>[0]

const v14 = { identity: 'FM-1_8000014', kind: 'official-open' } as const

/** A fake FM1 on Official Open that answers commands 0, 1, 2, and 6 from the capture. */
function setup(firmware: Midi['firmware'] = v14) {
  const ports = makeFakeFm1Ports()
  const commands = answerFromOfficialOpenCapture(ports)

  const turns: (() => Promise<void>)[] = []
  const logStore = new MidiLogStore([])
  const midi: Midi = {
    firmware,
    logStore,
    // Each read's turn runs when the test says, as a queue behind another transfer would.
    queueEffectOrder: vi.fn<Midi['queueEffectOrder']>((run, signal) => {
      if (signal.aborted) return Promise.resolve()
      return new Promise<void>((resolve) => {
        turns.push(async () => (await run(), resolve()))
      })
    }),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  const hook = renderHook((props: Midi) => useOfficialOpenReader(props), { initialProps: midi })
  return { commands, hook, logStore, midi, ports, runTurn: () => turns.shift()?.() }
}

const problem = (read: Promise<unknown>) =>
  read.then(
    () => 'none',
    (error: { problem?: string }) => error.problem,
  )

describe('useOfficialOpenReader', () => {
  it('reads a library bank as 32 patches in one queue turn', async () => {
    const { commands, hook, midi, runTurn } = setup()
    const read = hook.result.current.readLibraryBank(1)
    await runTurn()

    const voices = await read
    expect(voices).toHaveLength(32)
    expect(voices[0].name.trim()).toBe('GUITAR 1')
    expect(midi.queueEffectOrder).toHaveBeenCalledTimes(1)
    // Begin, 64 chunks, and the cancel that frees the FM1's buffer.
    expect(commands).toEqual([1, ...Array<number>(64).fill(2), 6])
  })

  it('reads a DX7 track’s voice and the track engines', async () => {
    const { hook, runTurn } = setup()
    const voice = hook.result.current.readTrackVoice(4)
    await runTurn()
    expect((await voice).name.trim()).toBe('SOFT BRASS')

    const engines = hook.result.current.readTrackEngines()
    await runTurn()
    expect(await engines).toEqual(['dx7', '303', 'sampler', 'dx7', 'psg', 'psg', 'psg', 'psg'])
  })

  it('logs a bank read starting and ending, not its chunks', async () => {
    const { hook, logStore, runTurn } = setup()
    const read = hook.result.current.readLibraryBank(0)
    await runTurn()
    await read

    // The log lists the newest entry first.
    expect(logStore.getSnapshot().map((entry) => entry.message)).toEqual([
      'Read bank 1 of its DX7 library from the FM1.',
      'Asked the FM1 for bank 1 of its DX7 library.',
    ])
  })

  it('offers a bank read only from V14, and a track read on every Official Open', () => {
    const v13 = setup({ identity: 'FM-1_8000013', kind: 'official-open' }).hook.result.current
    expect([v13.canReadBanks, v13.canReadTracks]).toEqual([false, true])
    const stock = setup({ identity: 'FM-1_016', kind: 'mvave' }).hook.result.current
    expect([stock.canReadBanks, stock.canReadTracks]).toEqual([false, false])
  })

  it('sends nothing for a read the firmware is not offered', async () => {
    const { commands, hook, midi } = setup({ identity: 'FM-1_8000013', kind: 'official-open' })

    expect(await problem(hook.result.current.readLibraryBank(0))).toBe('send-failed')
    expect(midi.queueEffectOrder).not.toHaveBeenCalled()
    expect(commands).toEqual([])
  })

  it('sends nothing when the output changes before the read’s turn', async () => {
    const { commands, hook, midi, runTurn } = setup()
    const read = problem(hook.result.current.readLibraryBank(0))

    hook.rerender({ ...midi, outputs: [], selectedOutputId: '' })
    await runTurn()

    expect(await read).toBe('cancelled')
    expect(commands).toEqual([])
  })

  it('stops part-way and sends no cancel when it unmounts during a bank read', async () => {
    const { commands, hook, ports, runTurn } = setup()
    const answer = ports.output.send.getMockImplementation()
    ports.output.send.mockImplementation((request) => {
      answer?.(request)
      // The page goes away once the third chunk has been asked for.
      if (commands.length === 4) hook.unmount()
    })
    const read = problem(hook.result.current.readLibraryBank(0))
    await runTurn()

    expect(await read).toBe('cancelled')
    expect(commands).toEqual([1, 2, 2, 2])
  })

  it('reports an FM1 that refuses the read as refused', async () => {
    const { hook, ports, runTurn } = setup()
    ports.output.send.mockImplementation((request) => {
      const body = [...officialOpenHeader.slice(1), request[5] | 0x40, request[6], request[7]]
      body.push(...packSevenBitStream([64 + 3]))
      ports.input.receive([0xf0, ...body, officialOpenChecksum(body), 0xf7])
    })
    const read = problem(hook.result.current.readTrackVoice(2))
    await runTurn()

    expect(await read).toBe('refused')
  })

  it('takes a new token for every request of a read', async () => {
    const { hook, ports, runTurn } = setup()
    const read = hook.result.current.readTrackVoice(1)
    await runTurn()
    await read

    const tokens = ports.output.send.mock.calls.map(([request]) => request[6] | (request[7] << 7))
    expect(new Set(tokens).size).toBe(tokens.length)
  })
})
