// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { ToastProvider } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { resetLastBackupTimeForTests } from '@/lib/last-backup'
import { emptyPatchLibrary, importVoices, makeDemoVoices, voiceId } from '@/lib/patch-library'
import { makeWorkspaceBackup } from '@/lib/workspace-backup'
import { translatePageText } from '@/test/page-translator'

import { LibrarianPage } from './librarian-page'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>

beforeEach(() => {
  localStorage.clear()
  resetLastBackupTimeForTests()
  createObjectURL = vi.fn((_blob: Blob) => 'blob:backup')
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await setLocale('en')
})

function makeLibrary() {
  const workspace = importVoices(emptyPatchLibrary(['A']), 'A', makeDemoVoices())
  const voices = makeDemoVoices()
  return {
    ...workspace,
    getBankVoices: vi.fn(() => voices),
    hasDamagedNamedBanks: false,
    namedBanks: [],
    namedBanksLoadFailed: false,
    namedBanksLoading: false,
    patches: [
      {
        bank: 'A',
        family: 'DX7',
        id: voiceId('A', 1),
        name: workspace.voices[voiceId('A', 1)].name,
        number: 1,
        program: 0,
      },
    ],
    restoreBackup: vi.fn(async () => ({ added: 0, changed: emptyPatchLibrary(), kept: 0 })),
    undoChange: vi.fn(() => true),
  } as unknown as PatchLibrary
}

function renderPage(library = makeLibrary()) {
  const view = render(
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
  return { ...view, library }
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle('More bank file actions'))
}

describe('LibrarianPage backup', () => {
  it('puts the full backup first, then SysEx files, then the factory reset', async () => {
    const user = userEvent.setup()
    renderPage()
    await openMenu(user)

    const backup = screen.getByRole('group', { name: 'Full backup' })
    const sysex = screen.getByRole('group', { name: 'For other DX7 tools' })
    expect(backup.compareDocumentPosition(sysex) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(backup).getByRole('button', { name: 'Download backup' })).toBeTruthy()
    expect(within(backup).getByRole('button', { name: 'Restore from backup…' })).toBeTruthy()
    const zip = within(sysex).getByRole('button', { name: 'Download SysEx banks (.zip)' })
    expect(document.getElementById(zip.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'DX7 data only, no FM1 effects',
    )
    expect(screen.getByRole('button', { name: 'Reset to factory patches…' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Restore all banks' })).toBeNull()
  })

  it('downloads the workspace as a backup file', async () => {
    const user = userEvent.setup()
    renderPage()
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Download backup' }))

    expect(
      await screen.findByText('Downloading a backup of your workspace banks and saved banks.'),
    ).toBeTruthy()
    const backup = JSON.parse(await createObjectURL.mock.calls[0][0].text())
    expect(backup).toMatchObject({ format: 'fm1-librarian-backup', version: 1 })
    expect(backup.workspace.slots).toHaveLength(32)
  })

  it('says a backup includes FM1 effects and shows no date before the first one', async () => {
    const user = userEvent.setup()
    renderPage()
    await openMenu(user)

    const download = screen.getByRole('button', { name: 'Download backup' })
    const contents = screen.getByText('Includes FM1 effects')
    expect(download.getAttribute('aria-describedby')).toBe(contents.id)
    expect(screen.queryByText(/^Last backed up:/)).toBeNull()
  })

  it('adds the date of the last backup on its own line once one is made', async () => {
    const user = userEvent.setup()
    renderPage()
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Download backup' }))
    await screen.findByText('Downloading a backup of your workspace banks and saved banks.')

    const line = screen.getByText(`Last backed up: ${new Date().toLocaleDateString('en')}`)
    const download = screen.getByRole('button', { name: 'Download backup' })
    expect(download.getAttribute('aria-describedby')).toContain(line.id)
    expect(Date.parse(localStorage.getItem('fm1-last-backup') ?? '')).not.toBeNaN()
  })

  it('shows the last backup date in the interface language', async () => {
    localStorage.setItem('fm1-last-backup', '2026-09-21T13:03:00.000Z')
    await setLocale('fr')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTitle('Autres actions sur les banques'))

    const date = new Date('2026-09-21T13:03:00.000Z').toLocaleDateString('fr')
    expect(screen.getByText(`Dernière sauvegarde : ${date}`)).toBeTruthy()
  })

  it('treats an unreadable stored backup date as no backup', async () => {
    localStorage.setItem('fm1-last-backup', 'yesterday')
    const user = userEvent.setup()
    renderPage()
    await openMenu(user)

    expect(screen.getByText('Includes FM1 effects')).toBeTruthy()
    expect(screen.queryByText(/^Last backed up:/)).toBeNull()
  })

  it('adds the last backup line under a page translator without breaking', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await openMenu(user)
    translatePageText(container)

    await user.click(screen.getByRole('button', { name: 'Download backup' }))

    expect(await screen.findByText(/^Last backed up:/)).toBeTruthy()
  })

  it('waits for saved banks to load before backing up', async () => {
    const user = userEvent.setup()
    renderPage({ ...makeLibrary(), namedBanksLoading: true } as PatchLibrary)
    await openMenu(user)

    expect(screen.getByRole('button', { name: 'Download backup' })).toHaveProperty('disabled', true)
  })

  it('restores a backup and offers to undo it', async () => {
    const user = userEvent.setup()
    const { library } = renderPage()
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Restore from backup…' }))
    const file = new File(
      [makeWorkspaceBackup(emptyPatchLibrary(), [], '2026-09-21T13:03:00.000Z')],
      'fm1-backup-2026-09-21.json',
    )
    await user.upload(await screen.findByLabelText('Choose a backup file'), file)
    await user.click(await screen.findByRole('button', { name: 'Restore backup' }))

    const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date('2026-09-21T13:03:00.000Z'),
    )
    expect(await screen.findByText(`Restored the backup from ${date}.`)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(library.undoChange).toHaveBeenCalledOnce()
  })
})
