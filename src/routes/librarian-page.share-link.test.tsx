// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { decodePatchSharePayload, encodePatchSharePayload } from '@/lib/patch-share-link'
import { makeDemoVoices, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { makeLibrarianLibrary, makeLibrarianMidi, slotMenuName } from '@/test/librarian-fakes'

import { LibrarianPage } from './librarian-page'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  // jsdom has no scrollIntoView; a test that watches it adds its own.
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  await setLocale('en-GB')
})

const [voice, otherVoice] = makeDemoVoices()
const effects = Uint8Array.from(makeDefaultFm1Effects(), (_, index) => (index === 2 ? 40 : 0))
const changed = { workspaceBanks: ['A'] } as unknown as PatchLibrarySnapshot

function renderPage(midi = makeLibrarianMidi()) {
  const library = makeLibrarianLibrary({
    bankNames: { A: 'Studio' },
    effects: { 'bank-A-1': effects },
    loadedBanks: ['A'],
    patches: [
      { bank: 'A', family: 'DX7', id: 'bank-A-1', name: voice.name, number: 1, program: 0 },
      { bank: 'A', family: 'DX7', id: 'bank-A-2', name: otherVoice.name, number: 2, program: 1 },
    ],
    replaceVoice: vi.fn(() => changed),
    replaceWithVirtualAnalog: vi.fn(() => changed),
    undoChange: vi.fn(),
    voices: { 'bank-A-1': voice, 'bank-A-2': otherVoice },
    workspaceBanks: ['A'],
  })
  const onPlaySearchResult = vi.fn()
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={midi}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={onPlaySearchResult}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { library, onPlaySearchResult, user }
}

function openOnLink(payload: string) {
  window.history.replaceState({ kept: true }, '', `/?ref=1#p=${payload}`)
}

