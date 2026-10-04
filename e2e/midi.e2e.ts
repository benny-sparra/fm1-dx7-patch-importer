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

  test('selects the FM1 program for a slot in a factory bank, then sends its voice and effects once', async ({
    page,
  }) => {
    // Until the FM1 names its firmware, a patch goes as parameter changes rather than a dump.
    await expect(
      page.getByText('Patches you play go to the FM1’s edit buffer.').first(),
    ).toBeAttached()
    const slot = slotButtons(page).nth(2)

    await slot.click()
    await expect.poll(() => sentMidi(page)).toContainEqual([0xc0, 2])
    await expect.poll(async () => (await sentSysex(page)).length).toBe(1)
    // The effect settings follow on the FX channel (2) as Control Changes.
    await expect
      .poll(async () => (await sentMidi(page)).filter(([status]) => status === 0xb1).length)
      .toBe(24)
    await slot.click()

    const messages = await sentMidi(page)
    const programAt = messages.findIndex(([status]) => status === 0xc0)
    const dumpAt = messages.findIndex((message) => message.length === singleVoiceDumpLength)
    const firstEffectAt = messages.findIndex(([status]) => status === 0xb1)
    expect(programAt).toBeLessThan(dumpAt)
    expect(dumpAt).toBeLessThan(firstEffectAt)
    // A repeated click finds the same sound in the edit buffer, so nothing more is sent.
    await expect.poll(async () => (await sentMidi(page)).length).toBe(messages.length)
    expect(messages.filter(([status]) => status === 0xc0)).toHaveLength(1)
  })

  test('sends a slot in an added bank to the FM1 edit buffer once, however often it is clicked', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add new bank…' }).locator('visible=true').click()
    const addBank = page.getByRole('dialog', { name: /^Add bank/ })
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
      page.getByText('“Bank 1” was sent. Choose its destination on the FM1.'),
    ).toBeVisible()
    const dumps = await sentSysex(page)
    expect(dumps.map((dump) => dump.length)).toEqual([bankDumpLength])
    expect(dumps[0].slice(0, 6)).toEqual([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00])
  })

  test('sends Favourites as a bank, with INIT VOICE in the slots after it', async ({ page }) => {
    const heart = page.getByRole('button', { name: /^Favourite / }).first()
    const name = (await heart.getAttribute('aria-label'))?.replace(/^Favourite /, '') ?? ''
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { exact: true, name: 'Favourites' }).click()

    await page.getByRole('button', { exact: true, name: 'Send to FM1' }).first().click()
    const instructions = page.getByRole('dialog', {
      name: 'Choose the destination bank on your FM1',
    })
    await expect(
      instructions.getByText(
        'A bank holds 32 patches, so sending Favourites fills the last 31 slots with INIT VOICE.',
      ),
    ).toBeVisible()
    await instructions.getByRole('button', { name: 'Send to FM1' }).click()

    await expect(
      page.getByText(
        'Favourites was sent, with INIT VOICE in the last 31 slots. Choose its destination on the FM1.',
      ),
    ).toBeVisible()
    const [dump] = await sentSysex(page)
    expect(dump).toHaveLength(bankDumpLength)
    // Each packed voice is 128 bytes after the six-byte header, with its name in the last ten.
    const voiceName = (slot: number) =>
      String.fromCharCode(...dump.slice(6 + slot * 128 + 118, 6 + slot * 128 + 128)).trimEnd()
    expect(voiceName(0)).toBe(name.trimEnd())
    expect(voiceName(1)).toBe('INIT VOICE')
    expect(voiceName(31)).toBe('INIT VOICE')
  })

  test('sends each voice edit to the FM1 as a parameter change', async ({ page }) => {
    // Opened from the slot's menu, since a double-click's first click also plays the slot.
    const label = (await slotButtons(page).first().getAttribute('aria-label')) ?? ''
    const name = label.replace(/^Send (.+) to FM1$/, '$1')
    await page
      .getByRole('button', { exact: true, name: `Actions for ${name}` })
      .first()
      .click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
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

  test('names the M-VAVE firmware and its release beside MIDI online', async ({ page }) => {
    const badge = page.getByTitle(/^The FM1 runs M-VAVE’s own firmware, V15\./)

    await expect(badge).toBeVisible()
    await expect(badge.getByText('M-VAVE firmware, V15')).toBeAttached()
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

  test('plays a patch from a bank file before importing it, leaving the bank unchanged', async ({
    page,
  }) => {
    const slotsBefore = await slotButtons(page).allTextContents()
    await page.getByLabel('Actions for Bank 1').locator('visible=true').click()
    await page.getByRole('button', { exact: true, name: 'Import DX7 bank…' }).click()
    const dialog = page.getByRole('dialog', { name: 'Import over “Bank 1”?' })
    await dialog.getByLabel('Patch data').setInputFiles('public/dx7-banks/factory/rom1a.syx')

    await dialog.getByRole('button', { name: /^Play .+, patch 5$/ }).click()

    await expect
      .poll(async () => (await sentSysex(page)).at(-1)?.length)
      .toBe(singleVoiceDumpLength)
    await dialog.getByRole('button', { name: 'Close' }).click()
    expect(await slotButtons(page).allTextContents()).toEqual(slotsBefore)
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

  test('plays an audition phrase at the level chosen in the keyboard header', async ({ page }) => {
    await page.getByRole('button', { name: 'Keyboard' }).first().click()
    const keyboard = page.getByRole('dialog', { name: 'Piano keyboard' })
    await expect(keyboard).toBeVisible()

    await keyboard.getByRole('slider', { name: 'Level' }).fill('48')
    await keyboard.getByRole('button', { name: 'Play the phrase' }).click()

    // The arpeggio's C3 and G3 are written at 96 and 92, so half the default level halves them.
    await expect.poll(() => sentMidi(page)).toContainEqual([0x90, 48, 48])
    await expect.poll(() => sentMidi(page)).toContainEqual([0x90, 55, 46])
    await keyboard.getByRole('button', { name: 'Stop the phrase' }).click()
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

// macOS names the FM1's ports USB Composite Device, which once showed as "USB Composite Dev", cut
// off without an ellipsis, beside another select in a two-column Settings panel.
for (const width of [1280, 768, 360]) {
  test(`shows the FM1's full macOS port name in Settings at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width })
    await installFakeMidi(page, { portName: 'USB Composite Device' })
    await openLibrarian(page)
    await switchMidiOn(page)

    await page.getByLabel('Settings', { exact: true }).locator('visible=true').first().click()
    for (const name of ['Output', 'Input monitor']) {
      const select = page.getByRole('combobox', { name })
      await expect(select).toHaveAttribute('title', 'USB Composite Device')
      const room = await select.evaluate((element) => {
        const style = getComputedStyle(element)
        const context = document.createElement('canvas').getContext('2d')!
        context.font = style.font
        const available =
          element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        return available - context.measureText('USB Composite Device').width
      })
      expect(room, `${name} has room for the whole name`).toBeGreaterThanOrEqual(0)
    }
  })
}

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

test('selects the FM1 program for a factory slot with its effects alone when SysEx access was declined', async ({
  page,
}) => {
  await installFakeMidi(page, { sysex: false })
  await openLibrarian(page)
  await switchMidiOn(page)

  await slotButtons(page).nth(2).click()

  await expect.poll(() => sentMidi(page)).toContainEqual([0xc0, 2])
  await expect
    .poll(async () => (await sentMidi(page)).filter(([status]) => status === 0xb1).length)
    .toBe(24)
  expect(await sentSysex(page)).toEqual([])
})

test.describe('with an FM-1 on FM-1+VA firmware', () => {
  test.beforeEach(async ({ page }) => {
    await installFakeMidi(page, { firmware: 'fm1-va' })
    await openLibrarian(page)
    await switchMidiOn(page)
  })

  test('sends a slot in an added bank as parameter changes, never as a single-voice dump', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add new bank…' }).locator('visible=true').click()
    const addBank = page.getByRole('dialog', { name: /^Add bank/ })
    await addBank.getByRole('combobox', { name: 'DX7 catalog bank' }).selectOption('rom1a')
    await addBank.getByRole('button', { name: 'Create bank' }).click()
    await expect(addBank).toBeHidden()

    await slotButtons(page).first().click()

    // FM-1+VA stores a single-voice dump over the selected preset, so the patch arrives as its 155
    // parameter changes, F0 43 10 pp qq vv F7, which it holds as an unsaved edit.
    await expect.poll(async () => (await sentSysex(page)).length, { timeout: 15_000 }).toBe(155)
    const messages = await sentSysex(page)
    expect(messages.every((message) => message.length === 7 && message[2] === 0x10)).toBe(true)
    expect(messages.some((message) => message.length === singleVoiceDumpLength)).toBe(false)
  })

  test('selects the FM1 program for a factory slot, then sends its voice as parameter changes', async ({
    page,
  }) => {
    await expect(page.getByTitle(/^The FM1 runs Baud Girl’s firmware \(FM-1\+VA\)/)).toBeVisible()

    await slotButtons(page).nth(2).click()

    await expect.poll(async () => (await sentSysex(page)).length, { timeout: 15_000 }).toBe(155)
    const messages = await sentMidi(page)
    const programAt = messages.findIndex(([status]) => status === 0xc0)
    const firstParameterAt = messages.findIndex(
      ([status, manufacturer, subStatus]) =>
        status === 0xf0 && manufacturer === 0x43 && subStatus === 0x10,
    )
    expect(messages[programAt]).toEqual([0xc0, 2])
    expect(programAt).toBeLessThan(firstParameterAt)
    expect(messages.some((message) => message.length === singleVoiceDumpLength)).toBe(false)
  })

  test('shows the Baud Girl badge in the header once the FM1 names its firmware', async ({
    page,
  }) => {
    const badge = page.getByTitle(/^The FM1 runs Baud Girl’s firmware \(FM-1\+VA\), FM-1_089\./)

    await expect(badge).toBeVisible()
    await expect(badge.getByRole('img')).toHaveCount(0)
    await expect(badge.getByText('Baud Girl firmware, FM-1_089')).toBeAttached()
  })

  test('shows FM-1+VA on the screen of the FM1 photo in the chosen finish', async ({ page }) => {
    // The other finishes slide out from the lit swatch while the picker has focus.
    await page.getByRole('radio', { name: 'Black FM1 finish' }).focus()
    await page.getByTitle('Orange', { exact: true }).click()

    const photo = page.getByRole('img', { name: 'M-VAVE FM1 synthesiser front panel' })
    await expect(photo).toHaveAttribute('src', /fm1-va-orange-/)
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete)).toBe(true)
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  })

  test('sends a bank by writing its presets, with no Replace Bank question', async ({ page }) => {
    await page.getByRole('button', { exact: true, name: 'Send to FM1' }).first().click()

    // FM-1_089 has the preset write, so the bank is written preset by preset over an FM1 bank
    // chosen in the app, rather than sent as a DX7 bank for the FM1 to ask where it goes.
    await expect(page.getByRole('dialog', { name: 'Send Bank 1 to the FM1' })).toBeVisible()
    await expect(
      page.getByRole('dialog', { name: 'Choose the destination bank on your FM1' }),
    ).toHaveCount(0)
    expect((await sentSysex(page)).some((message) => message.length === bankDumpLength)).toBe(false)
  })
})
