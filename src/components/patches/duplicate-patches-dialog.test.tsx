// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { emptyPatchLibrary } from '@/lib/patch-library'
import { makeWorkspaceWithCopies } from '@/test/factory-voices'

import { DuplicatePatchesDialog } from './duplicate-patches-dialog'

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
  await setLocale('en-GB')
})

type Library = Parameters<typeof DuplicatePatchesDialog>[0]['library']

function renderDialog(library: Library = makeWorkspaceWithCopies([{ name: 'MY BRASS', slot: 5 }])) {
  const onClose = vi.fn()
  render(<DuplicatePatchesDialog library={library} onClose={onClose} />)
  return {
    dialog: screen.getByRole('dialog'),
    onClose,
    user: userEvent.setup(),
  }
}

describe('DuplicatePatchesDialog', () => {
  it('is titled for what it lists', () => {
    const { dialog } = renderDialog()

    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Duplicate patches' })).toBe(dialog)
  })

  it('lists a patch with its renamed copy in another bank', () => {
    const { dialog } = renderDialog()

    const group = within(dialog).getByRole('region', { name: 'BRASS 1 and one copy' })
    expect(
      within(group).getByRole('button', { name: 'Go to BRASS 1, patch 1 in Bank 1' }),
    ).toBeTruthy()
    expect(
      within(group).getByRole('button', { name: 'Go to MY BRASS, patch 5 in Bank 2' }),
    ).toBeTruthy()
  })

  it('counts every copy of a patch in its group', () => {
    const { dialog } = renderDialog(
      makeWorkspaceWithCopies([
        { name: 'BRASS 1', slot: 2 },
        { name: 'BRASS 1', slot: 3 },
      ]),
    )

    expect(within(dialog).getByRole('region', { name: 'BRASS 1 and 2 copies' })).toBeTruthy()
  })

  it('says when the copies’ FM1 effects differ', () => {
    const workspace = makeWorkspaceWithCopies([{ name: 'BRASS 1', slot: 5 }])
    const reverb = makeDefaultFm1Effects()
    reverb[0] = 1

    const { dialog } = renderDialog({ ...workspace, effects: { 'bank-B-5': reverb } })

    expect(within(dialog).getByText('Their FM1 effects differ.')).toBeTruthy()
  })

  it('says when the copies’ FM-1+VA preset settings differ', () => {
    const workspace = makeWorkspaceWithCopies([{ name: 'BRASS 1', slot: 5 }])

    const { dialog } = renderDialog({ ...workspace, records: { 'bank-B-5': new Uint8Array(59) } })

    expect(within(dialog).getByText('Their FM-1+VA preset settings differ.')).toBeTruthy()
    expect(within(dialog).queryByText('Their FM1 effects differ.')).toBeNull()
  })

  it('says so when there are no duplicates', () => {
    const { dialog } = renderDialog(makeWorkspaceWithCopies([]))

    expect(
      within(dialog).getByText(
        'No duplicates: every patch in your banks has its own voice settings.',
      ),
    ).toBeTruthy()
  })

  it('looks only in loaded banks', () => {
    const workspace = makeWorkspaceWithCopies([{ name: 'BRASS 1', slot: 5 }])

    const { dialog } = renderDialog({ ...workspace, loadedBanks: ['A'] })

    expect(within(dialog).queryByRole('region')).toBeNull()
  })

  it('names banks by the title the user gave them', () => {
    const workspace = makeWorkspaceWithCopies([{ name: 'BRASS 1', slot: 5 }])

    const { dialog } = renderDialog({ ...workspace, bankNames: { B: 'Archive' } })

    expect(
      within(dialog).getByRole('button', { name: 'Go to BRASS 1, patch 5 in Archive' }),
    ).toBeTruthy()
  })

  it('focuses the first patch as it opens', () => {
    renderDialog()

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Go to BRASS 1, patch 1 in Bank 1' }),
    )
  })

  it('closes with the patch chosen to go to', async () => {
    const { dialog, onClose, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Go to MY BRASS, patch 5 in Bank 2' }))

    expect(dialog).toHaveProperty('open', false)
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ id: 'bank-B-5' }))
  })

  it('closes with no patch when it is dismissed', async () => {
    const { onClose, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledWith(null)
  })

  it('names a group and its copies in the interface language', async () => {
    await setLocale('de')
    const { dialog } = renderDialog(
      makeWorkspaceWithCopies([
        { name: 'BRASS 1', slot: 2 },
        { name: 'BRASS 1', slot: 3 },
      ]),
    )

    const group = within(dialog).getByRole('region', { name: 'BRASS 1 und 2 Kopien' })
    expect(
      within(group).getByRole('button', { name: 'Zu BRASS 1 springen, Sound 3 in Bank 2' }),
    ).toBeTruthy()
  })

  it('treats an empty library as having no duplicates', () => {
    const { dialog } = renderDialog({ ...emptyPatchLibrary(), patches: [] })

    expect(within(dialog).queryByRole('region')).toBeNull()
  })
})
