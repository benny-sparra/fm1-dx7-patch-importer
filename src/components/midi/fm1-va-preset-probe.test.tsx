// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { MidiLogStore } from '@/lib/midi-log-store'
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
