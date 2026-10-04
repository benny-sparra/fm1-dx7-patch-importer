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

test('zooms out of the slot as a patch opens and back into it as the editor closes', async ({
  page,
}) => {
  // The outlines last about a quarter of a second, so each zoom is recorded as it is drawn.
  await page.addInitScript(() => {
    const zooms: { first: DOMRect; last: DOMRect }[] = []
    Object.assign(window, { zooms })
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((records) => {
        for (const node of records.flatMap((record) => [...record.addedNodes])) {
          if (!(node instanceof HTMLElement) || node.className !== 'zoom-rects') continue
          const outlines = [...node.children].map((outline) => outline.getBoundingClientRect())
          zooms.push({ first: outlines[0], last: outlines[outlines.length - 1] })
        }
      }).observe(document.body, { childList: true })
    })
  })
  const zooms = () =>
    page.evaluate(() => (window as unknown as { zooms: { first: DOMRect; last: DOMRect }[] }).zooms)
  await openLibrarian(page)
  const slot = await page.locator('[data-patch-id]').first().boundingBox()

  await openFirstPatch(page)
  await page.getByRole('button', { name: 'Back to patch banks' }).click()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()

  await expect.poll(async () => (await zooms()).length).toBe(2)
  const [opening, closing] = await zooms()
  expect(opening.first).toMatchObject({ x: slot?.x, y: slot?.y, width: slot?.width })
  expect(opening.last.width).toBeGreaterThan(opening.first.width)
  expect(closing.last).toMatchObject({ x: slot?.x, y: slot?.y, width: slot?.width })
  expect(closing.first.width).toBeGreaterThan(closing.last.width)
})

test('zooms a dialog out of the menu item that opens it, then shows it, and back into the menu as it closes', async ({
  page,
}) => {
  // The outlines last about a quarter of a second, so each zoom is recorded as it is drawn, with
  // whether the dialog could be seen at that moment.
  await page.addInitScript(() => {
    const zooms: { dialogShown: boolean; first: DOMRect; last: DOMRect }[] = []
    Object.assign(window, { zooms })
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((records) => {
        for (const node of records.flatMap((record) => [...record.addedNodes])) {
          if (!(node instanceof HTMLElement) || node.className !== 'zoom-rects') continue
          const outlines = [...node.children].map((outline) => outline.getBoundingClientRect())
          const dialog = document.querySelector('dialog[open]')
          zooms.push({
            dialogShown: dialog ? getComputedStyle(dialog).opacity !== '0' : false,
            first: outlines[0],
            last: outlines[outlines.length - 1],
          })
        }
      }).observe(document.body, { childList: true })
    })
  })
  const zooms = () =>
    page.evaluate(
      () =>
        (window as unknown as { zooms: { dialogShown: boolean; first: DOMRect; last: DOMRect }[] })
          .zooms,
    )
  // The guide that opens itself on a first visit closes without having zoomed open.
  await openLibrarian(page)
  expect(await zooms()).toEqual([])
  // A bank below the first, so closing must find that bank's menu rather than the first one.
  const bankMenu = page.getByLabel('Actions for Bank 2').locator('visible=true')
  const bankMenuBox = await bankMenu.boundingBox()

  await bankMenu.click()
  const item = page.getByRole('button', { name: 'Bank information…' }).locator('visible=true')
  const itemBox = await item.boundingBox()
  await item.click()
  const dialog = page.getByRole('dialog', { name: 'Bank information' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
  const dialogBox = await dialog.boundingBox()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await expect.poll(async () => (await zooms()).length).toBe(2)
  const [opening, closing] = await zooms()
  expect(opening.dialogShown).toBe(false)
  expect(opening.first).toMatchObject({ x: itemBox?.x, y: itemBox?.y, width: itemBox?.width })
  expect(opening.last).toMatchObject({ x: dialogBox?.x, width: dialogBox?.width })
  expect(closing.last).toMatchObject({
    x: bankMenuBox?.x,
    y: bankMenuBox?.y,
    width: bankMenuBox?.width,
  })
})

