import { vi } from 'vitest'

type FakeContext = {
  fillText: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>
  [method: string]: unknown
}

/**
 * A canvas whose 2D context records what it is asked to draw: jsdom has no canvas. `clientWidth`
 * and `clientHeight` are set, since jsdom lays nothing out.
 */
export function makeFakeCanvas(width = 400, height = 240) {
  const canvas = document.createElement('canvas')
  const context: FakeContext = new Proxy({ fillText: vi.fn<() => void>() } as FakeContext, {
    get: (target, key: string) => target[key] ?? (target[key] = vi.fn<() => void>()),
    set: (target, key: string, value) => ((target[key] = value), true),
  })
  Object.defineProperty(canvas, 'clientWidth', { value: width })
  Object.defineProperty(canvas, 'clientHeight', { value: height })
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  return { canvas, context }
}
