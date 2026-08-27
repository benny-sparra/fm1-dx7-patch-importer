// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import App from '@/App'
import { ToastProvider } from '@/components/ui/toast'

const sendProgramChange = vi.hoisted(() => vi.fn())
const loadPatchEditorPage = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))),
)

vi.mock('@/hooks/use-midi', () => ({
  useMidi: () => ({ sendProgramChange }),
}))

vi.mock('@/hooks/use-patch-library', () => ({
  usePatchLibrary: () => ({
    effects: {},
    patches: [{ bank: 'A', family: 'Keys', id: 'patch-1', name: 'Piano', number: 1, program: 0 }],
    persistenceStatus: 'ready',
    updatePatch: vi.fn(),
    voices: { 'patch-1': {} },
    workspaceLoading: false,
  }),
}))

vi.mock('@/routes/root-layout', () => ({
  RootLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/routes/librarian-page', () => ({
  LibrarianPage: ({ onEditPatch }: { onEditPatch: (patch: { id: string }) => void }) => (
    <button onClick={() => onEditPatch({ id: 'patch-1' })} type="button">
      Edit Piano
    </button>
  ),
}))

vi.mock('@/components/workspace-persistence-status', () => ({
  WorkspacePersistenceStatus: () => null,
}))

vi.mock('@/routes/load-patch-editor-page', () => ({ loadPatchEditorPage }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('App patch editor loading', () => {
  it('keeps a failed editor chunk inside the app and returns to the librarian', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Piano' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'The editor could not be loaded.',
    )

    await user.click(screen.getByRole('button', { name: 'Back to library' }))

    expect(screen.getByRole('button', { name: 'Edit Piano' })).toBeTruthy()
    expect(consoleError).toHaveBeenCalled()
  })
})
