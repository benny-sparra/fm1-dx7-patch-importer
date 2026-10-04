// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import { dx7PackedVoiceSize, packDx7Voice, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { FM1_VOICE_PARAMETER_COUNT } from '@/lib/fm1-parameters'
import { fm1VaPresetPayloadStart, readFm1VaMessageRecord } from '@/lib/fm1-va-preset-message'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'
import { parseFm1VaReply } from '@/lib/fm1-va-sysex'
import { MidiLogStore } from '@/lib/midi-log-store'
import { voiceId } from '@/lib/patch-library'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { fm1VaTestPatchName } from '@/test/fm1-va-backup-file'
import { capturedOrgan3Reply } from '@/test/fm1-va-captures'
import {
  capturedVirtualAnalogRecord,
  capturedVirtualAnalogVoice,
} from '@/test/fm1-va-virtual-analog'
import { makeFm1VaReply } from '@/test/fm1-va-replies'

import { WriteFm1VaPresetsDialog } from './write-fm1-va-presets-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  // Writes are 3 s apart and each listens for 1.5 s, so time is simulated.
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await setLocale('en-GB')
})

type Midi = ComponentProps<typeof WriteFm1VaPresetsDialog>['midi']
type Library = ComponentProps<typeof WriteFm1VaPresetsDialog>['library']

// ORGAN 3's record as FM-1_093 stores it, which the fake FM1 gives every preset.
const storedRecord = (parseFm1VaReply(capturedOrgan3Reply)?.data ?? new Uint8Array()).slice(
  dx7PackedVoiceSize,
)

/** The voice the fake FM1 starts with in a slot, named as the test backup names it. */
function storedVoice(slot: number): Dx7Voice {
  return updateDx7VoiceName({ data: new Uint8Array(128), name: '' }, fm1VaTestPatchName(slot))
}

type Fm1Options = {
  /** Slots whose writes the FM1 stores wrongly, so they read back differently. */
  garbledSlots?: number[]
  /** The status the FM1 answers every read with, instead of the preset. */
  status?: number
  /** The first slot the FM1 leaves unanswered, to hold a read in progress. */
  unansweredFrom?: number
}

/**
 * An FM1 on FM-1+VA FM-1_093 holding `storedVoice` and `storedRecord` in every slot, which stores
 * what each preset write carries and answers later reads with it.
 */
function fakeFm1({ garbledSlots = [], status, unansweredFrom = Infinity }: Fm1Options = {}) {
  const stored = new Map<number, number[]>()
  const ports = makeFakeFm1Ports({
    presetReply: (slot) =>
      // A reply of another kind, which a read ignores, leaves the read waiting.
      slot >= unansweredFrom
        ? makeFm1VaReply({ argument: slot, kind: 0x51 })
        : makeFm1VaReply({
            argument: slot,
            data: stored.get(slot) ?? [...storedVoice(slot).data, ...storedRecord],
            status,
          }),
    presetWrite: (message) => {
      const slot = message[5]
      const voice = packDx7Voice(
        message.slice(fm1VaPresetPayloadStart, fm1VaPresetPayloadStart + FM1_VOICE_PARAMETER_COUNT),
      )
      const record = readFm1VaMessageRecord(message)
      if (garbledSlots.includes(slot)) record[0] ^= 1
      stored.set(slot, [...voice.data, ...record])
    },
  })
  const midi: Midi = {
    firmware: { identity: 'FM-1_093', kind: 'fm1-va' },
    logStore: new MidiLogStore([]),
    sysexAvailable: true,
    ...makeFakeFm1Devices(ports),
  }
  const writtenSlots = () =>
    ports.output.send.mock.calls.filter(([data]) => data[4] === 0x04).map(([data]) => data[5])
  return { midi, ports, stored, writtenSlots }
}

/** A library whose banks A–D hold exactly what the fake FM1 starts with, apart from `voices`. */
function matchingLibrary(voices: Library['voices'] = {}): Library {
  const ids = Array.from(
    { length: 128 },
    (_, slot) =>
      [voiceId(String.fromCharCode(65 + Math.floor(slot / 32)), (slot % 32) + 1), slot] as const,
  )
  return {
    bankNames: {},
    favourites: [],
    virtualAnalog: {},
    effects: Object.fromEntries(ids.map(([id]) => [id, fm1VaRecordEffects(storedRecord)])),
    records: Object.fromEntries(ids.map(([id]) => [id, storedRecord])),
    voices: { ...Object.fromEntries(ids.map(([id, slot]) => [id, storedVoice(slot)])), ...voices },
    workspaceBanks: ['A', 'B', 'C', 'D'],
  }
}

