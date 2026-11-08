// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeInitDx7Voice } from '@/lib/init-voice'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'

import { useSmk37PresetWrite } from './use-smk37-preset-write'

afterEach(cleanup)

type Midi = Parameters<typeof useSmk37PresetWrite>[0]

const voice = makeInitDx7Voice()

function setup() {
  const ports = makeFakeFm1Ports()
  let turn!: () => Promise<void>
  let finishTurn!: () => void
  const midi: Midi = {
    channel: 1,
    firmware: { identity: 'SMK-37 Pro_015', kind: 'smk37' },
    logStore: new MidiLogStore([]),
    queueEffectOrder: vi.fn<Midi['queueEffectOrder']>(
      (run) =>
        new Promise<void>((resolve) => {
          turn = run
          finishTurn = resolve
        }),
    ),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  const hook = renderHook((props: Midi) => useSmk37PresetWrite(props), { initialProps: midi })
  return {
    hook,
    midi,
    runTurn: async () => (await turn(), finishTurn()),
    sendSysex: ports.output.sendSysex,
  }
}

describe('useSmk37PresetWrite', () => {
  it('sends nothing when the output changes before the write’s turn', async () => {
    const { hook, midi, runTurn, sendSysex } = setup()
    const result = hook.result.current(voice)

    hook.rerender({ ...midi, outputs: [], selectedOutputId: '' })
    await runTurn()

    await expect(result).resolves.toEqual({ ok: false, reason: 'no_output' })
    expect(sendSysex).not.toHaveBeenCalled()
  })

  it('sends nothing when it unmounts before the write’s turn', async () => {
    const { hook, runTurn, sendSysex } = setup()
    const result = hook.result.current(voice)

    hook.unmount()
    await runTurn()

    await expect(result).resolves.toEqual({ ok: false, reason: 'no_output' })
    expect(sendSysex).not.toHaveBeenCalled()
  })
})
