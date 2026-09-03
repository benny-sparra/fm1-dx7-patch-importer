import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const factoryBank = 'public/dx7-banks/factory/rom1a.syx'

async function openLibrarian(page: Page) {
  await page.goto('/')
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  if (await helpDialog.isVisible())
    await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Edit / }).first()).toBeVisible()
}

async function openFirstBankMenu(page: Page) {
  await page.getByLabel('Actions for DX7 Bank 1').click()
}

async function openFirstPatch(page: Page) {
  await page
    .getByRole('button', { name: /^Edit / })
    .first()
    .click()
  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeVisible()
}

async function storedFirstPatchName(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string | undefined>((resolve, reject) => {
        const openRequest = indexedDB.open('fm1-librarian')
        openRequest.onerror = () =>
          reject(openRequest.error ?? new Error('Could not open the browser workspace.'))
        openRequest.onsuccess = () => {
          const database = openRequest.result
          const transaction = database.transaction('library', 'readonly')
          const getRequest = transaction.objectStore('library').get('current')
          getRequest.onerror = () => {
            database.close()
            reject(getRequest.error ?? new Error('Could not read the browser workspace.'))
          }
          getRequest.onsuccess = () => {
            database.close()
            resolve(getRequest.result?.voices?.['bank-A-1']?.name)
          }
        }
      }),
  )
}

test('opens the lazy editor and returns to the patch library', async ({ page }) => {
  await openLibrarian(page)
  await openFirstPatch(page)

  await page.getByRole('button', { name: 'Back to patch banks' }).click()

  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
})

test('persists a saved patch name across a browser reload', async ({ page }) => {
  await openLibrarian(page)
  await openFirstPatch(page)

  await page.getByRole('textbox', { name: 'Patch name' }).fill('E2E SAVE')
  await page.getByRole('button', { name: 'Save to Library' }).click()
  await expect(page.getByText('Saved “BRASS 1” to the library.')).toBeVisible()
  await expect.poll(() => storedFirstPatchName(page)).toBe('E2E SAVE')

  await page.reload()

  await expect(page.getByRole('button', { name: 'Edit E2E SAVE' })).toBeVisible()
})

test('imports a valid DX7 SysEx bank into a populated workspace bank', async ({ page }) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “DX7 Bank 1”?' })
  await dialog.getByLabel('Sound data').setInputFiles(factoryBank)
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(page.getByText('Imported sounds into “DX7 Bank 1”.')).toBeVisible()
})

test('rejects an invalid DX7 SysEx bank without closing the replacement dialog', async ({
  page,
}) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “DX7 Bank 1”?' })
  await dialog.getByLabel('Sound data').setInputFiles({
    buffer: Buffer.from([0xf0, 0x43, 0xf7]),
    mimeType: 'application/octet-stream',
    name: 'invalid.syx',
  })
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(dialog.getByRole('alert')).toHaveText(
    'Expected a 4104-byte DX7 bank; received 3 bytes.',
  )
  await expect(dialog).toBeVisible()
})

test('downloads a complete DX7 bank file', async ({ page }) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download this bank' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('fm1-bank-a.syx')
  expect((await readFile(await download.path())).byteLength).toBe(4104)
})

test('reorders patches with the keyboard drag control', async ({ page }) => {
  await openLibrarian(page)
  const editButtons = page.getByRole('button', { name: /^Edit / })
  const namesBefore = await editButtons.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )

  const reorderFirstPatch = page.getByRole('button', { name: /^Reorder / }).first()
  await reorderFirstPatch.press('Space')
  await reorderFirstPatch.press('ArrowRight')
  await reorderFirstPatch.press('Space')

  await expect
    .poll(() =>
      editButtons.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label')),
      ),
    )
    .toEqual([namesBefore[1], namesBefore[0], ...namesBefore.slice(2)])
})

test('keeps the librarian controls usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 412 })
  await openLibrarian(page)

  await expect(page.getByLabel('Search by name')).toBeVisible()
  await expect(page.getByAltText('M-VAVE FM1 synthesiser front panel')).toHaveCount(0)
})
