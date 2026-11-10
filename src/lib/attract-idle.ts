/*
  Decides when attract mode starts: once nobody has touched the page for `attractIdleMs`, and only
  while nothing is under way that the screen should show. It loads attract mode's chunk only then,
  so a visit that never sits idle never downloads it.
*/

import type { AttractI18n, startAttractMode } from './attract-mode'
import { readAttractModeEnabled } from './attract-setting'

type AttractModule = { startAttractMode: typeof startAttractMode }

/** How long the page sits untouched before attract mode starts. */
export const attractIdleMs = 3 * 60 * 1000

const activity = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart', 'scroll']

/**
 * Whether the page needs its screen: the tab is hidden, its window is not the one in use (the page
 * beside a DAW, say, where moving the mouse never reaches it), a dialog is open (every transfer, import,
 * and confirmation runs in one), the library is saving (`data-saving`, set by `usePatchLibrary`),
 * or a MIDI activity LED is lit, as it is while a patch goes out or the FM1 is played.
 */
export function isPageBusy(page: Document = document) {
  return (
    page.hidden ||
    !page.hasFocus() ||
    page.querySelector('dialog[open]') !== null ||
    page.documentElement.hasAttribute('data-saving') ||
    page.querySelector('.midi-activity-led[data-lit]') !== null
  )
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Watches the page for idleness and starts attract mode when it comes, then waits again once it
 * ends. With reduced motion it never starts: a screen that moves by itself is what that asks to
 * be spared. Nor does it once the viewer has switched it off in Settings. Returns the uninstall.
 */
export function installAttractIdle(
  i18n: AttractI18n,
  load: () => Promise<AttractModule> = () => import('./attract-mode'),
) {
  let timer = 0
  let stop: (() => void) | null = null
  let loading = false
  // Counts activity, so a load that something interrupted does not start the screen saver late.
  let epoch = 0

  const arm = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(fire, attractIdleMs)
  }
  const fire = () => {
    if (stop || loading) return
    if (isPageBusy() || prefersReducedMotion() || !readAttractModeEnabled()) {
      arm()
      return
    }
    const started = epoch
    loading = true
    load()
      .then(({ startAttractMode }) => {
        loading = false
        if (epoch !== started || isPageBusy()) {
          arm()
          return
        }
        stop = startAttractMode({
          i18n,
          isBusy: isPageBusy,
          onEnd: () => {
            stop = null
            arm()
          },
        })
        if (!stop) arm()
      })
      // A chunk a deploy has renamed, or a canvas the browser refuses, leaves the page as it was.
      .catch(() => {
        loading = false
        arm()
      })
  }
  const onActivity = () => {
    epoch += 1
    if (!stop) arm()
  }

  for (const type of activity)
    document.addEventListener(type, onActivity, { capture: true, passive: true })
  document.addEventListener('visibilitychange', onActivity)
  // Coming back to the window starts the wait afresh, as coming back to the tab does.
  window.addEventListener('focus', onActivity)
  // A lit MIDI LED is activity too: someone is playing the FM1 or a patch is going out.
  const observer =
    typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
          if (document.querySelector('.midi-activity-led[data-lit]')) onActivity()
        })
      : undefined
  observer?.observe(document.documentElement, {
    attributeFilter: ['data-lit'],
    attributes: true,
    subtree: true,
  })
  arm()

  return () => {
    window.clearTimeout(timer)
    stop?.()
    stop = null
    observer?.disconnect()
    for (const type of activity) document.removeEventListener(type, onActivity, { capture: true })
    document.removeEventListener('visibilitychange', onActivity)
    window.removeEventListener('focus', onActivity)
  }
}
