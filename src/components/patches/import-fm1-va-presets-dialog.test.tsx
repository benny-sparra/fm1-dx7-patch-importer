// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { setLocale } from '@/i18n'
import { dx7PackedVoiceSize, makeDx7BankFile, updateDx7VoiceName } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { makeFm1VaPresetReadRequest } from '@/lib/fm1-va-preset-read'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { MidiLogStore } from '@/lib/midi-log-store'
import { makeDemoVoices, voiceId, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import {
  fm1VaTestPatchName,
  makeFm1VaBackupBytes,
  makeFm1VaBackupFile,
} from '@/test/fm1-va-backup-file'
import { capturedOrgan3Reply } from '@/test/fm1-va-captures'
import { makeFm1VaReply } from '@/test/fm1-va-replies'
import { translatePageText } from '@/test/page-translator'

import { ImportFm1VaPresetsDialog } from './import-fm1-va-presets-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  // Runs the focus-on-open frame at once, so it cannot land part-way through a test's clicks.
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

const changed = {} as PatchLibrarySnapshot

type Midi = ComponentProps<typeof ImportFm1VaPresetsDialog>['midi']

/** MIDI with no ports, connected to an FM1 on M-VAVE's firmware: nothing can be read. */
const noFm1: Midi = {
  firmware: { identity: 'FM-1_015', kind: 'mvave' },
  inputs: [],
  logStore: new MidiLogStore([]),
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  sysexAvailable: false,
}

// ORGAN 3's record as FM-1_093 stores it, which the fake FM1 gives every FM preset.
const storedRecord = (parseFm1VaReply(capturedOrgan3Reply)?.data ?? new Uint8Array()).slice(
  dx7PackedVoiceSize,
)
const storedEffects = fm1VaRecordEffects(storedRecord)

/** The voice the fake FM1 holds in a slot, named as the test backup names it. */
function storedVoice(slot: number) {
  return updateDx7VoiceName({ data: new Uint8Array(128), name: '' }, fm1VaTestPatchName(slot))
}

type Fm1Options = {
  firmware?: Fm1Firmware
  /** The status the FM1 answers every read with, instead of the preset. */
  status?: number
  /** The first slot the FM1 leaves unanswered, to hold a read in progress. */
  unansweredFrom?: number
}

/** An FM1 on FM-1+VA that answers each read with `storedVoice` and `storedRecord`. */
function fakeFm1({
  firmware = { identity: 'FM-1_093', kind: 'fm1-va' },
  status,
  unansweredFrom = 128,
}: Fm1Options = {}) {
  const ports = makeFakeFm1Ports({
    presetReply: (slot) => {
      // A reply of another kind, which a read ignores, leaves the read waiting.
      if (slot >= unansweredFrom) return makeFm1VaReply({ argument: slot, kind: 0x51 })
      if (status !== undefined) return makeFm1VaReply({ argument: slot, status })
      return makeFm1VaReply({
        argument: slot,
        data: [...storedVoice(slot).data, ...storedRecord],
      })
    },
  })
  const midi: Midi = {
    firmware,
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  return { midi, ports }
}

/** A library whose banks A–D hold exactly what the fake FM1 stores, apart from `voices`. */
function matchingLibrary(voices: PatchLibrary['voices'] = {}) {
  const ids = Array.from(
    { length: 128 },
    (_, slot) =>
      [voiceId(String.fromCharCode(65 + Math.floor(slot / 32)), (slot % 32) + 1), slot] as const,
  )
  return {
    effects: Object.fromEntries(ids.map(([id]) => [id, storedEffects])),
    records: Object.fromEntries(ids.map(([id]) => [id, storedRecord])),
    voices: { ...Object.fromEntries(ids.map(([id, slot]) => [id, storedVoice(slot)])), ...voices },
  }
}

type LibraryOptions = {
  bankNames?: Record<string, string>
  effects?: PatchLibrary['effects']
  importFetchedBanks?: PatchLibrary['importFetchedBanks']
  midi?: Midi
  records?: PatchLibrary['records']
  voices?: PatchLibrary['voices']
  workspaceBanks?: string[]
}

function renderDialog({
  bankNames = {},
  effects = {},
  importFetchedBanks = vi.fn(() => changed),
  midi = noFm1,
  records = {},
  voices = {},
  workspaceBanks = ['A', 'B', 'C', 'D'],
}: LibraryOptions = {}) {
  const onClose = vi.fn()
  const onPlay = vi.fn()
  const undoChange = vi.fn()
  const library = {
    bankNames,
    effects,
    importFetchedBanks,
    records,
    undoChange,
    voices,
    workspaceBanks,
  }
  const dialogWith = (withMidi: Midi) => (
    <ToastProvider>
      <ImportFm1VaPresetsDialog
        library={library}
        midi={withMidi}
        onClose={onClose}
        onPlay={onPlay}
      />
    </ToastProvider>
  )
  const view = render(dialogWith(midi))
  const dialog = screen.getByRole<HTMLDialogElement>('dialog')
  return {
    dialog,
    importFetchedBanks,
    onClose,
    onPlay,
    rerender: (withMidi: Midi) => view.rerender(dialogWith(withMidi)),
    undoChange,
    user: userEvent.setup(),
  }
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file = makeFm1VaBackupFile()) {
  await user.upload(screen.getByLabelText(/FM-1\+VA presets file|Presetdatei/), file)
}

/** A file whose contents arrive only when the test says, to order two reads by hand. */
function slowBackupFile(name: string) {
  const file = makeFm1VaBackupFile(name)
  let release = () => {}
  const contents = file.arrayBuffer()
  const arrived = new Promise<ArrayBuffer>((resolve) => {
    release = () => void contents.then(resolve)
  })
  Object.defineProperty(file, 'arrayBuffer', { value: () => arrived })
  return { file, release }
}

const bankSection = (bank: string) => screen.getByRole('region', { name: `FM1 bank ${bank}` })

/** Unfolds a bank, which every bank starts as, to show its patches. */
async function openBank(user: ReturnType<typeof userEvent.setup>, bank: string) {
  await user.click(screen.getByRole('button', { name: `Expand FM1 bank ${bank}` }))
}

describe('ImportFm1VaPresetsDialog', () => {
  it('waits for a file before it can replace anything', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Import FM-1+VA presets' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Replace 0 banks' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('says that each patch arrives with its effects and settings', () => {
    renderDialog()

    const descriptionId = screen.getByRole('dialog').getAttribute('aria-describedby')

    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(
      'Each patch arrives with its FM1 effects and its FM-1+VA settings.',
    )
  })

  it('shows the four FM1 banks of a chosen file, each ticked', async () => {
    const { user } = renderDialog()

    await chooseFile(user)

    for (const bank of ['A', 'B', 'C', 'D']) {
      expect(within(bankSection(bank)).getByRole<HTMLInputElement>('switch').checked).toBe(true)
    }
    expect(screen.getByRole('button', { name: 'Replace 4 banks' })).toBeTruthy()
  })

  it('starts with every bank folded, so no patch shows until one is opened', async () => {
    const { user } = renderDialog()

    await chooseFile(user)

    expect(screen.queryAllByRole('button', { name: /^Play / })).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /^Expand FM1 bank / })).toHaveLength(4)
  })

  it('folds an opened bank again', async () => {
    const { user } = renderDialog()
    await chooseFile(user)
    await openBank(user, 'A')

    await user.click(screen.getByRole('button', { name: 'Minimise FM1 bank A' }))

    expect(screen.queryAllByRole('button', { name: /^Play / })).toHaveLength(0)
  })

  it('lists each bank’s patches in slot order', async () => {
    const { user } = renderDialog()

    await chooseFile(user)
    await openBank(user, 'C')

    const patches = within(bankSection('C')).getAllByRole('button', { name: /^Play / })
    expect(patches).toHaveLength(32)
    expect(patches[0].getAttribute('aria-label')).toBe(`Play ${fm1VaTestPatchName(64)}, patch 1`)
  })

  it('plays a patch from the file when it is clicked', async () => {
    const { onPlay, user } = renderDialog()
    await chooseFile(user)
    await openBank(user, 'B')

    await user.click(
      screen.getByRole('button', { name: `Play ${fm1VaTestPatchName(33)}, patch 2` }),
    )

    expect(onPlay).toHaveBeenCalledWith(
      expect.objectContaining({ name: fm1VaTestPatchName(33) }),
      expect.any(Uint8Array),
    )
  })

  it('imports only the banks left ticked, and offers to undo it', async () => {
    const { dialog, importFetchedBanks, onClose, undoChange, user } = renderDialog()
    await chooseFile(user)

    await user.click(within(bankSection('C')).getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Replace 3 banks' }))

    const imported = vi.mocked(importFetchedBanks).mock.calls[0][0]
    expect(imported.map(({ bank }) => bank)).toEqual(['A', 'B', 'D'])
    expect(imported[2].sounds[31]?.voice.name).toBe(fm1VaTestPatchName(127))
    // Each patch keeps the settings record FM-1+VA stored with it.
    expect(imported[2].sounds[31]?.record).toHaveLength(59)
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(await screen.findByText('Imported banks A, B and D from FM-1+VA.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undoChange).toHaveBeenCalledWith(changed)
  })

  it('names the library bank each FM1 bank replaces', async () => {
    const { user } = renderDialog({ bankNames: { B: 'Leads' } })

    await chooseFile(user)

    expect(within(bankSection('A')).getByRole('switch', { name: 'Replace “Bank 1”' })).toBeTruthy()
    expect(within(bankSection('B')).getByRole('switch', { name: 'Replace “Leads”' })).toBeTruthy()
  })

  it('offers to add a bank the library does not have', async () => {
    const { user } = renderDialog({ workspaceBanks: ['A', 'B'] })

    await chooseFile(user)

    expect(
      within(bankSection('C')).getByRole('switch', { name: 'Add it as a new bank' }),
    ).toBeTruthy()
  })

  it('marks a damaged preset and keeps that slot out of the import', async () => {
    const { importFetchedBanks, user } = renderDialog()
    await chooseFile(user, makeFm1VaBackupFile('damaged.syx', { damagedSlots: [5] }))

    expect(within(bankSection('A')).getByText('Damaged')).toBeTruthy()
    expect(screen.getByText('One preset is damaged. Its slot keeps its patch.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace 4 banks' }))
    expect(vi.mocked(importFetchedBanks).mock.calls[0][0][0].sounds[5]).toBeNull()
  })

  it('marks a Virtual Analog preset and keeps that slot out of the import', async () => {
    const { importFetchedBanks, user } = renderDialog()
    await chooseFile(user, makeFm1VaBackupFile('va.syx', { virtualAnalogSlots: [33] }))

    expect(within(bankSection('B')).getByText('Virtual Analog preset, not imported')).toBeTruthy()
    expect(within(bankSection('B')).getByText(fm1VaTestPatchName(33))).toBeTruthy()
    expect(
      screen.getByText(/^VA marks a Virtual Analog preset, which can’t be imported yet\./),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Replace 4 banks' }))
    expect(vi.mocked(importFetchedBanks).mock.calls[0][0][1].sounds[1]).toBeNull()
  })

  it('cannot take a bank that holds only Virtual Analog presets', async () => {
    const { user } = renderDialog()
    const bankD = Array.from({ length: 32 }, (_, index) => 96 + index)

    await chooseFile(user, makeFm1VaBackupFile('va.syx', { virtualAnalogSlots: bankD }))

    const bankSwitch = within(bankSection('D')).getByRole<HTMLInputElement>('switch')
    expect(bankSwitch.checked).toBe(false)
    expect(bankSwitch.disabled).toBe(true)
  })

  it('cannot take a bank in which every preset is damaged', async () => {
    const { user } = renderDialog()
    const bankB = Array.from({ length: 32 }, (_, index) => 32 + index)

    await chooseFile(user, makeFm1VaBackupFile('damaged.syx', { damagedSlots: bankB }))

    const bankSwitch = within(bankSection('B')).getByRole<HTMLInputElement>('switch')
    expect(bankSwitch.checked).toBe(false)
    expect(bankSwitch.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Replace 3 banks' })).toBeTruthy()
  })

  it('explains a file of the wrong size', async () => {
    const { user } = renderDialog()
    const bank = new File([makeDx7BankFile(makeDemoVoices())], 'bank.syx')

    await chooseFile(user, bank)

    expect(screen.getByRole('alert').textContent).toBe(
      'This file is 4,104 bytes. A file from FM-1+VA’s “Save a backup” is exactly 29,568 bytes.',
    )
  })

  it('explains a file that FM-1+VA did not write', async () => {
    const { user } = renderDialog()
    const bytes = makeFm1VaBackupBytes()
    bytes[3] = 0x00

    await chooseFile(user, new File([bytes], 'other.syx'))

    expect(screen.getByRole('alert').textContent).toBe(
      'This file was not saved by FM-1+VA’s “Save a backup”.',
    )
  })

  it('explains a file in which no preset can be read', async () => {
    const { user } = renderDialog()
    const everySlot = Array.from({ length: 128 }, (_, slot) => slot)

    await chooseFile(user, makeFm1VaBackupFile('broken.syx', { damagedSlots: everySlot }))

    expect(screen.getByRole('alert').textContent).toBe(
      'No preset in this file could be read. Save a new backup on FM-1+VA and try again.',
    )
  })

  it('shows the file chosen last when an earlier one finishes reading after it', async () => {
    const { user } = renderDialog()
    const first = slowBackupFile('first.syx')
    const second = slowBackupFile('second.syx')

    await chooseFile(user, first.file)
    await chooseFile(user, second.file)
    second.release()
    await screen.findByRole('button', { name: 'Replace 4 banks' })
    first.release()
    await first.file.arrayBuffer()

    expect(screen.getByText('second.syx')).toBeTruthy()
    expect(screen.getAllByRole('region', { name: /^FM1 bank / })).toHaveLength(4)
  })

  it('keeps the dialog open and explains a failed import', async () => {
    const { dialog, user } = renderDialog({
      importFetchedBanks: vi.fn(() => {
        throw new Error('storage')
      }),
    })
    await chooseFile(user)

    await user.click(screen.getByRole('button', { name: 'Replace 4 banks' }))

    expect(dialog.open).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Import failed.')
  })

  it('updates the button after a page translator rewrites the dialog', async () => {
    const { user } = renderDialog()
    await chooseFile(user)
    translatePageText(screen.getByRole('dialog'))

    await user.click(within(bankSection('A')).getByRole('switch'))

    expect(screen.getByRole('button', { name: 'Replace 3 banks' })).toBeTruthy()
  })

  it('names the imported banks in the interface language', async () => {
    await setLocale('de')
    const { user } = renderDialog()
    await chooseFile(user)

    await user.click(within(screen.getByRole('region', { name: 'FM1-Bank C' })).getByRole('switch'))
    await user.click(screen.getByRole('button', { name: '3 Bänke ersetzen' }))

    expect(await screen.findByText('Bänke A, B und D von FM-1+VA importiert.')).toBeTruthy()
  })
})

describe('ImportFm1VaPresetsDialog reading from the FM1', () => {
  const readButton = () => screen.getByRole('button', { name: 'Read from FM1' })

  it('reads all 128 presets from the FM1, in slot order, and shows its banks', async () => {
    const { midi, ports } = fakeFm1()
    const { user } = renderDialog({ midi })

    await user.click(readButton())

    expect(await screen.findByRole('heading', { name: 'Banks on the FM1' })).toBeTruthy()
    expect(ports.output.send.mock.calls.map(([message]) => message)).toEqual(
      Array.from({ length: 128 }, (_, slot) => makeFm1VaPresetReadRequest(slot)),
    )
    expect(screen.getAllByRole('region', { name: /^FM1 bank / })).toHaveLength(4)
  })

  it('marks each patch that differs from the library and switches on only its bank', async () => {
    const { midi } = fakeFm1()
    const changedVoice = updateDx7VoiceName(storedVoice(2), 'MY EDIT')
    const { user } = renderDialog({ midi, ...matchingLibrary({ [voiceId('A', 3)]: changedVoice }) })

    await user.click(readButton())
    await screen.findByRole('heading', { name: 'Banks on the FM1' })
    await openBank(user, 'A')

    expect(
      screen.getByText('A dot marks the one patch that differs from your library.'),
    ).toBeTruthy()
    const differing = screen.getByRole('button', { name: `Play ${fm1VaTestPatchName(2)}, patch 3` })
    expect(differing.getAttribute('aria-describedby')).toBeTruthy()
    expect(
      document.getElementById(differing.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('Differs from your library')
    expect(
      screen
        .getByRole('button', { name: `Play ${fm1VaTestPatchName(1)}, patch 2` })
        .hasAttribute('aria-describedby'),
    ).toBe(false)
    expect(
      ['A', 'B', 'C', 'D'].map(
        (bank) => within(bankSection(bank)).getByRole<HTMLInputElement>('switch').checked,
      ),
    ).toEqual([true, false, false, false])
  })

  it('says when every patch on the FM1 matches the library', async () => {
    const { midi } = fakeFm1()
    const { user } = renderDialog({ midi, ...matchingLibrary() })

    await user.click(readButton())

    expect(await screen.findByText('Every patch here matches your library.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Replace 0 banks' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('imports the FM1’s patches with the effects and records they were stored with', async () => {
    const { midi } = fakeFm1()
    const { importFetchedBanks, user } = renderDialog({
      midi,
      ...matchingLibrary({ [voiceId('A', 3)]: storedVoice(0) }),
    })
    await user.click(readButton())
    await screen.findByRole('heading', { name: 'Banks on the FM1' })

    await user.click(screen.getByRole('button', { name: 'Replace one bank' }))

    const [imported] = vi.mocked(importFetchedBanks).mock.calls[0][0]
    expect(imported.bank).toBe('A')
    expect(imported.sounds[2]).toEqual({
      effects: storedEffects,
      record: storedRecord,
      voice: storedVoice(2),
    })
    expect(await screen.findByText('Imported bank A from FM-1+VA.')).toBeTruthy()
  })

  it('plays a patch from the FM1 with its effects', async () => {
    const { midi } = fakeFm1()
    const { onPlay, user } = renderDialog({ midi })
    await user.click(readButton())
    await screen.findByRole('heading', { name: 'Banks on the FM1' })
    await openBank(user, 'B')

    await user.click(
      screen.getByRole('button', { name: `Play ${fm1VaTestPatchName(33)}, patch 2` }),
    )

    expect(onPlay).toHaveBeenCalledWith(storedVoice(33), storedEffects)
  })

  it('shows how far the read has got, in the interface language', async () => {
    await setLocale('de')
    const { midi } = fakeFm1({ unansweredFrom: 5 })
    const { user } = renderDialog({ midi })

    await user.click(screen.getByRole('button', { name: 'Vom FM1 lesen' }))

    expect(await screen.findByText('Lese Preset 6 von 128…')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Lese Preset 6 von 128…' })).toBeTruthy()
  })

  it('stops reading when asked, and asks the FM1 for nothing more', async () => {
    const { midi, ports } = fakeFm1({ unansweredFrom: 5 })
    const { user } = renderDialog({ midi })
    await user.click(readButton())
    await screen.findByText('Reading preset 6 of 128…')

    await user.click(screen.getByRole('button', { name: 'Stop reading' }))

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(readButton().hasAttribute('disabled')).toBe(false)
    expect(ports.output.send).toHaveBeenCalledTimes(6)
    expect(ports.input.removeListener).toHaveBeenCalledTimes(6)
  })

  it('stops reading when the dialog closes', async () => {
    const { midi, ports } = fakeFm1({ unansweredFrom: 5 })
    const { user } = renderDialog({ midi })
    await user.click(readButton())
    await screen.findByText('Reading preset 6 of 128…')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    cleanup()

    expect(ports.output.send).toHaveBeenCalledTimes(6)
    expect(ports.input.removeListener).toHaveBeenCalledTimes(6)
  })

  it('shows a file chosen during a read rather than the read', async () => {
    const { midi } = fakeFm1({ unansweredFrom: 5 })
    const { user } = renderDialog({ midi })
    await user.click(readButton())
    await screen.findByText('Reading preset 6 of 128…')

    await chooseFile(user)

    expect(await screen.findByRole('heading', { name: 'Banks in this file' })).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('explains a read the FM1 is too busy to answer', async () => {
    const { midi } = fakeFm1({ status: 3 })
    const { user } = renderDialog({ midi })

    await user.click(readButton())

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The FM1 can’t send its presets while its Sequencer is playing. Stop it and read again.',
    )
    expect(screen.queryByRole('region', { name: /^FM1 bank / })).toBeNull()
  })

  it('stops and explains a read when the MIDI ports change', async () => {
    const { midi } = fakeFm1({ unansweredFrom: 5 })
    const { rerender, user } = renderDialog({ midi })
    await user.click(readButton())
    await screen.findByText('Reading preset 6 of 128…')

    rerender({ ...midi, outputs: [], selectedOutputId: '' })

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'The read stopped because the MIDI ports changed. Read again.',
      ),
    )
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('explains what reading needs on FM-1+VA without the FM1 as MIDI input', () => {
    const { midi } = fakeFm1()

    renderDialog({ midi: { ...midi, selectedInputId: '' } })

    expect(screen.queryByRole('button', { name: 'Read from FM1' })).toBeNull()
    expect(
      screen.getByText(
        'To read the presets from the FM1, choose it as the MIDI output and input, with SysEx allowed. Reading needs FM-1+VA FM-1_079 or later.',
      ),
    ).toBeTruthy()
  })

  it('offers no read on M-VAVE’s firmware', () => {
    const { midi } = fakeFm1({ firmware: { identity: 'FM-1_015', kind: 'mvave' } })

    renderDialog({ midi })

    expect(screen.queryByRole('button', { name: 'Read from FM1' })).toBeNull()
    expect(screen.queryByText(/To read the presets from the FM1/)).toBeNull()
  })
})
