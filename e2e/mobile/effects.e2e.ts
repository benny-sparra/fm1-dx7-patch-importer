import { expect, test, type Page } from '@playwright/test'

import { capturedReply } from '../../src/test/v16-live-effects-captures'
import { frame } from '../../src/test/v16-live-effects-replies'
import { makeSettingsBlock, makeSettingsBlockReply } from '../../src/test/v16-settings-replies'
import {
  clearSentMidi,
  fakeMidiRequests,
  installFakeMidi,
  receiveMidi,
  sentMidi,
} from '../fake-midi'
import { centre, expectNoSidewaysScroll, screenTop, touchDrag } from './touch'

const initialOrder = ['Delay', 'Filter', 'Reverb', 'Distortion', 'Phaser', 'Chorus']
const hall = [1, 0, 44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const hallMessages = [
  [0xb1, 70, 1],
  [0xb1, 71, 0],
  [0xb1, 72, 44],
  [0xb1, 73, 0],
  [0xb1, 74, 0],
  [0xb1, 75, 0],
  [0xb1, 76, 0],
  [0xb1, 77, 0],
  [0xb1, 78, 0],
  [0xb1, 79, 0],
  [0xb1, 80, 0],
  [0xb1, 81, 0],
  [0xb1, 82, 0],
  [0xb1, 83, 0],
  [0xb1, 84, 0],
  [0xb1, 85, 0],
  [0xb1, 86, 0],
  [0xb1, 87, 0],
  [0xb1, 88, 0],
  [0xb1, 89, 0],
  [0xb1, 90, 0],
  [0xb1, 91, 0],
  [0xb1, 92, 0],
  [0xb1, 93, 0],
]

function rackOrder(page: Page) {
  return page
    .getByRole('region', { name: /^(Filter|Reverb|Delay|Distortion|Chorus|Phaser)$/ })
    .evaluateAll((regions) => regions.map((region) => region.getAttribute('aria-label')))
}

function cutoff(page: Page) {
  return page
    .getByRole('region', { name: 'Filter', exact: true })
    .getByRole('slider', { name: 'Filter Cutoff', exact: true })
}

async function openEffects(page: Page) {
  await page.route('https://**/*', (route) => route.abort())
  await installFakeMidi(page, {
    firmware: 'mvave-v16',
    settingsReply: Array.from(makeSettingsBlockReply(makeSettingsBlock())),
  })
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(welcome).toBeVisible()
  await welcome.getByRole('button', { name: 'Close help' }).tap()
  await expect(welcome).toBeHidden()
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().tap()
  await page.getByRole('button', { name: 'Effects', exact: true }).tap()
  await expect.poll(() => rackOrder(page)).toEqual(initialOrder)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.identity, fakeMidiRequests.effectOrder])
  await clearSentMidi(page)
  await expectNoSidewaysScroll(page)
}

/** Import through the UI before the modal opens; opening/choosing never uses private state. */
async function importPresets(page: Page) {
  const presets = Array.from({ length: 60 }, (_, index) => ({
    effects: [1, 0, index, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    name: `Room ${String(index).padStart(2, '0')}`,
  }))
  presets.push({ effects: hall, name: 'Touch hall' })
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'FX preset actions', exact: true }).tap()
  await page.getByRole('menuitem', { name: 'Import…', exact: true }).tap()
  await (
    await choosing
  ).setFiles({
    buffer: Buffer.from(JSON.stringify({ format: 'fm1-fx-presets', presets, version: 1 })),
    mimeType: 'application/json',
    name: 'touch-effects.json',
  })
  await expect(page.getByRole('region', { name: 'Completed actions' })).toContainText(
    'Imported 61 FX presets. Existing presets were kept.',
  )
  expect(await sentMidi(page)).toEqual([])
}

test('touch searches and recalls an FX preset, operates its modal row menu and returns focus to the toggle', async ({
  page,
}) => {
  await openEffects(page)
  await importPresets(page)
  await page.getByRole('button', { name: 'Unsaved effects', exact: true }).tap()
  const sheet = page.getByRole('dialog', { name: 'FX presets', exact: true })
  await expect(sheet).toBeVisible()
  const search = sheet.getByRole('searchbox', { name: 'Search FX presets', exact: true })
  await search.tap()
  await search.fill('touch')
  await expect(sheet.getByRole('list', { name: 'FX presets' }).getByRole('listitem')).toHaveCount(1)
  await sheet.getByRole('button', { name: 'Touch hall', exact: true }).tap()
  await expect(sheet).toBeHidden()
  const toggle = page.getByRole('button', { name: 'Touch hall', exact: true })
  await expect(toggle).toBeFocused()
  await expect(cutoff(page)).toHaveValue('44')
  await expect.poll(() => sentMidi(page)).toEqual(hallMessages)
  await expect(page.getByRole('button', { name: 'Send to FM1', exact: true })).toBeVisible()

  await toggle.tap()
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Actions for Touch hall', exact: true }).tap()
  await expect(sheet.getByRole('menuitem', { name: 'Duplicate', exact: true })).toBeVisible()
  expect(await sentMidi(page)).toEqual(hallMessages)
  await sheet.getByRole('menuitem', { name: 'Duplicate', exact: true }).tap()
  await expect(sheet.getByRole('button', { name: 'Copy of Touch hall', exact: true })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Touch hall', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await sheet.getByRole('button', { name: 'Close', exact: true }).tap()
  await expect(sheet).toBeHidden()
  await expect(toggle).toBeFocused()
  await expect(cutoff(page)).toHaveValue('44')
  expect(await sentMidi(page)).toEqual(hallMessages)
  await expectNoSidewaysScroll(page)
})

test('a finger scrolls the long FX sheet without recalling a row or sending MIDI', async ({
  page,
}) => {
  await openEffects(page)
  await importPresets(page)
  const toggle = page.getByRole('button', { name: 'Unsaved effects', exact: true })
  await toggle.tap()
  const sheet = page.getByRole('dialog', { name: 'FX presets', exact: true })
  const rows = sheet.getByRole('list', { name: 'FX presets' }).getByRole('listitem')
  await expect(rows).toHaveCount(61)
  const anchor = sheet.getByRole('button', { name: 'Room 06', exact: true })
  const start = await centre(anchor)
  const before = await screenTop(anchor)

  await touchDrag(page, start, { x: 0, y: -240 }, { steps: 16 })

  await expect.poll(() => screenTop(anchor)).toBeLessThan(before - 100)
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { pressed: true })).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([])
  await sheet.getByRole('button', { name: 'Close', exact: true }).tap()
  await expect(sheet).toBeHidden()
  await expect(toggle).toBeFocused()
  await expect(cutoff(page)).toHaveValue('0')
  expect(await sentMidi(page)).toEqual([])
})

