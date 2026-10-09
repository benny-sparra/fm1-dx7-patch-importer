import { expect, test, type Page } from '@playwright/test'

import { installFakeMidi, sentMidi } from '../fake-midi'
import {
  centre,
  controlsSmallerThan,
  doubleTap,
  expectNoSidewaysScroll,
  screenTop,
  touchDrag,
} from './touch'

async function openLibrarian(page: Page) {
  await page.addInitScript(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(slotButtons(page).first()).toBeVisible()
}

function slotButtons(page: Page) {
  return page.getByRole('button', { name: /^Send .+ to FM1$/ })
}

async function firstSlotName(page: Page) {
  const label = (await slotButtons(page).first().getAttribute('aria-label')) ?? ''
  return label.replace(/^Send (.+) to FM1$/, '$1')
}

test('fits the patch banks to the screen without sideways scrolling', async ({ page }) => {
  await openLibrarian(page)

  await expectNoSidewaysScroll(page)
})

test('gives every control on the patch banks a 24 px target', async ({ page }) => {
  await openLibrarian(page)

  expect(await controlsSmallerThan(page, 24)).toEqual([])
})

test('sends a slot to the FM1 with a tap', async ({ page }) => {
  await installFakeMidi(page)
  await openLibrarian(page)
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().tap()
  await expect(
    page.getByRole('switch', { name: 'MIDI online' }).locator('visible=true').first(),
  ).toBeChecked()

  await slotButtons(page).nth(2).tap()

  await expect.poll(() => sentMidi(page)).toContainEqual([0xc0, 2])
})

test('opens a patch in the editor with a double tap', async ({ page }) => {
  await openLibrarian(page)

  await doubleTap(page, slotButtons(page).first())

  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeVisible()
})

test('opens a patch in the editor from its menu with taps', async ({ page }) => {
  await openLibrarian(page)
  const name = await firstSlotName(page)

  await page
    .getByRole('button', { exact: true, name: `Actions for ${name}` })
    .first()
    .tap()
  await page.getByRole('menuitem', { name: 'Edit' }).tap()

  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeVisible()
})

test('copies a slot by dragging its grip onto another bank tab with a finger', async ({ page }) => {
  await openLibrarian(page)
  const name = await firstSlotName(page)
  const grip = await centre(page.getByRole('button', { exact: true, name: `Reorder ${name}` }))
  const tab = await centre(page.getByRole('button', { name: /^B — / }))

  await touchDrag(page, grip, { x: tab.x - grip.x, y: tab.y - grip.y }, { steps: 16 })

  await expect(page.getByRole('dialog', { name: `Copy ${name}` })).toBeVisible()
})

test('scrolls the banks, rather than moving a patch, when a swipe starts on a slot', async ({
  page,
}) => {
  await openLibrarian(page)
  const slots = await slotButtons(page).allTextContents()
  const last = slotButtons(page).last()
  const before = await screenTop(last)
  const start = await centre(slotButtons(page).nth(4))

  await touchDrag(page, start, { x: 0, y: -240 })

  await expect.poll(() => screenTop(last)).toBeLessThan(before - 100)
  expect(await slotButtons(page).allTextContents()).toEqual(slots)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
