// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { V16EffectsPanel, type V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { renderWithToasts } from '@/test/render-with-toasts'
import { resetV16EffectsForTests } from '@/lib/v16-effects'

beforeAll(async () => {
  await setLocale('en-GB')
})

beforeEach(() => {
  localStorage.clear()
  resetV16EffectsForTests()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeLibrary(): FxLibrary {
  return {
    damagedCount: 0,
    delete: vi.fn(),
    duplicate: vi.fn(),
    importPresets: vi.fn(),
    loadError: null,
    pending: false,
    presets: [],
    reload: vi.fn(() => Promise.resolve([])),
    rename: vi.fn(),
    restorePresets: vi.fn(),
    save: vi.fn(),
    status: 'ready',
    update: vi.fn(),
  }
}

const midi: V16EffectsMidi = {
  effectChannel: 1,
  firmware: { identity: 'FM-1_016', kind: 'mvave' },
  hasMidiOutput: false,
  selectedOutputId: '',
  sendSharedEffectParameter: vi.fn(),
  sendSharedEffectSettings: vi.fn(),
}

describe('V16 effects panel', () => {
  it('opens no second library when the page hands it one', () => {
    installFakeIndexedDb()
    const open = vi.spyOn(indexedDB, 'open')
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)

    expect(open).not.toHaveBeenCalled()
  })

  it('says the effects stay in this tab when the stored record is a newer release’s, and keeps it', async () => {
    const user = userEvent.setup()
    const stored = '{"version":2,"effects":[1]}'
    localStorage.setItem('fm1-v16-effects', stored)
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)

    expect(
      screen.getByText(
        'Browser storage can’t keep these effects, so they last only while this tab stays open.',
      ),
    ).toBeTruthy()
    await user.click(screen.getByRole('switch', { name: 'Filter' }))
    expect(localStorage.getItem('fm1-v16-effects')).toBe(stored)
  })

  it('shows no storage notice while the effects are kept', () => {
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)

    expect(screen.queryByText(/last only while this tab stays open/)).toBeNull()
  })

  it('explains in its help that effect order and front-panel changes stay with the FM1', async () => {
    const user = userEvent.setup()
    renderWithToasts(<V16EffectsPanel fxLibrary={makeLibrary()} midi={midi} />)
    await user.hover(screen.getByRole('button', { name: 'Help: Effects' }))

    const help = screen.getByRole('note').textContent
    expect(help).toContain('Effect order stays as set on the FM1.')
    expect(help).toContain('Front-panel changes are not read back by the editor.')
  })
})