test('switches a deleted bank off like a CRT over the bank that takes its place', async ({
  page,
}) => {
  // The copy lasts under half a second, so each switch-off is recorded as it is drawn.
  await page.addInitScript(() => {
    const switchOffs: { box: DOMRect; text: string }[] = []
    Object.assign(window, { switchOffs })
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((records) => {
        for (const node of records.flatMap((record) => [...record.addedNodes])) {
          if (!(node instanceof HTMLElement) || node.className !== 'crt-switch-off') continue
          switchOffs.push({ box: node.getBoundingClientRect(), text: node.textContent ?? '' })
        }
      }).observe(document.body, { childList: true })
    })
  })
  await openLibrarian(page)
  const grid = await page.locator('[data-patch-grid]').boundingBox()
  const firstPatch = (await slotNames(page))[0]?.replace(/^Send (.+) to FM1$/, '$1') ?? ''

  await openFirstBankMenu(page)
  await page.getByRole('button', { name: 'Delete bank…' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete bank' }).click()

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { switchOffs: unknown[] }).switchOffs))
    .toHaveLength(1)
  const [switchOff] = await page.evaluate(
    () => (window as unknown as { switchOffs: { box: DOMRect; text: string }[] }).switchOffs,
  )
  expect(switchOff.box).toMatchObject({ x: grid?.x, y: grid?.y, width: grid?.width })
  expect(switchOff.text).toContain(firstPatch)
})

test('leaves the Sentry test control out of a normal production build', async ({ page }) => {
  await openLibrarian(page)

  await expect(page.getByRole('button', { name: 'Send Sentry test error' })).toHaveCount(0)
})

test('persists a saved patch name across a browser reload', async ({ page }) => {
  await openLibrarian(page)
  await openFirstPatch(page)

  await page.getByRole('textbox', { name: 'Patch name' }).fill('E2E SAVE')
  await page.getByRole('button', { name: 'Save to library' }).click()
  // The notification names the patch as saved, under its new name.
  await expect(page.getByText('Saved “E2E SAVE” to the library.')).toBeVisible()
  await expect.poll(() => storedFirstPatchName(page)).toBe('E2E SAVE')

  await page.reload()

  await expect(page.getByRole('button', { name: 'Send E2E SAVE to FM1' })).toBeVisible()
})

test('imports a valid DX7 SysEx bank into a populated workspace bank', async ({ page }) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank…' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  await dialog.getByLabel('Patch data').setInputFiles(factoryBank)
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(page.getByText('Imported patches into “Bank 1”.')).toBeVisible()
})

test('imports the bank chosen from a file that joins several', async ({ page }) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank…' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  const [rom1a, rom1b] = await Promise.all([
    readFile(factoryBank),
    readFile('public/dx7-banks/factory/rom1b.syx'),
  ])
  await dialog.getByLabel('Patch data').setInputFiles({
    buffer: Buffer.concat([rom1a, rom1b]),
    mimeType: 'application/octet-stream',
    name: 'rom1.syx',
  })
  await dialog.getByRole('radio', { name: /^Bank 2: PIANO 4, / }).check()
  await expect(dialog.getByRole('button', { name: 'Play PIANO 4, patch 1' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace bank contents' }).click()

  await expect(page.getByText('Imported patches into “Bank 1”.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send PIANO 4 to FM1' })).toBeVisible()
})

