// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import type { Patch } from '@/data/patches'
import { makeDx7SingleVoicePayload } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { makeInitDx7Voice } from '@/lib/init-voice'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { renderWithToasts } from '@/test/render-with-toasts'
import { WriteSmk37PatchDialog } from './write-smk37-patch-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

type Midi = ComponentProps<typeof WriteSmk37PatchDialog>['midi']

const patch: Patch = { bank: 'A', family: 'DX7', id: 'bank-A-13', name: 'E.PIANO 1', number: 13 }
const voice = makeInitDx7Voice()
const smk37V15: Fm1Firmware = { identity: 'SMK-37 Pro_015', kind: 'smk37' }

function renderDialog(overrides: Partial<Midi> = {}) {
  const ports = makeFakeFm1Ports()
  const midi: Midi = {
    channel: 1,
    firmware: smk37V15,
    logStore: new MidiLogStore([]),
    queueEffectOrder: (run) => run(),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
    ...overrides,
  }
  const onClose = vi.fn()
  renderWithToasts(
    <WriteSmk37PatchDialog midi={midi} onClose={onClose} patch={patch} voice={voice} />,
  )
  return {
    dialog: screen.getByRole<HTMLDialogElement>('dialog'),
    onClose,
    sendSysex: ports.output.sendSysex,
  }
}

describe('WriteSmk37PatchDialog', () => {
  it('says to select the preset first and that the write cannot be undone, sending nothing', () => {
    const { sendSysex } = renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'Write A13 “E.PIANO 1” to the SMK-37?' }),
    ).toHaveProperty('open', true)
    expect(screen.getByText(/first select the preset to replace/)).toBeTruthy()
    expect(screen.getByText(/cannot be undone/)).toBeTruthy()
    expect(sendSysex).not.toHaveBeenCalled()
  })

  it('writes the patch as one single-voice dump, closes, and reports it written', async () => {
    const user = userEvent.setup()
    const { dialog, onClose, sendSysex } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Write patch' }))

    expect(sendSysex).toHaveBeenCalledExactlyOnceWith(0x43, makeDx7SingleVoicePayload(voice, 1))
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(await screen.findByText('Wrote “E.PIANO 1” to the SMK-37.')).toBeTruthy()
  })

  it('stays open with a translated reason when there is no output, sending nothing', async () => {
    const user = userEvent.setup()
    const { dialog, sendSysex } = renderDialog({ selectedOutputId: '' })

    await user.click(screen.getByRole('button', { name: 'Write patch' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'Choose the SMK-37 as the MIDI output, then try again.',
    )
    expect(dialog.open).toBe(true)
    expect(sendSysex).not.toHaveBeenCalled()
  })

  it('writes nothing on an SMK-37 release the write was not tested on', async () => {
    const user = userEvent.setup()
    const { sendSysex } = renderDialog({
      firmware: { identity: 'SMK-37 Pro_016', kind: 'smk37' },
    })

    await user.click(screen.getByRole('button', { name: 'Write patch' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'The patch was not written. Check the SMK-37 is connected, then try again.',
    )
    expect(sendSysex).not.toHaveBeenCalled()
  })

  it('sends one write for repeated clicks and keeps Escape from closing it while writing', async () => {
    const user = userEvent.setup()
    let turn!: () => Promise<void>
    let finishTurn!: () => void
    const queueEffectOrder = vi.fn<Midi['queueEffectOrder']>(
      (run) =>
        new Promise<void>((resolve) => {
          turn = run
          finishTurn = resolve
        }),
    )
    const { dialog, sendSysex } = renderDialog({ queueEffectOrder })

    await user.click(screen.getByRole('button', { name: 'Write patch' }))
    const writing = screen.getByRole('button', { name: 'Writing…' })
    expect(writing.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Writing…')
    await user.click(writing)
    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false)
    expect(queueEffectOrder).toHaveBeenCalledOnce()
    expect(sendSysex).not.toHaveBeenCalled()

    await turn()
    finishTurn()
    await vi.waitFor(() => expect(dialog.open).toBe(false))
    expect(sendSysex).toHaveBeenCalledOnce()
  })

  it('names the slot and patch in its title in another language', async () => {
    await setLocale('de')
    renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'A13 „E.PIANO 1“ auf den SMK-37 schreiben?' }),
    ).toHaveProperty('open', true)
  })
})