/** The library with two patches renamed, in A01 and C05, so two presets would change. */
const twoChanges = () =>
  matchingLibrary({
    [voiceId('A', 1)]: updateDx7VoiceName(storedVoice(0), 'MY PAD'),
    [voiceId('C', 5)]: updateDx7VoiceName(storedVoice(68), 'MY BASS'),
  })

function renderDialog(midi: Midi, library: Library = twoChanges(), sendBank?: string) {
  const onClose = vi.fn()
  render(
    <ToastProvider>
      <WriteFm1VaPresetsDialog
        library={library}
        midi={midi}
        onClose={onClose}
        sendBank={sendBank}
      />
    </ToastProvider>,
  )
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  return { dialog: screen.getByRole<HTMLDialogElement>('dialog'), onClose, user }
}

/** Lets every write, its spacing, and its listening window pass. */
async function finishWriting(count: number) {
  await act(() => vi.advanceTimersByTimeAsync(count * 4500))
}

const bankSection = (bank: string) => screen.getByRole('region', { name: `FM1 bank ${bank}` })

/** The switch that says whether an FM1 bank is written. */
const bankSwitch = (bank: string) =>
  within(bankSection(bank)).getByRole<HTMLInputElement>('switch', {
    name: `Write to FM1 bank ${bank}`,
  })

/** The control that chooses which library bank an FM1 bank is written from. */
const source = (bank: string) =>
  within(bankSection(bank)).getByRole<HTMLSelectElement>('combobox', { name: 'Write from' })

