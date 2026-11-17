import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import type { NamedBank } from '../src/lib/named-bank'
import type { StoredPatchLibrary } from '../src/lib/patch-library-storage'
import { completeRecoveryBackup, recoveryBytes } from '../src/test/workspace-recovery-backup'
import { makeSettingsBlock, makeSettingsBlockReply } from '../src/test/v16-settings-replies'
import { fakeMidiRequests, installFakeMidi, sentMidi } from './fake-midi'

const savedBankConflict =
  'This saved bank changed or was deleted in another tab. Your edits are kept here. Reload saved banks, then reopen its details to review the latest version.'

/** Resolve after the read transaction completes; never poll the app's private state. */
function storedLibrary(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ banks: NamedBank[]; workspace: StoredPatchLibrary | undefined }>(
        (resolve, reject) => {
          const open = indexedDB.open('fm1-librarian')
          open.onerror = () => reject(open.error ?? new Error('Could not open IndexedDB.'))
          open.onsuccess = () => {
            const database = open.result
            const transaction = database.transaction(['library', 'named-banks'], 'readonly')
            const workspace = transaction.objectStore('library').get('current')
            const banks = transaction.objectStore('named-banks').getAll()
            transaction.onabort = () => {
              database.close()
              reject(transaction.error ?? new Error('Could not read the library.'))
            }
            transaction.oncomplete = () => {
              database.close()
              resolve({ banks: banks.result, workspace: workspace.result })
            }
          }
        },
      ),
  )
}

async function openLibrary(
  page: Page,
  welcome: boolean,
  midiOptions?: Parameters<typeof installFakeMidi>[1],
) {
  await installFakeMidi(page, midiOptions)
  await page.goto('/')
  if (welcome) {
    // The lazy welcome must finish opening before it can be closed. Later tabs share its flag.
    const guide = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
    await expect(guide).toBeVisible()
    await guide.getByRole('button', { name: 'Close help' }).click()
    await expect(guide).toBeHidden()
  }
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Send A01 PIANO 1 to FM1', exact: true }),
  ).toBeVisible()
}

async function bankMenu(page: Page, title = 'Bank 1') {
  await page.getByLabel(`Actions for ${title}`).locator('visible=true').click()
}

async function sharedTabs(context: BrowserContext) {
  await context.route('https://**/*', (route) => route.abort())
  const seed = await context.newPage()
  await openLibrary(seed, true)
  await expect.poll(async () => (await storedLibrary(seed)).workspace?.version).toBe(9)
  await bankMenu(seed)
  await seed.getByRole('button', { name: 'Save bank…', exact: true }).click()
  const save = seed.getByRole('dialog')
  const name = save.getByRole('textbox', { name: 'Bank name' })
  await expect(name).toBeFocused()
  await name.fill('Shared bank')
  await save.getByRole('textbox', { name: 'Description (optional)' }).fill('Original notes')
  await save.getByRole('button', { name: 'Save bank', exact: true }).click()
  await expect(save).toBeHidden()
  await expect
    .poll(async () => (await storedLibrary(seed)).banks)
    .toMatchObject([{ description: 'Original notes', name: 'Shared bank' }])
  const initial = await storedLibrary(seed)
  await seed.close()

  // Create both readers only after the seed commits. Their later actions share real IndexedDB.
  const first = await context.newPage()
  const second = await context.newPage()
  await openLibrary(first, false)
  await openLibrary(second, false)
  return { first, initial, second }
}

async function savedBanks(page: Page) {
  await bankMenu(page)
  await page.getByRole('button', { name: 'Load bank…', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'My saved banks' })
  await expect(dialog.getByRole('button', { name: 'Edit Shared bank', exact: true })).toBeVisible()
  return dialog
}

async function editFirstPatch(page: Page, name: string) {
  await page.getByRole('button', { name: /^Send A01 .+ to FM1$/ }).dblclick()
  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeEnabled()
  await page.getByRole('textbox', { name: 'Patch name' }).fill(name)
  await page.getByRole('button', { name: 'Save to library' }).click()
}

