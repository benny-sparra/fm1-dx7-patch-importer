import { expect, test, type Page, type Route } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { installFakeMidi, sentMidi } from './fake-midi'

/** Use the actual build graph, including private sensitivity builds, rather than a chunk hash. */
async function chunkPath(source: string) {
  const root = process.env.FM1_TASK11_PREVIEW_ROOT ?? resolve(import.meta.dirname, '..')
  const manifest: Record<string, { file: string }> = JSON.parse(
    await readFile(resolve(root, 'dist/.vite/manifest.json'), 'utf8'),
  )
  expect(manifest[source]?.file).toMatch(/^assets\/.+\.js$/)
  return `/${manifest[source].file}`
}

/** Reads committed public storage only; all edits and recovery actions use the UI. */
function storedWorkspace(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string>((resolveRead, reject) => {
        const open = indexedDB.open('fm1-librarian')
        open.onerror = () => reject(open.error ?? new Error('Could not open IndexedDB.'))
        open.onsuccess = () => {
          const database = open.result
          const transaction = database.transaction('library', 'readonly')
          const request = transaction.objectStore('library').get('current')
          transaction.onabort = () => {
            database.close()
            reject(transaction.error ?? new Error('Could not read the workspace.'))
          }
          transaction.oncomplete = () => {
            database.close()
            resolveRead(JSON.stringify(request.result ?? null))
          }
        }
      }),
  )
}

async function seedEdits(page: Page) {
  await installFakeMidi(page)
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(welcome).toBeVisible()
  await welcome.getByRole('button', { name: 'Close help' }).click()
  await expect(welcome).toBeHidden()
  await page.getByRole('button', { name: 'Favourite A01 PIANO 1', exact: true }).click()
  await page.getByLabel('Actions for Bank 1').locator('visible=true').click()
  await page.getByRole('button', { name: 'Bank information…', exact: true }).click()
  const information = page.getByRole('dialog', { name: 'Bank information' })
  const title = information.getByRole('textbox', { name: 'Bank name', exact: true })
  await expect(title).toBeFocused()
  await title.fill('Kept edits')
  await information
    .getByRole('textbox', { name: 'Description (optional)' })
    .fill('Before lazy failures')
  await information.getByRole('button', { name: 'Update details', exact: true }).click()
  await expect(information).toBeHidden()
  await expect
    .poll(async () => {
      const stored = JSON.parse(await storedWorkspace(page))
      return {
        title: stored?.bankNames?.A,
        description: stored?.bankDescriptions?.A,
        favourites: stored?.favourites?.length,
      }
    })
    .toEqual({ title: 'Kept edits', description: 'Before lazy failures', favourites: 1 })
  return storedWorkspace(page)
}

function watchChunk(page: Page, pathname: string) {
  const requested: string[] = []
  const blocked: string[] = []
  const unexpectedErrors: string[] = []
  const documents: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === pathname) requested.push(request.url())
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documents.push(request.url())
    }
  })
  page.on('pageerror', (error) => {
    // Only a failed module fetch naming this intercepted chunk is expected in this scenario.
    const moduleFetch =
      /^(Failed to fetch dynamically imported module:|error loading dynamically imported module:|Importing a module script failed:)/.test(
        error.message,
      )
    if (!moduleFetch || !error.message.includes(pathname)) unexpectedErrors.push(error.message)
  })
  const fail = async (route: Route) => {
    blocked.push(route.request().url())
    await route.fulfill({
      status: 404,
      contentType: 'text/javascript',
      body: '// Chunk removed by a deployment.',
    })
  }
  return { blocked, documents, fail, requested, unexpectedErrors }
}

