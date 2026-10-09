import { expect, test, type Page } from '@playwright/test'

import { centre, controlsSmallerThan, expectNoSidewaysScroll, screenTop, touchDrag } from './touch'

/** Opens the first patch through its menu, so these journeys do not depend on a double tap. */
async function openEditor(page: Page) {
  await page.addInitScript(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
  await page.goto('/')
  const slot = page.getByRole('button', { name: /^Send .+ to FM1$/ }).first()
  const label = (await slot.getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Send (.+) to FM1$/, '$1')
  await page
    .getByRole('button', { exact: true, name: `Actions for ${name}` })
    .first()
    .tap()
  await page.getByRole('menuitem', { name: 'Edit' }).tap()
  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeEnabled()
}

function operatorOne(page: Page) {
  return page.getByRole('region', { name: /^Operator 1, / })
}

test('fits the editor to the screen without sideways scrolling', async ({ page }) => {
  await openEditor(page)

  await expectNoSidewaysScroll(page)
})

test('gives every editor control a 24 px target', async ({ page }) => {
  await openEditor(page)

  expect(await controlsSmallerThan(page, 24)).toEqual([])
})

test('turns a knob with a finger drag without scrolling the page, and undoes it in one step', async ({
  page,
}) => {
  await openEditor(page)
  const knob = operatorOne(page).getByRole('slider', { exact: true, name: 'Breakpoint' })
  const before = await knob.getAttribute('aria-valuenow')
  const start = await centre(knob)
  const top = await screenTop(knob)

  await touchDrag(page, start, { x: 0, y: -40 })

  expect(Number(await knob.getAttribute('aria-valuenow')) - Number(before)).toBeGreaterThan(1)
  expect(await screenTop(knob)).toBe(top)
  await page.getByRole('button', { exact: true, name: 'Undo' }).tap()
  await expect(knob).toHaveAttribute('aria-valuenow', before!)
})

test('sets a knob to a single step with a finger', async ({ page }) => {
  await openEditor(page)
  const knob = operatorOne(page).getByRole('slider', { exact: true, name: 'Breakpoint' })
  const before = Number(await knob.getAttribute('aria-valuenow'))

  // A finger moves a pixel or two while it rests; a knob that jumps several steps for that
  // cannot be set exactly by touch.
  await touchDrag(page, await centre(knob), { x: 0, y: -3 }, { steps: 3 })

  expect(Math.abs(Number(await knob.getAttribute('aria-valuenow')) - before)).toBeLessThanOrEqual(1)
})

test('moves an envelope point with a finger drag', async ({ page }) => {
  await openEditor(page)
  const point = operatorOne(page).getByRole('slider', { name: 'Amplitude envelope point 2' })
  const level = Number(await point.getAttribute('aria-valuenow'))

  await touchDrag(page, await centre(point), { x: -12, y: 24 })

  expect(level - Number(await point.getAttribute('aria-valuenow'))).toBeGreaterThan(1)
})

test('sets a range slider with a finger drag', async ({ page }) => {
  await openEditor(page)
  const range = page.getByRole('slider', { name: 'Operator 2 output level' })
  const before = Number(await range.inputValue())

  await touchDrag(page, await centre(range), { x: before > 50 ? -60 : 60, y: 0 })

  expect(Number(await range.inputValue())).not.toBe(before)
})

test('opens a help note with a tap and closes it with another', async ({ page }) => {
  await openEditor(page)
  const help = page.getByRole('button', { name: 'Help: FM operators' })

  await help.tap()
  await expect(page.getByRole('note')).toBeVisible()
  await help.tap()

  await expect(page.getByRole('note')).toBeHidden()
})
