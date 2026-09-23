// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { HelpButton } from '@/components/help-button'

beforeAll(() => {
  // Browsers refuse to show a modal that is not in a document, so the fake does too.
  HTMLDialogElement.prototype.showModal = function showModal() {
    if (!this.isConnected) {
      throw new DOMException('The element is not in a Document.', 'InvalidStateError')
    }
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

const helpButton = () =>
  screen.getByRole('button', { name: 'How to use the FM1 editor and librarian' })

const guide = () => screen.queryByRole('dialog')

describe('HelpButton', () => {
  it('loads and opens the guide when it is asked for', async () => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    const user = userEvent.setup()
    render(<HelpButton />)
    expect(guide()).toBeNull()

    await user.click(helpButton())

    expect(await screen.findByRole('tab', { name: 'Getting started' })).toBeTruthy()
  })

  it('opens the guide on a first visit without waiting to be asked', async () => {
    render(<HelpButton />)

    expect(await screen.findByRole('tab', { name: 'Getting started' })).toBeTruthy()
  })

  it('leaves the guide closed once it has been seen', async () => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    render(<HelpButton />)

    await waitFor(() => expect(helpButton()).toBeTruthy())
    expect(guide()).toBeNull()
  })

  it('opens the guide when the store cannot say whether it was seen', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    render(<HelpButton />)

    expect(await screen.findByRole('tab', { name: 'Getting started' })).toBeTruthy()
  })

  it('returns focus to the trigger when the guide is closed, and opens it again', async () => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    const user = userEvent.setup()
    render(<HelpButton />)
    await user.click(helpButton())
    await screen.findByRole('tab', { name: 'Getting started' })

    await user.click(screen.getByRole('button', { name: 'Start editing' }))

    await waitFor(() => expect(guide()).toBeNull())
    expect(document.activeElement).toBe(helpButton())

    await user.click(helpButton())

    expect(await screen.findByRole('tab', { name: 'Getting started' })).toBeTruthy()
  })

  it('opens a single guide when the trigger is activated repeatedly', async () => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    const user = userEvent.setup()
    render(<HelpButton />)

    await user.click(helpButton())
    await user.click(helpButton())
    await screen.findByRole('tab', { name: 'Getting started' })

    expect(document.querySelectorAll('dialog')).toHaveLength(1)
  })

  it('leaves the guide closed, without a failure notice, on a page outside the document', async () => {
    const detachedPage = document.createElement('div')
    render(<HelpButton />, { baseElement: detachedPage, container: detachedPage })

    const dialog = await waitFor(() => {
      const mounted = detachedPage.querySelector('dialog')
      expect(mounted).not.toBeNull()
      return mounted!
    })
    expect(dialog.open).toBe(false)
    expect(within(detachedPage).queryByRole('alert')).toBeNull()
  })

  it('explains in translated text when the guide cannot be loaded', async () => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    vi.resetModules()
    vi.doMock('@/components/help-dialog', () => {
      throw new Error('chunk failed')
    })
    const { HelpButton: ButtonWithFailingChunk } = await import('@/components/help-button')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<ButtonWithFailingChunk />)

    await user.click(helpButton())

    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText('The guide could not be opened. Reload the page and try again.'),
    ).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(guide()).toBeNull()
    consoleError.mockRestore()
    vi.doUnmock('@/components/help-dialog')
  })
})
