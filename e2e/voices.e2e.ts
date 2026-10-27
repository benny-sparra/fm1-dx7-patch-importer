import { expect, test, type Page } from '@playwright/test'

import { installFakeMidi, sentMidi } from './fake-midi'

// V16's Voice strip, as a returning visitor left it, with the help already seen.
async function openWithVoices(page: Page) {
  await installFakeMidi(page, { firmware: 'mvave-v16' })
  await page.addInitScript(() => {
    localStorage.setItem('fm1-librarian-help-seen', 'true')
    localStorage.setItem(
      'fm1-voice-setup',
      JSON.stringify({
        enabled: true,
        version: 2,
        voices: Array.from({ length: 8 }, (_, index) => ({
          channel: index + 1,
          on: true,
          preset: index === 0 ? 0 : null,
        })),
      }),
    )
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeVisible()
  await page.getByText('MIDI offline', { exact: true }).locator('visible=true').first().click()
  const strip = page.getByRole('group', { name: 'Voices 1–8' })
  await expect(strip).toBeVisible()
  return strip
}

for (const width of [320, 375]) {
  test(`shows the eight Voices, each with its switch, in view at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ height: 812, width })
    const strip = await openWithVoices(page)
    const voices = strip.getByRole('button', { name: /^Voice \d/ })

    await expect(voices).toHaveCount(8)
    for (let index = 0; index < 8; index += 1) {
      const voice = voices.nth(index)
      await expect(voice).toBeInViewport()
      // The whole label shows, not cut short by its neighbour the switch.
      expect(await voice.innerText()).toBe(`Voice ${index + 1}`)
      expect(await voice.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      const box = await voice.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(24)
      expect(box?.height).toBeGreaterThanOrEqual(24)
      const toggle = page.getByRole('switch', { name: `Voice ${index + 1} on` })
      await expect(toggle).toBeInViewport()
      const toggleBox = await toggle.boundingBox()
      expect(toggleBox?.width).toBeGreaterThanOrEqual(24)
      expect(toggleBox?.height).toBeGreaterThanOrEqual(24)
    }
    // The patch a Voice plays is in its tooltip.
    await expect(voices.first()).toHaveAttribute('title', /^Voice 1, Ch 1: A01 \S/)
    await expect(strip.getByRole('button', { name: 'Effects' })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Voice actions' })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'MIDI panic' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })
}

test('aims at a Voice and gives it a slot’s preset with one Program Change on its channel', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  const strip = await openWithVoices(page)
  // Wait for the FM1 to be identified, which is what offers the strip.
  await expect(strip.getByRole('button', { name: /^Voice 1,/, pressed: true })).toBeVisible()

  await strip.getByRole('button', { name: /^Voice 3,/ }).click()
  const before = (await sentMidi(page)).length
  await page.getByRole('button', { name: /^Send A02 .+ to FM1$/ }).click()

  await expect(strip.getByRole('button', { name: /^Voice 3, Ch 3: A02 / })).toBeVisible()
  const programChanges = (await sentMidi(page))
    .slice(before)
    .filter(([status]) => (status & 0xf0) === 0xc0)
  expect(programChanges).toEqual([[0xc2, 1]])
  await expect(page.getByRole('button', { name: /^Send A02 .+ to FM1$/ })).toHaveAttribute(
    'title',
    /Played by Voice 3/,
  )
})

test('sends the setup as one Program Change per Voice with a patch', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  const strip = await openWithVoices(page)
  await expect(strip.getByRole('button', { name: /^Voice 1,/, pressed: true })).toBeVisible()
  await strip.getByRole('button', { name: /^Voice 4,/ }).click()
  await page.getByRole('button', { name: /^Send A05 .+ to FM1$/ }).click()
  const before = (await sentMidi(page)).length

  await page.getByRole('button', { name: 'Voice actions' }).click()
  await page.getByRole('menuitem', { name: 'Recall Voices' }).click()

  await expect(page.getByText('Recalled Voice 1 and Voice 4')).toBeVisible()
  const programChanges = (await sentMidi(page))
    .slice(before)
    .filter(([status]) => (status & 0xf0) === 0xc0)
  expect(programChanges).toEqual([
    [0xc0, 0],
    [0xc3, 4],
  ])
})

test('opens the Effects tab without sending, sends only the controller an edit changed, and recalls all 24', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  const strip = await openWithVoices(page)
  await expect(strip.getByRole('button', { name: /^Voice 1,/, pressed: true })).toBeVisible()
  const controllerChanges = async (from: number) =>
    (await sentMidi(page)).slice(from).filter(([status]) => (status & 0xf0) === 0xb0)

  const beforeOpen = (await sentMidi(page)).length
  await strip.getByRole('button', { name: 'Effects' }).click()
  await expect(page.getByRole('heading', { name: 'Effects' })).toBeVisible()
  await expect(strip.getByRole('button', { name: 'Effects', pressed: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Patch banks' })).toBeHidden()
  expect(await controllerChanges(beforeOpen)).toEqual([])

  // The switch's input is visually hidden; checking it clicks its label, the effect's name.
  const beforeEdit = (await sentMidi(page)).length
  await page.getByRole('switch', { name: 'Reverb' }).check({ force: true })
  // Reverb's switch is effect controller 4, which V16 takes as CC 74 on the effect channel (2).
  await expect.poll(() => controllerChanges(beforeEdit)).toEqual([[0xb1, 74, 1]])

  const beforeRecall = (await sentMidi(page)).length
  await page.getByRole('button', { name: 'Voice actions' }).click()
  await page.getByRole('menuitem', { name: 'Recall voices' }).click()
  await expect.poll(async () => (await controllerChanges(beforeRecall)).length).toBe(24)
  const recalled = await controllerChanges(beforeRecall)
  expect(recalled.map(([, controller]) => controller)).toEqual(
    Array.from({ length: 24 }, (_, index) => 70 + index),
  )
  expect(recalled[4]).toEqual([0xb1, 74, 1])

  // The tab survives a reload: what was set is what the panel shows, with nothing sent.
  // MIDI stays connected across a reload, so the strip comes back without a click.
  await page.reload()
  await page
    .getByRole('group', { name: 'Voices 1–8' })
    .getByRole('button', { name: 'Effects' })
    .click()
  await expect(page.getByRole('switch', { name: 'Reverb' })).toBeChecked()
})

for (const width of [992, 1280]) {
  test(`fits the eight Voices and the Effects tab in one row, labels whole, at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width })
    const strip = await openWithVoices(page)
    const tabs = strip.getByRole('button', { name: /^(Voice \d|Effects)/ })
    await expect(tabs).toHaveCount(9)

    const tops = new Set<number>()
    for (let index = 0; index < 9; index += 1) {
      const tab = tabs.nth(index)
      await expect(tab).toBeInViewport()
      // The text's own width, since a centred label that overflows leaves scrollWidth unchanged.
      expect(
        await tab.evaluate((el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          const style = getComputedStyle(el)
          const room =
            el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
          return range.getBoundingClientRect().width <= room + 0.5
        }),
      ).toBe(true)
      tops.add(Math.round((await tab.boundingBox())?.y ?? -1))
    }
    // The lit tab stands a few pixels taller than the rest, so the row's tops differ by that much.
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8)
    await expect(page.getByRole('button', { name: 'Voice actions' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })
}
