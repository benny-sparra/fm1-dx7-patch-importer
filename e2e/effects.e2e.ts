import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { capturedReply, sentRack } from '../src/test/v16-live-effects-captures'
import { frame, table, values } from '../src/test/v16-live-effects-replies'
import { makeSettingsBlock, makeSettingsBlockReply } from '../src/test/v16-settings-replies'
import {
  clearSentMidi,
  fakeMidiRequests,
  installFakeMidi,
  receiveMidi,
  sentMidi,
  type FakeMidiDeviceOptions,
} from './fake-midi'

const effectNames = ['Filter', 'Reverb', 'Delay', 'Distortion', 'Chorus', 'Phaser']
const initialOrder = ['Delay', 'Filter', 'Reverb', 'Distortion', 'Phaser', 'Chorus']
const zeroRack = Array<number>(24).fill(0)

function rackOrder(page: Page) {
  return page
    .getByRole('region', { name: /^(Filter|Reverb|Delay|Distortion|Chorus|Phaser)$/ })
    .evaluateAll((regions) => regions.map((region) => region.getAttribute('aria-label')))
}

async function rackValues(page: Page) {
  const groups = await Promise.all(
    effectNames.map((name) =>
      page
        .getByRole('region', { name, exact: true })
        .locator(
          'input[role="switch"], input[type="range"], select[aria-label="Filter Type"], select[aria-label="Reverb Space"]',
        )
        .evaluateAll((controls) =>
          controls.map((control) => {
            if (control instanceof HTMLInputElement && control.type === 'checkbox') {
              return Number(control.checked)
            }
            if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
              return Number(control.value)
            }
            throw new Error('Not an effect control.')
          }),
        ),
    ),
  )
  return groups.flat()
}

async function openEffects(
  page: Page,
  liveReply?: number[],
  additional: FakeMidiDeviceOptions[] = [],
) {
  await page.route('https://**/*', (route) => route.abort())
  await installFakeMidi(page, {
    devices: [
      {
        id: 'fm1',
        firmware: 'mvave-v16',
        liveEffectsReply: liveReply,
        settingsReply: Array.from(makeSettingsBlockReply(makeSettingsBlock())),
      },
      ...additional,
    ],
  })
  await page.goto('/')
  const welcome = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(welcome).toBeVisible()
  await welcome.getByRole('button', { name: 'Close help' }).click()
  await expect(welcome).toBeHidden()
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().click()
  await page.getByRole('button', { name: 'Effects', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(6)
  await expect.poll(() => rackOrder(page)).toEqual(initialOrder)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.identity, fakeMidiRequests.effectOrder])
  await clearSentMidi(page)
}

async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date('2026-11-08T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-08T12:00:01Z'))
}

