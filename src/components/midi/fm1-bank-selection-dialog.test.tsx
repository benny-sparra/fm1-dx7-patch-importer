// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { translatePageText } from '@/test/page-translator'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(cleanup)

const mvave: Fm1Firmware = { identity: 'FM-1_015', kind: 'mvave' }

function renderDialog(sysexAvailable: boolean, firmware = mvave) {
  return (
    <Fm1BankSelectionDialog
      isSending={false}
      midi={{
        connectMidi: vi.fn(),
        disconnectMidi: vi.fn(),
        firmware,
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

  it('gives M-VAVE firmware its knob steps and no FM-1+VA note', () => {
    render(renderDialog(true))

    expect(
      screen.getByText('Turn Knob 1, 2, 3 or 4 to choose destination bank A, B, C or D.'),
    ).toBeTruthy()
    expect(screen.queryByText(/FM-1\+VA/)).toBeNull()
  })

  it('gives FM-1+VA firmware the Write the bank steps, which start on bank A', () => {
    render(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(
      screen.getByText(
        'The FM1 asks “Write the bank?” and starts on bank A, whichever bank you send.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Turn ALGORITHM until the question names the destination bank: A, B, C or D.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/Turn Knob 1/)).toBeNull()
  })

  it('shows FM-1+VA firmware its Write the bank screen', () => {
    render(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(screen.getByRole('img', { name: /asking “Write the bank\?”/ })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /32 Voice Save To/ })).toBeNull()
  })

  it('shows the M-VAVE screen while the firmware is not identified', () => {
    render(renderDialog(true, { kind: 'checking' }))

    expect(screen.getByRole('img', { name: /32 Voice Save To/ })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Write the bank/ })).toBeNull()
  })

  it('says how FM-1+VA differs while the firmware is not identified', () => {
    render(renderDialog(true, { kind: 'unidentified' }))

    expect(screen.getByText(/Turn Knob 1, 2, 3 or 4/)).toBeTruthy()
    expect(screen.getByText(/If your FM1 runs FM-1\+VA firmware/)).toBeTruthy()
  })

  it('says Felucca ignores DX7 banks rather than how FM-1+VA differs', () => {
    render(renderDialog(true, { identity: 'FM-1_908', kind: 'felucca' }))

    expect(
      screen.getByText(
        'Felucca ignores DX7 banks, so sending this bank does not change its presets.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/If your FM1 runs FM-1\+VA firmware/)).toBeNull()
  })

  it('changes to the FM-1+VA steps once identified, after a page translator replaces its text', () => {
    const view = render(renderDialog(true, { kind: 'checking' }))
    translatePageText(view.container)

    view.rerender(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(screen.getByText(/Turn SELECT to Write and press SEL/)).toBeTruthy()
    expect(screen.queryByText(/Turn Knob 1/)).toBeNull()
  })
})
