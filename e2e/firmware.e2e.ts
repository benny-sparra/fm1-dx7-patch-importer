import { expect, test } from '@playwright/test'

// The firmware list is a second page in the build. Were it missing, the host would answer
// /firmware/ with the app, as it did when a branch without the page was deployed.
test('serves the firmware list at /firmware/ rather than the app', async ({ page }) => {
  await page.goto('/firmware/')

  await expect(page).toHaveTitle('M-VAVE FM1 firmware')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Firmware/)
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toHaveCount(0)
})

test('serves the firmware list at /firmware without its trailing slash', async ({ page }) => {
  await page.goto('/firmware')

  await expect(page).toHaveURL(/\/firmware\/$/)
  await expect(page).toHaveTitle('M-VAVE FM1 firmware')
})

// The fold is the stylesheet's line clamp, which jsdom cannot lay out.
test('folds a blurb to its first lines until its More button opens it', async ({ page }) => {
  await page.goto('/firmware/')
  const card = page.locator('#felucca')
  const blurb = card.locator('.firmware-blurb').first()
  const folded = await blurb.evaluate((element) => element.clientHeight)

  await card.getByRole('button', { name: 'More about Felucca' }).click()

  await expect(card.getByRole('button', { name: 'Less about Felucca' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(await blurb.evaluate((element) => element.clientHeight)).toBeGreaterThan(folded)
})

test('shows only the cards of the kind chosen', async ({ page }) => {
  await page.goto('/firmware/')

  await page.getByRole('button', { name: /^Samplers/ }).click()

  await expect(page.locator('#pigeon')).toBeVisible()
  await expect(page.locator('#felucca')).toBeHidden()
})
