import { expect, test, type Locator, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { readFile } from 'node:fs/promises'

const factoryBank = 'public/dx7-banks/factory/rom1a.syx'

async function openLibrarian(page: Page) {
  await page.goto('/')
  // A first visit always meets the guide, which arrives with its own chunk, so waiting for it
  // keeps it from opening over the first clicks of the journey.
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(helpDialog).toBeVisible()
  await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(helpDialog).toBeHidden()
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
  await dialog.getByLabel('Patch data').setInputFiles(factoryBank)
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(page.getByText('Imported patches into “Bank 1”.')).toBeVisible()
})

test('rejects an invalid DX7 SysEx bank without closing the replacement dialog', async ({
  page,
}) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  await dialog.getByLabel('Patch data').setInputFiles({
    buffer: Buffer.from([0xf0, 0x43, 0xf7]),
    mimeType: 'application/octet-stream',
    name: 'invalid.syx',
  })

  // The file is read as it is chosen, so the problem shows before anything can be replaced.
  await expect(dialog.getByRole('alert')).toHaveText(
    'This file is 3 bytes. A DX7 bank file must be exactly 4,104 bytes.',
  )
  await expect(dialog.getByRole('button', { name: 'Replace bank contents' })).toBeDisabled()
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
  await page.getByRole('button', { name: 'Download SysEx banks (.zip)' }).click()
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

test('copies a slot from the keyboard through its menu and the slot grid', async ({ page }) => {
  await openLibrarian(page)
  const { button, name } = await slotMenuButton(page, 0)

  await button.first().press('Enter')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Copy to…' })).toBeFocused()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: `Copy ${name}` })
  await expect(dialog).toBeVisible()
  const chosen = dialog.getByRole('group', { name: 'Slot' }).getByRole('button', { pressed: true })
  await expect(chosen).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('button', { name: /^Replace B02$/ })).toBeVisible()
})

/** Drags a slot's grip with the pointer in steps, as dnd-kit needs moves to follow it. */
async function dragGrip(page: Page, slotName: string, target: Locator) {
  const grip = await page
    .getByRole('button', { exact: true, name: `Reorder ${slotName}` })
    .boundingBox()
  const drop = await target.boundingBox()
  if (!grip || !drop) throw new Error('The grip or its drop target is not on screen.')
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, { steps: 12 })
  await page.mouse.up()
}

test('copies a slot by dropping it on another bank tab', async ({ page }) => {
  await openLibrarian(page)
  const { name } = await slotMenuButton(page, 0)

  await dragGrip(page, name, page.getByRole('button', { name: /^B — / }))

  const dialog = page.getByRole('dialog', { name: `Copy ${name}` })
  await expect(dialog.getByRole('button', { name: /^B — /, pressed: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace B01' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
})

test('reorders when a slot is dropped in the grid beside the bank rail', async ({ page }) => {
  await openLibrarian(page)
  const namesBefore = await slotNames(page)
  const { name } = await slotMenuButton(page, 1)

  await dragGrip(page, name, slotButtons(page).first())

  await expect
    .poll(() => slotNames(page))
    .toEqual([namesBefore[1], namesBefore[0], ...namesBefore.slice(2)])
  await expect(page.getByRole('dialog')).toHaveCount(0)
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

  // The other finishes slide out from the lit swatch on hover or focus. Focus keeps them out
  // wherever the pointer lands; a layout shift after a hover can leave it off the picker, so
  // the swatches collapse again before the click.
  await page.getByRole('radio', { name: 'Black FM1 finish' }).focus()
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

  await expect(page.getByLabel('Search', { exact: true })).toBeVisible()
  await expect(page.getByAltText('M-VAVE FM1 synthesiser front panel')).toHaveCount(0)
})

// Restoring writes saved banks to real IndexedDB, where one already stored must never be replaced.
test('restores a downloaded backup over a factory reset', async ({ page }) => {
  await openLibrarian(page)
  await openFirstPatch(page)
  await page.getByRole('textbox', { name: 'Patch name' }).fill('E2E BACKUP')
  await page.getByRole('button', { name: 'Save to Library' }).click()
  await page.getByRole('button', { name: 'Back to patch banks' }).click()
  await openFirstBankMenu(page)
  await page.getByRole('button', { name: 'Save bank' }).click()
  const saveDialog = page.getByRole('dialog')
  await saveDialog.getByLabel('Bank name').fill('Kept bank')
  await saveDialog.getByRole('button', { name: 'Save bank' }).click()
  await expect(saveDialog).toBeHidden()

  await page.getByLabel('More bank file actions').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fm1-backup-\d{4}-\d{2}-\d{2}\.json$/)

  await page.getByLabel('More bank file actions').click()
  await page.getByRole('button', { name: 'Reset to factory patches…' }).click()
  await page.getByRole('button', { name: 'Reset four banks' }).click()
  await expect(page.getByRole('button', { name: 'Send PIANO 1 to FM1' })).toBeVisible()

  await page.getByLabel('More bank file actions').click()
  await page.getByRole('button', { name: 'Restore from backup…' }).click()
  const restoreDialog = page.getByRole('dialog', { name: 'Restore from backup' })
  await restoreDialog.getByLabel('Choose a backup file').setInputFiles(await download.path())
  await expect(restoreDialog.getByText('Already here, kept')).toBeVisible()
  await restoreDialog.getByRole('button', { name: 'Restore backup' }).click()

  await expect(page.getByText(/^Restored the backup from /)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send E2E BACKUP to FM1' })).toBeVisible()
  await expect.poll(() => storedFirstPatchName(page)).toBe('E2E BACKUP')
})
