import { expect, test, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { readFile } from 'node:fs/promises'

const factoryBank = 'public/dx7-banks/factory/rom1a.syx'

async function openLibrarian(page: Page) {
  await page.goto('/')
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  if (await helpDialog.isVisible())
    await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(slotButtons(page).first()).toBeVisible()
}

/** The slot buttons, named "Send … to FM1"; the toolbar's bank-wide "Send to FM1" is excluded. */
function slotButtons(page: Page) {
  return page.getByRole('button', { name: /^Send .+ to FM1$/ })
}

function slotNames(page: Page) {
  return slotButtons(page).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )
}

/** The rail holds the bank menu from md up; below that it sits beside the bank name instead. */
async function openFirstBankMenu(page: Page) {
  await page.getByLabel('Actions for Bank 1').locator('visible=true').click()
}

async function openFirstPatch(page: Page) {
  await page
    .getByRole('button', { name: /^Send .+ to FM1$/ })
    .first()
    .dblclick()
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
  await expect(page.getByText('Saved “PIANO 1” to the library.')).toBeVisible()
  await expect.poll(() => storedFirstPatchName(page)).toBe('E2E SAVE')

  await page.reload()

  await expect(page.getByRole('button', { name: 'Send E2E SAVE to FM1' })).toBeVisible()
})

test('imports a valid DX7 SysEx bank into a populated workspace bank', async ({ page }) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  await dialog.getByLabel('Sound data').setInputFiles(factoryBank)
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(page.getByText('Imported sounds into “Bank 1”.')).toBeVisible()
})

test('rejects an invalid DX7 SysEx bank without closing the replacement dialog', async ({
  page,
}) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  await dialog.getByLabel('Sound data').setInputFiles({
    buffer: Buffer.from([0xf0, 0x43, 0xf7]),
    mimeType: 'application/octet-stream',
    name: 'invalid.syx',
  })
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(dialog.getByRole('alert')).toHaveText(
    'This file is 3 bytes. A DX7 bank file must be exactly 4,104 bytes.',
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

// Bulk export loads fflate on demand, so this also covers that import resolving in a build.
test('downloads every loaded bank as one zip archive', async ({ page }) => {
  await openLibrarian(page)
  await page.getByLabel('More bank file actions').click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download all banks (.zip)' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('fm1-browser-banks.zip')
  const archive = unzipSync(await readFile(await download.path()))
  expect(Object.keys(archive).sort()).toEqual([
    'fm1-bank-a.syx',
    'fm1-bank-b.syx',
    'fm1-bank-c.syx',
    'fm1-bank-d.syx',
  ])
  for (const [name, bank] of Object.entries(archive))
    expect(bank.byteLength, `${name} is not a 32-voice DX7 bank`).toBe(4104)
})

test('reorders patches with the keyboard drag control', async ({ page }) => {
  await openLibrarian(page)
  const namesBefore = await slotNames(page)

  const reorderFirstPatch = page.getByRole('button', { name: /^Reorder / }).first()
  await reorderFirstPatch.press('Space')
  await reorderFirstPatch.press('ArrowRight')
  await reorderFirstPatch.press('Space')

  await expect
    .poll(() => slotNames(page))
    .toEqual([namesBefore[1], namesBefore[0], ...namesBefore.slice(2)])
})

test('plays a slot on a single click and stays in the library', async ({ page }) => {
  await openLibrarian(page)

  const slot = slotButtons(page).first()
  await slot.click()

  await expect(slot).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toHaveCount(0)
})

/** The ⋮ button on a slot, named after its sound; the bank menus share the "Actions for" wording. */
async function slotMenuButton(page: Page, index: number) {
  const label = (await slotNames(page)).at(index) ?? ''
  const name = label.replace(/^Send (.+) to FM1$/, '$1')
  return { button: page.getByRole('button', { exact: true, name: `Actions for ${name}` }), name }
}

test('reaches the editor from the keyboard through a slot menu', async ({ page }) => {
  await openLibrarian(page)
  const { button } = await slotMenuButton(page, 0)

  await button.first().press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeVisible()
})

test('opens a slot menu on the last row above the grid without playing the slot', async ({
  page,
}) => {
  await openLibrarian(page)
  const { button, name } = await slotMenuButton(page, -1)

  // The menu closes when the page scrolls, and a click scrolls its target into view first.
  await button.last().scrollIntoViewIfNeeded()
  await button.last().click()
  await expect(slotButtons(page).last()).not.toHaveAttribute('aria-current', 'true')
  await page.getByRole('menuitem', { name: 'Copy to…' }).click()

  await expect(page.getByRole('dialog', { name: `Copy ${name}` })).toBeVisible()
})

test('switches the favicon to the chosen colourway and keeps it after a reload', async ({
  page,
}) => {
  await openLibrarian(page)
  const favicon = page.locator('link[rel="icon"]')
  await expect(favicon).toHaveAttribute('href', '/favicon-black.svg')

  // The other finishes slide out from the lit swatch on hover.
  await page.getByTitle('Black', { exact: true }).hover()
  await page.getByTitle('Orange', { exact: true }).click()

  await expect(page.getByRole('radio', { name: 'Orange FM1 finish' })).toBeChecked()
  await expect(favicon).toHaveAttribute('href', '/favicon-orange.svg')
  const icon = await page.request.get('/favicon-orange.svg')
  expect(icon.ok()).toBe(true)
  expect(icon.headers()['content-type']).toContain('image/svg+xml')

  await page.reload()
  await expect(favicon).toHaveAttribute('href', '/favicon-orange.svg')
})

test('keeps the librarian controls usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 412 })
  await openLibrarian(page)

  await expect(page.getByLabel('Search by name')).toBeVisible()
  await expect(page.getByAltText('M-VAVE FM1 synthesiser front panel')).toHaveCount(0)
})
