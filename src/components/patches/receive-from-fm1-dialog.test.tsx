// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { Patch } from '@/data/patches'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import { updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { makeDx7VoiceFile } from '@/lib/dx7-voice-file'
import { makeDemoVoices, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { translatePageText } from '@/test/page-translator'
import { stockV16BankExport, stockV16BankExportNames } from '@/test/stock-v16-bank-export'

import { ReceiveFromFm1Dialog } from './receive-from-fm1-dialog'

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

type Props = ComponentProps<typeof ReceiveFromFm1Dialog>
type ReceiveMidi = Props['midi']
type ReceiveLibrary = Props['library']

const banks = [
  { id: 'A', name: 'Leads' },
  { id: 'B', name: 'Pads' },
  { id: 'C', name: 'Bank 3' },
]
const bankPatches = (bank: string, prefix: string): Patch[] =>
  Array.from({ length: 32 }, (_, index) => ({
    bank,
    family: 'DX7',
    id: `bank-${bank}-${index + 1}`,
    name: `${prefix} ${index + 1}`,
    number: index + 1,
  }))
const sentVoice = updateDx7VoiceName(makeDemoVoices()[0], 'FROM DEXED')
const changed = {} as PatchLibrarySnapshot

function renderWizard({
  initialBank = 'B',
  initialSlot,
  initialSource = 'fm1',
  midi: midiOverrides = {},
}: {
  initialBank?: string
  initialSlot?: number
  initialSource?: Props['initialSource']
  midi?: Partial<ReceiveMidi>
} = {}) {
  const ports = makeFakeFm1Ports()
  const { inputs, selectedInputId } = makeFakeFm1Devices(ports)
  const midi: ReceiveMidi = {
    connectMidi: vi.fn<ReceiveMidi['connectMidi']>(),
    error: null,
    inputs,
    isConnecting: false,
    midiAccess: true,
    selectedInputId,
    setSelectedInputId: vi.fn<ReceiveMidi['setSelectedInputId']>(),
    sysexAvailable: true,
    ...midiOverrides,
  }
  const library: ReceiveLibrary = {
    importBank: vi.fn<PatchLibrary['importBank']>(() => changed),
    loadedBanks: ['A', 'B'],
    patches: [...bankPatches('A', 'LEAD'), ...bankPatches('B', 'PAD')],
    replaceVoice: vi.fn<PatchLibrary['replaceVoice']>(() => changed),
    undoChange: vi.fn<PatchLibrary['undoChange']>(),
  }
  const onClose = vi.fn()
  const onPlay = vi.fn<(voice: Dx7Voice) => void>()
  const props: Props = {
    banks,
    initialBank,
    initialSlot,
    initialSource,
    library,
    midi,
    onClose,
    onPlay,
  }
  // The librarian drops the dialog once it reports closing.
  function Host() {
    const [open, setOpen] = useState(true)
    return open ? (
      <ReceiveFromFm1Dialog
        {...props}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
      />
    ) : null
  }
  const view = render(
    <ToastProvider>
      <Host />
    </ToastProvider>,
  )
  const receive = (bytes: Uint8Array | number[]) => act(() => ports.input.receive(bytes))
  return { ...view, library, midi, onClose, onPlay, ports, receive, user: userEvent.setup() }
}

const nextButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Next' })
const status = () => screen.getByRole('status')

describe('ReceiveFromFm1Dialog', () => {
  it('walks from the FM1’s Bank Export to replacing a bank, with Undo', async () => {
    const { library, onPlay, ports, receive, user } = renderWizard()

    expect(screen.getByRole('dialog', { name: 'Receive patches' })).toBeTruthy()
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'An FM1 on M-VAVE’s V16' }).checked,
    ).toBe(true)
    expect(screen.getByText(/Connect the FM1 to this computer with USB/)).toBeTruthy()
    await user.click(nextButton())

    expect(status().textContent).toContain('Listening on “FM-1 MIDI 1”. The editor sends nothing.')
    expect(status().textContent).toContain('Now open GLOBE on the FM1, choose Export')
    expect(nextButton().disabled).toBe(true)
    receive(stockV16BankExport())
    expect(status().textContent).toContain(
      'Received a bank of 32 patches, starting with “j.piano 7+”.',
    )
    await user.click(nextButton())

    expect(screen.getByRole('heading', { name: 'Patches received' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Play ORGAN 1, patch 2' }))
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ name: 'ORGAN 1' }))
    await user.click(nextButton())

    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Pads' }).checked).toBe(true)
    expect(screen.getByText(/Every patch in “Pads” will be replaced/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace' }))

    const [bank, voices] = vi.mocked(library.importBank).mock.calls[0]
    expect(bank).toBe('B')
    expect(voices.slice(0, 4).map((voice) => voice.name.trim())).toEqual(stockV16BankExportNames)
    expect(await screen.findByText('Imported patches into “Pads”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledWith(changed)
    expect(ports.output.send).not.toHaveBeenCalled()
    expect(ports.output.sendSysex).not.toHaveBeenCalled()
  })

  it('moves focus to each screen’s first control', async () => {
    const { receive, user } = renderWizard()

    await user.click(nextButton())
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: /Input monitor/ }))
    receive(stockV16BankExport())
    await user.click(nextButton())
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Play j.piano 7+, patch 1' }),
    )
    await user.click(nextButton())
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Pads' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Play j.piano 7+, patch 1' }),
    )
  })

  it('puts a received bank in another bank when one is chosen', async () => {
    const { library, receive, user } = renderWizard()
    await user.click(nextButton())
    receive(stockV16BankExport())
    await user.click(nextButton())
    await user.click(nextButton())

    await user.click(screen.getByRole('radio', { name: 'Leads' }))
    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(library.importBank).toHaveBeenCalledWith('A', expect.any(Array))
  })

  it('imports into an empty bank without warning that anything is replaced', async () => {
    const { library, receive, user } = renderWizard({ initialBank: 'C' })
    await user.click(nextButton())
    receive(stockV16BankExport())
    await user.click(nextButton())
    await user.click(nextButton())

    expect(screen.queryByText(/will be replaced/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Import bank' }))

    expect(library.importBank).toHaveBeenCalledWith('C', expect.any(Array))
  })

  it('replaces the slot it was opened on with a single patch', async () => {
    const { library, receive, user } = renderWizard({
      initialBank: 'A',
      initialSlot: 5,
      initialSource: 'patch',
    })

    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'One patch from another device' })
        .checked,
    ).toBe(true)
    expect(screen.getByText('Send one patch from it as a DX7 single-voice dump.')).toBeTruthy()
    await user.click(nextButton())
    receive(makeDx7VoiceFile(sentVoice))
    expect(status().textContent).toContain('Received “FROM DEXED”.')
    await user.click(nextButton())

    expect(screen.getByRole('heading', { name: 'Patch received' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play FROM DEXED' })).toBeTruthy()
    await user.click(nextButton())

    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Slot to replace' }).value).toBe(
      '5',
    )
    expect(screen.getByText(/A05 “LEAD 5” will be replaced by “FROM DEXED”/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace' }))

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      5,
      expect.objectContaining({ data: sentVoice.data, name: 'FROM DEXED' }),
    )
    expect(await screen.findByText('Replaced A05 with “FROM DEXED”.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledWith(changed)
  })

  it('offers a single patch only banks that hold patches', async () => {
    const { receive, user } = renderWizard({ initialBank: 'C', initialSource: 'patch' })
    await user.click(nextButton())
    receive(makeDx7VoiceFile(sentVoice))
    await user.click(nextButton())
    await user.click(nextButton())

    expect(screen.queryByRole('radio', { name: 'Bank 3' })).toBeNull()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Leads' }).checked).toBe(true)
  })

  it('explains a damaged bank and how to send it again', async () => {
    const { receive, user } = renderWizard()
    await user.click(nextButton())
    const bytes = stockV16BankExport()
    bytes[bytes.length - 2] ^= 0x01

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe(
      'That bank arrived damaged. Start Export on the FM1 again.',
    )
    expect(nextButton().disabled).toBe(true)
  })

  it('takes a bank sent again after a damaged one', async () => {
    const { receive, user } = renderWizard()
    await user.click(nextButton())
    const bytes = stockV16BankExport()
    bytes[bytes.length - 2] ^= 0x01
    receive(bytes)

    receive(stockV16BankExport())

    expect(screen.queryByRole('alert')).toBeNull()
    expect(nextButton().disabled).toBe(false)
  })

  it('explains a damaged bank in Ukrainian', async () => {
    await setLocale('uk')
    const { receive, user } = renderWizard()
    await user.click(screen.getByRole('button', { name: 'Далі' }))
    const bytes = stockV16BankExport()
    bytes[bytes.length - 2] ^= 0x01

    receive(bytes)

    expect(screen.getByRole('alert').textContent).toBe(
      'Банк надійшов пошкодженим. Знову запустіть Export на FM1.',
    )
  })

  it('names the input it listens on in German', async () => {
    await setLocale('de')
    const { user } = renderWizard()

    await user.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(status().textContent).toContain('Abgehört wird „FM-1 MIDI 1“. Der Editor sendet nichts.')
  })

  it('says what to do when the FM1 reports Receive Timeout', async () => {
    const { user } = renderWizard()

    await user.click(nextButton())

    expect(screen.getByText(/If the FM1 says Receive Timeout, start Export again/)).toBeTruthy()
  })

  it('listens only while the listening screen shows', async () => {
    const { ports, user } = renderWizard()
    expect(ports.input.addListener).not.toHaveBeenCalled()

    await user.click(nextButton())
    expect(ports.input.addListener).toHaveBeenCalledWith('midimessage', expect.any(Function))
    const listener = ports.input.addListener.mock.calls[0][1]
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(ports.input.removeListener).toHaveBeenCalledWith('midimessage', listener)
  })

  it('stops listening and changes nothing when closed while listening', async () => {
    const { library, onClose, ports, user } = renderWizard()
    await user.click(nextButton())
    const listener = ports.input.addListener.mock.calls[0][1]

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(ports.input.removeListener).toHaveBeenCalledWith('midimessage', listener)
    expect(() => listener({ data: Array.from(stockV16BankExport()) })).not.toThrow()
    expect(library.importBank).not.toHaveBeenCalled()
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('switches MIDI online from the listening screen', async () => {
    const { midi, ports, user } = renderWizard({
      midi: { inputs: [], midiAccess: false, selectedInputId: '', sysexAvailable: false },
    })
    await user.click(nextButton())

    expect(status().textContent).toContain('MIDI is offline.')
    expect(screen.queryByText(/Now open GLOBE/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Switch MIDI online' }))

    expect(midi.connectMidi).toHaveBeenCalledOnce()
    expect(ports.input.addListener).not.toHaveBeenCalled()
  })

  it('chooses the input monitor from the listening screen', async () => {
    const { midi, user } = renderWizard({ midi: { selectedInputId: '' } })
    await user.click(nextButton())

    expect(status().textContent).toContain('Choose the device sending the patches')
    await user.selectOptions(screen.getByRole('combobox', { name: /Input monitor/ }), 'fm1-in')

    expect(midi.setSelectedInputId).toHaveBeenCalledWith('fm1-in')
  })

  it('asks for SysEx while the browser has not allowed it', async () => {
    const { ports, user } = renderWizard({ midi: { sysexAvailable: false } })

    await user.click(nextButton())

    expect(status().textContent).toContain('Receiving patches needs SysEx.')
    expect(ports.input.addListener).not.toHaveBeenCalled()
  })

  it('survives a page translator rewriting its text as a bank arrives', async () => {
    const { container, receive, user } = renderWizard()
    await user.click(nextButton())
    translatePageText(document.body)

    receive(stockV16BankExport())

    expect(container.ownerDocument.body.textContent).toContain('Received a bank of 32 patches')
  })
})
