// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { LibrarianPage } from '@/routes/librarian-page'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

beforeAll(async () => {
  await setLocale('en-GB')
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeFxLibrary(): FxLibrary {
  return {
    damagedCount: 0,
    delete: vi.fn<FxLibrary['delete']>(),
    duplicate: vi.fn<FxLibrary['duplicate']>(),
    importPresets: vi.fn<FxLibrary['importPresets']>(),
    loadError: null,
    pending: false,
    presets: [],
    reload: vi.fn<FxLibrary['reload']>(() => Promise.resolve([])),
    rename: vi.fn<FxLibrary['rename']>(),
    restorePresets: vi.fn<FxLibrary['restorePresets']>(),
    save: vi.fn<FxLibrary['save']>(),
    status: 'ready',
    update: vi.fn<FxLibrary['update']>(),
  }
}

function setup(midi = makeLibrarianMidi(), fxLibrary = makeFxLibrary()) {
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        fxLibrary={fxLibrary}
        library={makeLibrarianLibrary()}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { fxLibrary, midi }
}

describe('independent Effects library view', () => {
  it('is reachable offline without a selected sound or Voice strip and navigation sends nothing', async () => {
    const user = userEvent.setup()
    const sendParameter = vi.fn()
    const sendSettings = vi.fn()
    setup(
      makeLibrarianMidi({
        sendSharedEffectParameter: sendParameter,
        sendSharedEffectSettings: sendSettings,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Effects' }))

    expect(await screen.findByRole('heading', { name: 'Effects' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'FX presets…' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: /Voice/ })).toBeNull()
    expect(sendParameter).not.toHaveBeenCalled()
    expect(sendSettings).not.toHaveBeenCalled()
  })

  it('keeps live V16 editing on the changed-controller path', async () => {
    const user = userEvent.setup()
    const sendParameter = vi.fn(() => true)
    setup(
      makeLibrarianMidi({
        firmware: { identity: 'FM-1_016', kind: 'mvave' },
        hasMidiOutput: true,
        sendSharedEffectParameter: sendParameter,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    await screen.findByRole('heading', { name: 'Effects' })

    await user.click(screen.getByRole('switch', { name: 'Filter' }))

    expect(sendParameter).toHaveBeenCalledOnce()
    expect(sendParameter.mock.calls[0]).toHaveLength(2)
  })

  it('returns focus to the compact launcher after preset management closes', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    const launcher = await screen.findByRole('button', { name: 'FX presets…' })

    await user.click(launcher)
    const dialog = await screen.findByRole('dialog', { name: 'FX presets' })
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBe(dialog))
    expect(document.activeElement).toBe(launcher)
  })
})
