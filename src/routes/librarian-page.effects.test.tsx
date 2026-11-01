// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import { getV16Effects, resetV16EffectsForTests } from '@/lib/v16-effects'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { LibrarianPage } from '@/routes/librarian-page'
import { translatePageText } from '@/test/page-translator'
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

beforeEach(() => {
  localStorage.clear()
  resetV16EffectsForTests()
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

const v16 = { identity: 'FM-1_016', kind: 'mvave' } as const

function makeV16Midi(overrides: Parameters<typeof makeLibrarianMidi>[0] = {}) {
  return makeLibrarianMidi({ firmware: v16, ...overrides })
}

function setup(midi = makeV16Midi(), fxLibrary = makeFxLibrary()) {
  const view = render(
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
  return { fxLibrary, midi, view }
}

describe('independent Effects library view', () => {
  it('is reachable offline without a selected sound or Voice strip and navigation sends nothing', async () => {
    const user = userEvent.setup()
    const sendParameter = vi.fn()
    const sendSettings = vi.fn()
    setup(
      makeV16Midi({
        sendSharedEffectParameter: sendParameter,
        sendSharedEffectSettings: sendSettings,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Effects' }))

    expect(await screen.findByRole('heading', { name: 'Effects' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'FX presets' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: /Voice/ })).toBeNull()
    expect(sendParameter).not.toHaveBeenCalled()
    expect(sendSettings).not.toHaveBeenCalled()
  })

  it('keeps the loaded FX preset and unsaved edits when switching Sounds and Effects', async () => {
    const user = userEvent.setup()
    const effects = new Uint8Array(24)
    effects[2] = 22
    const fxLibrary = makeFxLibrary()
    fxLibrary.presets = [
      createFxLibraryPreset({ id: 'dave', name: 'dave', effects, now: '2026-10-31T12:00:00.000Z' }),
    ]
    const sendSettings = vi.fn()
    setup(makeV16Midi({ sendSharedEffectSettings: sendSettings }), fxLibrary)
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    await user.click(await screen.findByRole('button', { name: 'dave' }))
    await user.click(screen.getByRole('switch', { name: 'Filter' }))
    await user.click(screen.getByRole('button', { name: 'Patches' }))
    await user.click(screen.getByRole('button', { name: 'Effects' }))

    expect(getV16Effects()[0]).toBe(1)
    expect(getV16Effects()[2]).toBe(22)
    expect(screen.getByRole('button', { name: 'dave' }).getAttribute('aria-pressed')).toBe('true')
    expect(await screen.findByRole('heading', { name: /^dave/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    expect(screen.getByRole('menuitem', { name: 'Update “dave”' })).toBeTruthy()
    expect(sendSettings).not.toHaveBeenCalled()
  })

  it('does not resend the FX preset when returning to Effects with V16 online', async () => {
    const user = userEvent.setup()
    const fxLibrary = makeFxLibrary()
    fxLibrary.presets = [
      createFxLibraryPreset({
        id: 'dave',
        name: 'dave',
        effects: new Uint8Array(24),
        now: '2026-10-31T12:00:00.000Z',
      }),
    ]
    const sendSettings = vi.fn(() => Promise.resolve({ ok: true as const, sent: 24 as const }))
    setup(
      makeLibrarianMidi({
        firmware: { kind: 'mvave', identity: 'FM-1_016' },
        hasMidiOutput: true,
        selectedOutputId: 'fm1',
        sendSharedEffectSettings: sendSettings,
      }),
      fxLibrary,
    )
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    await user.click(await screen.findByRole('button', { name: 'dave' }))
    expect(sendSettings).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('switch', { name: 'Filter' }))
    await user.click(screen.getByRole('button', { name: 'Patches' }))
    await user.click(screen.getByRole('button', { name: 'Effects' }))

    expect(await screen.findByRole('heading', { name: /^dave/ })).toBeTruthy()
    expect(getV16Effects()[0]).toBe(1)
    expect(sendSettings).toHaveBeenCalledOnce()
  })

  it('offers Effects only to firmware with a shared FX group and says which view is shown', () => {
    setup(makeLibrarianMidi())

    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Patches' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('falls back to Patches when the firmware changes while Effects is open', async () => {
    const user = userEvent.setup()
    const { fxLibrary, view } = setup()
    await user.click(screen.getByRole('button', { name: 'Effects' }))
    expect(await screen.findByRole('heading', { name: 'Effects' })).toBeTruthy()

    view.rerender(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          fxLibrary={fxLibrary}
          library={makeLibrarianLibrary()}
          midi={makeLibrarianMidi()}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(screen.queryByRole('heading', { name: 'Effects' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Patches' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('survives a page translator rewriting the view buttons’ text', async () => {
    const user = userEvent.setup()
    setup()
    translatePageText(screen.getByRole('navigation', { name: 'Library view' }))

    await user.click(screen.getByRole('button', { name: 'Effects' }))
    await user.click(screen.getByRole('button', { name: 'Patches' }))

    expect(screen.getByRole('button', { name: 'Patches' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
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

  it('shows preset management directly alongside the effects', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Effects' }))

    expect(await screen.findByRole('searchbox', { name: 'Search FX presets' })).toBeTruthy()
    await user.hover(screen.getByRole('button', { name: 'Help: Effects' }))
    expect(screen.getByRole('note').textContent).toContain('Edit effects and save presets.')
    await user.click(screen.getByRole('button', { name: 'FX preset actions' }))
    expect(screen.getByRole('menuitem', { name: 'Import…' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Save current as…' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
