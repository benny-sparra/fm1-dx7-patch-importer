// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { attractIdleMs, installAttractIdle, isPageBusy } from './attract-idle'
import type { AttractI18n } from './attract-mode'

const i18n: AttractI18n = { addResourceBundle: vi.fn(), t: vi.fn() as unknown as AttractI18n['t'] }

let hidden = false
let reducedMotion = false
let uninstall: (() => void) | undefined

function fakeAttract() {
  const ends: Array<() => void> = []
  const stop = vi.fn()
  const startAttractMode = vi.fn(({ onEnd }: { onEnd: () => void }) => {
    ends.push(onEnd)
    return stop
  })
  return { ends, load: () => Promise.resolve({ startAttractMode }), startAttractMode, stop }
}

async function idle(ms = attractIdleMs) {
  await vi.advanceTimersByTimeAsync(ms)
}

beforeEach(() => {
  vi.useFakeTimers()
  hidden = false
  reducedMotion = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }))
})

afterEach(() => {
  uninstall?.()
  uninstall = undefined
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-saving')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('attract mode’s idle watch', () => {
  it('starts attract mode once the page has sat untouched for the idle time', async () => {
    const attract = fakeAttract()
    uninstall = installAttractIdle(i18n, attract.load)

    await idle(attractIdleMs - 1000)
    expect(attract.startAttractMode).not.toHaveBeenCalled()
    await idle(1000)
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })

  it('starts the wait again on every key, pointer, and scroll', async () => {
    const attract = fakeAttract()
    uninstall = installAttractIdle(i18n, attract.load)

    await idle(attractIdleMs - 1000)
    document.dispatchEvent(new Event('pointermove'))
    await idle(attractIdleMs - 1000)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
    await idle(attractIdleMs - 1000)
    expect(attract.startAttractMode).not.toHaveBeenCalled()
    await idle(1000)
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })

  it('waits while a dialog is open, then starts once the page is idle without one', async () => {
    const attract = fakeAttract()
    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    document.body.append(dialog)
    uninstall = installAttractIdle(i18n, attract.load)

    await idle()
    expect(attract.startAttractMode).not.toHaveBeenCalled()
    dialog.remove()
    await idle()
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })

  it('never starts while the library is saving', async () => {
    const attract = fakeAttract()
    document.documentElement.setAttribute('data-saving', '')
    uninstall = installAttractIdle(i18n, attract.load)

    await idle()
    await idle()
    expect(attract.startAttractMode).not.toHaveBeenCalled()
  })

  it('takes a lit MIDI activity LED as activity, as when the FM1 is played', async () => {
    const attract = fakeAttract()
    const led = document.createElement('span')
    led.className = 'midi-activity-led'
    document.body.append(led)
    uninstall = installAttractIdle(i18n, attract.load)

    await idle(attractIdleMs - 1000)
    led.setAttribute('data-lit', 'true')
    await vi.advanceTimersByTimeAsync(0)
    led.removeAttribute('data-lit')
    await idle(attractIdleMs - 1000)
    expect(attract.startAttractMode).not.toHaveBeenCalled()
    await idle(1000)
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })

  it('never starts while the tab is hidden', async () => {
    const attract = fakeAttract()
    hidden = true
    uninstall = installAttractIdle(i18n, attract.load)

    await idle()
    expect(attract.startAttractMode).not.toHaveBeenCalled()
  })

  it('never starts when reduced motion is requested', async () => {
    const attract = fakeAttract()
    reducedMotion = true
    uninstall = installAttractIdle(i18n, attract.load)

    await idle()
    await idle()
    expect(attract.startAttractMode).not.toHaveBeenCalled()
  })

  it('waits the whole idle time again after attract mode ends', async () => {
    const attract = fakeAttract()
    uninstall = installAttractIdle(i18n, attract.load)
    await idle()
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)

    attract.ends[0]()
    await idle(attractIdleMs - 1000)
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
    await idle(1000)
    expect(attract.startAttractMode).toHaveBeenCalledTimes(2)
  })

  it('does not start when the page was touched while its chunk loaded', async () => {
    let resolve: (
      module: Awaited<ReturnType<ReturnType<typeof fakeAttract>['load']>>,
    ) => void = () => {}
    const attract = fakeAttract()
    uninstall = installAttractIdle(i18n, () => new Promise((settle) => (resolve = settle)))
    await idle()

    document.dispatchEvent(new Event('pointermove'))
    resolve({ startAttractMode: attract.startAttractMode })
    await vi.advanceTimersByTimeAsync(0)
    expect(attract.startAttractMode).not.toHaveBeenCalled()
  })

  it('tries again later when its chunk fails to load', async () => {
    const attract = fakeAttract()
    const load = vi
      .fn<typeof attract.load>()
      .mockRejectedValueOnce(new Error('renamed chunk'))
      .mockImplementation(attract.load)
    uninstall = installAttractIdle(i18n, load)

    await idle()
    expect(attract.startAttractMode).not.toHaveBeenCalled()
    await idle()
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })

  it('stops attract mode and its watch when uninstalled', async () => {
    const attract = fakeAttract()
    uninstall = installAttractIdle(i18n, attract.load)
    await idle()

    uninstall()
    uninstall = undefined
    expect(attract.stop).toHaveBeenCalled()
    await idle()
    expect(attract.startAttractMode).toHaveBeenCalledTimes(1)
  })
})

describe('isPageBusy', () => {
  it('is quiet on an idle page with nothing open', () => {
    expect(isPageBusy()).toBe(false)
  })
})
