import { expect, test, type Page, type TestInfo } from '@playwright/test'

import de from '../src/i18n/locales/de'
import en from '../src/i18n/locales/en-GB'
import enHelp from '../src/i18n/locales/en-GB-help'
import es from '../src/i18n/locales/es'
import fr from '../src/i18n/locales/fr'
import ptBR from '../src/i18n/locales/pt-BR'
import uk from '../src/i18n/locales/uk'
import zhHans from '../src/i18n/locales/zh-Hans'

type Translations = { [key: string]: string | Translations }

const locales: Record<string, Translations> = {
  de: de as Translations,
  // The guide's English loads with its chunk, so it is kept apart from the page's.
  en: { ...en, help: { ...en.help, ...enHelp.help } } as Translations,
  es: es as Translations,
  fr: fr as Translations,
  'pt-BR': ptBR as Translations,
  uk: uk as Translations,
  'zh-Hans': zhHans as Translations,
}

// English is included as the baseline the translated layouts are measured against.
const testedLocales = Object.keys(locales)

const viewports = [
  { height: 900, name: 'desktop', width: 1280 },
  { height: 900, name: 'mobile', width: 412 },
] as const

function translate(locale: string, key: string) {
  const lookup = (source: Translations) =>
    key.split('.').reduce<string | Translations | undefined>((value, segment) => {
      if (typeof value !== 'object') return undefined
      return value[segment]
    }, source)

  const translation = lookup(locales[locale]) ?? lookup(locales.en)
  if (typeof translation !== 'string') throw new Error(`Missing translation for ${key}.`)
  return translation
}

/** Builds a name matcher from a translation containing interpolated values, such as the slot and name. */
function interpolatedPattern(locale: string, key: string) {
  const escape = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  const pattern = translate(locale, key)
    .split(/\{\{\w+\}\}/)
    .map(escape)
    .join('.+')
  return new RegExp(`^${pattern}$`)
}

type Overflow = {
  clientHeight: number
  clientWidth: number
  label: string
  scrollHeight: number
  scrollWidth: number
}

/**
 * Reports visible elements whose own text is clipped by a hidden overflow, which is how longer
 * translations fail: the box keeps its English size and the extra characters disappear.
 */
async function clippedText(page: Page) {
  return page.evaluate<Overflow[]>(() => {
    const tolerance = 1
    const clipped: Overflow[] = []

    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const text = element.textContent?.trim()
      if (!text) continue

      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.opacity === '0') continue

      // Screen-reader-only text is clipped to a 1px box on purpose.
      const rect = element.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) continue

      const hidesX = style.overflowX === 'hidden' || style.overflowX === 'clip'
      const hidesY = style.overflowY === 'hidden' || style.overflowY === 'clip'
      const truncatesOnPurpose =
        style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none'

      const overflowsX = hidesX && element.scrollWidth - element.clientWidth > tolerance
      const overflowsY = hidesY && element.scrollHeight - element.clientHeight > tolerance
      if (truncatesOnPurpose || (!overflowsX && !overflowsY)) continue

      const classes = String(element.className).trim().split(/\s+/).filter(Boolean).join('.')
      clipped.push({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        label: `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''} — “${text.slice(0, 60)}”`,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
      })
    }

    return clipped
  })
}

async function horizontalPageOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const overflow = root.scrollWidth - root.clientWidth
    if (overflow <= 1) return null

    const culprits = [...document.body.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
      .filter((element) => getComputedStyle(element).visibility !== 'hidden')
      .slice(0, 5)
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}: ${element.textContent?.trim().slice(0, 60)}`,
      )

    return { culprits, overflow }
  })
}

async function expectNoClippedLayout(page: Page, testInfo: TestInfo, view: string) {
  const sideways = await horizontalPageOverflow(page)
  const clipped = await clippedText(page)
  if (sideways || clipped.length > 0)
    await testInfo.attach(`${view}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

  expect(sideways, `${view} scrolls sideways`).toBeNull()
  expect(clipped, `${view} clips translated text`).toEqual([])
}