test('rejects an invalid DX7 SysEx bank without closing the replacement dialog', async ({
  page,
}) => {
  await openLibrarian(page)
  await openFirstBankMenu(page)
  await page.getByRole('button', { exact: true, name: 'Import DX7 bank…' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
  await dialog.getByLabel('Patch data').setInputFiles({
    buffer: Buffer.from([0xf0, 0x43, 0xf7]),
    mimeType: 'application/octet-stream',
    name: 'invalid.syx',
  })

  // The file is read as it is chosen, so the problem shows before anything can be replaced.
  await expect(dialog.getByRole('alert')).toHaveText(
    'This file is 3 bytes and holds no complete DX7 bank. A bank file is 4,104 bytes, or a multiple of that when it joins several banks.',
  )
  await expect(dialog.getByRole('button', { name: 'Replace bank contents' })).toBeDisabled()
  await expect(dialog).toBeVisible()
})

/** A file laid out as FM-1+VA's "Save a backup" writes one: 128 blank FM presets, A01 to D32. */
function fm1VaPresetsFile() {
  const messages = Array.from({ length: 128 }, (_, slot) => {
    const voice = new Uint8Array(155)
    const name = `${'ABCD'[slot >> 5]}${String((slot % 32) + 1).padStart(2, '0')} FM`.padEnd(10)
    voice.set(Buffer.from(name, 'ascii'), 145)
    const record = new Uint8Array(68)
    // Record byte 18 is the engine marker, 03 for an FM preset (docs/fm1-research.md).
    record[21] = 0x03
    const payload = [...voice, ...record]
    const checksum = payload.reduce((sum, byte) => sum + (~byte & 0x7f), 0) & 0x7f
    return [0xf0, 0x43, 0x00, 0x7d, 0x04, slot, ...payload, checksum, 0xf7]
  })
  return {
    buffer: Buffer.from(messages.flat()),
    mimeType: 'application/octet-stream',
    name: 'FM-1 presets.syx',
  }
}

test('switches an FM-1+VA bank and chooses where it goes without folding it, and folds it from its title', async ({
  page,
}) => {
  await openLibrarian(page)
  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Import Baud Girl presets file…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import Baud Girl presets file' })
  // The dialog's title names the file too, so the input is found by its type.
  await dialog.locator('input[type="file"]').setInputFiles(fm1VaPresetsFile())

  const bankA = dialog.getByRole('region', { name: 'FM1 bank A' })
  const firstPatch = bankA.getByRole('button', { name: 'Play A01 FM, patch 1' })
  const bankSwitch = bankA.getByRole('switch', { name: 'Import FM1 bank A' })
  const destination = bankA.getByRole('combobox', { name: 'Import into' })
  await expect(bankSwitch).toBeChecked()
  await expect(destination).toHaveValue('A')
  await expect(firstPatch).toBeHidden()

  // The switch and its label, the bank's title, sit above the strip's fold overlay, so a click on
  // the title, landing by position, switches the bank and folds nothing.
  const switchLabel = await bankA.getByText('Import FM1 bank A', { exact: true }).boundingBox()
  expect(switchLabel).not.toBeNull()
  const clickSwitch = () =>
    page.mouse.click(
      switchLabel!.x + switchLabel!.width / 2,
      switchLabel!.y + switchLabel!.height / 2,
    )
  await clickSwitch()
  await expect(bankSwitch).not.toBeChecked()
  await expect(destination).toBeDisabled()
  await expect(firstPatch).toBeHidden()
  await expect(dialog.getByRole('button', { name: 'Import 3 banks' })).toBeVisible()

  // Anywhere else on the strip unfolds the bank: its fold control's hit area is a CSS overlay
  // across the strip, which only a real browser lays out, so the click lands by position.
  const strip = await bankA.getByRole('heading', { level: 4 }).locator('..').boundingBox()
  expect(strip).not.toBeNull()
  await page.mouse.click(strip!.x + strip!.width - 60, strip!.y + strip!.height / 2)
  await expect(firstPatch).toBeVisible()

  // The destination sits below the strip, clear of its fold overlay: choosing one folds nothing.
  await clickSwitch()
  await expect(bankSwitch).toBeChecked()
  await destination.selectOption({ label: 'A new bank' })
  await expect(firstPatch).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Import 4 banks' })).toBeVisible()

  // With every bank open the body scrolls, but the title and the action stay pinned in view.
  for (const bank of ['B', 'C', 'D']) {
    await dialog.getByRole('button', { name: `Expand FM1 bank ${bank}` }).click()
  }
  await expect(dialog.getByRole('button', { name: 'Import 4 banks' })).toBeInViewport()
  await expect(
    dialog.getByRole('heading', { name: 'Import Baud Girl presets file' }),
  ).toBeInViewport()
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
  await page.getByLabel('Library actions').click()

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

test('lights the slots Undo puts back, not the slots a drag moves, and leaves them clickable', async ({
  page,
}) => {
  // The glow fades within a second, so each one is recorded as it appears, with what a click at
  // its centre would reach.
  await page.addInitScript(() => {
    const glows: { hitsGlow: boolean; patchId: string }[] = []
    Object.assign(window, { glows })
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((records) => {
        for (const node of records.flatMap((record) => [...record.addedNodes])) {
          if (!(node instanceof HTMLElement) || node.className !== 'patch-cell-changed') continue
          const box = node.getBoundingClientRect()
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
          glows.push({ hitsGlow: hit === node, patchId: node.parentElement?.dataset.patchId ?? '' })
        }
      }).observe(document.body, { childList: true, subtree: true })
    })
  })
  const glows = () =>
    page.evaluate(
      () => (window as unknown as { glows: { hitsGlow: boolean; patchId: string }[] }).glows,
    )
  await openLibrarian(page)
  const namesBefore = await slotNames(page)

  const reorderFirstPatch = page.getByRole('button', { name: /^Reorder / }).first()
  await reorderFirstPatch.press('Space')
  await reorderFirstPatch.press('ArrowRight')
  await reorderFirstPatch.press('Space')
  await expect.poll(() => slotNames(page)).not.toEqual(namesBefore)
  expect(await glows()).toEqual([])

  await page.keyboard.press('ControlOrMeta+z')

  await expect.poll(() => slotNames(page)).toEqual(namesBefore)
  await expect
    .poll(async () => (await glows()).map(({ patchId }) => patchId).sort())
    .toEqual(['bank-A-1', 'bank-A-2'])
  expect((await glows()).some(({ hitsGlow }) => hitsGlow)).toBe(false)
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

test('outlines the dragged slot, and the bank tab it is over, with marching ants', async ({
  page,
}) => {
  await openLibrarian(page)
  const { name } = await slotMenuButton(page, 1)
  const ants = (selector: string) =>
    page.evaluate((target) => {
      const element = document.querySelector(target)
      return element ? getComputedStyle(element, '::after').animationName : null
    }, selector)
  const grip = await page
    .getByRole('button', { exact: true, name: `Reorder ${name}` })
    .boundingBox()
  const tab = await page.getByRole('button', { name: /^B — / }).boundingBox()
  if (!grip || !tab) throw new Error('The grip or the bank tab is not on screen.')

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 140, grip.y + 60, { steps: 6 })
  await expect.poll(() => ants('.patch-cell[data-dragging]')).toBe('marching-ants')
  expect(await ants('.bank-tab[data-drop-target]')).toBeNull()
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2, { steps: 10 })
  await expect.poll(() => ants('.bank-tab[data-drop-target]')).toBe('marching-ants')
  await page.keyboard.press('Escape')
  await page.mouse.up()

  await expect(page.locator('[data-dragging], [data-drop-target]')).toHaveCount(0)
})

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

test('finds a copied patch among the duplicates and goes to its slot', async ({ page }) => {
  await openLibrarian(page)
  const { name } = await slotMenuButton(page, 0)
  await dragGrip(page, name, page.getByRole('button', { name: /^B — / }))
  const copy = page.getByRole('dialog', { name: `Copy ${name}` })
  await copy.getByRole('button', { name: 'Replace B01' }).click()
  await expect(copy).toBeHidden()

  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Find duplicate patches…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Duplicate patches' })
  await dialog.getByRole('button', { name: /^Go to .+, patch 1 in Bank 2$/ }).click()

  // The native dialog hands focus back as it closes; the slot must take it after that.
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /^B — /, pressed: true })).toBeVisible()
  await expect(slotButtons(page).first()).toBeFocused()
})

