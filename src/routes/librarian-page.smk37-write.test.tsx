// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { Dx7Voice } from '@/lib/dx7'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import {
  emptyPatchLibrary,
  getBankVoices,
  importVoices,
  makeDemoVoices,
  makePatches,
} from '@/lib/patch-library'
import { makeDx7SingleVoicePayload } from '@/lib/dx7'
import { makeFakeFm1Devices, makeFakeFm1Ports } from '@/test/fake-fm1-midi'
import { makeLibrarianLibrary, makeLibrarianMidi, slotMenuName } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

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
  sessionStorage.clear()
  await setLocale('en-GB')
})

const smk37V15: Fm1Firmware = { identity: 'SMK-37 Pro_015', kind: 'smk37' }
const demo = makeDemoVoices()
const firstName = demo[0].name

function renderPage(firmware: Fm1Firmware) {
  const snapshot = importVoices(emptyPatchLibrary(['A']), 'A', demo)
  const library = makeLibrarianLibrary({
    ...snapshot,
    getBankVoices: (bank: string, initVoice?: Dx7Voice) => getBankVoices(snapshot, bank, initVoice),
    patches: makePatches(snapshot),
  })
  const ports = makeFakeFm1Ports()
  const midi = makeLibrarianMidi({
    ...makeFakeFm1Devices(ports),
    firmware,
    hasMidiOutput: true,
    sysexAvailable: true,
  })
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { sendSysex: ports.output.sendSysex, user: userEvent.setup() }
}

describe('LibrarianPage writing a patch to the SMK-37', () => {
  it.each([
    ['an FM1 on V15', { identity: 'FM-1_015', kind: 'mvave' }],
    ['an SMK-37 on a release not yet tested', { identity: 'SMK-37 Pro_016', kind: 'smk37' }],
  ] as const)('offers no write on %s', async (_name, firmware) => {
    const { user } = renderPage(firmware)

    await user.click(screen.getByRole('button', { name: slotMenuName(firstName) }))

    expect(screen.queryByRole('menuitem', { name: 'Write to SMK-37…' })).toBeNull()
  })

  it('writes the slot’s voice once confirmed and says it was written', async () => {
    const { sendSysex, user } = renderPage(smk37V15)
    await user.click(screen.getByRole('button', { name: slotMenuName(firstName) }))
    await user.click(screen.getByRole('menuitem', { name: 'Write to SMK-37…' }))

    const dialog = await screen.findByRole('dialog', {
      name: `Write A01 “${firstName}” to the SMK-37?`,
    })
    expect(sendSysex).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Write patch' }))

    expect(sendSysex).toHaveBeenCalledExactlyOnceWith(0x43, makeDx7SingleVoicePayload(demo[0], 1))
    expect(await screen.findByText(`Wrote “${firstName}” to the SMK-37.`)).toBeTruthy()
  })
})
