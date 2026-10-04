// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1BankSelectionDialog } from '@/components/midi/fm1-bank-selection-dialog'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { shouldShowFm1BankSelectionDialog } from '@/lib/session'
import { translatePageText } from '@/test/page-translator'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const mvave: Fm1Firmware = { identity: 'FM-1_015', kind: 'mvave' }

function renderDialog(sysexAvailable: boolean, firmware = mvave, isSending = false) {
  return (
    <Fm1BankSelectionDialog
      isSending={isSending}
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

  it('stops showing for the session once closed with its Don’t show switch on', () => {
    render(renderDialog(true))
    const dontShow = screen.getByRole<HTMLInputElement>('switch', {
      hidden: true,
      name: 'Don’t show me again this session',
    })

    fireEvent.click(dontShow)
    fireEvent(screen.getByRole('dialog', { hidden: true }), new Event('close'))

    expect(dontShow.checked).toBe(true)
    expect(shouldShowFm1BankSelectionDialog()).toBe(false)
  })

  it('shows again next time when closed with its Don’t show switch off', () => {
    render(renderDialog(true))

    fireEvent(screen.getByRole('dialog', { hidden: true }), new Event('close'))

    expect(shouldShowFm1BankSelectionDialog()).toBe(true)
  })

  it('runs a barber pole on its Send button while the bank is on the way', () => {
    const { rerender } = render(renderDialog(true, mvave, true))
    expect(screen.getByRole('button', { hidden: true, name: 'Sending…' }).classList).toContain(
      'barber-pole',
    )

    rerender(renderDialog(true, mvave, false))

    expect(
      screen.getByRole('button', { hidden: true, name: 'Send to FM1' }).classList,
    ).not.toContain('barber-pole')
  })

  it('gives M-VAVE firmware its knob steps and no FM-1+VA note', () => {
    render(renderDialog(true))

    expect(
      screen.getByText('Turn Knob 1, 2, 3 or 4 to choose destination bank A, B, C or D.'),
    ).toBeTruthy()
    expect(screen.queryByText(/FM-1\+VA/)).toBeNull()
  })

  it('gives FM-1+VA firmware the Replace Bank steps, which start on bank A', () => {
    render(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(
      screen.getByText(
        'The FM1 asks “Replace Bank A?” and starts on bank A, whichever bank you send.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Turn ALGORITHM until the question names the destination bank: A, B, C or D.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/Turn Knob 1/)).toBeNull()
  })

  it('warns FM-1+VA firmware that Replace also replaces the bank’s factory presets', () => {
    render(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(
      screen.getByText(
        'Turn SELECT to Replace and press SEL to store the 32 patches, or press HOME to cancel. They also replace that bank’s factory presets permanently.',
      ),
    ).toBeTruthy()
  })

  it('shows FM-1+VA firmware its Replace Bank screen', () => {
    render(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(screen.getByRole('img', { name: /asking “Replace Bank A\?”/ })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /32 Voice Save To/ })).toBeNull()
  })

  it('shows the M-VAVE screen while the firmware is not identified', () => {
    render(renderDialog(true, { kind: 'checking' }))

    expect(screen.getByRole('img', { name: /32 Voice Save To/ })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Replace Bank A/ })).toBeNull()
  })

  it('says how FM-1+VA differs while the firmware is not identified', () => {
    render(renderDialog(true, { kind: 'unidentified' }))

    expect(screen.getByText(/Turn Knob 1, 2, 3 or 4/)).toBeTruthy()
    expect(screen.getByText(/If your FM1 runs Baud Girl’s firmware/)).toBeTruthy()
  })

  it('says Felucca ignores DX7 banks rather than how FM-1+VA differs', () => {
    render(renderDialog(true, { identity: 'FM-1_908', kind: 'felucca' }))

    expect(
      screen.getByText(
        'Felucca ignores DX7 banks, so sending this bank does not change its presets.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/If your FM1 runs Baud Girl’s firmware/)).toBeNull()
  })

  it('changes to the FM-1+VA steps once identified, after a page translator replaces its text', () => {
    const view = render(renderDialog(true, { kind: 'checking' }))
    translatePageText(view.container)

    view.rerender(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(screen.getByText(/Turn SELECT to Replace and press SEL/)).toBeTruthy()
    expect(screen.queryByText(/Turn Knob 1/)).toBeNull()
  })
})
