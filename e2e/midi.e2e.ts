import { expect, test, type Page } from '@playwright/test'

import { installFakeMidi, receiveMidi, sentMidi, sentSysex } from './fake-midi'

// A DX7 single-voice dump is F0 43 0n 00 01 1B, 155 voice bytes, a checksum and F7.
const singleVoiceDumpLength = 163
// A 32-voice bank dump is F0 43 0n 09 20 00, 4,096 packed voice bytes, a checksum and F7.
const bankDumpLength = 4104

async function openLibrarian(page: Page) {
  await page.goto('/')
  // A first visit always meets the guide, which arrives with its own chunk, so waiting for it
  // keeps it from opening over the first clicks of the journey.
  const helpDialog = page.getByRole('dialog', { name: 'Welcome to the FM1 editor & librarian' })
  await expect(helpDialog).toBeVisible()
  await helpDialog.getByRole('button', { name: 'Close help' }).click()
  await expect(helpDialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
}

async function switchMidiOn(page: Page) {
  // The switch's checkbox sits under its drawn track, so it is operated through its label.
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().click()
  await expect(
    page.getByRole('switch', { name: 'MIDI online' }).locator('visible=true').first(),
  ).toBeChecked()
}

function slotButtons(page: Page) {
  return page.getByRole('button', { name: /^Send .+ to FM1$/ })
}

test.describe('with an FM-1 connected', () => {
  test.beforeEach(async ({ page }) => {
    await installFakeMidi(page)
    await openLibrarian(page)
    await switchMidiOn(page)
  })

  test('selects the FM1 program for a slot in a factory bank, then its effects', async ({
    page,
  }) => {
    await slotButtons(page).nth(2).click()

    await expect.poll(() => sentMidi(page)).toContainEqual([0xc0, 2])
    const messages = await sentMidi(page)
    const programAt = messages.findIndex(([status]) => status === 0xc0)
    // The effect settings follow on the FX channel (2) as Control Changes.
    expect(messages.slice(programAt + 1).every(([status]) => status === 0xb1)).toBe(true)
    await expect.poll(async () => (await sentMidi(page)).length).toBeGreaterThan(programAt + 1)
  })

  test('sends a slot in an added bank to the FM1 edit buffer once, however often it is clicked', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add new bank' }).locator('visible=true').click()
    const addBank = page.getByRole('dialog', { name: /^Add workspace bank/ })
    await addBank.getByRole('combobox', { name: 'DX7 catalog bank' }).selectOption('rom1a')
    await addBank.getByRole('button', { name: 'Create bank' }).click()
    await expect(addBank).toBeHidden()
    const slot = slotButtons(page).first()

    await slot.click()
    await expect.poll(async () => (await sentSysex(page)).length).toBe(1)
    await slot.click()

    const [dump] = await sentSysex(page)
    expect(dump).toHaveLength(singleVoiceDumpLength)
    expect(dump.slice(0, 6)).toEqual([0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b])
    expect(dump.at(-1)).toBe(0xf7)
    // A repeated click finds the same sound in the edit buffer, so nothing more is sent.
    await expect.poll(async () => (await sentSysex(page)).length).toBe(1)
  })

  test('sends the selected bank as a 32-voice dump after the destination instructions', async ({
    page,
  }) => {
    await page.getByRole('button', { exact: true, name: 'Send to FM1' }).first().click()
    const instructions = page.getByRole('dialog', {
      name: 'Choose the destination bank on your FM1',
    })
    await instructions.getByRole('button', { name: 'Send to FM1' }).click()

    await expect(
      page.getByText('Browser bank Bank 1 was sent. Choose its destination on the FM1.').first(),
    ).toBeVisible()
    const dumps = await sentSysex(page)
    expect(dumps.map((dump) => dump.length)).toEqual([bankDumpLength])
    expect(dumps[0].slice(0, 6)).toEqual([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00])
  })

  test('sends each voice edit to the FM1 as a parameter change', async ({ page }) => {
    await slotButtons(page).first().dblclick()
    // The editor puts its voice in the FM1 edit buffer before it sends single edits, and holds the
    // way back until it has. An edit made before then resends the whole voice instead.
    await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeEnabled()
    expect((await sentSysex(page)).map((message) => message.length)).toEqual([
      singleVoiceDumpLength,
    ])

    const lfoSpeed = page.getByRole('slider', { name: 'LFO speed' })
    const speed = Number(await lfoSpeed.inputValue())
    await lfoSpeed.focus()
    await lfoSpeed.press('ArrowRight')

    // LFO speed is voice parameter 137: group bits 01, low bits 09.
    await expect
      .poll(() => sentSysex(page))
      .toContainEqual([0xf0, 0x43, 0x10, 0x01, 0x09, speed + 1, 0xf7])
  })

  test('shows notes played on the FM1 in the MIDI log', async ({ page }) => {
    await receiveMidi(page, [0x90, 60, 100])
    await receiveMidi(page, [0xf8])

    await page.getByRole('button', { name: 'MIDI log' }).first().click()

    const log = page.getByRole('dialog', { name: 'MIDI log' })
    await expect(log.getByText('Ch 1 Note On: C4 (velocity 100)')).toBeVisible()
  })

  test('sends a MIDI panic as a Note Off for every note on the note channel', async ({ page }) => {
    await page.getByRole('button', { name: 'MIDI panic' }).click()

    const noteOffs = () =>
      sentMidi(page).then((messages) =>
        messages.filter(([status]) => status === 0x80).map(([, note]) => note),
      )
    await expect.poll(noteOffs).toEqual(Array.from({ length: 128 }, (_, note) => note))
    await expect(
      page.getByText('MIDI panic sent. Every note on the note channel was released.'),
    ).toBeVisible()
  })

  test('moves the keyboard by its header without selecting the header text', async ({ page }) => {
    await page.getByRole('button', { name: 'Keyboard' }).first().click()
    const keyboard = page.getByRole('dialog', { name: 'Piano keyboard' })
    await expect(keyboard).toBeVisible()
    const title = keyboard.getByText('Keyboard', { exact: true })
    const start = await title.boundingBox()
    if (!start) throw new Error('The keyboard title has no position.')
    const before = await keyboard.boundingBox()

    await page.mouse.move(start.x + 4, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(start.x + 80, start.y + 60, { steps: 8 })
    await page.mouse.up()

    expect((await keyboard.boundingBox())?.y).not.toBe(before?.y)
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  })

  test('strikes the keyboard at the velocity chosen in its header', async ({ page }) => {
    await page.getByRole('button', { name: 'Keyboard' }).first().click()
    const keyboard = page.getByRole('dialog', { name: 'Piano keyboard' })
    await expect(keyboard).toBeVisible()

    await keyboard.getByRole('slider', { name: 'Level' }).fill('40')
    await keyboard.getByRole('button', { name: 'Close keyboard' }).focus()
    await page.keyboard.down('a')
    await page.keyboard.up('a')

    await expect.poll(() => sentMidi(page)).toContainEqual([0x90, 48, 40])
  })

  test('loops an audition phrase from the keyboard and silences it on stop', async ({ page }) => {
    await page.getByRole('button', { name: 'Keyboard' }).first().click()
    const keyboard = page.getByRole('dialog', { name: 'Piano keyboard' })
    await expect(keyboard).toBeVisible()

    await keyboard.getByRole('button', { name: 'Play the phrase' }).click()

    // The arpeggio opens on C3 at velocity 96, then G3 at 92.
    await expect.poll(() => sentMidi(page)).toContainEqual([0x90, 48, 96])
    await expect.poll(() => sentMidi(page)).toContainEqual([0x90, 55, 92])

    await keyboard.getByRole('button', { name: 'Stop the phrase' }).click()

    await expect.poll(() => sentMidi(page).then((messages) => messages.at(-1)?.[0])).toBe(0x80)
    const afterStop = (await sentMidi(page)).length
    await page.waitForTimeout(1500)
    expect((await sentMidi(page)).length).toBe(afterStop)
    await expect(keyboard.getByRole('button', { name: 'Play the phrase' })).toBeVisible()
  })
})

test('offers to reconnect instead of sending a bank when SysEx access was declined', async ({
  page,
}) => {
  await installFakeMidi(page, { sysex: false })
  await openLibrarian(page)
  await switchMidiOn(page)

  await page.getByRole('button', { exact: true, name: 'Send to FM1' }).first().click()

  await expect(page.getByRole('button', { name: 'Reconnect MIDI with SysEx' })).toBeVisible()
  expect(await sentSysex(page)).toEqual([])
})
