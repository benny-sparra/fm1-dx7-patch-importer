import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.addInitScript(() => localStorage.setItem('fm1-librarian-help-seen', 'true'))
  await page.goto('/')
  await openFirstPatch(page)
}

async function openFirstPatch(page: Page) {
  await page
    .getByRole('button', { name: /^Send .+ to FM1$/ })
    .first()
    .dblclick()
  await expect(page.getByRole('button', { name: 'Back to patch banks' })).toBeVisible()
}

/** The column header that opens an operator, named "Operator N, Carrier" or "…, Modulator". */
function operatorButton(page: Page, operator: number) {
  return page.getByRole('button', { name: new RegExp(`^Operator ${operator}, `) })
}

/** Moves a range one step, towards zero unless it is already there, and returns the new value. */
async function nudge(page: Page, name: string) {
  const range = page.getByRole('slider', { name })
  const value = Number(await range.inputValue())
  await range.press(value > 0 ? 'ArrowLeft' : 'ArrowRight')
  return String(value > 0 ? value - 1 : value + 1)
}

test.describe('operator rack', () => {
  test('keeps exactly one operator column open', async ({ page }) => {
    await openEditor(page)
    await expect(operatorButton(page, 1)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('region', { name: /^Operator 1, / })).toBeVisible()

    await operatorButton(page, 3).click()

    await expect(operatorButton(page, 3)).toHaveAttribute('aria-expanded', 'true')
    await expect(operatorButton(page, 1)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('region', { name: /^Operator \d, / })).toHaveCount(1)
    await expect(page.getByRole('region', { name: /^Operator 3, / })).toBeVisible()
  })

  test('trims and silences a collapsed operator without opening it', async ({ page }) => {
    await openEditor(page)

    const edited = await nudge(page, 'Operator 2 output level')
    await expect(page.getByRole('slider', { name: 'Operator 2 output level' })).toHaveValue(edited)

    await page.getByRole('button', { name: 'Mute operator 2 for audition' }).click()
    await expect(
      page.getByRole('button', { name: 'Unmute operator 2 for audition' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await expect(operatorButton(page, 2)).toHaveAttribute('aria-expanded', 'false')
    await expect(operatorButton(page, 1)).toHaveAttribute('aria-expanded', 'true')
  })

  test('sets all six columns side by side at xl', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 })
    await openEditor(page)

    const tops = await page
      .locator('.operator-column')
      .evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().top))

    expect(tops).toHaveLength(6)
    for (const top of tops) expect(Math.abs(top - tops[0])).toBeLessThanOrEqual(1)
  })

  test('leads the rack with the open column on a full-width row below xl', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1024 })
    await openEditor(page)

    const rack = await page.getByRole('group', { name: 'Operators' }).boundingBox()
    const open = await page.locator('.operator-column[data-selected="true"]').boundingBox()
    const collapsedTop = await page
      .locator('.operator-column[data-selected="false"]')
      .evaluateAll((columns) =>
        Math.min(...columns.map((column) => column.getBoundingClientRect().top)),
      )

    expect(rack).not.toBeNull()
    expect(open).not.toBeNull()
    expect(open!.y + open!.height).toBeLessThanOrEqual(collapsedTop)
    expect(open!.width).toBeGreaterThan(rack!.width * 0.9)
  })
})

test.describe('rack panel title strip', () => {
  // The collapse toggle's hit area is a CSS overlay across the strip, which
  // only a real browser lays out, so these clicks land by position.
  test('folds the panel from anywhere on its title', async ({ page }) => {
    await openEditor(page)
    const title = await page.locator('#operators-heading').boundingBox()
    expect(title).not.toBeNull()

    await page.mouse.click(title!.x + title!.width / 2, title!.y + title!.height / 2)

    await expect(page.getByRole('button', { name: 'Expand Operators' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  test('opens the title help without folding the panel', async ({ page }) => {
    await openEditor(page)
    const help = await page.getByRole('button', { name: 'Help: FM operators' }).boundingBox()
    expect(help).not.toBeNull()

    // Hover opens the help, so reaching it proves the button sits above the
    // overlay; a click then toggles it, so the fold state is what to check.
    await page.mouse.move(help!.x + help!.width / 2, help!.y + help!.height / 2)
    await expect(page.getByRole('note')).toBeVisible()
    await page.mouse.down()
    await page.mouse.up()

    await expect(page.getByRole('button', { name: 'Minimise Operators' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})

test.describe('algorithm picker', () => {
  test('chooses an algorithm and closes', async ({ page }) => {
    await openEditor(page)

    const trigger = page.getByLabel(/^Algorithm \d+\. Choose algorithm$/)
    const current = Number((await trigger.getAttribute('aria-label'))?.match(/\d+/)?.[0])
    const target = current === 5 ? 6 : 5

    await trigger.click()
    const picker = page.getByRole('radiogroup', { name: 'DX7 algorithm' })
    await expect(picker).toBeVisible()
    await expect(
      picker.getByRole('radio', { exact: true, name: `Algorithm ${current}` }),
    ).toHaveAttribute('aria-checked', 'true')

    await picker.getByRole('radio', { exact: true, name: `Algorithm ${target}` }).click()

    await expect(picker).toBeHidden()
    await expect(page.getByLabel(`Algorithm ${target}. Choose algorithm`)).toBeVisible()
  })

  test('keeps the open picker inside a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 412 })
    await openEditor(page)

    await page.getByLabel(/^Algorithm \d+\. Choose algorithm$/).click()
    const picker = page.getByRole('radiogroup', { name: 'DX7 algorithm' })
    await expect(picker).toBeVisible()

    const box = await picker.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(412)
  })
})

test('asks before leaving unsaved changes, then keeps, discards or saves them', async ({
  page,
}) => {
  await openEditor(page)
  const output = page.getByRole('slider', { name: 'Operator 1 output level' })
  const saved = await output.inputValue()
  const back = page.getByRole('button', { name: 'Back to patch banks' })
  const dialog = page.getByRole('dialog', { name: 'Unsaved patch changes' })
  const library = page.getByRole('heading', { name: 'Patch banks' })

  const edited = await nudge(page, 'Operator 1 output level')
  await back.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep editing' }).click()
  await expect(dialog).toBeHidden()
  await expect(output).toHaveValue(edited)

  await back.click()
  await dialog.getByRole('button', { name: 'Discard changes' }).click()
  await expect(library).toBeVisible()
  await openFirstPatch(page)
  await expect(output).toHaveValue(saved)

  await nudge(page, 'Operator 1 output level')
  await back.click()
  await dialog.getByRole('button', { name: 'Save and return' }).click()
  await expect(library).toBeVisible()
  await openFirstPatch(page)
  await expect(output).toHaveValue(edited)
})
