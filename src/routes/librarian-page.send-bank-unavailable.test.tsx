// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeDemoVoices } from '@/lib/patch-library'
import {
  makeLibrarianLibrary,
  makeLibrarianMidi,
  sendBankThroughGuide,
} from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

const reportBankTransferFailure = vi.hoisted(() => vi.fn())

vi.mock('@/lib/monitoring', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/monitoring')>()),
  reportBankTransferFailure,
}))
// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/lib/init-voice', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  reportBankTransferFailure.mockClear()
})

describe('LibrarianPage sending a bank whose Init voice chunk fails to load', () => {
  it('explains it, sends nothing, and does not report a transport failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const sendBank = vi.fn()
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={makeLibrarianLibrary({
            bankNames: { A: 'Studio' },
            loadedBanks: ['A'],
            patches: [
              { bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 },
            ],
            virtualAnalog: { 'bank-A-2': new Uint8Array(128) },
            voices: { 'bank-A-1': makeDemoVoices()[0] },
            workspaceBanks: ['A'],
          })}
          midi={makeLibrarianMidi({ hasMidiOutput: true, sendBank, sysexAvailable: true })}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    await sendBankThroughGuide(user)

    expect(
      await screen.findByText(
        'The bank could not be prepared for sending. Reload the page and try again.',
      ),
    ).toBeTruthy()
    expect(sendBank).not.toHaveBeenCalled()
    expect(reportBankTransferFailure).not.toHaveBeenCalled()
  })
})
