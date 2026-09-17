// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { MidiLogDialog } from '@/components/midi/midi-log-dialog'
import { makeLogEntry } from '@/lib/midi'
import { MidiLogStore } from '@/lib/midi-log-store'

const downloadFile = vi.hoisted(() => vi.fn())
vi.mock('@/lib/download-file', () => ({ downloadFile }))

beforeEach(() => {
  downloadFile.mockReset()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
})

afterEach(cleanup)

describe('MidiLogDialog', () => {
  it('enables the log once MIDI activity is recorded, whatever the start-up message says', () => {
    const store = new MidiLogStore([makeLogEntry('system', 'Prêt.')])
    render(<MidiLogDialog logStore={store} />)
    const button = screen.getByRole('button', { name: 'MIDI log' }) as HTMLButtonElement

    expect(button.disabled).toBe(true)

    act(() => store.append(makeLogEntry('system', 'MIDI connected.')))

    expect(button.disabled).toBe(false)
  })

  it('downloads the log as a text file with each message and its full hex data', async () => {
    const user = userEvent.setup()
    const store = new MidiLogStore([])
    render(<MidiLogDialog logStore={store} />)
    act(() =>
      store.append(
        makeLogEntry(
          'out',
          'Sent FM1 parameter 123 = 14.',
          [0xf0, 0x43, 0x10, 0x00, 0x7b, 0x0e, 0xf7],
        ),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'MIDI log' }))
    await user.click(screen.getByRole('button', { name: 'Download log' }))

    expect(downloadFile).toHaveBeenCalledOnce()
    const [file, filename] = downloadFile.mock.calls[0] as [Blob, string]
    expect(filename).toMatch(/^fm1-midi-log-.+\.txt$/)
    const text = await file.text()
    expect(text).toContain('OUT  Sent FM1 parameter 123 = 14.')
    expect(text).toContain('F0 43 10 00 7B 0E F7')
  })
})
