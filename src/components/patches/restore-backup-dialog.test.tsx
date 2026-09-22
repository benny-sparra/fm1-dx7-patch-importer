// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import type { NamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { makeWorkspaceBackup, type WorkspaceBackup } from '@/lib/workspace-backup'

import { RestoreBackupDialog } from './restore-backup-dialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
  // The dialog focuses its file field in an animation frame; run it at once.
  window.requestAnimationFrame = (callback) => {
    callback(0)
    return 1
  }
})

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function makeSavedBank(id: string): NamedBank {
  return {
    createdAt: '2026-09-01T10:00:00.000Z',
    description: '',
    id,
    name: `Saved ${id}`,
    slots: makeDemoVoices().map((voice, index) => ({
      effects: makeDefaultFm1Effects(),
      slot: index + 1,
      voice,
    })),
    updatedAt: '2026-09-01T10:00:00.000Z',
    version: 1,
  }
}

function makeBackupFile(name = 'fm1-backup-2026-09-21.json') {
  const workspace = importVoices(emptyPatchLibrary(['A', 'B', 'C']), 'A', makeDemoVoices())
  const text = makeWorkspaceBackup(
    workspace,
    [makeSavedBank('one'), makeSavedBank('two')],
    '2026-09-21T13:03:00.000Z',
  )
  return new File([text], name, { type: 'application/json' })
}

function makeLibrary(overrides: Partial<{ namedBanks: NamedBank[] }> = {}) {
  return {
    namedBanks: [],
    namedBanksLoadFailed: false,
    restoreBackup: vi.fn((backup: WorkspaceBackup) =>
      Promise.resolve({ added: backup.savedBanks.length, changed: backup.workspace, kept: 0 }),
    ),
    ...overrides,
  }
}

function renderDialog(library = makeLibrary()) {
  const onClose = vi.fn()
  const onRestored = vi.fn()
  render(<RestoreBackupDialog library={library} onClose={onClose} onRestored={onRestored} />)
  return { library, onClose, onRestored }
}

function summaryValue(term: string) {
  const row = screen.getByText(term, { selector: 'dt' })
  return row.nextElementSibling?.textContent
}

describe('RestoreBackupDialog', () => {
  it('shows what the backup holds before anything changes', async () => {
    const user = userEvent.setup()
    const { library } = renderDialog(makeLibrary({ namedBanks: [makeSavedBank('one')] }))

    await user.upload(screen.getByLabelText('Choose a backup file'), makeBackupFile())

    expect(await screen.findByText('Workspace banks')).toBeTruthy()
    expect(summaryValue('Workspace banks')).toBe('3')
    expect(summaryValue('Patches')).toBe('32')
    expect(summaryValue('Saved banks')).toBe('2')
    expect(summaryValue('To add')).toBe('1')
    expect(summaryValue('Already here, kept')).toBe('1')
    expect(library.restoreBackup).not.toHaveBeenCalled()
  })

  it('restores the backup once confirmed and reports its date', async () => {
    const user = userEvent.setup()
    const { library, onClose, onRestored } = renderDialog()

    await user.upload(screen.getByLabelText('Choose a backup file'), makeBackupFile())
    await user.click(await screen.findByRole('button', { name: 'Restore backup' }))

    expect(library.restoreBackup).toHaveBeenCalledOnce()
    expect(onRestored).toHaveBeenCalledWith('2026-09-21T13:03:00.000Z', expect.any(Object))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cannot restore before a backup has been read', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Restore backup' })).toHaveProperty('disabled', true)
  })

  it('explains a file that is not a backup in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    renderDialog()

    await user.upload(
      screen.getByLabelText('Sicherungsdatei auswählen'),
      new File(['{"banks":[]}'], 'notes.json', { type: 'application/json' }),
    )

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Diese Datei ist keine Sicherung aus dieser App. Wähle eine .json-Datei, die mit „Sicherung herunterladen“ erstellt wurde.',
    )
    expect(screen.getByRole('button', { name: 'Sicherung wiederherstellen' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('shows the backup date in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    renderDialog()

    await user.upload(screen.getByLabelText('Sicherungsdatei auswählen'), makeBackupFile())

    expect(await screen.findByText('Gesichert')).toBeTruthy()
    expect(summaryValue('Gesichert')).toBe(
      new Intl.DateTimeFormat('de', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date('2026-09-21T13:03:00.000Z'),
      ),
    )
  })

  it('keeps the dialog open while restoring', async () => {
    const user = userEvent.setup()
    let finish!: () => void
    const library = makeLibrary()
    library.restoreBackup.mockImplementation(
      (backup) =>
        new Promise((resolve) => {
          finish = () => resolve({ added: 0, changed: backup.workspace, kept: 0 })
        }),
    )
    const { onClose } = renderDialog(library)

    await user.upload(screen.getByLabelText('Choose a backup file'), makeBackupFile())
    await user.click(await screen.findByRole('button', { name: 'Restore backup' }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog, cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Restoring…' })).toHaveProperty('disabled', true)
    expect(onClose).not.toHaveBeenCalled()
    finish()
  })

  it('explains a storage failure and stays open to try again', async () => {
    const user = userEvent.setup()
    const library = makeLibrary()
    library.restoreBackup.mockRejectedValueOnce(new Error('QuotaExceededError'))
    const { onClose } = renderDialog(library)

    await user.upload(screen.getByLabelText('Choose a backup file'), makeBackupFile())
    await user.click(await screen.findByRole('button', { name: 'Restore backup' }))

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Browser storage could not keep the saved banks from this backup, so your workspace was not changed. Try again.',
    )
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Restore backup' }))
    expect(library.restoreBackup).toHaveBeenCalledTimes(2)
  })

  it('shows the file chosen last when an earlier read finishes after it', async () => {
    const user = userEvent.setup()
    renderDialog()
    let finishFirst!: (text: string) => void
    const first = makeBackupFile('first.json')
    const firstText = await first.text()
    Object.defineProperty(first, 'text', {
      value: () => new Promise<string>((resolve) => (finishFirst = resolve)),
    })
    const input = screen.getByLabelText('Choose a backup file')

    await user.upload(input, first)
    await user.upload(input, new File(['not a backup'], 'second.json'))
    await screen.findByRole('alert')
    finishFirst(firstText)
    await Promise.resolve()

    expect(screen.queryByText('Workspace banks')).toBeNull()
    expect(within(screen.getByRole('alert')).getByText(/not a backup from this app/)).toBeTruthy()
  })
})
