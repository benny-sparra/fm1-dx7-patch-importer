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