describe('WriteFm1VaPresetsDialog', () => {
  it('reads the FM1 as it opens and says what each bank would change', async () => {
    renderDialog(fakeFm1().midi)

    expect(await screen.findByRole('button', { name: 'Write 2 patches…' })).toBeTruthy()
    expect(within(bankSection('A')).getByText('One patch differs.')).toBeTruthy()
    expect(within(bankSection('B')).getByText('Every patch matches.')).toBeTruthy()
    expect(within(bankSection('C')).getByText('One patch differs.')).toBeTruthy()
  })

  it('lights an LED for each preset it reads and blinks the one being read', async () => {
    renderDialog(fakeFm1({ unansweredFrom: 5 }).midi)

    await screen.findByText('Reading preset 6 of 128…')

    const leds = [...document.querySelectorAll<HTMLElement>('.read-led')]
    expect(leds.map((led) => led.dataset.state ?? 'off')).toEqual([
      ...Array<string>(5).fill('read'),
      'reading',
      ...Array<string>(122).fill('off'),
    ])
    expect(leds[0].closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('names every preset it would replace before writing anything', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)

    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))

    expect(screen.getByRole('heading', { name: 'Replace these presets on the FM1?' })).toBe(
      document.activeElement,
    )
    expect(screen.getByText('001 A01 PATCH → MY PAD')).toBeTruthy()
    expect(screen.getByText('069 C05 PATCH → MY BASS')).toBeTruthy()
    expect(screen.getByText(/the FM1 can’t undo it/)).toBeTruthy()
    expect(fm1.writtenSlots()).toEqual([])
  })

  it('writes only the presets that differ, reads each back, and closes', async () => {
    const fm1 = fakeFm1()
    const { dialog, onClose, user } = renderDialog(fm1.midi)
    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))

    await user.click(screen.getByRole('button', { name: 'Write 2 patches' }))
    await finishWriting(2)

    expect(fm1.writtenSlots()).toEqual([0, 68])
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByText('Wrote 2 patches to the FM1.')).toBeTruthy()
  })

  it('goes back to the banks without writing when the confirmation is cancelled', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)
    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Write 2 patches…' })).toBeTruthy()
    expect(fm1.writtenSlots()).toEqual([])
  })

  it('writes nothing to a bank switched off', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)
    await screen.findByRole('button', { name: 'Write 2 patches…' })

    await user.click(bankSwitch('C'))
    await user.click(screen.getByRole('button', { name: 'Write one patch…' }))
    await user.click(screen.getByRole('button', { name: 'Write one patch' }))
    await finishWriting(1)

    expect(fm1.writtenSlots()).toEqual([0])
  })

  it('writes a library bank over another FM1 bank chosen for it', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)
    await screen.findByRole('button', { name: 'Write 2 patches…' })

    await user.selectOptions(source('D'), 'Bank 3')

    // Every patch of library bank C differs from FM1 bank D's, whose names hold another letter.
    expect(within(bankSection('D')).getByText('32 patches differ.')).toBeTruthy()
  })

  it('waits for a bank to be switched on before its library bank can be chosen', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)
    await screen.findByRole('button', { name: 'Write 2 patches…' })

    await user.click(bankSwitch('C'))

    expect(source('C').disabled).toBe(true)
    expect(within(bankSection('C')).queryByText('One patch differs.')).toBeNull()
  })

  it('starts a bank the library does not have switched off, offering the first library bank', async () => {
    const fm1 = fakeFm1()
    const library = { ...twoChanges(), workspaceBanks: ['A', 'B', 'C'] }
    const { user } = renderDialog(fm1.midi, library)
    await screen.findByRole('button', { name: 'Write 2 patches…' })

    expect(bankSwitch('D').checked).toBe(false)
    expect(source('D').value).toBe('A')
    await user.click(bankSwitch('D'))
    expect(screen.getByRole('button', { name: 'Write 34 patches…' })).toBeTruthy()
  })

  it('cannot be closed while writing', async () => {
    const fm1 = fakeFm1()
    const { dialog, user } = renderDialog(fm1.midi)
    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))
    await user.click(screen.getByRole('button', { name: 'Write 2 patches' }))

    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog, cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true)
    await finishWriting(2)
  })

  it('stops after the patch being written when asked', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi)
    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))
    await user.click(screen.getByRole('button', { name: 'Write 2 patches' }))

    await user.click(screen.getByRole('button', { name: 'Stop after this patch' }))
    await finishWriting(2)

    expect(fm1.writtenSlots()).toEqual([0])
    expect(screen.getByText('Stopped after 1 of 2 patches. The rest are unchanged.')).toBeTruthy()
  })

  it('stops at a preset that does not read back as written, and reads the FM1 again', async () => {
    const fm1 = fakeFm1({ garbledSlots: [0] })
    const { dialog, user } = renderDialog(fm1.midi)
    await user.click(await screen.findByRole('button', { name: 'Write 2 patches…' }))

    await user.click(screen.getByRole('button', { name: 'Write 2 patches' }))
    await finishWriting(1)

    expect(fm1.writtenSlots()).toEqual([0])
    expect(dialog.open).toBe(true)
    expect(
      screen.getByText(
        'Preset 001 didn’t read back as written, so writing stopped after 0 of 2 patches.',
      ),
    ).toBeTruthy()
    // The FM1 is read again, so the banks show what it now holds.
    expect(await screen.findByRole('button', { name: 'Write 2 patches…' })).toBeTruthy()
  })

  it('explains a read the FM1 refuses while its Sequencer plays', async () => {
    renderDialog(fakeFm1({ status: 3 }).midi)

    expect(
      await screen.findByText(
        'The FM1 can’t send its presets while its Sequencer is playing. Stop it and read again.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Read from FM1' })).toBeTruthy()
  })

  it('counts the presets it would write in the interface language', async () => {
    await setLocale('de')
    renderDialog(fakeFm1().midi)

    expect(await screen.findByRole('button', { name: '2 Sounds schreiben…' })).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'FM1-Bank A' })).getByText(
        'Ein Sound unterscheidet sich.',
      ),
    ).toBeTruthy()
  })
})

/** `count` favourites, each a copy of a patch named for its place, which no FM1 preset holds. */
function favourites(count: number): Library['favourites'] {
  return Array.from({ length: count }, (_, index) => ({
    effects: fm1VaRecordEffects(storedRecord),
    id: `favourite-${index}`,
    origin: { bankNumber: 1 },
    voice: updateDx7VoiceName(storedVoice(index), `FAV ${index + 1}`),
  }))
}

const destination = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Write over' })

