// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider } from '@/components/ui/toast'

import { WorkspacePersistenceStatus } from './workspace-persistence-status'

// Stands in for a backup chunk that fails, as a stale deployment's missing file would.
vi.mock('@/lib/workspace-backup', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

afterEach(() => {
  cleanup()
})

describe('WorkspacePersistenceStatus backup that fails to load', () => {
  it('explains the failure without offering a reload that would lose unsaved work', async () => {
    const user = userEvent.setup()
    render(
      <WorkspacePersistenceStatus
        library={{
          bankDescriptions: {},
          bankNames: {},
          continueWithoutWorkspaceSaving: vi.fn(),
          effects: {},
          hasDamagedNamedBanks: false,
          loadedBanks: [],
          namedBanks: [],
          namedBanksLoadFailed: false,
          namedBanksLoading: false,
          persistenceError: { code: 'write-failed', detail: '' },
          persistenceStatus: 'save-error',
          retryWorkspaceLoading: vi.fn(),
          retryWorkspaceSaving: vi.fn(),
          voices: {},
          workspaceBanks: ['A'],
        }}
      />,
      { wrapper: ToastProvider },
    )

    await user.click(screen.getByRole('button', { name: 'Download backup' }))

    expect(
      await screen.findByText(
        'The backup could not be prepared. Keep this tab open, because your latest changes are not saved, and try again.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reload app' })).toBeNull()
  })
})
