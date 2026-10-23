// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Patch } from '@/data/patches'
import { setLocale } from '@/i18n'
import { makeDx7BankFile, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { makeDx7VoiceFile } from '@/lib/dx7-voice-file'
import { makeDemoVoices } from '@/lib/patch-library'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { translatePageText } from '@/test/page-translator'
import { stockV16BankExport } from '@/test/stock-v16-bank-export'

import { ReceivePatchDialog } from './receive-patch-dialog'

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

type ReceiveMidi = ComponentProps<typeof ReceivePatchDialog>['midi']

const patch: Patch = { bank: 'A', family: 'DX7', id: 'bank-A-5', name: 'PIANO 2', number: 5 }
const sentVoice = updateDx7VoiceName(makeDemoVoices()[0], 'FROM DEXED')

function renderDialog(midiOverrides: Partial<ReceiveMidi> = {}) {
  const ports = makeFakeFm1Ports()
  const { inputs, selectedInputId } = makeFakeFm1Devices(ports)
  const midi: ReceiveMidi = { inputs, selectedInputId, sysexAvailable: true, ...midiOverrides }
  const replaceVoice = vi.fn(() => null)
  const onClose = vi.fn()
  const onReplaced = vi.fn<(voice: Dx7Voice, changed: unknown) => void>()
  const onImportBank = vi.fn<(voices: Dx7Voice[]) => void>()
  const props = {
    bankName: 'Leads',
    library: { replaceVoice },
    midi,
    onClose,
    onImportBank,
    onReplaced,
    patch,
  }
  const view = render(<ReceivePatchDialog {...props} />)
  const rerender = (next: Partial<ReceiveMidi>) =>
    view.rerender(<ReceivePatchDialog {...props} midi={{ ...midi, ...next }} />)
  const receive = (bytes: Uint8Array | number[]) => act(() => ports.input.receive(bytes))
  return {
    ...view,
    input: ports.input,
    onClose,
    onImportBank,
    onReplaced,
    receive,
    replaceVoice,
    rerender,
  }
}

const replaceButton = () => screen.getByRole('button', { name: 'Replace patch' })

describe('ReceivePatchDialog', () => {
  it('names the slot it will replace', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Receive a patch into A05 “PIANO 2”' })).toBeTruthy()
  })

  it('says it is listening while nothing has arrived', () => {
    renderDialog()

    expect(screen.getByRole('status').textContent).toContain('Listening on the input monitor.')
  })

  it('keeps the action reachable but inactive until a patch arrives', async () => {
    const { replaceVoice } = renderDialog()

    await userEvent.setup().click(replaceButton())

    expect(replaceButton().getAttribute('aria-disabled')).toBe('true')
    expect(replaceVoice).not.toHaveBeenCalled()
  })

  it('shows the patch that arrived', () => {
    const { receive } = renderDialog()

    receive(makeDx7VoiceFile(sentVoice))

    expect(screen.getByRole('status').textContent).toContain('Received “FROM DEXED”.')
  })

  it('replaces the slot with the received patch only once confirmed', async () => {
    const { onReplaced, receive, replaceVoice } = renderDialog()
    receive(makeDx7VoiceFile(sentVoice))
    expect(replaceVoice).not.toHaveBeenCalled()

    await userEvent.setup().click(replaceButton())

    expect(replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      5,
      expect.objectContaining({ data: sentVoice.data, name: 'FROM DEXED' }),
    )
    expect(onReplaced).toHaveBeenCalledOnce()
  })

  it('takes a later patch in place of the first', async () => {
    const { receive, replaceVoice } = renderDialog()
    receive(makeDx7VoiceFile(sentVoice))
    receive(makeDx7VoiceFile(updateDx7VoiceName(sentVoice, 'SECOND')))

    await userEvent.setup().click(replaceButton())

    expect(replaceVoice).toHaveBeenCalledWith('A', 5, expect.objectContaining({ name: 'SECOND' }))
  })

  it('reads a patch that arrives split across messages', () => {
    const { receive } = renderDialog()
    const bytes = makeDx7VoiceFile(sentVoice)

    receive(bytes.slice(0, 70))
    receive(bytes.slice(70))

    expect(screen.getByRole('status').textContent).toContain('Received “FROM DEXED”.')
  })

  it('ignores notes and controllers arriving at the input', () => {
    const { receive } = renderDialog()

    receive([0x90, 60, 100])
    receive([0xb0, 7, 90])

    expect(screen.getByRole('status').textContent).toContain('Listening')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('explains a damaged patch in words', () => {
    const { receive } = renderDialog()
    const bytes = makeDx7VoiceFile(sentVoice)
    bytes[161] = (bytes[161] + 1) & 0x7f

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe('That patch arrived damaged. Send it again.')
  })

  it('shows a bank a stock FM1 on V16 sent with Export', () => {
    const { receive } = renderDialog()

    receive(stockV16BankExport())

    expect(screen.getByRole('status').textContent).toContain(
      'Received a 32-voice bank starting with “j.piano 7+”.',
    )
    expect(screen.queryByRole('button', { name: 'Replace patch' })).toBeNull()
  })

  it('hands a received bank on to the bank import without replacing the slot', async () => {
    const { onClose, onImportBank, receive, replaceVoice } = renderDialog()
    receive(stockV16BankExport())

    await userEvent.setup().click(screen.getByRole('button', { name: 'Import bank into “Leads”…' }))

    expect(onImportBank).toHaveBeenCalledOnce()
    expect(onImportBank.mock.calls[0][0].map((voice) => voice.name.trim()).slice(0, 2)).toEqual([
      'j.piano 7+',
      'ORGAN 1',
    ])
    expect(onClose).toHaveBeenCalledOnce()
    expect(replaceVoice).not.toHaveBeenCalled()
  })

  it('takes a patch sent after a bank in its place', async () => {
    const { receive, replaceVoice } = renderDialog()
    receive(makeDx7BankFile(makeDemoVoices()))
    receive(makeDx7VoiceFile(sentVoice))

    await userEvent.setup().click(replaceButton())

    expect(replaceVoice).toHaveBeenCalledOnce()
  })

  it('reads a bank that arrives split across messages', () => {
    const { receive } = renderDialog()
    const bytes = stockV16BankExport()

    receive(bytes.slice(0, 2048))
    receive(bytes.slice(2048))

    expect(screen.getByRole('status').textContent).toContain('Received a 32-voice bank')
  })

  it('explains a damaged bank in words', () => {
    const { onImportBank, receive } = renderDialog()
    const bytes = stockV16BankExport()
    bytes[bytes.length - 2] ^= 0x01

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe('That bank arrived damaged. Send it again.')
    expect(onImportBank).not.toHaveBeenCalled()
  })

  it('explains a bank cut short as not a patch or bank', () => {
    const { receive } = renderDialog()

    receive([...stockV16BankExport().slice(0, 3000), 0xf7])

    expect(screen.getByRole('alert').textContent).toContain('That wasn’t a DX7 patch or bank.')
  })

  it('explains a damaged bank in Ukrainian', async () => {
    await setLocale('uk')
    const { receive } = renderDialog()
    const bytes = stockV16BankExport()
    bytes[bytes.length - 2] ^= 0x01

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe(
      'Банк надійшов пошкодженим. Надішліть його ще раз.',
    )
  })

  it('explains a damaged patch in the interface language', async () => {
    await setLocale('de')
    const { receive } = renderDialog()
    const bytes = makeDx7VoiceFile(sentVoice)
    bytes[161] = (bytes[161] + 1) & 0x7f

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe(
      'Dieser Sound ist beschädigt angekommen. Sende ihn erneut.',
    )
  })

  it('asks for an input while none is selected', () => {
    renderDialog({ selectedInputId: '' })

    expect(screen.getByRole('status').textContent).toContain('Switch MIDI on')
  })

  it('asks for SysEx while the browser has not allowed it', () => {
    const { input } = renderDialog({ sysexAvailable: false })

    expect(screen.getByRole('status').textContent).toContain('Receiving a patch needs SysEx.')
    expect(input.addListener).not.toHaveBeenCalled()
  })

  it('listens on the selected input while open', () => {
    const { input } = renderDialog()

    expect(input.addListener).toHaveBeenCalledWith('midimessage', expect.any(Function))
  })

  it('stops listening when it closes', () => {
    const { input, unmount } = renderDialog()
    const listener = input.addListener.mock.calls[0][1]

    unmount()

    expect(input.removeListener).toHaveBeenCalledWith('midimessage', listener)
  })

  it('stops listening when MIDI is switched off', () => {
    const { input, rerender } = renderDialog()
    const listener = input.addListener.mock.calls[0][1]

    rerender({ inputs: [], selectedInputId: '' })

    expect(input.removeListener).toHaveBeenCalledWith('midimessage', listener)
    expect(screen.getByRole('status').textContent).toContain('Switch MIDI on')
  })

  it('stops listening when another input is chosen', () => {
    const { input, rerender } = renderDialog()
    const listener = input.addListener.mock.calls[0][1]

    rerender({ selectedInputId: 'other-input' })

    expect(input.removeListener).toHaveBeenCalledWith('midimessage', listener)
  })

  it('does nothing with a message that arrives after it closes', () => {
    const { input, replaceVoice, unmount } = renderDialog()
    const listener = input.addListener.mock.calls[0][1]
    unmount()

    expect(() => listener({ data: Array.from(makeDx7VoiceFile(sentVoice)) })).not.toThrow()
    expect(replaceVoice).not.toHaveBeenCalled()
  })

  it('survives a page translator rewriting its text as a patch arrives', () => {
    const { container, receive } = renderDialog()
    translatePageText(document.body)

    receive(makeDx7VoiceFile(sentVoice))
    const bytes = makeDx7VoiceFile(sentVoice)
    bytes[50] = 0x85
    receive(bytes)

    expect(container.ownerDocument.body.textContent).toContain('That patch arrived damaged.')
  })
})
