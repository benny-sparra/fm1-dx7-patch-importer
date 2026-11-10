/*
  Attract mode: once the page has sat idle (`attract-idle.ts` decides when), the FM1 turns and
  drifts across a dimmed screen, bouncing off its edges, with PRESS ANY KEY blinking under it, as an
  arcade cabinet does between games. It is decoration: its canvas is `aria-hidden` and never takes
  focus, it changes nothing on the page and sends nothing, and any key, pointer, wheel, or MIDI
  activity ends it. The key or tap that wakes the page does only that, as a screen saver's does.
  A dim line under the prompt says it can be switched off in Settings.
*/

import type { i18n as I18n } from 'i18next'

import britishEnglish from '@/i18n/locales/en-GB-attract'
import {
  paintWireframe,
  readPalette,
  wireframeHeight,
  wireframeWidth,
} from './fm1-wireframe-canvas'

/** How fast the FM1 drifts across the screen, in CSS pixels a second. */
export const driftSpeed = { x: 70, y: 46 } as const
const turnSpeed = 0.9
const blinkPeriod = 1.2
const blinkLit = 0.7
// How much of the page shows through: enough to see it is still there.
const shade = 0.88
// A pointer must move this far to wake the page, so a cursor that never moved, which a browser
// can report as moving when the screen appears under it, leaves it running.
const wakeDistance = 4
const longestStepMs = 50
const largestBoxWidth = 420

/** The members of the page's i18next instance attract mode uses. */
export type AttractI18n = Pick<I18n, 'addResourceBundle' | 't'>

export type Drift = { vx: number; vy: number; x: number; y: number }

/**
 * One step of the drift: the box's centre moves, and turns back off an edge of the screen, so the
 * whole box stays on it.
 */
export function driftStep(
  drift: Drift,
  seconds: number,
  screen: { height: number; width: number },
  box: { height: number; width: number },
): Drift {
  let { vx, vy } = drift
  const left = box.width / 2
  const right = Math.max(left, screen.width - box.width / 2)
  const top = box.height / 2
  const bottom = Math.max(top, screen.height - box.height / 2)
  let x = drift.x + vx * seconds
  let y = drift.y + vy * seconds
  if (x < left || x > right) {
    vx = x < left ? Math.abs(vx) : -Math.abs(vx)
    x = Math.min(right, Math.max(left, x))
  }
  if (y < top || y > bottom) {
    vy = y < top ? Math.abs(vy) : -Math.abs(vy)
    y = Math.min(bottom, Math.max(top, y))
  }
  return { vx, vy, x, y }
}

/** The box the FM1 turns in: a share of the screen, never larger than it looks good. */
export function attractBox(screenWidth: number) {
  const width = Math.min(largestBoxWidth, screenWidth * 0.45)
  return { height: (width * wireframeHeight) / wireframeWidth, width }
}

/** Whether PRESS ANY KEY shows at this moment of its blink. */
export function promptLit(seconds: number) {
  return seconds % blinkPeriod < blinkLit
}

/**
 * Shows attract mode over the page until something wakes it, or `isBusy` says the page needs the
 * screen (a dialog, a save, MIDI traffic). `onEnd` runs once when it wakes. Returns a stop that
 * removes it without calling `onEnd`, or null when the browser cannot draw on a canvas.
 */
export function startAttractMode({
  i18n,
  isBusy,
  onEnd,
}: {
  i18n: AttractI18n
  isBusy: () => boolean
  onEnd: () => void
}): (() => void) | null {
  const canvas = document.createElement('canvas')
  canvas.className = 'attract-mode'
  canvas.setAttribute('aria-hidden', 'true')
  const context = canvas.getContext('2d')
  if (!context) return null
  document.body.append(canvas)

  const palette = readPalette(canvas)
  const style = getComputedStyle(canvas)
  const led = style.getPropertyValue('--crt-led').trim() || '#fc6'
  const font = `bold 14px ${getComputedStyle(document.body).fontFamily || 'monospace'}`
  // The page's i18next, handed in rather than imported: importing it here made Rolldown split
  // i18next out of the entry's shared chunk, 450 B over the budget.
  i18n.addResourceBundle('en-GB', 'translation', britishEnglish, true, false)
  const prompt = i18n.t('attract.pressAnyKey')
  const hint = i18n.t('attract.switchOff')
  const hintFont = `12px ${getComputedStyle(document.body).fontFamily || 'monospace'}`
  let drift: Drift = {
    vx: driftSpeed.x,
    vy: driftSpeed.y,
    x: (canvas.clientWidth || window.innerWidth) / 2,
    y: (canvas.clientHeight || window.innerHeight) / 2,
  }
  let seconds = 0
  let last = 0
  let frame = 0
  let pointer: { x: number; y: number } | null = null
  let ended = false

  const draw = () => {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    const density = window.devicePixelRatio || 1
    const pixelWidth = Math.round(width * density)
    const pixelHeight = Math.round(height * density)
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    context.setTransform(density, 0, 0, density, 0, 0)
    context.clearRect(0, 0, width, height)
    context.globalAlpha = shade
    context.fillStyle = palette.ground
    context.fillRect(0, 0, width, height)
    context.globalAlpha = 1

    const box = attractBox(width)
    context.translate(drift.x - box.width / 2, drift.y - box.height / 2)
    const view = { pitch: 0.7 + Math.sin(seconds * 0.5) * 0.3, yaw: seconds * turnSpeed }
    paintWireframe(context, view, box.width, box.height, palette)
    context.setTransform(density, 0, 0, density, 0, 0)

    context.textAlign = 'center'
    if (promptLit(seconds)) {
      context.font = font
      context.fillStyle = led
      context.fillText(prompt, width / 2, height - 40)
    }
    // How to stop it, dim and steady, for anyone it annoys.
    context.font = hintFont
    context.globalAlpha = 0.7
    context.fillStyle = palette.line
    context.fillText(hint, width / 2, height - 18)
    context.globalAlpha = 1
  }

  const tick = (time: number) => {
    frame = 0
    if (isBusy()) {
      end()
      return
    }
    const step = last === 0 ? 0 : Math.min(time - last, longestStepMs) / 1000
    last = time
    seconds += step
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    drift = driftStep(drift, step, { height, width }, attractBox(width))
    draw()
    frame = requestAnimationFrame(tick)
  }

  // The key that wakes the page is spent on waking it, so it runs no shortcut beneath.
  const onKeyDown = (event: KeyboardEvent) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    end()
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!pointer) {
      pointer = { x: event.clientX, y: event.clientY }
      return
    }
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= wakeDistance) end()
  }
  // A press lands on the screen itself, which goes as it wakes, so nothing beneath is clicked.
  const onPress = (event: Event) => {
    event.preventDefault()
    end()
  }
  const onVisibility = () => {
    if (document.hidden) end()
  }

  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('wheel', end, true)
  canvas.addEventListener('pointerdown', onPress)
  canvas.addEventListener('touchstart', onPress)
  document.addEventListener('visibilitychange', onVisibility)

  function remove() {
    if (ended) return false
    ended = true
    cancelAnimationFrame(frame)
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('pointermove', onPointerMove, true)
    window.removeEventListener('wheel', end, true)
    canvas.removeEventListener('pointerdown', onPress)
    canvas.removeEventListener('touchstart', onPress)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.remove()
    return true
  }
  function end() {
    if (remove()) onEnd()
  }

  draw()
  frame = requestAnimationFrame(tick)
  return () => {
    remove()
  }
}
