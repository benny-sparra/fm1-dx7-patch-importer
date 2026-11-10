// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  attractBox,
  type AttractI18n,
  driftStep,
  promptLit,
  startAttractMode,
} from './attract-mode'

let frames: Array<(time: number) => void>
let busy = false
let hidden = false
let fills: string[]
let stops: Array<() => void> = []
let strokes: number

function installContext() {
  fills = []
  strokes = 0
  const context = new Proxy(
    {
      fillText: (text: string) => fills.push(text),
      stroke: () => (strokes += 1),
    } as Record<string, unknown>,
    {
      get: (target, key: string) => target[key] ?? (target[key] = () => {}),
      set: (target, key: string, value) => ((target[key] = value), true),
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
}

function runFrames(time: number) {
  const pending = frames
  frames = []
  pending.forEach((callback) => callback(time))
}

const i18n: AttractI18n = {
  addResourceBundle: vi.fn() as unknown as AttractI18n['addResourceBundle'],
  t: vi.fn((key: string) =>
    key === 'attract.pressAnyKey' ? 'PRESS ANY KEY' : 'Switch it off in Settings',
  ) as unknown as AttractI18n['t'],
}

function start() {
  const onEnd = vi.fn()
  const stop = startAttractMode({ i18n, isBusy: () => busy, onEnd })
  if (stop) stops.push(stop)
  return { onEnd, screen: () => document.querySelector('canvas.attract-mode'), stop }
}

beforeEach(() => {
  frames = []
  busy = false
  hidden = false
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) =>
    frames.push(callback),
  )
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  installContext()
})

afterEach(() => {
  stops.forEach((stop) => stop())
  stops = []
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('attract mode', () => {
  it('is decoration: hidden from assistive technology, never focused', () => {
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    const { screen } = start()

    expect(screen()?.getAttribute('aria-hidden')).toBe('true')
    expect(screen()?.hasAttribute('tabindex')).toBe(false)
    expect(document.activeElement).toBe(button)
  })

  it('shows PRESS ANY KEY in the interface language', () => {
    start()

    expect(i18n.t).toHaveBeenCalledWith('attract.pressAnyKey')
    expect(fills).toContain('PRESS ANY KEY')
  })

  it('says under the prompt how to switch it off', () => {
    start()

    expect(i18n.t).toHaveBeenCalledWith('attract.switchOff')
    expect(fills).toContain('Switch it off in Settings')
  })

  it('redraws the FM1 on every animation frame', () => {
    start()
    const first = strokes
    runFrames(16)
    runFrames(32)

    expect(strokes).toBeGreaterThan(first)
    expect(frames).toHaveLength(1)
  })

  it('ends on a key, which does nothing else', () => {
    const { onEnd, screen } = start()
    const shortcut = vi.fn()
    document.addEventListener('keydown', shortcut)
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' })
    document.body.dispatchEvent(event)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    expect(shortcut).not.toHaveBeenCalled()
    expect(screen()).toBeNull()
    expect(frames).toHaveLength(0)
    document.removeEventListener('keydown', shortcut)
  })

  it('ends when the pointer moves, but not for a pointer that stays where it is', () => {
    const { onEnd } = start()
    const move = (x: number) =>
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: 10 }))

    move(10)
    move(11)
    expect(onEnd).not.toHaveBeenCalled()
    move(30)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('ends on a press, which lands on its own screen rather than the page', () => {
    const { onEnd, screen } = start()
    const event = new Event('pointerdown', { bubbles: true, cancelable: true })
    screen()!.dispatchEvent(event)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ends when the page needs its screen, such as a dialog opening', () => {
    const { onEnd, screen } = start()
    busy = true
    runFrames(16)

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(screen()).toBeNull()
  })

  it('ends when the tab is hidden', () => {
    const { onEnd } = start()
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stops without reporting an end when the page takes it away', () => {
    const { onEnd, screen, stop } = start()
    stop?.()

    expect(screen()).toBeNull()
    expect(frames).toHaveLength(0)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('leaves the page alone when the browser cannot draw on a canvas', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { screen, stop } = start()

    expect(stop).toBeNull()
    expect(screen()).toBeNull()
  })
})

describe('the drift', () => {
  const screen = { height: 600, width: 1000 }
  const box = { height: 200, width: 280 }

  it('moves at its speed until it meets an edge', () => {
    const next = driftStep({ vx: 70, vy: 46, x: 500, y: 300 }, 1, screen, box)
    expect(next).toEqual({ vx: 70, vy: 46, x: 570, y: 346 })
  })

  it('turns back off an edge and keeps the whole box on the screen', () => {
    const next = driftStep({ vx: 70, vy: -46, x: 855, y: 105 }, 1, screen, box)
    expect(next.vx).toBe(-70)
    expect(next.vy).toBe(46)
    expect(next.x).toBe(1000 - 140)
    expect(next.y).toBe(100)
  })

  it('sizes the box to the screen, never larger than 420 pixels', () => {
    expect(attractBox(400).width).toBe(180)
    expect(attractBox(4000).width).toBe(420)
    expect(attractBox(4000).height).toBe(300)
  })

  it('blinks PRESS ANY KEY: lit for most of each beat, then dark', () => {
    expect(promptLit(0)).toBe(true)
    expect(promptLit(0.6)).toBe(true)
    expect(promptLit(0.9)).toBe(false)
    expect(promptLit(1.3)).toBe(true)
  })
})
