// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { translatePageText } from '@/test/page-translator'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(cleanup)

function renderDialog(sysexAvailable: boolean) {
  return (
    <Fm1BankSelectionDialog
      isSending={false}
      midi={{
        connectMidi: vi.fn(),
        disconnectMidi: vi.fn(),
        isConnecting: false,
        midiAccess: true,
        sysexAvailable,
      }}
      onClose={vi.fn()}
      onSend={vi.fn()}
    />
  )
}

describe('Fm1BankSelectionDialog', () => {
  it('switches from the SysEx warning to bank selection after a page translator replaces its text', () => {
    const view = render(renderDialog(false))
    translatePageText(view.container)

    view.rerender(renderDialog(true))

    expect(screen.getByRole('button', { hidden: true, name: 'Send to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { hidden: true, name: 'Close' })).toBeNull()
  })
})
