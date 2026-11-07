// Captures the README's screenshots of the patch banks and the voice editor from the production
// build, so they can be refreshed with one command rather than retaken by hand. Run it through
// `npm run screenshots:readme`, which builds first.
//
// Every capture starts from the same state: the factory banks, a first visit's storage with the
// welcome already seen, the Black finish, British English, reduced motion, and the fake FM-1 on
// M-VAVE's stock V16, so MIDI shows online and identified without hardware.

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import sharp from 'sharp'

import { installFakeMidi } from '../e2e/fake-midi.ts'

const outputDirectory = path.resolve(fileURLToPath(import.meta.url), '../../docs/images')
const viewport = { height: 860, width: 1360 }
const startupTimeoutMs = 20_000

async function availablePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise((resolve) => server.close(resolve))
  if (!port) throw new Error('Could not allocate a local preview port.')
  return port
}

async function waitForPreview(url) {
  const deadline = Date.now() + startupTimeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for the production preview.')
}

/** Saves a page screenshot as WebP, small enough for the README to load quickly on GitHub. */
async function save(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  const png = await page.screenshot({ animations: 'disabled', caret: 'hide' })
  const file = path.join(outputDirectory, `${name}.webp`)
  await sharp(png).webp({ effort: 6, quality: 82 }).toFile(file)
  console.log(`Saved ${path.relative(process.cwd(), file)}`)
}

async function main() {
  const port = await availablePort()
  const url = `http://127.0.0.1:${port}/`
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const preview = spawn(
    npmCommand,
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: 'ignore' },
  )
  const browser = await chromium.launch()

  try {
    await waitForPreview(url)
    const context = await browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 2,
      locale: 'en-GB',
      reducedMotion: 'reduce',
      viewport,
    })
    const page = await context.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('fm1-librarian-help-seen', 'true')
      localStorage.setItem('fm1-colourway', 'black')
    })
    await installFakeMidi(page, { firmware: 'mvave-v16' })
    await page.goto(url)
    await page.getByRole('heading', { name: 'Patch banks' }).waitFor()

    // The switch's checkbox sits under its drawn track, so it is operated through its label.
    await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().click()
    // The firmware badge fills once the fake FM-1 answers the identity query.
    await page
      .getByText(/^M-VAVE firmware, /)
      .first()
      .waitFor({ state: 'attached' })

    const slots = page.getByRole('button', { name: /^Send .+ to FM1$/ })
    await slots.first().click()
    await save(page, 'patch-banks')

    await slots.first().dblclick()
    const back = page.getByRole('button', { name: 'Back to patch banks' })
    await back.waitFor()
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find(
        (element) => element.getAttribute('aria-label') === 'Back to patch banks',
      )
      return button && !button.disabled
    })
    // On V16 a notification says which Voice edits reach, and would cover the rack.
    const dismissButtons = page.getByRole('button', { name: 'Dismiss notification' })
    for (const button of await dismissButtons.all()) await button.click()
    await dismissButtons.first().waitFor({ state: 'detached' })
    await save(page, 'voice-editor')
  } finally {
    await browser.close()
    preview.kill('SIGTERM')
  }
}

await main()
