// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import { type MidiController } from '@/hooks/use-midi'

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

// Page translators such as Google Translate treat buttons as inline text and may wrap them in
// <font> elements, so React can no longer remove a button from the footer directly.
function translateText(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  for (const text of texts) {
    const font = document.createElement('font')
    font.textContent = text.data
    text.replaceWith(font)
  }
}

describe('Fm1BankSelectionDialog', () => {
  it('switches from the SysEx warning to bank selection after a translator wraps its buttons', () => {
    const view = render(renderDialog(false))
    translateText(document.querySelector('dialog')!)

    view.rerender(renderDialog(true))

    expect(screen.getByRole('button', { hidden: true, name: 'Send to FM1' })).toBeTruthy()
    expect(screen.queryByRole('button', { hidden: true, name: 'Close' })).toBeNull()
  })
})