async function expectKeptEdits(page: Page, snapshot: string) {
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await expect(page.getByLabel('Actions for Kept edits').locator('visible=true')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Favourite A01 PIANO 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(await storedWorkspace(page)).toBe(snapshot)
}

test('a missing editor chunk survives its one automatic retry, returns focus and opens after the offered reload', async ({
  page,
  context,
}) => {
  await context.route('https://**/*', (route) => route.abort())
  const pathname = await chunkPath('src/routes/patch-editor-page.tsx')
  const watched = watchChunk(page, pathname)
  const snapshot = await seedEdits(page)
  expect(watched.requested).toEqual([])
  await page.route(`**${pathname}`, watched.fail)
  const slot = page.getByRole('button', { name: 'Send A01 PIANO 1 to FM1', exact: true })
  await slot.dblclick()
  const alert = page.getByRole('alert').filter({ hasText: 'The editor could not be loaded.' })
  await expect(alert).toContainText(
    'The app may have been updated or the connection was interrupted. Reload to use the latest version, or return to the library.',
  )
  await expect(alert.getByRole('button', { name: 'Reload app', exact: true })).toBeVisible()
  expect(watched.blocked).toHaveLength(2)
  expect(watched.documents).toHaveLength(2)
  await expect(
    page.getByRole('heading', { name: 'M-VAVE FM1 editor & librarian', exact: true }),
  ).toBeVisible()
  expect(await storedWorkspace(page)).toBe(snapshot)
  await alert.getByRole('button', { name: 'Back to library', exact: true }).click()
  await expectKeptEdits(page, snapshot)
  await expect(slot).toBeFocused()

  // React caches the rejection for this page. The recovery action must fetch a new document.
  await slot.dblclick()
  await expect(alert).toBeVisible()
  await page.unroute(`**${pathname}`, watched.fail)
  await alert.getByRole('button', { name: 'Reload app', exact: true }).click()
  await expectKeptEdits(page, snapshot)
  await slot.dblclick()
  await expect(page.getByRole('button', { name: 'Back to patch banks', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: 'Patch name', exact: true })).toHaveValue(
    'PIANO 1',
  )
  expect(watched.blocked).toHaveLength(2)
  expect(watched.documents).toHaveLength(3)
  expect(watched.requested).toHaveLength(3)
  expect(await storedWorkspace(page)).toBe(snapshot)
  await page.getByRole('button', { name: 'Back to patch banks', exact: true }).click()
  await expectKeptEdits(page, snapshot)
  await expect(slot).toBeFocused()
  expect(await sentMidi(page)).toEqual([])
  expect(watched.unexpectedErrors).toEqual([])
})

test('a missing backup-dialog chunk leaves the library usable and opens after the offered reload', async ({
  page,
  context,
}) => {
  await context.route('https://**/*', (route) => route.abort())
  const pathname = await chunkPath('src/components/patches/restore-backup-dialog.tsx')
  const watched = watchChunk(page, pathname)
  const snapshot = await seedEdits(page)
  expect(watched.requested).toEqual([])
  await page.route(`**${pathname}`, watched.fail)
  const opener = page.getByLabel('Library actions')
  await opener.click()
  await page.getByRole('button', { name: 'Restore from backup…', exact: true }).click()
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Backups could not be opened. Reload the page and try again.' })
  await expect(
    alert.getByText('Backups could not be opened. Reload the page and try again.', { exact: true }),
  ).toBeVisible()
  await expect(alert.getByRole('button', { name: 'Reload app', exact: true })).toBeVisible()
  expect(watched.blocked).toHaveLength(1)
  expect(watched.documents).toHaveLength(1)
  await expect(page.getByRole('dialog', { name: 'Restore from backup', exact: true })).toHaveCount(
    0,
  )
  await expectKeptEdits(page, snapshot)
  // The contained failure must leave the underlying grid interactive, not only still painted.
  const slot = page.getByRole('button', { name: 'Send A01 PIANO 1 to FM1', exact: true })
  await slot.click()
  await expect(slot).toHaveAttribute('aria-current', 'true')

  await page.unroute(`**${pathname}`, watched.fail)
  await alert.getByRole('button', { name: 'Reload app', exact: true }).click()
  await expectKeptEdits(page, snapshot)
  await opener.click()
  await page.getByRole('button', { name: 'Restore from backup…', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Restore from backup', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Choose a backup file')).toBeEnabled()
  expect(watched.blocked).toHaveLength(1)
  expect(watched.requested).toHaveLength(2)
  expect(watched.documents).toHaveLength(2)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expectKeptEdits(page, snapshot)
  expect(await sentMidi(page)).toEqual([])
  expect(watched.unexpectedErrors).toEqual([])
})
