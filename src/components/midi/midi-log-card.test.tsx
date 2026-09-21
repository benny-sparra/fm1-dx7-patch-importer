// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { MidiLogCard } from '@/components/midi/midi-log-card'
import { translatePageText } from '@/test/page-translator'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(async () => {
  cleanup()
  await setLocale('en')
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

function setClipboard(value: Clipboard | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value })
}

const log = [
  {
    createdAt: Date.parse('2026-09-21T13:04:05.000Z'),
    data: Uint8Array.from([0xf0, 0x43, 0xf7]),
    direction: 'out' as const,
    id: 'entry-1',
    message: 'Sent bank A.',
  },
]

describe('MidiLogCard clipboard boundaries', () => {
  it('confirms a successful copy', async () => {
    const writeText = vi.fn(async () => undefined)
    const user = userEvent.setup()
    setClipboard({ writeText } as unknown as Clipboard)
    render(<MidiLogCard log={log} />)

    await user.click(screen.getByRole('button', { name: 'View data' }))
    await user.click(screen.getByRole('button', { name: 'Copy hex' }))

    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('reports an unavailable clipboard without an unhandled rejection', async () => {
    const user = userEvent.setup()
    setClipboard(undefined)
    render(<MidiLogCard log={log} />)

    await user.click(screen.getByRole('button', { name: 'View data' }))
    await user.click(screen.getByRole('button', { name: 'Copy hex' }))

    expect(screen.getByRole('button', { name: 'Copy unavailable' })).toBeTruthy()
  })

  it('confirms a copy after a page translator replaces the button text', async () => {
    const writeText = vi.fn(async () => undefined)
    const user = userEvent.setup()
    setClipboard({ writeText } as unknown as Clipboard)
    const { container } = render(<MidiLogCard log={log} />)

    await user.click(screen.getByRole('button', { name: 'View data' }))
    translatePageText(container)
    await user.click(screen.getByRole('button', { name: 'Copy hex' }))

    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
  })
})

describe('MidiLogCard times', () => {
  it('shows when each entry was logged in the interface language', async () => {
    await setLocale('de')
    render(<MidiLogCard log={log} />)

    const time = new Intl.DateTimeFormat('de', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(log[0].createdAt)
    expect(screen.getByText(time)).toBeTruthy()
  })

  it('groups the digits of a message’s byte count in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    render(<MidiLogCard log={[{ ...log[0], data: new Uint8Array(4104) }]} />)

    await user.click(screen.getByRole('button', { name: 'Daten anzeigen' }))

    expect(screen.getByText('4.104 Bytes')).toBeTruthy()
  })
})
