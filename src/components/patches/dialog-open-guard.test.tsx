// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AddWorkspaceBankDialog } from '@/components/patches/add-workspace-bank-dialog'
import { DeleteWorkspaceBankDialog } from '@/components/patches/delete-workspace-bank-dialog'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { MidiConnectionRequiredDialog } from '@/components/midi/midi-connection-required-dialog'
import { RestoreFactoryBanksDialog } from '@/components/patches/restore-factory-banks-dialog'
import { DuplicatePatchesDialog } from '@/components/patches/duplicate-patches-dialog'
import { ImportDx7BankDialog } from '@/components/patches/import-dx7-bank-dialog'
import { ReceivePatchDialog } from '@/components/patches/receive-patch-dialog'
import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import { makeWorkspaceWithCopies } from '@/test/factory-voices'

// Browsers before the HTML spec changed it throw when a dialog that is already open is opened
// again, which an effect that runs twice, as React's StrictMode does, makes it do.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (this.open) throw new DOMException('Already open', 'InvalidStateError')
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

const openDialogs = {
  'add-bank': () => (
    <AddWorkspaceBankDialog
      bank="E"
      library={{ addBank: vi.fn() }}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      suggestedName="Bank 5"
    />
  ),
  'delete-bank': () => (
    <DeleteWorkspaceBankDialog bankName="Leads" onClose={vi.fn()} onDelete={vi.fn()} />
  ),
  'send-bank': () => (
    <Fm1BankSelectionDialog
      isSending={false}
      midi={{
        connectMidi: vi.fn(),
        disconnectMidi: vi.fn(),
        firmware: { kind: 'unidentified' },
        isConnecting: false,
        midiAccess: true,
        sysexAvailable: true,
      }}
      onClose={vi.fn()}
      onSend={vi.fn()}
    />
  ),
  'midi-required': () => (
    <MidiConnectionRequiredDialog
      midi={{
        connectMidi: vi.fn(),
        error: null,
        firmware: { kind: 'unidentified' },
        hasMidiOutput: false,
        isConnecting: false,
        midiAccess: false,
        outputs: [],
        selectedOutputId: '',
        setSelectedOutputId: vi.fn(),
      }}
      onClose={vi.fn()}
      onSend={vi.fn()}
    />
  ),
  'restore-factory': () => (
    <RestoreFactoryBanksDialog onClose={vi.fn()} onRestore={() => Promise.resolve()} />
  ),
  duplicates: () => (
    <DuplicatePatchesDialog
      library={makeWorkspaceWithCopies([{ name: 'MY BRASS', slot: 5 }])}
      onClose={vi.fn()}
    />
  ),
  'import-bank': () => (
    <ImportDx7BankDialog
      bank="B"
      bankName="Leads"
      library={{ importBank: vi.fn(), undoChange: vi.fn() }}
      onClose={vi.fn()}
      onPlay={vi.fn()}
      replacing
    />
  ),
  'receive-patch': () => (
    <ReceivePatchDialog
      library={{ replaceVoice: vi.fn() }}
      midi={{ inputs: [], selectedInputId: '', sysexAvailable: false }}
      onClose={vi.fn()}
      onReplaced={vi.fn()}
      patch={{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1 }}
    />
  ),
}

describe('a dialog that opens itself as it mounts', () => {
  it.each(Object.entries(openDialogs))(
    'opens once, without throwing, when its effect runs twice: %s',
    (_name, dialog) => {
      render(<ToastProvider>{dialog()}</ToastProvider>, { reactStrictMode: true })

      expect(screen.getByRole<HTMLDialogElement>('dialog').open).toBe(true)
    },
  )
})
