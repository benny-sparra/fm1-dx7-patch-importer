// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { act } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { decodeVoiceName, dx7PackedVoiceSize, packDx7Voice, updateDx7VoiceName } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import {
  fm1VaPresetPayloadStart,
  makeFm1VaPresetWrite,
  readFm1VaMessageRecord,
} from '@/lib/fm1-va-preset-message'
import { fm1VaPresetWriteSpacingMs } from '@/lib/fm1-va-preset-write'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { MidiLogStore } from '@/lib/midi-log-store'
import { capturedOrgan3, capturedOrgan3Reply } from '@/test/fm1-va-captures'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeFm1VaPresetReply, makeFm1VaReply, makeStoredPresetData } from '@/test/fm1-va-replies'

import { Fm1VaPresetProbe } from './fm1-va-preset-probe'

type Midi = ComponentProps<typeof Fm1VaPresetProbe>['midi']

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(cleanup)

function makeMidi(
  presetReply: (slot: number) => Uint8Array = makeFm1VaPresetReply,
  overrides: Partial<Midi> = {},
) {
  const ports = makeFakeFm1Ports({ presetReply })
  const midi: Midi = {
    firmware: { identity: 'FM-1_093', kind: 'fm1-va' },
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
    ...overrides,
  }
  return { midi, ports }
}

async function openProbe({ midi }: { midi: Midi }) {
  const user = userEvent.setup()
  render(<Fm1VaPresetProbe midi={midi} />)
  await user.click(screen.getByRole('button', { name: 'FM-1+VA preset probe (dev)' }))
  return { dialog: screen.getByRole('dialog'), user }
}

async function readPreset(user: ReturnType<typeof userEvent.setup>, number: string) {
  const field = screen.getByRole('spinbutton', { hidden: true, name: 'Preset (001–128)' })
  await user.clear(field)
  await user.type(field, number)
  await user.click(screen.getByRole('button', { hidden: true, name: 'Read preset' }))
}

describe('Fm1VaPresetProbe', () => {
  it('reads the preset the FM1 numbers, from slot 0', async () => {
    const fake = makeMidi()
    const { dialog, user } = await openProbe(fake)

    await readPreset(user, '97')

    expect(fake.ports.output.send.mock.calls[0][0][5]).toBe(96)
    expect(within(dialog).getByText(/Preset 097, /)).toBeTruthy()
  })

  it('marks the record bytes that changed since the same preset was last read', async () => {
    let reads = 0
    const { dialog, user } = await openProbe(
      makeMidi((slot) => {
        const { record, voice } = makeStoredPresetData()
        if (reads++ > 0) record[27] = 0x01
        return makeFm1VaReply({ argument: slot, data: [...voice, ...record] })
      }),
    )

    await readPreset(user, '1')
    await readPreset(user, '1')

    const changed = dialog.querySelectorAll('[data-changed]')
    expect(changed).toHaveLength(1)
    expect(changed[0].textContent).toBe('27: 01')
    expect(within(dialog).getByText(/1 record and 0 voice bytes changed/)).toBeTruthy()
  })

  it('does not compare a preset with a different one', async () => {
    const { dialog, user } = await openProbe(makeMidi())

    await readPreset(user, '1')
    await readPreset(user, '2')

    expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(0)
    expect(within(dialog).getByText(/First read of this preset/)).toBeTruthy()
  })

  it('shows why a read failed', async () => {
    const { dialog, user } = await openProbe(
      makeMidi((slot) => makeFm1VaReply({ argument: slot, status: 1 })),
    )

    await readPreset(user, '1')

    expect(within(dialog).getByText('The FM1 refused the read of preset 001 (1).')).toBeTruthy()
  })

  it('cannot read from firmware other than FM-1+VA', async () => {
    const { dialog } = await openProbe(
      makeMidi(undefined, { firmware: { identity: 'FM-1_015', kind: 'mvave' } }),
    )

    expect(
      within(dialog).getByRole('button', { hidden: true, name: 'Read preset' }),
    ).toHaveProperty('disabled', true)
  })

  it('copies the capture with the bytes that changed', async () => {
    const { user } = await openProbe(makeMidi())
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    await readPreset(user, '1')
    await user.click(screen.getByRole('button', { hidden: true, name: 'Copy capture' }))

    const capture = JSON.parse(writeText.mock.calls[0][0])
    expect(capture).toMatchObject({ changedRecordBytes: [], firmware: 'FM-1_093', preset: '001' })
    expect(capture.reply).toMatch(/^F0 7D /)
  })
})

