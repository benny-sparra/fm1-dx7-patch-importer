// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { makeDemoVoices } from '@/lib/patch-library'
import { makePatchShareFragment } from '@/lib/patch-share-link'
import { readPatchShareFragment } from '@/lib/patch-share-link-reader'

import { LibrarianPage } from './librarian-page'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
  await setLocale('en')
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

const slotVoice = updateDx7VoiceName(makeDemoVoices()[0], 'ALPHA')
const sharedVoice = updateDx7VoiceName(makeDemoVoices()[1], 'SHARED')
const sharedEffects = makeDefaultFm1Effects()
sharedEffects.set([1, 2, 80, 4])
const slotEffects = makeDefaultFm1Effects()
slotEffects.set([0, 0, 0, 0, 1, 1, 50, 40])
const sharedFragment = `#${makePatchShareFragment(sharedVoice, sharedEffects)}`
const changed = { changed: true }

function makeLibrary(overrides: Partial<PatchLibrary> = {}) {
  return {
    bankDescriptions: {},
    bankNames: { A: 'Studio Favourites' },
    effects: { 'bank-A-1': slotEffects },
    getBankVoices: vi.fn(() => []),
    loadedBanks: ['A'],
    namedBanks: [],
    patches: [{ bank: 'A', family: 'DX7', id: 'bank-A-1', name: 'ALPHA', number: 1, program: 0 }],
    replaceVoice: vi.fn(() => changed),
    undoChange: vi.fn(),
    voices: { 'bank-A-1': slotVoice },
    workspaceBanks: ['A'],
    ...overrides,
  } as unknown as PatchLibrary
}

function renderPage(library = makeLibrary()) {
  const user = userEvent.setup()
  render(
    <ToastProvider>
      <LibrarianPage
        activePatchId=""
        library={library}
        midi={{ hasMidiOutput: false } as unknown as MidiController}
        onBankDeleted={vi.fn()}
        onEditPatch={vi.fn()}
        onPlaySearchResult={vi.fn()}
        onSelectPatch={vi.fn()}
      />
    </ToastProvider>,
  )
  return { library, user }
}

function openWithAddress(hash: string, library?: PatchLibrary) {
  window.history.replaceState(null, '', `/${hash}`)
  return renderPage(library)
}

async function addSharedPatch() {
  const page = openWithAddress(sharedFragment)
  const dialog = await screen.findByRole('dialog', { name: 'Copy SHARED' })
  await page.user.click(within(dialog).getByRole('button', { name: 'Replace A01' }))
  return page
}

describe('LibrarianPage opening a share link', () => {
  it('asks where to put the shared patch without changing the library', async () => {
    const { library } = openWithAddress(sharedFragment)

    const dialog = await screen.findByRole('dialog', { name: 'Copy SHARED' })

    expect(
      within(dialog).getByText(
        'Someone shared this patch with you. Choose a slot for it in one of your banks.',
      ),
    ).toBeTruthy()
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('removes the link from the address, so a reload does not offer it again', async () => {
    openWithAddress(sharedFragment)

    await screen.findByRole('dialog', { name: 'Copy SHARED' })

    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/')
  })

  it('puts the shared patch and its FM1 effects in the chosen slot', async () => {
    const { library } = await addSharedPatch()

    expect(library.replaceVoice).toHaveBeenCalledExactlyOnceWith(
      'A',
      1,
      expect.objectContaining({ data: sharedVoice.data, name: 'SHARED' }),
      sharedEffects,
    )
  })

  it('offers to undo adding the shared patch from its notification', async () => {
    const { library, user } = await addSharedPatch()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('writes nothing when the dialog is closed', async () => {
    const { library, user } = openWithAddress(sharedFragment)
    const dialog = await screen.findByRole('dialog', { name: 'Copy SHARED' })

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(library.replaceVoice).not.toHaveBeenCalled()
  })

  it('opens a link pasted into a tab that is already open', async () => {
    renderPage()
    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => {
      window.history.replaceState(null, '', `/${sharedFragment}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(await screen.findByRole('dialog', { name: 'Copy SHARED' })).toBeTruthy()
  })

  it('leaves the page alone for a fragment that is not a share link', () => {
    openWithAddress('#section')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.location.hash).toBe('#section')
  })

  it('explains a damaged link in the interface language', async () => {
    await setLocale('de')

    openWithAddress(sharedFragment.slice(0, -12))

    expect(
      await screen.findByText(
        'Dieser Link ist unvollständig oder beschädigt. Lass ihn dir noch einmal schicken und kopiere ihn ganz.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('explains a link from a newer release', async () => {
    openWithAddress(sharedFragment.replace('patch=1.', 'patch=2.'))

    expect(
      await screen.findByText(
        'This share link was made by a newer version of this app. Reload the page, then open the link again.',
      ),
    ).toBeTruthy()
  })

  it('asks for a bank first when no bank holds patches', async () => {
    const library = makeLibrary({ loadedBanks: [], patches: [] })

    openWithAddress(sharedFragment, library)

    expect(
      await screen.findByText(
        'To add a shared patch, first load or import a bank, then open the link again.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('LibrarianPage copying a share link', () => {
  // userEvent installs its own clipboard as it is set up, so the page's is replaced afterwards.
  async function copyShareLink(clipboard: Partial<Clipboard> | undefined) {
    const page = renderPage()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard })
    await page.user.click(screen.getByRole('button', { name: 'Actions for ALPHA' }))
    await page.user.click(screen.getByRole('menuitem', { name: 'Copy share link' }))
    return page
  }

  it('copies a link that carries the slot’s patch and FM1 effects', async () => {
    const writeText = vi.fn(async (_text: string) => undefined)

    await copyShareLink({ writeText })

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const link = new URL(writeText.mock.calls[0][0])
    expect(link.origin).toBe(window.location.origin)
    expect(readPatchShareFragment(link.hash)).toEqual({ effects: slotEffects, voice: slotVoice })
  })

  it('says the link was copied', async () => {
    await copyShareLink({ writeText: vi.fn(async () => undefined) })

    expect(
      await screen.findByText(
        'Copied a link to “ALPHA”. Anyone who opens it can add the patch to their own banks.',
      ),
    ).toBeTruthy()
  })

  it('explains a clipboard the browser refused, without its technical message', async () => {
    await copyShareLink({
      writeText: vi.fn(async () => Promise.reject(new Error('Document is not focused.'))),
    })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'The link could not be copied, because the browser did not allow access to the clipboard. Try again.',
    )
  })

  it('explains a browser without a clipboard', async () => {
    await copyShareLink(undefined)

    expect(
      await screen.findByText(
        'The link could not be copied, because the browser did not allow access to the clipboard. Try again.',
      ),
    ).toBeTruthy()
  })
})
