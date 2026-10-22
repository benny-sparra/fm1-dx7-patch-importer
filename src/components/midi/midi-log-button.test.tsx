// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { MidiLogButton } from '@/components/midi/midi-log-button'
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
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(cleanup)

function storeWithActivity() {
  const store = new MidiLogStore([])
  store.append(
    makeLogEntry('out', 'Sent FM1 parameter 123 = 14.', [0xf0, 0x43, 0x10, 0x00, 0x7b, 0x0e, 0xf7]),
  )
  return store
}

const logDialog = () => document.querySelector('dialog')

describe('MidiLogButton', () => {
  it('enables the log once MIDI activity is recorded, whatever the start-up message says', () => {
    const store = new MidiLogStore([makeLogEntry('system', 'Prêt.')])
    render(<MidiLogButton logStore={store} />)
    const button = screen.getByRole('button', { name: 'MIDI log' }) as HTMLButtonElement

    expect(button.disabled).toBe(true)

    act(() => store.append(makeLogEntry('system', 'MIDI connected.')))

    expect(button.disabled).toBe(false)
  })

  it('leaves the log dialog out of the page until it is opened', () => {
    render(<MidiLogButton logStore={storeWithActivity()} />)

    expect(logDialog()).toBeNull()
  })

  it('downloads the log as a text file with each message and its full hex data', async () => {
    const user = userEvent.setup()
    render(<MidiLogButton logStore={storeWithActivity()} />)

    await user.click(screen.getByRole('button', { name: 'MIDI log' }))
    await user.click(await screen.findByRole('button', { name: 'Download log' }))

    expect(downloadFile).toHaveBeenCalledOnce()
    const [file, filename] = downloadFile.mock.calls[0] as [Blob, string]
    expect(filename).toMatch(/^fm1-midi-log-.+\.txt$/)
    const text = await file.text()
    expect(text).toContain('OUT  Sent FM1 parameter 123 = 14.')
    expect(text).toContain('F0 43 10 00 7B 0E F7')
  })

  it('returns focus to its button and unmounts the log when the log closes', async () => {
    const user = userEvent.setup()
    render(<MidiLogButton logStore={storeWithActivity()} />)
    const button = screen.getByRole('button', { name: 'MIDI log' })

    await user.click(button)
    await user.click(await screen.findByRole('button', { name: 'Close MIDI log' }))

    expect(logDialog()).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('opens one log when its button is pressed twice while it loads', async () => {
    const user = userEvent.setup()
    render(<MidiLogButton logStore={storeWithActivity()} />)
    const button = screen.getByRole('button', { name: 'MIDI log' })

    await user.click(button)
    await user.click(button)
    await waitFor(() => expect(logDialog()?.open).toBe(true))

    expect(document.querySelectorAll('dialog')).toHaveLength(1)
  })

  it('explains in translated text when the log cannot be loaded', async () => {
    vi.resetModules()
    vi.doMock('@/components/midi/midi-log-dialog', () => {
      throw new Error('chunk failed')
    })
    await import('@/i18n')
    const { MidiLogButton: ButtonWithFailingChunk } =
      await import('@/components/midi/midi-log-button')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<ButtonWithFailingChunk logStore={storeWithActivity()} />)

    await user.click(screen.getByRole('button', { name: 'MIDI log' }))

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText('The MIDI log could not be opened. Reload the page and try again.'),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(logDialog()).toBeNull()
    consoleError.mockRestore()
    vi.doUnmock('@/components/midi/midi-log-dialog')
  })
})
