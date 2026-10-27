// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { resetV16EffectsForTests } from '@/lib/v16-effects'
import { resetVoiceSetupForTests } from '@/lib/voice-setup'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/midi/v16-effects-panel', () => ({
  V16EffectsPanel: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetVoiceSetupForTests()
  resetV16EffectsForTests()
  vi.restoreAllMocks()
})

describe('LibrarianPage Effects tab that fails to load', () => {
  it('explains the failure and offers a reload, leaving the Voices and their tabs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    render(
      <ToastProvider>
        <LibrarianPage
          activePatchId=""
          library={makeLibrarianLibrary()}
          midi={makeLibrarianMidi({ firmware: { identity: 'FM-1_016', kind: 'mvave' } })}
          onBankDeleted={vi.fn()}
          onEditPatch={vi.fn()}
          onPlaySearchResult={vi.fn()}
          onSelectPatch={vi.fn()}
          onSendVoiceSetup={() => 0}
        />
      </ToastProvider>,
    )

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Effects' }))

    const alert = await screen.findByText('The effects could not be loaded.')
    expect(
      within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', {
        name: 'Reload app',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Effects' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Voice 1,/ })).toBeTruthy()
  })
})
