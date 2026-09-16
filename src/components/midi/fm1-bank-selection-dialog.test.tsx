// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { type MidiController } from '@/hooks/use-midi'
import { translatePageText } from '@/test/page-translator'

afterEach(cleanup)

function renderDialog(sysexAvailable: boolean) {
  const midi = { isConnecting: false, midiAccess: true, sysexAvailable } as MidiController
  return (
    <Fm1BankSelectionDialog
      dialogRef={createRef<HTMLDialogElement>()}
      isSending={false}
      midi={midi}
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
