// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import type { PatchLibrary } from '@/hooks/use-patch-library'

import { WorkspacePersistenceStatus } from './workspace-persistence-status'

type Status = PatchLibrary['persistenceStatus']

function makeLibrary(
  persistenceStatus: Status,
  persistenceError: PatchLibrary['persistenceError'] = null,
) {
  return {
    continueWithoutWorkspaceSaving: vi.fn(),
    persistenceError,
    persistenceStatus,
    retryWorkspaceLoading: vi.fn(),
    retryWorkspaceSaving: vi.fn(),
  }
}

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

describe('WorkspacePersistenceStatus', () => {
  it.each<Status>(['loading', 'ready', 'saving'])(
    'shows nothing while the workspace is %s',
    (status) => {
      const { container } = render(<WorkspacePersistenceStatus library={makeLibrary(status)} />)

      expect(container.childElementCount).toBe(0)
    },
  )

  it('explains an incompatible workspace and leaves its data untouched', () => {
    render(
      <WorkspacePersistenceStatus
        library={makeLibrary('load-error', { code: 'incompatible', detail: '' })}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(
      within(alert).getByRole('heading', {
        name: 'The saved workspace is incompatible or damaged',
      }),
    ).toBeTruthy()
    expect(within(alert).getByText(/existing browser record has been left untouched/)).toBeTruthy()
  })

  it('treats a load failure without a code as a read failure', () => {
    render(<WorkspacePersistenceStatus library={makeLibrary('load-error')} />)

    expect(
      screen.getByRole('heading', { name: 'The saved workspace could not be read' }),
    ).toBeTruthy()
  })

  it('retries loading from the load error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('load-error', { code: 'read-failed', detail: '' })
    render(<WorkspacePersistenceStatus library={library} />)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(library.retryWorkspaceLoading).toHaveBeenCalledTimes(1)
    expect(library.continueWithoutWorkspaceSaving).not.toHaveBeenCalled()
  })

  it('continues for the session only from the load error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('load-error', { code: 'unavailable', detail: '' })
    render(<WorkspacePersistenceStatus library={library} />)

    await user.click(screen.getByRole('button', { name: 'Continue without saving' }))

    expect(library.continueWithoutWorkspaceSaving).toHaveBeenCalledTimes(1)
    expect(library.retryWorkspaceLoading).not.toHaveBeenCalled()
  })

  it('keeps the browser error text in a collapsed technical details disclosure', () => {
    render(
      <WorkspacePersistenceStatus
        library={makeLibrary('load-error', {
          code: 'read-failed',
          detail: 'UnknownError: Internal error opening backing store',
        })}
      />,
    )

    const details = screen.getByText('Technical details').closest('details')!
    expect(details.open).toBe(false)
    expect(within(details).getByText(/Internal error opening backing store/)).toBeTruthy()
  })

  it('leaves out the technical details when there are none', () => {
    render(
      <WorkspacePersistenceStatus
        library={makeLibrary('save-error', { code: 'write-failed', detail: '' })}
      />,
    )

    expect(screen.queryByText('Technical details')).toBeNull()
  })

  it('warns that changes are not stored and retries saving', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('save-error', { code: 'write-failed', detail: '' })
    render(<WorkspacePersistenceStatus library={library} />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Workspace changes are not safely stored')).toBeTruthy()
    await user.click(within(alert).getByRole('button', { name: 'Retry saving' }))

    expect(library.retryWorkspaceSaving).toHaveBeenCalledTimes(1)
  })

  it('warns that a session-only workspace is lost on close, with no retry', () => {
    render(<WorkspacePersistenceStatus library={makeLibrary('session-only')} />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Session-only workspace')).toBeTruthy()
    expect(within(alert).queryByRole('button')).toBeNull()
  })

  it('explains a load error in the interface language', async () => {
    await setLocale('de')
    render(
      <WorkspacePersistenceStatus
        library={makeLibrary('load-error', { code: 'read-failed', detail: '' })}
      />,
    )

    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ohne Speichern fortfahren' })).toBeTruthy()
  })
})