/**
 * A fake FM1 holding ORGAN 3 in every slot, as FM-1_093 answered its read, that stores what each
 * preset write carries and answers later reads with it.
 */
function makeWritableMidi() {
  const reply = parseFm1VaReply(capturedOrgan3Reply)
  if (!reply) throw new Error('The captured reply did not parse.')
  const stored = new Map<number, number[]>()
  const ports = makeFakeFm1Ports({
    presetReply: (slot) =>
      makeFm1VaReply({ argument: slot, data: stored.get(slot) ?? Array.from(reply.data) }),
    presetWrite: (message) => {
      const editBuffer = message.slice(
        fm1VaPresetPayloadStart,
        fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT,
      )
      stored.set(message[5], [...packDx7Voice(editBuffer).data, ...readFm1VaMessageRecord(message)])
    },
  })
  const midi: Midi = {
    firmware: { identity: 'FM-1_093', kind: 'fm1-va' },
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  return { midi, ports, reply }
}

describe('Fm1VaPresetProbe write test', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Clicks a write button and lets the spacing after any earlier write and the write's listening
   * window pass.
   */
  async function writeBack(user: ReturnType<typeof userEvent.setup>, name: string) {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await user.click(screen.getByRole('button', { hidden: true, name }))
    await act(() => vi.advanceTimersByTimeAsync(fm1VaPresetWriteSpacingMs + 1500))
  }

  it('writes the preset back exactly as read, and reads it again to check', async () => {
    const fake = makeWritableMidi()
    const { dialog, user } = await openProbe(fake)
    await readPreset(user, '1')

    await writeBack(user, 'Write back unchanged')

    const writes = fake.ports.output.send.mock.calls.filter(([message]) => message[4] === 0x04)
    expect(writes).toEqual([[capturedOrgan3]])
    expect(await within(dialog).findByText(/The read back matches what was written\./)).toBeTruthy()
    expect(within(dialog).getByText(/No FM-1\+VA reply was heard after the write\./)).toBeTruthy()
  })

  it('writes the preset back renamed, so a landed write shows on the FM1', async () => {
    const fake = makeWritableMidi()
    const { dialog, user } = await openProbe(fake)
    await readPreset(user, '1')

    await writeBack(user, 'Write back as WRITE TEST')

    const data = fake.reply.data.slice(0, dx7PackedVoiceSize)
    const renamed = updateDx7VoiceName({ data, name: decodeVoiceName(data) }, 'WRITE TEST')
    expect(fake.ports.output.send).toHaveBeenCalledWith(
      makeFm1VaPresetWrite(0, renamed, fake.reply.data.slice(dx7PackedVoiceSize)),
    )
    expect(await within(dialog).findByText(/Wrote WRITE TEST\./)).toBeTruthy()
    expect(within(dialog).getByText(/The read back matches what was written\./)).toBeTruthy()
  })

  it('puts back the preset as first read after a renamed write', async () => {
    const fake = makeWritableMidi()
    const { dialog, user } = await openProbe(fake)
    await readPreset(user, '1')
    await writeBack(user, 'Write back as WRITE TEST')
    await within(dialog).findByText(/Wrote WRITE TEST\./)

    await writeBack(user, 'Restore the first read (ORGAN 3)')

    const data = fake.reply.data.slice(0, dx7PackedVoiceSize)
    const writes = fake.ports.output.send.mock.calls.filter(([message]) => message[4] === 0x04)
    expect(writes.at(-1)?.[0]).toEqual(
      makeFm1VaPresetWrite(
        0,
        { data, name: decodeVoiceName(data) },
        fake.reply.data.slice(dx7PackedVoiceSize),
      ),
    )
    expect(await within(dialog).findByText(/Wrote ORGAN 3\./)).toBeTruthy()
    expect(
      screen.queryByRole('button', { hidden: true, name: /^Restore the first read/ }),
    ).toBeNull()
  })

  it('offers no write for a Virtual Analog preset', async () => {
    const { voice, record } = makeStoredPresetData()
    record[18] = 0x5a
    const fake = makeMidi((slot) => makeFm1VaReply({ argument: slot, data: [...voice, ...record] }))
    const { user } = await openProbe(fake)

    await readPreset(user, '97')

    expect(screen.queryByRole('button', { hidden: true, name: 'Write back unchanged' })).toBeNull()
  })
})
