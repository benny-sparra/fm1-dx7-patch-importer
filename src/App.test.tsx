// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import App from '@/App'
import { ToastProvider } from '@/components/ui/toast'

const sendProgramChange = vi.hoisted(() => vi.fn(() => true))
const sendVoice = vi.hoisted(() => vi.fn(async () => true))
const sendEffectSettings = vi.hoisted(() => vi.fn(async () => true))
const midiState = vi.hoisted(() => ({ sysexAvailable: true }))
const pianoVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'PIANO' }))
const addedVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'PAD' }))
const pianoEffects = vi.hoisted(() => Uint8Array.from({ length: 24 }, (_, index) => index % 2))
const catalogVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'BRASS 1' }))
const savedVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'SOLO' }))
const savedEffects = vi.hoisted(() =>
  Uint8Array.from({ length: 24 }, (_, index) => (index + 1) % 2),
)
const loadVirtualAnalogEditorPage = vi.hoisted(() => vi.fn(() => new Promise<never>(() => {})))
const loadPatchEditorPage = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))),
)

vi.mock('@/hooks/use-midi', () => ({
  useMidi: () => ({
    sendEffectSettings,
    sendProgramChange,
    sendVoice,
    sysexAvailable: midiState.sysexAvailable,
  }),
}))

vi.mock('@/hooks/use-patch-library', () => ({
  usePatchLibrary: () => ({
    effects: { 'patch-1': pianoEffects },
    records: { 'patch-va': new Uint8Array(59) },
    patches: [
      { bank: 'A', family: 'Keys', id: 'patch-1', name: 'Piano', number: 1, program: 0 },
      { bank: 'E', family: 'DX7', id: 'patch-e1', name: 'Pad', number: 1 },
      // A Virtual Analog preset in A3, whose bytes are not a DX7 voice, so it is not in `voices`.
      { bank: 'A', family: 'VA', id: 'patch-va', name: 'VOICE 97', number: 3, program: 2 },
    ],
    persistenceStatus: 'ready',
    updatePatch: vi.fn(),
    virtualAnalog: { 'patch-va': new Uint8Array(128) },
    voices: { 'patch-1': pianoVoice, 'patch-e1': addedVoice },
    workspaceBanks: ['A', 'E'],
    workspaceLoading: false,
  }),
}))

vi.mock('@/routes/root-layout', () => ({
  RootLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/routes/librarian-page', () => ({
  LibrarianPage: ({
    activePatchId,
    onBankDeleted,
    onEditPatch,
    onPlaySearchResult,
    onSelectPatch,
  }: {
    activePatchId: string
    onBankDeleted: (bank: string) => void
    onEditPatch: (patch: { id: string }) => void
    onPlaySearchResult: (voice: unknown, effects: Uint8Array | undefined) => void
    onSelectPatch: (patch: { id: string }) => void
  }) => (
    <>
      <p>Lit slot: {activePatchId || 'none'}</p>
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
      <button onClick={() => onSelectPatch({ id: 'patch-va' })} type="button">
        Play Virtual Analog
      </button>
      <button onClick={() => onEditPatch({ id: 'patch-va' })} type="button">
        Edit Virtual Analog
      </button>
      <button onClick={() => onPlaySearchResult(catalogVoice, undefined)} type="button">
        Play catalog result
      </button>
      <button onClick={() => onPlaySearchResult(savedVoice, savedEffects)} type="button">
        Play saved result
      </button>
      <button onClick={() => onBankDeleted('A')} type="button">
        Delete bank A
      </button>
      <button onClick={() => onBankDeleted('E')} type="button">
        Delete bank E
      </button>
    </>
  ),
}))

vi.mock('@/components/workspace-persistence-status', () => ({
  WorkspacePersistenceStatus: () => null,
}))

vi.mock('@/routes/load-patch-editor-page', () => ({
  loadPatchEditorPage,
  loadVirtualAnalogEditorPage,
}))