test('a live FX read updates all controls, order and matching name; Undo restores browser values without MIDI', async ({
  page,
}) => {
  await openEffects(page, Array.from(capturedReply('Read run A distinct')))
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'FX preset actions' }).click()
  await page.getByRole('menuitem', { name: 'Import…', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    buffer: Buffer.from(
      JSON.stringify({
        format: 'fm1-fx-presets',
        presets: [{ effects: sentRack('Read run A distinct'), name: 'Read run A distinct' }],
        version: 1,
      }),
    ),
    mimeType: 'application/json',
    name: 'read-fixture.json',
  })
  await expect(page.getByRole('button', { name: 'Read run A distinct', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New FX preset…' }).click()
  await page.getByRole('textbox', { name: 'Preset name' }).fill('Browser zero')
  await page.getByRole('button', { name: 'Save preset', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Browser zero', exact: true })).toBeVisible()
  expect(await rackValues(page)).toEqual(zeroRack)
  await freezeClock(page)

  await page.getByRole('button', { name: 'Read from FM1', exact: true }).click()
  await page.clock.runFor(1)

  await expect.poll(() => rackValues(page)).toEqual(sentRack('Read run A distinct'))
  await expect.poll(() => rackOrder(page)).toEqual(effectNames)
  await expect(
    page.getByRole('heading', { name: 'Read run A distinct', exact: true }),
  ).toBeVisible()
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  const readToast = page.getByRole('status').filter({ hasText: 'Read the effects from the FM1.' })
  await expect(readToast).toBeVisible()

  // The named records are unchanged: reading adopts a matching preset, never overwrites one.
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'FX preset actions' }).click()
  await page.getByRole('menuitem', { name: 'Download all', exact: true }).click()
  const download = await downloading
  expect(JSON.parse(await readFile(await download.path(), 'utf8')).presets).toEqual([
    // Saved while the FM1's order, read from its settings block, was known, so it keeps it.
    { effects: zeroRack, name: 'Browser zero', order: [2, 0, 1, 3, 5, 4] },
    { effects: sentRack('Read run A distinct'), name: 'Read run A distinct' },
  ])
  await readToast.getByRole('button', { name: 'Undo', exact: true }).click()

  await expect.poll(() => rackValues(page)).toEqual(zeroRack)
  // Order is the FM1's live state; Undo restores the browser controls, not hardware order, so
  // the preset, saved with the FM1's earlier order, reads as edited.
  await expect(
    page.getByRole('heading', { name: 'Browser zero edited', exact: true }),
  ).toBeVisible()
  expect(await rackOrder(page)).toEqual(effectNames)
  await page.clock.fastForward(6000)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
})

test('leaving Effects cancels a pending live read and ignores its late reply and toast', async ({
  page,
}) => {
  await openEffects(page)
  await freezeClock(page)
  await page.getByRole('button', { name: 'Read from FM1', exact: true }).click()
  await page.clock.runFor(1)
  await expect.poll(() => sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  await expect(page.getByRole('button', { name: 'Reading…', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Patches', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Send A01 PIANO 1 to FM1', exact: true }),
  ).toBeVisible()
  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')))
  await page.clock.fastForward(6000)

  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  await page.getByRole('button', { name: 'Effects', exact: true }).click()
  await page.clock.runFor(1)
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(6)
  await expect.poll(() => rackValues(page)).toEqual(zeroRack)
  await expect.poll(() => rackOrder(page)).toEqual(initialOrder)
  await expect(page.getByRole('heading', { name: 'Unsaved effects', exact: true })).toBeVisible()
  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects, fakeMidiRequests.effectOrder])
})

