// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import App from '@/App'
import { ToastProvider } from '@/components/ui/toast'

const sendProgramChange = vi.hoisted(() => vi.fn())
const sendVoice = vi.hoisted(() => vi.fn(async () => true))
const sendEffectSettings = vi.hoisted(() => vi.fn(async () => true))
const addedVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'PAD' }))
const loadPatchEditorPage = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))),
)

vi.mock('@/hooks/use-midi', () => ({
  useMidi: () => ({ sendEffectSettings, sendProgramChange, sendVoice }),
}))

vi.mock('@/hooks/use-patch-library', () => ({
  usePatchLibrary: () => ({
    effects: {},
    patches: [
      { bank: 'A', family: 'Keys', id: 'patch-1', name: 'Piano', number: 1, program: 0 },
      { bank: 'E', family: 'DX7', id: 'patch-e1', name: 'Pad', number: 1 },
    ],
    persistenceStatus: 'ready',
    updatePatch: vi.fn(),
    voices: { 'patch-1': {}, 'patch-e1': addedVoice },
    workspaceLoading: false,
  }),
}))

vi.mock('@/routes/root-layout', () => ({
  RootLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/routes/librarian-page', () => ({
  LibrarianPage: ({
    onEditPatch,
    onSelectPatch,
  }: {
    onEditPatch: (patch: { id: string }) => void
    onSelectPatch: (patch: { id: string }) => void
  }) => (
    <>
      <button onClick={() => onEditPatch({ id: 'patch-1' })} type="button">
        Edit Piano
      </button>
      <button onClick={() => onSelectPatch({ id: 'patch-1' })} type="button">
        Play Piano
      </button>
      <button onClick={() => onSelectPatch({ id: 'patch-e1' })} type="button">
        Play Pad
      </button>
      <button onClick={() => onEditPatch({ id: 'patch-e1' })} type="button">
        Edit Pad
      </button>
    </>
  ),
}))

vi.mock('@/components/workspace-persistence-status', () => ({
  WorkspacePersistenceStatus: () => null,
}))

vi.mock('@/routes/load-patch-editor-page', () => ({ loadPatchEditorPage }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
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

describe('App slot audition', () => {
  function renderApp() {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    return userEvent.setup()
  }

  it('selects a slot in banks A to D on the FM1 with a Program Change', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendProgramChange).toHaveBeenCalledExactlyOnceWith(0)
    expect(sendVoice).not.toHaveBeenCalled()
  })

  it('auditions an added bank slot through the FM1 edit buffer with its effects', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Pad' }))

    expect(sendProgramChange).not.toHaveBeenCalled()
    expect(sendVoice).toHaveBeenCalledExactlyOnceWith(addedVoice)
    await waitFor(() =>
      expect(sendEffectSettings).toHaveBeenCalledExactlyOnceWith(new Uint8Array(24)),
    )
  })

  it('leaves sending an added bank slot to the editor when it is opened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Edit Pad' }))
    await screen.findByRole('alert')

    expect(sendProgramChange).not.toHaveBeenCalled()
    expect(sendVoice).not.toHaveBeenCalled()
  })
})