test('rack Move later and Move earlier stay tappable after the FX sheet closes', async ({
  page,
}) => {
  await openEffects(page)
  const toggle = page.getByRole('button', { name: 'Unsaved effects', exact: true })
  await toggle.tap()
  const sheet = page.getByRole('dialog', { name: 'FX presets', exact: true })
  await sheet.getByRole('button', { name: 'Close', exact: true }).tap()
  await expect(sheet).toBeHidden()
  await expect(toggle).toBeFocused()
  const filter = page.getByRole('region', { name: 'Filter', exact: true })
  const menu = filter.getByRole('button', { name: 'Actions for Filter', exact: true })

  await menu.tap()
  await page.getByRole('menuitem', { name: 'Move later', exact: true }).tap()

  await expect
    .poll(() => rackOrder(page))
    .toEqual(['Delay', 'Reverb', 'Filter', 'Distortion', 'Phaser', 'Chorus'])
  const later = Array.from(
    frame(
      [
        4, 0x92, 0, 0, 0, 27, 0, 0, 2, 1, 0, 1, 1, 0, 0, 1, 0, 3, 1, 0, 5, 1, 0, 4, 1, 0, 6, 1, 0,
        7, 1, 0, 8, 1, 0,
      ],
      0x22,
    ),
  )
  await expect.poll(() => sentMidi(page)).toEqual([fakeMidiRequests.effectOrder, later])
  await expect(menu).toBeFocused()
  await menu.tap()
  await page.getByRole('menuitem', { name: 'Move earlier', exact: true }).tap()
  await expect.poll(() => rackOrder(page)).toEqual(initialOrder)
  const earlier = Array.from(
    frame(
      [
        4, 0x92, 0, 0, 0, 27, 0, 0, 2, 1, 0, 0, 1, 0, 1, 1, 0, 3, 1, 0, 5, 1, 0, 4, 1, 0, 6, 1, 0,
        7, 1, 0, 8, 1, 0,
      ],
      0x22,
    ),
  )
  await expect
    .poll(() => sentMidi(page))
    .toEqual([fakeMidiRequests.effectOrder, later, fakeMidiRequests.effectOrder, earlier])
  await expect(menu).toBeFocused()
  const enabled = filter.getByRole('switch', { name: 'Filter', exact: true })
  await enabled.locator('..').tap()
  await expect(enabled).toBeChecked()
  await expect
    .poll(() => sentMidi(page))
    .toEqual([
      fakeMidiRequests.effectOrder,
      later,
      fakeMidiRequests.effectOrder,
      earlier,
      [0xb1, 70, 1],
    ])
  await expectNoSidewaysScroll(page)
})

test('touch Read from FM1 keeps loading focus, disables the rack and adopts a reply without sending it back', async ({
  page,
}) => {
  await openEffects(page)
  await page.getByRole('button', { name: 'Unsaved effects', exact: true }).tap()
  const sheet = page.getByRole('dialog', { name: 'FX presets', exact: true })
  await sheet.getByRole('button', { name: 'Close', exact: true }).tap()
  await expect(sheet).toBeHidden()
  const enabled = page.getByRole('switch', { name: 'Filter', exact: true })
  await enabled.locator('..').tap()
  await expect(enabled).toBeChecked()
  await expect(cutoff(page)).toBeEnabled()
  await expect.poll(() => sentMidi(page)).toEqual([[0xb1, 70, 1]])
  await clearSentMidi(page)
  const read = page.getByRole('button', { name: 'Read from FM1', exact: true })

  await read.tap()

  const loading = page.getByRole('button', { name: 'Reading…', exact: true })
  await expect(loading).toBeVisible()
  await expect(loading).toBeFocused()
  await expect(loading).toBeDisabled()
  await expect(enabled).toBeDisabled()
  await expect(cutoff(page)).toBeDisabled()
  await expect(cutoff(page)).toHaveValue('0')
  await expect.poll(() => sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')))

  await expect(cutoff(page)).toHaveValue('53')
  await expect(cutoff(page)).toBeEnabled()
  await expect(enabled).toBeEnabled()
  await expect(read).toBeEnabled()
  await expect(read).toBeFocused()
  await expect
    .poll(() => rackOrder(page))
    .toEqual(['Filter', 'Reverb', 'Delay', 'Distortion', 'Chorus', 'Phaser'])
  await expect(
    page.getByRole('status').filter({ hasText: 'Read the effects from the FM1.' }),
  ).toBeVisible()
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  await expectNoSidewaysScroll(page)
})