test('a timed-out live read retains the rack, explains the failure and never retries', async ({
  page,
}) => {
  await openEffects(page)
  await freezeClock(page)
  await page.getByRole('button', { name: 'Read from FM1', exact: true }).click()
  await page.clock.runFor(1)
  await expect.poll(() => sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  await expect(page.getByRole('button', { name: 'Reading…', exact: true })).toBeVisible()

  await page.clock.fastForward(1501)

  await expect(page.getByRole('alert')).toHaveText(
    'The FM1 did not answer. Check that its MIDI input is selected, then try again.',
  )
  await expect(page.getByRole('button', { name: 'Read from FM1', exact: true })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  expect(await rackValues(page)).toEqual(zeroRack)
  expect(await rackOrder(page)).toEqual(initialOrder)
  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')))
  await page.clock.fastForward(6000)
  expect(await rackValues(page)).toEqual(zeroRack)
  await expect(page.getByRole('heading', { name: 'Unsaved effects', exact: true })).toBeVisible()
  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
})

test('a validly framed reading with an out-of-range control changes nothing and offers a translated retry', async ({
  page,
}) => {
  await openEffects(page)
  await freezeClock(page)
  await page.getByRole('button', { name: 'Read from FM1', exact: true }).click()
  await page.clock.runFor(1)
  await expect.poll(() => sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
  const invalid = [...values]
  invalid[0] = 120 // Cutoff's maximum is 107; the independent fixture packer keeps framing valid.

  await receiveMidi(page, Array.from(frame([...invalid, ...table])))

  await expect(page.getByRole('alert')).toHaveText(
    'The FM1’s effects could not be read, so nothing here changed. Try again.',
  )
  await expect(page.getByRole('button', { name: 'Read from FM1', exact: true })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  expect(await rackValues(page)).toEqual(zeroRack)
  expect(await rackOrder(page)).toEqual(initialOrder)
  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')))
  await page.clock.fastForward(6000)
  expect(await rackValues(page)).toEqual(zeroRack)
  await expect(page.getByRole('heading', { name: 'Unsaved effects', exact: true })).toBeVisible()
  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toHaveCount(0)
  expect(await sentMidi(page)).toEqual([fakeMidiRequests.liveEffects])
})

test('the fake does not answer settings, live reads or malformed identity queries with an identity', async ({
  page,
}) => {
  await installFakeMidi(page, { firmware: 'mvave-v16' })
  await page.goto('about:blank')
  await page.clock.install()
  const replies = await page.evaluateHandle(async (requests) => {
    const access = await navigator.requestMIDIAccess({ sysex: true })
    const input = access.inputs.values().next().value
    const output = access.outputs.values().next().value
    if (!input || !output) throw new Error('The fake needs one input/output pair.')
    const received: number[][] = []
    input.onmidimessage = (event) => received.push(Array.from(event.data ?? []))
    output.send(requests.effectOrder)
    output.send(requests.liveEffects)
    output.send(requests.identity.slice(0, -1))
    return received
  }, fakeMidiRequests)
  await page.clock.runFor(1)

  expect(await replies.jsonValue()).toEqual([])
  await replies.dispose()
})

test('a live FX read ignores a valid reply from the nonselected input', async ({ page }) => {
  await openEffects(page, undefined, [{ id: 'second', portName: 'FM-1 B', firmware: 'mvave-v16' }])
  await freezeClock(page)
  await page.getByRole('button', { name: 'Read from FM1', exact: true }).click()
  await page.clock.runFor(1)
  await expect.poll(() => sentMidi(page, 'fm1')).toEqual([fakeMidiRequests.liveEffects])

  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')), 'second')
  await page.clock.runFor(100)

  await expect(page.getByRole('button', { name: 'Reading…', exact: true })).toBeVisible()
  expect(await rackValues(page)).toEqual(zeroRack)
  expect(await rackOrder(page)).toEqual(initialOrder)
  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toHaveCount(0)
  expect(await sentMidi(page, 'second')).toEqual([])

  await receiveMidi(page, Array.from(capturedReply('Read run A distinct')), 'fm1')
  await expect.poll(() => rackValues(page)).toEqual(sentRack('Read run A distinct'))
  await expect.poll(() => rackOrder(page)).toEqual(effectNames)
  await expect(page.getByText('Read the effects from the FM1.', { exact: true })).toBeVisible()
  await page.clock.fastForward(6000)
  expect(await sentMidi(page, 'fm1')).toEqual([fakeMidiRequests.liveEffects])
  expect(await sentMidi(page, 'second')).toEqual([])
})

test('an old FX recall Undo cannot send to either output after selecting a different device', async ({
  page,
}) => {
  await openEffects(page, undefined, [
    {
      id: 'second',
      portName: 'FM-1 B',
      firmware: 'mvave-v16',
      settingsReply: Array.from(makeSettingsBlockReply(makeSettingsBlock())),
    },
  ])
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'FX preset actions' }).click()
  await page.getByRole('menuitem', { name: 'Import…', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'route-rack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'fm1-fx-presets',
        version: 1,
        presets: [
          {
            name: 'Route rack',
            effects: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          },
        ],
      }),
    ),
  })
  await expect(page.getByRole('button', { name: 'Route rack', exact: true })).toBeVisible()
  await freezeClock(page)
  await page.getByRole('button', { name: 'Route rack', exact: true }).click()
  await page.clock.runFor(1000)
  await expect
    .poll(async () => (await sentMidi(page, 'fm1')).filter(([status]) => status === 0xb1).length)
    .toBe(24)
  expect(await sentMidi(page, 'fm1')).toContainEqual([0xb1, 70, 1])
  const undo = page
    .getByRole('status')
    .filter({ hasText: 'Loaded “Route rack”.' })
    .getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeVisible()
  await clearSentMidi(page)

  await page.getByLabel('Settings', { exact: true }).locator('visible=true').first().click()
  await page.getByRole('combobox', { name: 'Output', exact: true }).selectOption('second-output')
  await expect(page.getByRole('combobox', { name: 'Input monitor', exact: true })).toHaveValue(
    'second-input',
  )
  await page.getByLabel('Settings', { exact: true }).locator('visible=true').first().click()
  await page.clock.runFor(1)
  await page.getByRole('button', { name: 'Effects', exact: true }).click()
  await page.clock.runFor(1)
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(6)
  expect(await sentMidi(page, 'fm1')).toEqual([])
  expect(await sentMidi(page, 'second')).toEqual([
    fakeMidiRequests.identity,
    fakeMidiRequests.effectOrder,
  ])
  await clearSentMidi(page)

  await undo.click()
  await page.clock.runFor(6000)

  expect(await sentMidi(page, 'fm1')).toEqual([])
  expect(await sentMidi(page, 'second')).toEqual([])
  await expect(page.getByRole('switch', { name: 'Filter', exact: true })).toBeChecked()
  await expect(page.getByRole('heading', { name: 'Route rack', exact: true })).toBeVisible()
})
