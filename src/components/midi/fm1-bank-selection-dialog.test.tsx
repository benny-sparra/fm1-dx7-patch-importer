// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
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

function renderDialog(
  sysexAvailable: boolean,
  firmware = mvave,
  isSending = false,
  onSend = vi.fn(),
) {
  return (
    <Fm1BankSelectionDialog
      isSending={isSending}
      midi={{
        connectMidi: vi.fn(),
        disconnectMidi: vi.fn(),
        firmware,
        isConnecting: false,
        midiAccess: true,
        outputs: [],
        selectedOutputId: '',
        sysexAvailable,
      }}
      onClose={vi.fn()}
      onSend={onSend}
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

  // A bank is sent rarely enough that the steps are worth reading every time.
  it('offers no switch to stop showing the steps', () => {
    render(renderDialog(true))

    expect(screen.queryByRole('switch', { hidden: true })).toBeNull()
  })

  it('loads its Send button like a tape, with the watch cursor, while the bank is on the way', () => {
    const { rerender } = render(renderDialog(true, mvave, true))
    const sending = screen.getByRole('button', { hidden: true, name: 'Sending…' }).classList
    expect(sending).toContain('barber-pole')
    expect(sending).toContain('tape-loader')

    rerender(renderDialog(true, mvave, false))

    expect(
      screen.getByRole('button', { hidden: true, name: 'Send to FM1' }).classList,
    ).not.toContain('tape-loader')
  })

  // A disabled button drops focus, and a screen reader hears nothing of what replaced its name.
  it('keeps focus on its Send button while sending, which says so and ignores another press', () => {
    const onSend = vi.fn()
    const { rerender } = render(renderDialog(true, mvave, false, onSend))
    screen.getByRole('button', { hidden: true, name: 'Send to FM1' }).focus()

    rerender(renderDialog(true, mvave, true, onSend))

    const sending = screen.getByRole<HTMLButtonElement>('button', {
      hidden: true,
      name: 'Sending…',
    })
    expect(document.activeElement).toBe(sending)
    expect(sending.disabled).toBe(false)
    expect(sending.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('status', { hidden: true }).textContent).toBe('Sending…')
    fireEvent.click(sending)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends when its Send button is pressed', () => {
    const onSend = vi.fn()
    render(renderDialog(true, mvave, false, onSend))

    fireEvent.click(screen.getByRole('button', { hidden: true, name: 'Send to FM1' }))

    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('gives M-VAVE firmware its knob steps and no FM-1+VA note', () => {
    render(renderDialog(true))

    expect(
      screen.getByText(
        'Turn Knob 1, 2, 3 or 4 to choose destination bank A, B, C or D, or turn SELECT left to cancel.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('The FM1 saves the 32 patches as soon as you choose a bank.'),
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

  it('says M-VAVE’s Official Open ignores DX7 banks rather than how FM-1+VA differs', () => {
    render(renderDialog(true, { identity: 'FM-1_8000012', kind: 'official-open' }))

    expect(
      screen.getByText(
        'M-VAVE’s Open firmware ignores DX7 banks, so sending this bank does not change its projects.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/If your FM1 runs Baud Girl’s firmware/)).toBeNull()
  })

  it('says Felucca and SLOOP ignore DX7 banks for FM-1_900, the name both report', () => {
    render(renderDialog(true, { identity: 'FM-1_900', kind: 'felucca' }))

    expect(
      screen.getByText(
        'Felucca and SLOOP ignore DX7 banks, so sending this bank does not change the FM1’s presets.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/^Felucca ignores DX7 banks/)).toBeNull()
  })

  it('offers an SMK-37 no bank, since it would save one over its presets', () => {
    render(renderDialog(true, { identity: 'SMK-37 Pro_015', kind: 'smk37' }))

    expect(
      screen.getByRole('dialog', {
        hidden: true,
        name: 'The SMK-37 would save a bank over its presets, so none is sent',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { hidden: true, name: 'Send to FM1' })).toBeNull()
    expect(
      screen.getByRole('button', { hidden: true, name: 'Close bank selection instructions' }),
    ).toBeTruthy()
  })

  it('offers DX747 no bank, since it drops one, and says so in German', async () => {
    await setLocale('de')
    try {
      render(renderDialog(true, { identity: 'FM-1_8747747', kind: 'dx747' }))

      expect(
        screen.getByRole('dialog', {
          hidden: true,
          name: 'DX747 nimmt keine Bank über MIDI an, deshalb wird keine gesendet',
        }),
      ).toBeTruthy()
      expect(screen.queryByRole('button', { hidden: true, name: 'An FM1 senden' })).toBeNull()
    } finally {
      await setLocale('en-GB')
    }
  })

  it('offers DX747 no bank to send', () => {
    render(renderDialog(true, { identity: 'FM-1_8747747', kind: 'dx747' }))

    expect(
      screen.getByRole('dialog', {
        hidden: true,
        name: 'DX747 takes no bank over MIDI, so none is sent',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { hidden: true, name: 'Send to FM1' })).toBeNull()
  })

  it('changes to the FM-1+VA steps once identified, after a page translator replaces its text', () => {
    const view = render(renderDialog(true, { kind: 'checking' }))
    translatePageText(view.container)

    view.rerender(renderDialog(true, { identity: 'FM-1_089', kind: 'fm1-va' }))

    expect(screen.getByText(/Turn SELECT to Replace and press SEL/)).toBeTruthy()
    expect(screen.queryByText(/Turn Knob 1/)).toBeNull()
  })
})
