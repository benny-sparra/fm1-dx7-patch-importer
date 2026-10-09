import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Touch input sent through Chromium's DevTools protocol, so the page gets real touch events and the
 * pointer events a finger makes (`pointerType: 'touch'`), with the browser's own scrolling,
 * long-press, and double-tap handling. Playwright's `touchscreen` only taps.
 */
type Point = { x: number; y: number }

async function session(page: Page) {
  return page.context().newCDPSession(page)
}

export async function centre(locator: Locator): Promise<Point> {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('The control is not on screen.')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Puts one or more fingers down, moves them together by the offset in steps, and lifts them. */
export async function touchDrag(
  page: Page,
  from: Point | Point[],
  offset: Point,
  { holdMs = 0, steps = 10 }: { holdMs?: number; steps?: number } = {},
) {
  const cdp = await session(page)
  const starts = Array.isArray(from) ? from : [from]
  const at = (step: number) =>
    starts.map((start, id) => ({
      id,
      x: start.x + (offset.x * step) / steps,
      y: start.y + (offset.y * step) / steps,
    }))
  await cdp.send('Input.dispatchTouchEvent', { touchPoints: at(0), type: 'touchStart' })
  if (holdMs) await page.waitForTimeout(holdMs)
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { touchPoints: at(step), type: 'touchMove' })
  }
  await cdp.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' })
  await cdp.detach()
}

/** Puts fingers down and returns a function that lifts them, for checks while they are held. */
export async function touchHold(page: Page, points: Point[]) {
  const cdp = await session(page)
  const touchPoints = points.map((point, id) => ({ id, ...point }))
  await cdp.send('Input.dispatchTouchEvent', { touchPoints, type: 'touchStart' })
  return async () => {
    await cdp.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' })
    await cdp.detach()
  }
}

/** Two quick taps in one place, as a finger double-taps. */
export async function doubleTap(page: Page, locator: Locator) {
  const point = await centre(locator)
  await page.touchscreen.tap(point.x, point.y)
  await page.touchscreen.tap(point.x, point.y)
}

/** How far the element has moved on screen, whichever container scrolled it. */
export async function screenTop(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('The element is not on screen.')
  return box.y
}

export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(overflow.page, 'the page is wider than the screen').toBeLessThanOrEqual(overflow.viewport)
}

/** Every visible control smaller than the size, named so a failure lists what to fix. */
export async function controlsSmallerThan(page: Page, size: number) {
  return page
    .locator(
      'button, a[href], select, summary, [role="slider"], [role="switch"], input:not([type="hidden"])',
    )
    .evaluateAll(
      (controls, minimum) =>
        controls
          .filter((control) => {
            const { height, width } = control.getBoundingClientRect()
            if (width === 0 && height === 0) return false
            // A switch's checkbox sits under its drawn track and is reached through its label.
            if (control.matches('.sr-only, [class*="sr-only"]')) return false
            if (getComputedStyle(control).visibility === 'hidden') return false
            // WCAG 2.5.8 exempts a link set in a sentence, whose size the line of text decides.
            if (control.matches('p a')) return false
            return width < minimum || height < minimum
          })
          .map((control) => {
            const { height, width } = control.getBoundingClientRect()
            const name =
              control.getAttribute('aria-label') ??
              control.textContent?.trim().slice(0, 40) ??
              control.tagName
            return `${name} (${Math.round(width)}×${Math.round(height)})`
          }),
      size,
    )
}