// A first visit meets the welcome, which opens itself over the librarian.
async function openLibrarian(page: Page, locale: string, { firstVisit = false } = {}) {
  await page.addInitScript(
    ({ language, showWelcome }: { language: string; showWelcome: boolean }) => {
      localStorage.setItem('fm1-language', language)
      if (!showWelcome) localStorage.setItem('fm1-librarian-help-seen', 'true')
    },
    { language: locale, showWelcome: firstVisit },
  )
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 2, name: translate(locale, 'banks.gridTitle') }).first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByRole('button', { name: interpolatedPattern(locale, 'banks.sendPatch') }).first(),
  ).toBeVisible({ timeout: 15_000 })
}

for (const locale of testedLocales) {
  for (const viewport of viewports) {
    test(`fits ${locale} text in the librarian on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale)

      await expectNoClippedLayout(page, testInfo, `librarian-${locale}-${viewport.name}`)
    })

    test(`fits ${locale} text in the settings menu on ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale)

      await page.getByLabel(translate(locale, 'common.settings'), { exact: true }).click()
      await expect(page.getByText(translate(locale, 'settings.description'))).toBeVisible()

      await expectNoClippedLayout(page, testInfo, `settings-${locale}-${viewport.name}`)
    })

    // A slot that moves between the two clicks of a double click never opens.
    test(`keeps the ${locale} slot grid still when a slot lights on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale)

      const slot = page
        .getByRole('button', { name: interpolatedPattern(locale, 'banks.sendPatch') })
        .first()
      const before = await slot.boundingBox()
      await slot.click()
      await expect(slot).toHaveAttribute('aria-current', 'true')
      await expect(slot.locator('xpath=..')).toHaveAttribute('data-flash', 'false')

      expect(await slot.boundingBox()).toEqual(before)
    })

    test(`fits ${locale} text in the editor on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale)

      await page
        .getByRole('button', { name: interpolatedPattern(locale, 'banks.sendPatch') })
        .first()
        .dblclick()
      await expect(
        page.getByRole('button', { name: translate(locale, 'editor.back') }),
      ).toBeVisible()

      await expectNoClippedLayout(page, testInfo, `editor-${locale}-${viewport.name}`)
    })

    test(`fits ${locale} text in the welcome on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale, { firstVisit: true })

      // The welcome arrives with its own chunk, so wait for it rather than look once.
      const dialog = page.getByRole('dialog', { name: translate(locale, 'help.title') })
      await expect(dialog).toBeVisible()

      await expectNoClippedLayout(page, testInfo, `welcome-${locale}-${viewport.name}`)
    })

    test(`fits ${locale} text in the guide on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      await openLibrarian(page, locale)

      await page.getByRole('button', { name: translate(locale, 'help.open') }).click()
      const dialog = page.getByRole('dialog', { name: translate(locale, 'help.guideTitle') })
      await expect(dialog).toBeVisible()

      await expectNoClippedLayout(page, testInfo, `help-${locale}-${viewport.name}`)
    })
  }
}

// WCAG 1.4.10 asks for the page to reflow at 320 px without sideways scrolling or lost text. A
// translated dialog title is longest there, and used to end in an ellipsis.
for (const locale of ['de', 'uk']) {
  test(`reflows the ${locale} librarian at 320 px and wraps its dialog titles in full`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ height: 700, width: 320 })
    await openLibrarian(page, locale)
    await expectNoClippedLayout(page, testInfo, `librarian-${locale}-320`)

    // The welcome's title is the longest a dialog has, so a first visit is the one to measure.
    await page.addInitScript(() => localStorage.removeItem('fm1-librarian-help-seen'))
    await page.reload()
    const dialog = page.getByRole('dialog', { name: translate(locale, 'help.title') })
    await expect(dialog).toBeVisible()
    const title = dialog.locator('h2').first()

    const cutShort = await title.evaluate(
      (heading) => heading.scrollWidth > heading.clientWidth + 1,
    )
    expect(cutShort, `the ${locale} help title is cut short`).toBe(false)
    expect(await horizontalPageOverflow(page)).toBeNull()
  })
}
