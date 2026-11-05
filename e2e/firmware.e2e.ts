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

  await page.locator('.firmware-kind-toggle').click()
  await page.getByRole('button', { name: /^Samplers/ }).click()

  await expect(page.locator('.firmware-kind-toggle')).toContainText('Samplers 14')

  await expect(page.locator('#pigeon')).toBeVisible()
  await expect(page.locator('#felucca')).toBeHidden()
})

test('keeps only the cards whose words match the search', async ({ page }) => {
  await page.goto('/firmware/')

  await page.getByRole('searchbox', { name: 'Search' }).fill('irish ambient')

  await expect(page.locator('#aisling')).toBeVisible()
  await expect(page.locator('#felucca')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'No firmwares found' })).toBeHidden()
})

test('says no firmwares were found, and shows them all again on request', async ({ page }) => {
  await page.goto('/firmware/')
  const search = page.getByRole('searchbox', { name: 'Search' })

  await search.fill('zzzz no such firmware')

  await expect(page.getByRole('heading', { name: 'No firmwares found' })).toBeVisible()
  await expect(page.locator('.firmware-grid')).toBeHidden()

  await page.getByRole('button', { name: 'Show all firmwares' }).click()

  await expect(search).toHaveValue('')
  await expect(page.locator('#felucca')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No firmwares found' })).toBeHidden()
})

test('keeps a card’s other links in a menu that closes on Escape and when another opens', async ({
  page,
}) => {
  await page.goto('/firmware/')
  const aisling = page.locator('#aisling')
  const source = aisling.getByRole('link', { name: 'Source ↗' })

  await expect(source).toBeHidden()
  await page.getByLabel('More links for AISLING').click()
  await expect(source).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(source).toBeHidden()
  await expect(page.getByLabel('More links for AISLING')).toBeFocused()

  await page.getByLabel('More links for AISLING').click()
  await page.getByLabel('More links for 386DX').click()
  await expect(source).toBeHidden()
  await expect(page.locator('[id="386dx"]').getByRole('link', { name: 'Source ↗' })).toBeVisible()
})

test('hides the Latest strip’s list with its eye button, and keeps it hidden on reload', async ({
  page,
}) => {
  await page.goto('/firmware/')
  const list = page.locator('.firmware-latest-list')

  await page.getByRole('button', { name: 'Hide the latest changes' }).click()
  await expect(list).toBeHidden()
  await page.reload()

  await expect(list).toBeHidden()
  await page.getByRole('button', { name: 'Show the latest changes' }).click()
  await expect(list).toBeVisible()
})

test('opens a card’s photo full size in a dialog, closed by a click outside it', async ({
  page,
}) => {
  await page.goto('/firmware/')
  const thumbnail = page.getByRole('button', { name: 'Enlarge the photo of AMB-1' })

  await thumbnail.click()
  const dialog = page.getByRole('dialog', { name: 'AMB-1' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img')).toHaveJSProperty('complete', true)

  await page.mouse.click(5, 5)
  await expect(dialog).toBeHidden()
  await expect(thumbnail).toBeFocused()
})