// A DX7 name is ten characters and the name font is monospaced, so every full name is as wide as
// any other. These are the narrowest cards at each column count, and the smallest common phone. A
// page with a classic scrollbar is about 15 px narrower than its viewport, which takes about 4 px
// from each of four cards, so each name keeps that much to spare.
const scrollbarShare = 4

for (const width of [1280, 768, 360]) {
  test(`leaves room for a full ten-character patch name beside the heart and menu at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width })
    await openLibrarian(page)

    const cramped = await page.locator('.patch-cell .patch-name').evaluateAll((names, spare) => {
      const probe = names[0].cloneNode() as HTMLElement
      probe.style.cssText = 'position: absolute; visibility: hidden; width: auto'
      probe.textContent = 'WWWWWWWWWW'
      document.body.append(probe)
      const fullName = probe.getBoundingClientRect().width
      probe.remove()
      return names
        .filter((name) => name.getBoundingClientRect().width < fullName + spare)
        .map((name) => name.textContent)
    }, scrollbarShare)

    expect(cramped).toEqual([])
  })
}

// WCAG 2.5.8 asks for 24 px targets. The heart sits on the slot's own button and beside the menu,
// so the spacing exception cannot excuse a smaller one.
test('gives every patch card control a 24 px target', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 360 })
  await openLibrarian(page)

  const small = await page
    .locator('.patch-cell button:not([aria-label^="Send "])')
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const { height, width } = button.getBoundingClientRect()
          return width < 24 || height < 24
        })
        .map((button) => button.getAttribute('aria-label')),
    )

  expect(small).toEqual([])
})

test('adds a slot to Favourites from its heart without playing it', async ({ page }) => {
  await openLibrarian(page)
  const slot = slotButtons(page).first()
  const name = (await slot.getAttribute('aria-label'))?.replace(/^Send (.+) to FM1$/, '$1') ?? ''

  // The heart sits above the slot's own button, which plays the slot when it gets the click.
  const heart = page.getByRole('button', { exact: true, name: `Favourite ${name}` })
  await heart.click()

  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(slot).not.toHaveAttribute('aria-current', 'true')
})

test('adds a slot to Favourites by dropping it on the Favourites tab', async ({ page }) => {
  await openLibrarian(page)
  const { name } = await slotMenuButton(page, 0)

  await dragGrip(page, name, page.getByRole('button', { exact: true, name: 'Favourites' }))

  await expect(page.getByText(`Added “${name}” to Favourites.`)).toBeVisible()
  await expect(
    page.getByRole('button', { exact: true, name: `Favourite ${name}` }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test.describe('in a browser set to American English', () => {
  test.use({ locale: 'en-US' })

  test('spells Favorites the American way and names the page American English', async ({
    page,
  }) => {
    await openLibrarian(page)

    await expect(page.getByRole('button', { exact: true, name: 'Favorites' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
  })
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
  await page.getByRole('button', { name: 'Save to library' }).click()
  await page.getByRole('button', { name: 'Back to patch banks' }).click()
  await openFirstBankMenu(page)
  await page.getByRole('button', { name: 'Save bank…' }).click()
  const saveDialog = page.getByRole('dialog')
  await saveDialog.getByLabel('Bank name').fill('Kept bank')
  await saveDialog.getByRole('button', { name: 'Save bank' }).click()
  await expect(saveDialog).toBeHidden()

  await page.getByLabel('Library actions').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fm1-backup-\d{4}-\d{2}-\d{2}\.json$/)

  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Reset to factory patches…' }).click()
  await page.getByRole('button', { name: 'Reset four banks' }).click()
  await expect(page.getByRole('button', { name: 'Send PIANO 1 to FM1' })).toBeVisible()

  await page.getByLabel('Library actions').click()
  await page.getByRole('button', { name: 'Restore from backup…' }).click()
  const restoreDialog = page.getByRole('dialog', { name: 'Restore from backup' })
  await restoreDialog.getByLabel('Choose a backup file').setInputFiles(await download.path())
  await expect(restoreDialog.getByText('Already here, kept')).toBeVisible()
  await restoreDialog.getByRole('button', { name: 'Restore backup' }).click()

  await expect(page.getByText(/^Restored the backup from /)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send E2E BACKUP to FM1' })).toBeVisible()
  await expect.poll(() => storedFirstPatchName(page)).toBe('E2E BACKUP')
})