describe('LibrarianPage share links', () => {
  it('copies a share link to this site, carrying the slot’s voice and effects', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: slotMenuName(voice.name) }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy share link' }))

    expect(await screen.findByText(`Copied a share link for “${voice.name}”.`)).toBeTruthy()
    const link = await navigator.clipboard.readText()
    expect(link.startsWith(`${window.location.origin}/#p=`)).toBe(true)
    const shared = decodePatchSharePayload(link.split('#p=')[1])
    expect('voice' in shared && shared.voice.data).toEqual(voice.data)
    expect(shared.effects).toEqual(effects)
  })

  it('explains in the interface language when the browser refuses the clipboard', async () => {
    await setLocale('de')
    const { user } = renderPage()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'))

    await user.click(screen.getByRole('button', { name: slotMenuName(voice.name, 'Aktionen für') }))
    await user.click(screen.getByRole('menuitem', { name: 'Freigabelink kopieren' }))

    expect(
      await screen.findByText(
        'Der Freigabelink konnte nicht kopiert werden, weil der Browser die Zwischenablage nicht erlaubt hat.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/NotAllowedError/)).toBeNull()
  })

  it('brings a refused copy’s explanation into view below the patch banks', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { user } = renderPage()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'))

    await user.click(screen.getByRole('button', { name: slotMenuName(voice.name) }))
    await user.click(screen.getByRole('menuitem', { name: 'Copy share link' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('The browser did not allow the share link to be copied.')
    expect(scrollIntoView.mock.contexts).toContain(alert.parentElement)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('confirms a copied link in the interface language, naming the patch', async () => {
    await setLocale('de')
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: slotMenuName(voice.name, 'Aktionen für') }))
    await user.click(screen.getByRole('menuitem', { name: 'Freigabelink kopieren' }))

    expect(await screen.findByText(`Freigabelink für „${voice.name}“ kopiert.`)).toBeTruthy()
  })

  it('opens a shared patch and adds it to the chosen slot, which Undo reverses', async () => {
    const shared = makeDemoVoices()[3]
    openOnLink(encodePatchSharePayload({ effects, name: shared.name, voice: shared }))
    const { library, user } = renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    expect(within(dialog).getByText(shared.name)).toBeTruthy()
    expect(library.replaceVoice).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Add to library…' }))
    await user.click(await screen.findByRole('button', { name: 'A02 ' + otherVoice.name }))
    await user.click(screen.getByRole('button', { name: 'Replace A02' }))

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      2,
      expect.objectContaining({ data: shared.data }),
      effects,
      undefined,
    )
    expect(await screen.findByText(`Copied “${shared.name}” to A02 in “Studio”.`)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('adds a shared Virtual Analog preset with its record, exactly as shared', async () => {
    const presetVoice = Uint8Array.from(voice.data)
    const record = Uint8Array.from({ length: 59 }, (_, index) => (index === 18 ? 0x5a : index))
    openOnLink(encodePatchSharePayload({ effects, name: '', record, virtualAnalog: presetVoice }))
    const { library, user } = renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    expect(within(dialog).queryByRole('button', { name: 'Play on FM1' })).toBeNull()
    expect(within(dialog).getByText(/plays only on Baud Girl’s firmware/)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Add to library…' }))
    await user.click(await screen.findByRole('button', { name: 'Replace A01' }))

    expect(library.replaceWithVirtualAnalog).toHaveBeenCalledExactlyOnceWith(
      'A',
      1,
      presetVoice,
      effects,
      record,
    )
  })

  it('plays a shared DX7 patch through the edit buffer without adding it', async () => {
    const shared = makeDemoVoices()[3]
    openOnLink(encodePatchSharePayload({ effects, name: shared.name, voice: shared }))
    const { library, onPlaySearchResult, user } = renderPage(
      makeLibrarianMidi({ hasMidiOutput: true }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    await user.click(within(dialog).getByRole('button', { name: 'Play on FM1' }))

    expect(onPlaySearchResult).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ data: shared.data }),
      effects,
    )
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('asks for the FM1 before a shared patch can play', async () => {
    openOnLink(encodePatchSharePayload({ effects, name: voice.name, voice }))
    renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    expect(
      (within(dialog).getByRole('button', { name: 'Play on FM1' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(within(dialog).getByText('Connect the FM1 to play it.')).toBeTruthy()
  })

  it('takes the link out of the address bar, keeping the rest of the address', async () => {
    openOnLink(encodePatchSharePayload({ effects, name: voice.name, voice }))
    renderPage()

    await screen.findByRole('dialog', { name: 'Shared patch' })

    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?ref=1')
    expect(window.history.state).toEqual({ kept: true })
  })

  it('opens a link pasted into the address bar of the open page', async () => {
    renderPage()
    expect(screen.queryByRole('dialog', { name: 'Shared patch' })).toBeNull()

    window.location.hash = `#p=${encodePatchSharePayload({ effects, name: voice.name, voice })}`

    expect(await screen.findByRole('dialog', { name: 'Shared patch' })).toBeTruthy()
  })

  it('explains a damaged link in the interface language and offers nothing to add', async () => {
    await setLocale('de')
    openOnLink('AQAA')
    renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Geteilter Sound' })
    expect(
      within(dialog).getByText(
        'Dieser Freigabelink ist beschädigt oder unvollständig. Lass ihn dir noch einmal schicken und kopiere ihn vollständig.',
      ),
    ).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Zur Bibliothek hinzufügen…' })).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('keeps a link from a newer release for the reload it offers', async () => {
    openOnLink('AgAA')
    renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    expect(
      within(dialog).getByText(
        'This share link comes from a newer release of the editor. Reload the page to open it.',
      ),
    ).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Reload app' })).toBeTruthy()
    expect(window.location.hash).toBe('#p=AgAA')
  })

  it('forgets a link once its dialog closes', async () => {
    openOnLink('AgAA')
    const { user } = renderPage()

    const dialog = await screen.findByRole('dialog', { name: 'Shared patch' })
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0])

    expect(screen.queryByRole('dialog', { name: 'Shared patch' })).toBeNull()
    expect(window.location.hash).toBe('')
  })
})
