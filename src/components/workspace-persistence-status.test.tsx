// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { setLocale } from '@/i18n'
import type { PatchLibrary } from '@/hooks/use-patch-library'

import { WorkspacePersistenceStatus } from './workspace-persistence-status'

type Status = PatchLibrary['persistenceStatus']

function makeLibrary(
  persistenceStatus: Status,
  persistenceError: PatchLibrary['persistenceError'] = null,
) {
  return {
    bankDescriptions: {},
    bankNames: {},
    continueWithoutWorkspaceSaving: vi.fn(),
    effects: {},
    hasDamagedNamedBanks: false,
    loadedBanks: [],
    namedBanks: [],
    namedBanksLoadFailed: false,
    namedBanksLoading: false,
    persistenceError,
    persistenceStatus,
    retryWorkspaceLoading: vi.fn(),
    retryWorkspaceSaving: vi.fn(),
    voices: {},
    workspaceBanks: ['A'],
  }
}

function renderStatus(library: ReturnType<typeof makeLibrary>) {
  return render(<WorkspacePersistenceStatus library={library} />, { wrapper: ToastProvider })
}

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await setLocale('en')
})

describe('WorkspacePersistenceStatus', () => {
  it.each<Status>(['loading', 'ready', 'saving'])(
    'shows nothing while the workspace is %s',
    (status) => {
      const { container } = renderStatus(makeLibrary(status))

      expect(within(container).queryByRole('alert')).toBeNull()
    },
  )

  it('explains an incompatible workspace and leaves its data untouched', () => {
    renderStatus(makeLibrary('load-error', { code: 'incompatible', detail: '' }))

    const alert = screen.getByRole('alert')
    expect(
      within(alert).getByRole('heading', {
        name: 'The saved workspace is incompatible or damaged',
      }),
    ).toBeTruthy()
    expect(within(alert).getByText(/existing browser record has been left untouched/)).toBeTruthy()
  })

  it('treats a load failure without a code as a read failure', () => {
    renderStatus(makeLibrary('load-error'))

    expect(
      screen.getByRole('heading', { name: 'The saved workspace could not be read' }),
    ).toBeTruthy()
  })

  it('retries loading from the load error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('load-error', { code: 'read-failed', detail: '' })
    renderStatus(library)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(library.retryWorkspaceLoading).toHaveBeenCalledTimes(1)
    expect(library.continueWithoutWorkspaceSaving).not.toHaveBeenCalled()
  })

  it('continues for the session only from the load error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('load-error', { code: 'unavailable', detail: '' })
    renderStatus(library)

    await user.click(screen.getByRole('button', { name: 'Continue without saving' }))

    expect(library.continueWithoutWorkspaceSaving).toHaveBeenCalledTimes(1)
    expect(library.retryWorkspaceLoading).not.toHaveBeenCalled()
  })

  it('keeps the browser error text in a collapsed technical details disclosure', () => {
    renderStatus(
      makeLibrary('load-error', {
        code: 'read-failed',
        detail: 'UnknownError: Internal error opening backing store',
      }),
    )

    const details = screen.getByText('Technical details').closest('details')!
    expect(details.open).toBe(false)
    expect(within(details).getByText(/Internal error opening backing store/)).toBeTruthy()
  })

  it('leaves out the technical details when there are none', () => {
    renderStatus(makeLibrary('save-error', { code: 'write-failed', detail: '' }))

    expect(screen.queryByText('Technical details')).toBeNull()
  })

  it('warns that changes are not stored and retries saving', async () => {
    const user = userEvent.setup()
    const library = makeLibrary('save-error', { code: 'write-failed', detail: '' })
    renderStatus(library)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Workspace changes are not safely stored')).toBeTruthy()
    await user.click(within(alert).getByRole('button', { name: 'Retry saving' }))

    expect(library.retryWorkspaceSaving).toHaveBeenCalledTimes(1)
  })

  it('warns that a session-only workspace is lost on close, with no retry', () => {
    renderStatus(makeLibrary('session-only'))

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Session-only workspace')).toBeTruthy()
    expect(within(alert).queryByRole('button', { name: 'Retry saving' })).toBeNull()
  })

  it.each<Status>(['save-error', 'session-only'])(
    'offers a backup download while the workspace is %s',
    async (status) => {
      const user = userEvent.setup()
      const createObjectURL = vi.fn((_blob: Blob) => 'blob:backup')
      Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      renderStatus(makeLibrary(status, { code: 'write-failed', detail: '' }))

      await user.click(screen.getByRole('button', { name: 'Download backup' }))

      expect(
        await screen.findByText('Downloading a backup of your workspace banks and saved banks.'),
      ).toBeTruthy()
      expect(click).toHaveBeenCalledOnce()
      const file = createObjectURL.mock.calls[0][0]
      expect(JSON.parse(await file.text())).toMatchObject({ format: 'fm1-librarian-backup' })
    },
  )

  it('explains a load error in the interface language', async () => {
    await setLocale('de')
    renderStatus(makeLibrary('load-error', { code: 'read-failed', detail: '' }))

    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ohne Speichern fortfahren' })).toBeTruthy()
  })
})
