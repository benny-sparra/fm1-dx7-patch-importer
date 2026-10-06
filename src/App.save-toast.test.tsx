// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import App from '@/App'
import { ToastProvider } from '@/components/ui/toast'

const openedVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'SYN PAD 1' }))
const renamedVoice = vi.hoisted(() => ({ data: new Uint8Array(128), name: 'SYN PADZ1' }))
const updatePatch = vi.hoisted(() => vi.fn(() => 0))
const replaceWithVirtualAnalog = vi.hoisted(() => vi.fn())
// A Virtual Analog preset's voice bytes, named BASS VA in the packed name bytes.
const virtualAnalogVoice = vi.hoisted(() => {
  const voice = new Uint8Array(128)
  voice.set(new TextEncoder().encode('BASS VA   '), 118)
  return voice
})
const virtualAnalogRecord = vi.hoisted(() => new Uint8Array(59))

vi.mock('@/hooks/use-midi', () => ({
  useMidi: () => ({ sendEffectSettings: vi.fn(), sendProgramChange: vi.fn(), sendVoice: vi.fn() }),
}))

vi.mock('@/hooks/use-patch-library', () => ({
  usePatchLibrary: () => ({
    effects: {},
    records: { 'patch-e2': virtualAnalogRecord },
    patches: [
      { bank: 'E', family: 'DX7', id: 'patch-e1', name: 'SYN PAD 1', number: 1 },
      { bank: 'E', family: 'VA', id: 'patch-e2', name: 'BASS VA', number: 2 },
      { bank: 'favourites', family: 'DX7', id: 'favourite-1', name: 'SYN PAD 1', number: 1 },
    ],
    persistenceStatus: 'ready',
    replaceWithVirtualAnalog,
    updatePatch,
    virtualAnalog: { 'patch-e2': virtualAnalogVoice },
    voices: { 'favourite-1': openedVoice, 'patch-e1': openedVoice },
    workspaceBanks: ['E'],
    workspaceLoading: false,
  }),
}))

vi.mock('@/routes/root-layout', () => ({
  RootLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/routes/librarian-page', () => ({
  LibrarianPage: ({ onEditPatch }: { onEditPatch: (patch: { id: string }) => void }) => (
    <>
      <button onClick={() => onEditPatch({ id: 'patch-e1' })} type="button">
        Edit slot
      </button>
      <button onClick={() => onEditPatch({ id: 'favourite-1' })} type="button">
        Edit favourite
      </button>
      <button onClick={() => onEditPatch({ id: 'patch-e2' })} type="button">
        Edit Virtual Analog
      </button>
    </>
  ),
}))

vi.mock('@/components/workspace-persistence-status', () => ({
  WorkspacePersistenceStatus: () => null,
}))

// The editor renames the sound, then saves it.
vi.mock('@/routes/load-patch-editor-page', () => ({
  loadPatchEditorPage: () =>
    Promise.resolve({
      default: ({ onSave }: { onSave: (voice: unknown, effects: Uint8Array) => void }) => (
        <button onClick={() => onSave(renamedVoice, new Uint8Array(24))} type="button">
          Save renamed
        </button>
      ),
    }),
  loadVirtualAnalogEditorPage: () =>
    Promise.resolve({
      default: ({
        onSave,
        voice,
      }: {
        onSave: (voice: Uint8Array, effects: Uint8Array, record: Uint8Array) => void
        voice: Uint8Array
      }) => (
        <button
          onClick={() => onSave(voice, new Uint8Array(24), virtualAnalogRecord)}
          type="button"
        >
          Save Virtual Analog
        </button>
      ),
    }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function saveRenamed(editButton: string) {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  )
  await user.click(screen.getByRole('button', { name: editButton }))
  await user.click(await screen.findByRole('button', { name: 'Save renamed' }))
}

describe('App save notification', () => {
  it('names a renamed patch by its new name', async () => {
    await saveRenamed('Edit slot')

    expect(await screen.findByText('Saved “SYN PADZ1” to the library.')).toBeTruthy()
  })

  it('names a renamed patch by its new name when its favourite copy changed too', async () => {
    updatePatch.mockReturnValueOnce(1)

    await saveRenamed('Edit slot')

    expect(
      await screen.findByText('Saved “SYN PADZ1” to the library, and to its copy in Favourites.'),
    ).toBeTruthy()
  })

  it('names a renamed favourite by its new name when the bank slots changed too', async () => {
    updatePatch.mockReturnValueOnce(1)

    await saveRenamed('Edit favourite')

    expect(
      await screen.findByText(
        'Saved “SYN PADZ1” to Favourites, and to the bank slots that held it.',
      ),
    ).toBeTruthy()
  })

  it('opens a Virtual Analog preset in its own editor and saves it in its slot', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Edit Virtual Analog' }))
    await user.click(await screen.findByRole('button', { name: 'Save Virtual Analog' }))

    expect(replaceWithVirtualAnalog).toHaveBeenCalledWith(
      'E',
      2,
      virtualAnalogVoice,
      new Uint8Array(24),
      virtualAnalogRecord,
    )
    expect(updatePatch).not.toHaveBeenCalled()
    expect(await screen.findByText('Saved “BASS VA” to the library.')).toBeTruthy()
  })
})