test('a stale description edit cannot overwrite another tab’s saved-bank rename', async ({
  context,
}) => {
  const { first, initial, second } = await sharedTabs(context)
  const firstDialog = await savedBanks(first)
  const secondDialog = await savedBanks(second)
  await firstDialog.getByRole('button', { name: 'Edit Shared bank', exact: true }).click()
  await expect(firstDialog.getByRole('textbox', { name: 'Bank name' })).toBeFocused()
  await secondDialog.getByRole('button', { name: 'Edit Shared bank', exact: true }).click()
  await expect(secondDialog.getByRole('textbox', { name: 'Bank name' })).toBeFocused()
  await secondDialog
    .getByRole('textbox', { name: 'Description (optional)' })
    .fill('Draft from tab B')

  await firstDialog.getByRole('textbox', { name: 'Bank name' }).fill('Tab A bank')
  await firstDialog.getByRole('button', { name: 'Update details' }).click()
  await expect.poll(async () => (await storedLibrary(first)).banks[0]?.name).toBe('Tab A bank')
  const winner = await storedLibrary(first)
  expect(winner.banks[0]).toMatchObject({
    description: 'Original notes',
    id: initial.banks[0].id,
    name: 'Tab A bank',
    slots: initial.banks[0].slots,
  })

  await secondDialog.getByRole('button', { name: 'Update details' }).click()

  await expect(secondDialog.getByRole('alert')).toHaveText(savedBankConflict)
  await expect(secondDialog.getByRole('textbox', { name: 'Bank name' })).toHaveValue('Shared bank')
  await expect(secondDialog.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue(
    'Draft from tab B',
  )
  expect(await storedLibrary(second)).toEqual(winner)
  await secondDialog.getByRole('button', { name: 'Reload saved banks' }).click()
  await expect(
    secondDialog.getByRole('button', { name: 'Edit Tab A bank', exact: true }),
  ).toBeVisible()
  await expect(secondDialog.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue(
    'Draft from tab B',
  )
  await secondDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await secondDialog.getByRole('button', { name: 'Edit Tab A bank', exact: true }).click()
  await expect(secondDialog.getByRole('textbox', { name: 'Bank name' })).toHaveValue('Tab A bank')
  await expect(secondDialog.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue(
    'Original notes',
  )
  expect(await storedLibrary(second)).toEqual(winner)
  expect(await sentMidi(first)).toEqual([])
  expect(await sentMidi(second)).toEqual([])
})

test('a stale rename cannot resurrect a saved bank deleted by another tab', async ({ context }) => {
  const { first, initial, second } = await sharedTabs(context)
  const firstDialog = await savedBanks(first)
  const secondDialog = await savedBanks(second)
  await secondDialog.getByRole('button', { name: 'Edit Shared bank', exact: true }).click()
  const name = secondDialog.getByRole('textbox', { name: 'Bank name' })
  await expect(name).toBeFocused()
  await name.fill('Resurrected')

  await firstDialog.getByRole('button', { name: 'Delete Shared bank', exact: true }).click()
  await firstDialog
    .getByRole('group', { name: 'Delete bank', exact: true })
    .getByRole('button', { name: 'Delete bank', exact: true })
    .click()
  await expect.poll(async () => (await storedLibrary(first)).banks).toEqual([])

  await secondDialog.getByRole('button', { name: 'Update details' }).click()

  await expect(secondDialog.getByRole('alert')).toHaveText(savedBankConflict)
  await expect(name).toHaveValue('Resurrected')
  await expect(secondDialog.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue(
    'Original notes',
  )
  expect(await storedLibrary(second)).toEqual({ ...initial, banks: [] })
  await secondDialog.getByRole('button', { name: 'Reload saved banks' }).click()
  await expect(
    secondDialog.getByText('No saved banks yet. Save the selected bank to create one.'),
  ).toBeVisible()
  await expect(name).toHaveValue('Resurrected')
  expect((await storedLibrary(second)).banks).toEqual([])
  expect(await sentMidi(first)).toEqual([])
  expect(await sentMidi(second)).toEqual([])
})

test('a stale workspace keeps its unsaved edit and exports it before reloading the other tab’s save', async ({
  context,
}) => {
  const { first, second } = await sharedTabs(context)
  await editFirstPatch(first, 'FIRST TAB')
  await expect
    .poll(async () => (await storedLibrary(first)).workspace?.voices['bank-A-1']?.name)
    .toBe('FIRST TAB')
  const winner = await storedLibrary(first)
  await editFirstPatch(second, 'SECOND TAB')
  const conflict = second.getByRole('alert').filter({ hasText: 'Another tab changed your library' })

  await expect(conflict).toContainText(
    'Your changes in this tab are still here but were not saved, so they do not replace the other tab’s. Download a backup to keep them, then reload to open the library as saved.',
  )
  await expect(second.getByRole('textbox', { name: 'Patch name' })).toHaveValue('SECOND TAB')
  expect(await storedLibrary(second)).toEqual(winner)

  const downloading = second.waitForEvent('download')
  await conflict.getByRole('button', { name: 'Download backup', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^fm1-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(backup).toMatchObject({ format: 'fm1-librarian-backup', version: 7 })
  const slot = backup.workspace.slots.find(
    (candidate: { bank: string; slot: number }) => candidate.bank === 'A' && candidate.slot === 1,
  )
  expect(Buffer.from(slot.voice, 'base64').subarray(118).toString('ascii')).toBe('SECOND TAB')
  await expect(second.getByRole('textbox', { name: 'Patch name' })).toHaveValue('SECOND TAB')
  expect(await storedLibrary(second)).toEqual(winner)
  expect(await sentMidi(first)).toEqual([])
  expect(await sentMidi(second)).toEqual([])

  // Recovery is demonstrated before allowing the losing tab to discard its in-memory draft.
  second.once('dialog', (dialog) => dialog.accept())
  await conflict.getByRole('button', { name: 'Reload app', exact: true }).click()
  await expect(
    second.getByRole('button', { name: 'Send A01 FIRST TAB to FM1', exact: true }),
  ).toBeVisible()
  await expect(second.getByRole('alert')).toHaveCount(0)
  expect(await storedLibrary(second)).toEqual(winner)
})

/** Observe all public stores, including opaque bytes, only after their read transaction commits. */
async function storedRecoveryData(page: Page) {
  const json = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('fm1-librarian')
        open.onerror = () => reject(open.error ?? new Error('Could not open IndexedDB.'))
        open.onsuccess = () => {
          const database = open.result
          const transaction = database.transaction(
            ['library', 'named-banks', 'fx-presets'],
            'readonly',
          )
          const workspace = transaction.objectStore('library').get('current')
          const banks = transaction.objectStore('named-banks').getAll()
          const fxPresets = transaction.objectStore('fx-presets').getAll()
          transaction.onabort = () => {
            database.close()
            reject(transaction.error ?? new Error('Could not read recovery data.'))
          }
          transaction.oncomplete = () => {
            database.close()
            resolve(
              JSON.stringify(
                { banks: banks.result, fxPresets: fxPresets.result, workspace: workspace.result },
                (_key, value: unknown) =>
                  value instanceof Uint8Array ? btoa(String.fromCharCode(...value)) : value,
              ),
            )
          }
        }
      }),
  )
  return JSON.parse(json)
}

async function chooseRecoveryBackup(page: Page, buffer: Buffer) {
  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Restore from backup…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Restore from backup' })
  await dialog.getByLabel('Choose a backup file').setInputFiles({
    buffer,
    mimeType: 'application/json',
    name: 'recovery.json',
  })
  await expect(dialog.getByRole('button', { name: 'Restore backup', exact: true })).toBeEnabled()
  return dialog
}

async function restoreRecoveryBackup(page: Page, buffer: Buffer) {
  const dialog = await chooseRecoveryBackup(page, buffer)
  await dialog.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('region', { name: 'Completed actions' })).toContainText(
    'Restored the backup from ',
  )
}

async function downloadRecoveryBackup(page: Page) {
  const pending = page.waitForEvent('download')
  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Download backup' }).click()
  const download = await pending
  expect(download.suggestedFilename()).toMatch(/^fm1-backup-\d{4}-\d{2}-\d{2}\.json$/)
  return readFile(await download.path())
}

function recoveryStoredExpectation() {
  const fixture = completeRecoveryBackup()
  return {
    banks: fixture.savedBanks.map((bank) => ({
      ...bank,
      slots: bank.slots.map((slot) =>
        'voice' in slot ? { ...slot, voice: { data: slot.voice, name: 'BACKUP 1' } } : slot,
      ),
      version: 4,
    })),
    fxPresets: fixture.fxPresets.map((preset) => ({ ...preset, version: 2 })),
    workspace: {
      bankDescriptions: fixture.workspace.bankDescriptions,
      bankNames: fixture.workspace.bankNames,
      effects: {
        'bank-A-1': recoveryBytes.effects,
        'bank-A-2': recoveryBytes.effects,
        'bank-A-3': recoveryBytes.effects,
      },
      eightBit: { 'bank-A-3': recoveryBytes.eightBit },
      favourites: [
        {
          ...fixture.workspace.favourites[0],
          voice: { data: recoveryBytes.dx7, name: 'BACKUP 1' },
        },
      ],
      loadedBanks: ['A'],
      records: {
        'bank-A-1': recoveryBytes.record,
        'bank-A-2': recoveryBytes.virtualAnalogRecord,
        'bank-A-3': recoveryBytes.eightBitRecord,
      },
      savedAt: expect.any(String),
      version: 9,
      virtualAnalog: { 'bank-A-2': recoveryBytes.virtualAnalog },
      voices: { 'bank-A-1': { data: recoveryBytes.dx7, name: 'BACKUP 1' } },
      workspaceBanks: ['A', 'B'],
    },
  }
}

async function expectRecoveryNames(page: Page, bankTitle = 'Recovery') {
  await expect(
    page.getByRole('button', { name: 'Send A01 BACKUP 1 to FM1', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Send A02 VOICE 97 to FM1', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Send A03 NES ROCK to FM1', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Favourites', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Send .+ BACKUP 1 to FM1$/ })).toHaveCount(1)
  await bankMenu(page, bankTitle)
  await page.getByRole('button', { name: 'Load bank…', exact: true }).click()
  const banks = page.getByRole('dialog', { name: 'My saved banks' })
  await expect(banks.getByRole('button', { name: 'Edit Live pads', exact: true })).toBeVisible()
  await banks.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().click()
  await page.getByRole('button', { name: 'Effects', exact: true }).click()
  const fx = page.getByRole('list', { name: 'FX presets' })
  await expect(fx.getByRole('button', { name: 'Live room', exact: true })).toBeVisible()
  await expect(fx.getByRole('button', { name: 'Bright hall', exact: true })).toBeVisible()
}

test('a downloaded complete backup recovers every collection and opaque engine byte after a fresh-context reload', async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  await context.route('https://**/*', (route) => route.abort())
  await openLibrary(page, true)
  const fixture = completeRecoveryBackup()
  await restoreRecoveryBackup(page, Buffer.from(JSON.stringify(fixture)))
  await expect.poll(() => storedRecoveryData(page)).toEqual(recoveryStoredExpectation())
  const downloaded = await downloadRecoveryBackup(page)
  expect(JSON.parse(downloaded.toString('utf8'))).toEqual({
    ...fixture,
    savedAt: expect.any(String),
  })

  const fresh = await browser.newContext({ baseURL, locale: 'en-GB' })
  try {
    await fresh.route('https://**/*', (route) => route.abort())
    const target = await fresh.newPage()
    await openLibrary(target, true, {
      firmware: 'mvave-v16',
      settingsReply: Array.from(makeSettingsBlockReply(makeSettingsBlock())),
    })
    expect((await storedRecoveryData(target)).banks).toEqual([])
    expect((await storedRecoveryData(target)).fxPresets).toEqual([])
    await restoreRecoveryBackup(target, downloaded)
    await expect.poll(() => storedRecoveryData(target)).toEqual(recoveryStoredExpectation())
    await target.reload()
    await expect(target.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
    expect(await sentMidi(target)).toEqual([])
    await expectRecoveryNames(target)
    expect(await storedRecoveryData(target)).toEqual(recoveryStoredExpectation())
    await expect
      .poll(() => sentMidi(target))
      .toEqual([fakeMidiRequests.identity, fakeMidiRequests.effectOrder])
  } finally {
    await fresh.close()
  }
  expect(await sentMidi(page)).toEqual([])
})

test('restoring a version-5 backup leaves the browser’s named FX presets intact after reload', async ({
  page,
  context,
}) => {
  await context.route('https://**/*', (route) => route.abort())
  await openLibrary(page, true, {
    firmware: 'mvave-v16',
    settingsReply: Array.from(makeSettingsBlockReply(makeSettingsBlock())),
  })
  const fixture = completeRecoveryBackup()
  await restoreRecoveryBackup(page, Buffer.from(JSON.stringify(fixture)))
  await expect.poll(() => storedRecoveryData(page)).toEqual(recoveryStoredExpectation())
  const { fxPresets, ...withoutFx } = completeRecoveryBackup()
  const legacy = {
    ...withoutFx,
    version: 5,
    workspace: { ...withoutFx.workspace, bankNames: { A: 'Legacy' } },
  }
  const dialog = await chooseRecoveryBackup(page, Buffer.from(JSON.stringify(legacy)))
  await expect(dialog.getByText('Not included (older backup)', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await expect(dialog).toBeHidden()
  const expected = recoveryStoredExpectation()
  expected.workspace.bankNames = { A: 'Legacy' }
  await expect.poll(() => storedRecoveryData(page)).toEqual(expected)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Send A01 BACKUP 1 to FM1', exact: true }),
  ).toBeVisible()
  expect(await storedRecoveryData(page)).toEqual(expected)
  const downloaded = await downloadRecoveryBackup(page)
  expect(JSON.parse(downloaded.toString('utf8'))).toEqual({
    ...legacy,
    fxPresets,
    savedAt: expect.any(String),
    version: 7,
  })
  expect(await sentMidi(page)).toEqual([])
  await expectRecoveryNames(page, 'Legacy')
  await expect
    .poll(() => sentMidi(page))
    .toEqual([fakeMidiRequests.identity, fakeMidiRequests.effectOrder])
})

declare global {
  interface Window {
    fm1RecoveryFault: {
      armed: boolean
      bankCommits: string[]
      bankCommitsAtAbort: string[]
      fxAddsBeforeAbort: string[]
      aborts: number
    }
  }
}

/** Fail a real FX transaction after two successful requests, so even its first row must roll back. */
async function installFxRestoreFailure(page: Page) {
  await page.addInitScript(() => {
    const state = {
      armed: false,
      bankCommits: [] as string[],
      bankCommitsAtAbort: [] as string[],
      fxAddsBeforeAbort: [] as string[],
      aborts: 0,
    }
    window.fm1RecoveryFault = state
    // oxlint-disable-next-line typescript/unbound-method -- Applied below with the original store as this.
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args: Parameters<IDBObjectStore['add']>) {
      const request = add.apply(this, args)
      const transaction = this.transaction
      const store = this.name
      if (!state.armed || transaction.db.name !== 'fm1-librarian') return request
      request.addEventListener('success', () => {
        const key = request.result
        if (typeof key !== 'string') throw new Error('Recovery records require string IDs.')
        if (store === 'named-banks') {
          transaction.addEventListener('complete', () => state.bankCommits.push(key))
        }
        if (store === 'fx-presets') {
          state.fxAddsBeforeAbort.push(key)
          if (state.fxAddsBeforeAbort.length === 2) {
            state.armed = false
            state.aborts += 1
            state.bankCommitsAtAbort = [...state.bankCommits]
            transaction.abort()
          }
        }
      })
      return request
    }
  })
}

test('an FX-store abort keeps committed banks and the old workspace, then retries without overwrites or duplicate FX', async ({
  page,
  context,
}) => {
  await context.route('https://**/*', (route) => route.abort())
  await installFxRestoreFailure(page)
  await openLibrary(page, true)
  const seed = completeRecoveryBackup()
  seed.savedBanks = []
  seed.workspace.bankNames = { A: 'Local' }
  seed.fxPresets = [{ ...seed.fxPresets[0], id: 'local-fx', name: 'Local FX' }]
  await restoreRecoveryBackup(page, Buffer.from(JSON.stringify(seed)))
  await expect
    .poll(async () => (await storedRecoveryData(page)).workspace.bankNames)
    .toEqual({ A: 'Local' })
  // Reload after the seed commits: no previous success toast can mask a false restore success.
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Send A01 BACKUP 1 to FM1', exact: true }),
  ).toBeVisible()
  const before = await storedRecoveryData(page)
  expect(before.banks).toEqual([])
  expect(before.fxPresets).toEqual([{ ...seed.fxPresets[0], version: 2 }])
  const buffer = Buffer.from(JSON.stringify(completeRecoveryBackup()))
  const dialog = await chooseRecoveryBackup(page, buffer)
  await page.evaluate(() => {
    window.fm1RecoveryFault.armed = true
  })
  await dialog.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText(
    'FX presets from this backup could not be saved, so your library was not replaced and no FX presets were added. The saved banks from this backup were added first and were kept.',
  )
  await expect(dialog.getByRole('button', { name: 'Restore backup', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.fm1RecoveryFault)).toEqual({
    armed: false,
    bankCommits: ['recovery-bank'],
    bankCommitsAtAbort: ['recovery-bank'],
    fxAddsBeforeAbort: ['recovery-fx-1-room', 'recovery-fx-2-hall'],
    aborts: 1,
  })
  const retained = await storedRecoveryData(page)
  expect(retained).toEqual({ ...before, banks: recoveryStoredExpectation().banks })
  await expect(page.getByRole('region', { name: 'Completed actions' })).not.toContainText(
    'Restored the backup from ',
  )
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()

  // Change the retained bank through its normal UI before retrying the same file.
  await bankMenu(page, 'Local')
  await page.getByRole('button', { name: 'Load bank…', exact: true }).click()
  const banks = page.getByRole('dialog', { name: 'My saved banks' })
  await banks.getByRole('button', { name: 'Edit Live pads', exact: true }).click()
  const name = banks.getByRole('textbox', { name: 'Bank name' })
  await expect(name).toBeFocused()
  await name.fill('Kept after failure')
  await banks
    .getByRole('textbox', { name: 'Description (optional)' })
    .fill('Edited after the partial restore')
  await banks.getByRole('button', { name: 'Update details' }).click()
  await expect
    .poll(async () => (await storedRecoveryData(page)).banks[0].name)
    .toBe('Kept after failure')
  const edited = (await storedRecoveryData(page)).banks
  await banks.getByRole('button', { name: 'Close', exact: true }).click()

  const retry = await chooseRecoveryBackup(page, buffer)
  await expect(retry.getByText('Already here, kept', { exact: true })).toBeVisible()
  await retry.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await expect(retry).toBeHidden()
  await expect(page.getByRole('region', { name: 'Completed actions' })).toContainText(
    'Restored the backup from ',
  )
  const expected = {
    ...recoveryStoredExpectation(),
    banks: edited,
    fxPresets: [...before.fxPresets, ...recoveryStoredExpectation().fxPresets],
  }
  await expect.poll(() => storedRecoveryData(page)).toEqual(expected)
  // An additional restore of the identical backup is idempotent across both independent stores.
  await restoreRecoveryBackup(page, buffer)
  await expect.poll(() => storedRecoveryData(page)).toEqual(expected)
  const downloaded = JSON.parse((await downloadRecoveryBackup(page)).toString('utf8'))
  expect(downloaded.savedBanks).toEqual([
    {
      ...completeRecoveryBackup().savedBanks[0],
      name: 'Kept after failure',
      description: 'Edited after the partial restore',
      updatedAt: edited[0].updatedAt,
    },
  ])
  expect(downloaded.fxPresets).toEqual([...seed.fxPresets, ...completeRecoveryBackup().fxPresets])
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Send A01 BACKUP 1 to FM1', exact: true }),
  ).toBeVisible()
  expect(await storedRecoveryData(page)).toEqual(expected)
  await bankMenu(page, 'Recovery')
  await page.getByRole('button', { name: 'Load bank…', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Edit Kept after failure', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit Live pads', exact: true })).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([])
})
