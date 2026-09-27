// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { updateDx7VoiceName } from '@/lib/dx7'
import { ToastProvider } from '@/components/ui/toast'
import {
  type Favourite,
  favouritePatchId,
  favouriteSoundKeys,
  makeFavouritePatches,
  toggleFavourite,
} from '@/lib/favourites'
import {
  emptyPatchLibrary,
  importVoices,
  makeDemoVoices,
  makePatches,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'
import { makeLibrarianLibrary, makeLibrarianMidi } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

type Library = ComponentProps<typeof LibrarianPage>['library']
type Midi = ComponentProps<typeof LibrarianPage>['midi']

const voices = makeDemoVoices()

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})

beforeEach(() => {
  // Sends straight away, as after the FM1's bank guide has been dismissed for the session.
  sessionStorage.setItem('fm1-bank-selection-dialog-dismissed', 'true')
})

afterEach(async () => {
  cleanup()
  sessionStorage.clear()
  await setLocale('en-GB')
})

/** Bank A holds the demo voices, and Favourites holds the first `count` of them, repeating. */
function makeWorkspace(count: number) {
  const loaded = importVoices(emptyPatchLibrary(['A']), 'A', voices)
  return Array.from({ length: count }, (_, index) => index).reduce<PatchLibrarySnapshot>(
    (snapshot, index) => {
      // Favourites keeps one copy of a sound, so each one past the bank's 32 gets its own name.
      const voice =
        index < voices.length ? voices[index] : updateDx7VoiceName(voices[0], `EXTRA ${index}`)
      return toggleFavourite(snapshot, { voice }, { bankName: 'Keys' }, `f${index + 1}`).snapshot
    },
    loaded,
  )
}

function makeLibrary(snapshot: PatchLibrarySnapshot, overrides: Partial<Library> = {}) {
  const byPatchId = <Value,>(select: (favourite: Favourite) => Value) =>
    Object.fromEntries(
      snapshot.favourites.map((favourite) => [favouritePatchId(favourite.id), select(favourite)]),
    )
  return makeLibrarianLibrary({
    effects: { ...snapshot.effects, ...byPatchId(({ effects }) => effects) },
    favouriteKeys: favouriteSoundKeys(snapshot.favourites),
    favourites: snapshot.favourites,
    loadedBanks: snapshot.loadedBanks,
    patches: [...makePatches(snapshot), ...makeFavouritePatches(snapshot.favourites)],
    voices: { ...snapshot.voices, ...byPatchId(({ voice }) => voice) },
    workspaceBanks: snapshot.workspaceBanks,
    ...overrides,
  })
}

function renderPage(library: Library, midi: Midi = makeLibrarianMidi()) {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return user
}

const connectedMidi = () =>
  makeLibrarianMidi({
    hasMidiOutput: true,
    sendBank: vi.fn<Midi['sendBank']>(async () => ({ ok: true }) as const),
    sysexAvailable: true,
  })

describe('LibrarianPage hearts in a bank', () => {
  it('shows which slots hold a favourite sound', () => {
    renderPage(makeLibrary(makeWorkspace(1)))

    const favourite = screen.getByRole('button', { name: `Favourite ${voices[0].name}` })
    const other = screen.getByRole('button', { name: `Favourite ${voices[1].name}` })
    expect(favourite.getAttribute('aria-pressed')).toBe('true')
    expect(other.getAttribute('aria-pressed')).toBe('false')
  })

  it('adds a slot’s sound to Favourites from its heart', async () => {
    const snapshot = makeWorkspace(1)
    const toggle = vi.fn<Library['toggleFavourite']>(() => ({ added: true, changed: snapshot }))
    const user = renderPage(makeLibrary(snapshot, { toggleFavourite: toggle }))

    await user.click(screen.getByRole('button', { name: `Favourite ${voices[1].name}` }))

    expect(toggle).toHaveBeenCalledExactlyOnceWith('bank-A-2')
    // The heart lighting is the confirmation; a notification for each would pile up.
    expect(screen.queryByText(`Added “${voices[1].name}” to Favourites.`)).toBeNull()
  })
})

