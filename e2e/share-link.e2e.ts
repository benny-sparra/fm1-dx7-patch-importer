import { expect, test, type Page } from '@playwright/test'

// A version 1 link to a DX7 patch named SHARE DX7, as src/lib/patch-share-link.test.ts writes it.
const sharedPayload =
  'AQAABw4VHCMqMTg_Rk1UW2JpcHd-BQwTGiEoLzY9REtSWWBnbnV8AwoRGB8mLTQ7QklQV15lbHN6AQgPFh0kKzI5QEdOVVxjanF4fwYNFBsiKTA3PkVMU1phaG92fQQLEhkgJy41PENKUVhfZm10ewIJEBceJSwzU0hBUkUgRFg3IAACCgQAAR4jAC0yNwBBRksAVVpfAAQJDg'

/** The slot buttons, named "Send … to FM1"; the toolbar's bank-wide "Send to FM1" is excluded. */
function slotButtons(page: Page) {
  return page.getByRole('button', { name: /^Send .+ to FM1$/ })
}

test('opens a shared patch from its link and adds it to a slot, which Undo reverses', async ({
  page,
}) => {
  await page.goto(`/#p=${sharedPayload}`)

  // A first visit that came for a share link meets the patch rather than the guide.
  const dialog = page.getByRole('dialog', { name: 'Shared patch' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('SHARE DX7', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: /Welcome/ })).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).hash).toBe('')
  const replaced = await slotButtons(page).first().getAttribute('aria-label')

  await dialog.getByRole('button', { name: 'Add to library…' }).click()
  await page.getByRole('button', { name: 'Replace A01' }).click()

  await expect(page.getByRole('button', { name: /^Send \S+ SHARE DX7 to FM1$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(slotButtons(page).first()).toHaveAttribute('aria-label', replaced ?? '')

  // The link left the address bar, so a reload does not offer the patch again.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Shared patch' })).toHaveCount(0)
})

test('copies a slot’s share link that opens the same patch', async ({
  browserName,
  context,
  page,
}) => {
  test.skip(browserName !== 'chromium', 'Only Chromium lets a journey read the clipboard.')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(helpDialog).toBeVisible()
  await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(helpDialog).toBeHidden()
  const label = (await slotButtons(page).nth(1).getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Send \S+ (.+) to FM1$/, '$1')

  await page.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Copy share link' }).click()
  await expect(page.getByText(`Copied a share link for “${name}”.`)).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  // The link opens the site it was copied from, here the local build.
  expect(link).toMatch(/^http:\/\/127\.0\.0\.1:4173\/#p=[A-Za-z0-9_-]+$/)

  // Pasted into the open tab, the link opens the patch it was copied from.
  await page.goto(link)
  const dialog = page.getByRole('dialog', { name: 'Shared patch' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(name, { exact: true })).toBeVisible()
})

test('shows a refused copy’s explanation in view of the slot it was copied from', async ({
  page,
}) => {
  // Stands in for a browser that refuses the clipboard, as an embedded browser or a denied
  // permission does.
  await page.addInitScript(() => {
    const refuse = () =>
      Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
    navigator.clipboard.write = refuse
    navigator.clipboard.writeText = refuse
  })
  await page.goto('/')
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(helpDialog).toBeVisible()
  await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(helpDialog).toBeHidden()
  const label = (await slotButtons(page).first().getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Send \S+ (.+) to FM1$/, '$1')

  await page.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Copy share link' }).click()

  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'The browser did not allow the share link to be copied.' }),
  ).toBeInViewport()
})
