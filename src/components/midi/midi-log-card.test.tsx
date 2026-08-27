// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { MidiLogCard } from '@/components/midi/midi-log-card'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  cleanup()
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

function setClipboard(value: Clipboard | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value })
}

const log = [
  {
    createdAt: '12:34:56',
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
})