describe('LibrarianPage Favourites', () => {
  it('lists favourites in their order with the bank each came from', async () => {
    const user = renderPage(makeLibrary(makeWorkspace(2)))

    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    expect(screen.getByRole('button', { name: 'Favourites' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    const first = screen.getByRole('button', { name: `Send ${voices[0].name} to FM1` })
    const card = first.parentElement as HTMLElement
    expect(within(card).getByText('01')).toBeTruthy()
    expect(within(card).getByText('Keys')).toBeTruthy()
    expect(screen.queryByRole('button', { name: `Send ${voices[2].name} to FM1` })).toBeNull()
  })

  it('offers no file import over a favourite', async () => {
    const user = renderPage(makeLibrary(makeWorkspace(1)))
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: `Actions for ${voices[0].name}` }))

    expect(screen.getByRole('menuitem', { name: 'Copy to…' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Import patch…' })).toBeNull()
  })

  it('takes a favourite out with its heart and offers Undo', async () => {
    const snapshot = makeWorkspace(1)
    const undoChange = vi.fn<Library['undoChange']>(() => true)
    const user = renderPage(
      makeLibrary(snapshot, {
        toggleFavourite: vi.fn(() => ({ added: false, changed: snapshot })),
        undoChange,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: `Favourite ${voices[0].name}` }))
    await screen.findByText(`Removed “${voices[0].name}” from Favourites.`)
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(undoChange).toHaveBeenCalledExactlyOnceWith(snapshot)
  })

  it('explains an empty Favourites and cannot send it', async () => {
    const user = renderPage(makeLibrary(makeWorkspace(0)), connectedMidi())

    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    expect(screen.getByRole('heading', { name: 'No favourites yet' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send to FM1' }).hasAttribute('disabled')).toBe(true)
  })

  it('says a short Favourites is sent with INIT VOICE in the slots after it', async () => {
    const midi = connectedMidi()
    const user = renderPage(makeLibrary(makeWorkspace(3)), midi)
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    await waitFor(() => expect(midi.sendBank).toHaveBeenCalledOnce())
    const [bank, sent] = vi.mocked(midi.sendBank).mock.calls[0]
    expect(bank).toBe('favourites')
    expect(sent).toHaveLength(32)
    expect(sent.slice(0, 3)).toEqual(voices.slice(0, 3))
    expect(sent.slice(3).every((voice) => voice.name === 'INIT VOICE')).toBe(true)
    expect(
      (
        await screen.findAllByText(
          'Favourites was sent, with INIT VOICE in the last 29 slots. Choose its destination on the FM1.',
        )
      ).length,
    ).toBeGreaterThan(0)
  })

  it('says only the first 32 of a longer Favourites are sent', async () => {
    const midi = connectedMidi()
    const user = renderPage(makeLibrary(makeWorkspace(34)), midi)
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    await waitFor(() => expect(midi.sendBank).toHaveBeenCalledOnce())
    expect(vi.mocked(midi.sendBank).mock.calls[0][1]).toEqual(voices)
    expect(
      (
        await screen.findAllByText(
          'The first 32 favourites were sent; the last 2 were left out. Choose their destination on the FM1.',
        )
      ).length,
    ).toBeGreaterThan(0)
  })

  it('repeats the INIT VOICE note in the destination instructions', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = renderPage(makeLibrary(makeWorkspace(3)), connectedMidi())
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(
      within(dialog).getByText(
        'A bank holds 32 patches, so sending Favourites fills the last 29 slots with INIT VOICE.',
      ),
    ).toBeTruthy()
  })

  it('repeats the first-32 note in the destination instructions', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = renderPage(makeLibrary(makeWorkspace(34)), connectedMidi())
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(
      within(dialog).getByText(
        'A bank holds 32 patches, so only the first 32 favourites are sent. The last 2 stay here.',
      ),
    ).toBeTruthy()
  })

  it('adds no note to the destination instructions for a workspace bank', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = renderPage(makeLibrary(makeWorkspace(3)), connectedMidi())

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(within(dialog).queryByText(/INIT VOICE|first 32/)).toBeNull()
  })

  it('adds no note to the destination instructions for exactly 32 favourites', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    const user = renderPage(makeLibrary(makeWorkspace(32)), connectedMidi())
    await user.click(screen.getByRole('button', { name: 'Favourites' }))

    await user.click(screen.getByRole('button', { name: 'Send to FM1' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose the destination bank on your FM1' })
    expect(within(dialog).queryByText(/INIT VOICE|first 32/)).toBeNull()
  })

  it('writes the INIT VOICE note in German with the count in place', async () => {
    sessionStorage.removeItem('fm1-bank-selection-dialog-dismissed')
    await setLocale('de')
    const user = renderPage(makeLibrary(makeWorkspace(3)), connectedMidi())
    await user.click(screen.getByRole('button', { name: 'Favoriten' }))

    await user.click(screen.getByRole('button', { name: 'An FM1 senden' }))

    expect(
      screen.getByText(
        'Eine Bank fasst 32 Sounds, darum füllt das Senden der Favoriten die letzten 29 Plätze mit INIT VOICE.',
      ),
    ).toBeTruthy()
  })

  it('spells Favourites the American way in American English', async () => {
    await setLocale('en-US')
    renderPage(makeLibrary(makeWorkspace(1)))

    expect(screen.getByRole('button', { name: 'Favorites' })).toBeTruthy()
    expect(screen.getByRole('button', { name: `Favorite ${voices[0].name}` })).toBeTruthy()
  })
})
