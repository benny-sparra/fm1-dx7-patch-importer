import { expect, test, type Page } from '@playwright/test'

import { installFakeMidi, sentMidi } from '../fake-midi'
import { centre, touchHold } from './touch'

async function openKeyboard(page: Page) {
  await installFakeMidi(page)
  await page.addInitScript(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
  await page.goto('/')
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().tap()
  await expect(
    page.getByRole('switch', { name: 'MIDI online' }).locator('visible=true').first(),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Keyboard' }).first().tap()
  const keyboard = page.getByRole('dialog', { name: 'Piano keyboard' })
  await expect(keyboard).toBeVisible()
  return keyboard
}

const noteOns = (page: Page) =>
  sentMidi(page).then((messages) =>
    messages.filter(([status, , velocity]) => status === 0x90 && velocity > 0).map(([, n]) => n),
  )
const noteOffs = (page: Page) =>
  sentMidi(page).then((messages) =>
    messages
      .filter(([status, , velocity]) => status === 0x80 || (status === 0x90 && velocity === 0))
      .map(([, note]) => note),
  )

test('fits the keyboard inside the screen', async ({ page }) => {
  const keyboard = await openKeyboard(page)
  const box = await keyboard.boundingBox()
  const viewport = page.viewportSize()!

  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
})

test('plays and releases a note with a tap on a piano key', async ({ page }) => {
  const keyboard = await openKeyboard(page)

  await keyboard
    .getByRole('button', { name: /^Play [A-G]/ })
    .first()
    .tap()

  await expect.poll(() => noteOns(page)).toHaveLength(1)
  await expect.poll(() => noteOffs(page)).toHaveLength(1)
})

test('holds a note for as long as a finger rests on its key', async ({ page }) => {
  const keyboard = await openKeyboard(page)
  const key = await centre(keyboard.getByRole('button', { name: /^Play [A-G]/ }).first())

  const lift = await touchHold(page, [key])
  await expect.poll(() => noteOns(page)).toHaveLength(1)
  // Longer than a long press, which the browser can turn into a context menu and a cancelled
  // pointer, releasing the note early.
  await page.waitForTimeout(1000)
  expect(await noteOffs(page)).toEqual([])
  await lift()

  await expect.poll(() => noteOffs(page)).toHaveLength(1)
})

test('plays a two-finger chord on the piano keys', async ({ page }) => {
  const keyboard = await openKeyboard(page)
  const keys = keyboard.getByRole('button', { name: /^Play [A-G]/ })
  const first = await centre(keys.nth(0))
  const third = await centre(keys.nth(4))

  const lift = await touchHold(page, [first, third])
  await expect.poll(() => noteOns(page)).toHaveLength(2)
  await lift()

  await expect.poll(() => noteOffs(page)).toHaveLength(2)
})
