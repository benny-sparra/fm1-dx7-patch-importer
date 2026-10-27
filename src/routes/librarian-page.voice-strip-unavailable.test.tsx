// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { resetVoiceSetupForTests, setVoiceSetupEnabled } from '@/lib/voice-setup'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

// Stand in for a chunk that fails, as a stale deployment's missing file would.
vi.mock('@/components/midi/voice-strip', () => ({
  VoiceStrip: () => {
    throw new Error('Failed to fetch dynamically imported module')
  },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetVoiceSetupForTests()
  vi.restoreAllMocks()
})

describe('LibrarianPage Voice strip that fails to load', () => {
  it('explains the failure and offers a reload, leaving the switch and the banks', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    setVoiceSetupEnabled(true)
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

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Voices 1–8 could not be loaded.')).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Multitimbral mode' })).toBeTruthy()
  })
})