describe('WriteFm1VaPresetsDialog with Virtual Analog patches', () => {
  /** The library with the Virtual Analog preset 097, as read from the FM1, in slot A01. */
  function withVirtualAnalogInA1(): Library {
    const library = matchingLibrary()
    const id = voiceId('A', 1)
    const voices = { ...library.voices }
    delete voices[id]
    return {
      ...library,
      effects: { ...library.effects, [id]: fm1VaRecordEffects(capturedVirtualAnalogRecord()) },
      records: { ...library.records, [id]: capturedVirtualAnalogRecord() },
      virtualAnalog: { [id]: capturedVirtualAnalogVoice() },
      voices,
    }
  }

  it('writes a Virtual Analog patch with its voice bytes as read, and confirms it', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi, withVirtualAnalogInA1())

    await user.click(await screen.findByRole('button', { name: 'Write one patch…' }))
    expect(screen.getByText('001 A01 PATCH → VOICE 97')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Write one patch' }))
    await finishWriting(1)

    expect(fm1.writtenSlots()).toEqual([0])
    expect(fm1.stored.get(0)?.slice(0, 128)).toEqual(Array.from(capturedVirtualAnalogVoice()))
    expect(screen.getByText('Wrote one patch to the FM1.')).toBeTruthy()
  })

  it('says when a Virtual Analog patch cannot be stored exactly, and keeps that preset', async () => {
    const library = withVirtualAnalogInA1()
    library.virtualAnalog[voiceId('A', 1)][110] |= 0x60
    renderDialog(fakeFm1().midi, library)

    expect(
      await screen.findByText(
        'Every patch matches. One Virtual Analog patch can’t be stored exactly, so its preset is kept.',
      ),
    ).toBeTruthy()
  })
})

describe('WriteFm1VaPresetsDialog sending one bank', () => {
  it('writes the bank over the FM1 bank of the same letter, only where it differs', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi, twoChanges(), 'C')

    expect(await screen.findByRole('dialog', { name: 'Send Bank 3 to the FM1' })).toBeTruthy()
    expect(destination().value).toBe('C')
    expect(screen.getByText('One patch differs.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Write one patch…' }))
    expect(screen.getByText('069 C05 PATCH → MY BASS')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Write one patch' }))
    await finishWriting(1)

    expect(fm1.writtenSlots()).toEqual([68])
  })

  it('writes the bank over another FM1 bank chosen for it', async () => {
    const fm1 = fakeFm1()
    const { user } = renderDialog(fm1.midi, twoChanges(), 'C')
    await screen.findByRole('button', { name: 'Write one patch…' })

    await user.selectOptions(destination(), 'FM1 bank D')

    // Every patch of library bank C differs from FM1 bank D's, whose names hold another letter.
    expect(screen.getByText('32 patches differ.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Write 32 patches…' })).toBeTruthy()
  })

  it('starts a bank without an FM1 letter on FM1 bank A', async () => {
    const library = matchingLibrary({ [voiceId('E', 1)]: storedVoice(0) })
    renderDialog(fakeFm1().midi, { ...library, workspaceBanks: ['A', 'B', 'C', 'D', 'E'] }, 'E')

    expect(
      (await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Write over' })).value,
    ).toBe('A')
  })

  it('writes a short Favourites only as far as it goes, and says so', async () => {
    const fm1 = fakeFm1()
    const library = { ...matchingLibrary(), favourites: favourites(3) }
    const { user } = renderDialog(fm1.midi, library, 'favourites')

    expect(await screen.findByRole('dialog', { name: 'Send Favourites to the FM1' })).toBeTruthy()
    expect(
      await screen.findByText(
        'Favourites holds 3 patches, so the FM1 bank’s other presets stay as they are.',
      ),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Write 3 patches…' }))
    await user.click(screen.getByRole('button', { name: 'Write 3 patches' }))
    await finishWriting(3)

    expect(fm1.writtenSlots()).toEqual([0, 1, 2])
  })

  it('writes only the first 32 favourites, and says how many stay behind', async () => {
    const library = { ...matchingLibrary(), favourites: favourites(34) }
    renderDialog(fakeFm1().midi, library, 'favourites')

    expect(
      await screen.findByText(
        'A bank holds 32 patches, so only the first 32 favourites are sent. The last 2 stay here.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Write 32 patches…' })).toBeTruthy()
  })

  it('names the bank it sends in the interface language', async () => {
    await setLocale('de')
    renderDialog(fakeFm1().midi, twoChanges(), 'C')

    expect(await screen.findByRole('dialog', { name: 'Bank 3 an den FM1 senden' })).toBeTruthy()
    expect(
      await screen.findByText(
        'Schreibt Bank 3 über eine der Presetbänke des FM1. Nur Sounds, die sich unterscheiden, werden geschrieben.',
      ),
    ).toBeTruthy()
  })
})