afterEach(() => {
  midiState.sysexAvailable = true
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

  it('returns to the librarian on browser Back when the editor could not load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Edit Piano' }))
    await screen.findByRole('alert')

    window.history.back()

    expect(await screen.findByRole('button', { name: 'Edit Piano' })).toBeTruthy()
  })

  it('opens the editor again on browser Forward', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Edit Piano' }))
    await screen.findByRole('alert')
    window.history.back()
    await screen.findByRole('button', { name: 'Edit Piano' })
    // The patch banks show before the app's own step back, which takes the editor's entry away,
    // has landed. jsdom picks a step's destination a task before taking it, so Forward pressed
    // while that step is on its way finds no entry ahead and is lost.
    await waitFor(() => expect(window.history.state).toBeNull())

    window.history.forward()

    expect(await screen.findByRole('alert')).toBeTruthy()
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

  it('selects a slot in banks A to D on the FM1 and then sends its voice from the library', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendProgramChange).toHaveBeenCalledExactlyOnceWith(0)
    expect(sendVoice).toHaveBeenCalledExactlyOnceWith(pianoVoice)
    expect(sendProgramChange.mock.invocationCallOrder[0]).toBeLessThan(
      sendVoice.mock.invocationCallOrder[0],
    )
  })

  it('sends the saved effects of a slot in banks A to D after its voice', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    await waitFor(() => expect(sendEffectSettings).toHaveBeenCalledExactlyOnceWith(pianoEffects))
    expect(sendVoice.mock.invocationCallOrder[0]).toBeLessThan(
      sendEffectSettings.mock.invocationCallOrder[0],
    )
  })

  it('sends neither voice nor effects when the program of a slot in banks A to D was not selected', async () => {
    sendProgramChange.mockReturnValueOnce(false)
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendVoice).not.toHaveBeenCalled()
    expect(sendEffectSettings).not.toHaveBeenCalled()
  })

  it('selects a slot in banks A to D with its saved effects alone when SysEx is unavailable', async () => {
    midiState.sysexAvailable = false
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendProgramChange).toHaveBeenCalledExactlyOnceWith(0)
    expect(sendVoice).not.toHaveBeenCalled()
    expect(sendEffectSettings).toHaveBeenCalledExactlyOnceWith(pianoEffects)
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

  it('selects a Virtual Analog slot’s program and sends nothing else, with or without SysEx', async () => {
    for (const sysexAvailable of [true, false]) {
      midiState.sysexAvailable = sysexAvailable
      const user = renderApp()

      await user.click(screen.getByRole('button', { name: 'Play Virtual Analog' }))

      expect(sendProgramChange).toHaveBeenCalledExactlyOnceWith(2)
      expect(sendVoice).not.toHaveBeenCalled()
      expect(sendEffectSettings).not.toHaveBeenCalled()
      cleanup()
      vi.clearAllMocks()
    }
  })

  it('opens a Virtual Analog slot in its own editor, selecting its preset on the FM1', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Edit Virtual Analog' }))

    expect(loadVirtualAnalogEditorPage).toHaveBeenCalledTimes(1)
    expect(loadPatchEditorPage).not.toHaveBeenCalled()
    expect(sendProgramChange).toHaveBeenCalledWith(2)
    expect(sendVoice).not.toHaveBeenCalled()
  })
})

describe('App audition repeats', () => {
  function renderApp() {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    return userEvent.setup()
  }

  it('does not resend an unchanged added bank sound when its slot is clicked again', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Pad' }))
    await user.click(screen.getByRole('button', { name: 'Play Pad' }))

    expect(sendVoice).toHaveBeenCalledOnce()
  })

  it('sends the added bank sound again after another slot replaced the edit buffer', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Pad' }))
    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Play Pad' }))

    expect(sendVoice).toHaveBeenCalledTimes(3)
    expect(sendVoice).toHaveBeenLastCalledWith(addedVoice)
  })

  it('tries again when an added bank sound did not reach the FM1', async () => {
    sendVoice.mockResolvedValueOnce(false)
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Pad' }))
    await waitFor(() => expect(sendVoice).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('button', { name: 'Play Pad' }))

    expect(sendVoice).toHaveBeenCalledTimes(2)
    expect(sendEffectSettings).toHaveBeenCalledOnce()
  })
  it('does not select the program again when an unchanged slot in banks A to D is clicked again', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendProgramChange).toHaveBeenCalledOnce()
    expect(sendVoice).toHaveBeenCalledOnce()
  })

  it('selects a slot in banks A to D and sends its voice again after another slot played', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Play Pad' }))
    await user.click(screen.getByRole('button', { name: 'Play Piano' }))

    expect(sendProgramChange).toHaveBeenCalledTimes(2)
    expect(sendVoice).toHaveBeenLastCalledWith(pianoVoice)
  })
})

describe('App search result audition', () => {
  function renderApp() {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    return userEvent.setup()
  }

  it('plays a catalog result through the FM1 edit buffer with the default effects', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play catalog result' }))

    expect(sendVoice).toHaveBeenCalledExactlyOnceWith(catalogVoice)
    await waitFor(() =>
      expect(sendEffectSettings).toHaveBeenCalledExactlyOnceWith(new Uint8Array(24)),
    )
  })

  it('plays a saved-bank result with its own effects', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play saved result' }))

    await waitFor(() => expect(sendEffectSettings).toHaveBeenCalledExactlyOnceWith(savedEffects))
  })

  it('does not resend an unchanged search result when it is played again', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play catalog result' }))
    await user.click(screen.getByRole('button', { name: 'Play catalog result' }))

    expect(sendVoice).toHaveBeenCalledOnce()
  })

  it('turns off the lit slot when a search result replaces the edit buffer', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Play catalog result' }))

    expect(screen.getByText('Lit slot: none')).toBeTruthy()
  })
})

describe('App lit slot after deleting a bank', () => {
  function renderApp() {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    return userEvent.setup()
  }

  it('turns off the lit slot when its bank is deleted', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Delete bank A' }))

    expect(screen.getByText('Lit slot: none')).toBeTruthy()
  })

  it('turns off the lit slot when an earlier bank is deleted', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Pad' }))
    await user.click(screen.getByRole('button', { name: 'Delete bank A' }))

    expect(screen.getByText('Lit slot: none')).toBeTruthy()
  })

  it('keeps the lit slot when a later bank is deleted', async () => {
    const user = renderApp()

    await user.click(screen.getByRole('button', { name: 'Play Piano' }))
    await user.click(screen.getByRole('button', { name: 'Delete bank E' }))

    expect(screen.getByText('Lit slot: patch-1')).toBeTruthy()
  })
})
