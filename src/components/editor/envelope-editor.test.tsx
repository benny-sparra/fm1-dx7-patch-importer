// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { i18nReady } from '@/i18n'

const ignore = () => {}

/** Stands in for the browser's ResizeObserver, reporting whatever box a test gives it. */
function stubResizeObserver() {
  const observers: { callback: ResizeObserverCallback; target: Element | null }[] = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly entry: { callback: ResizeObserverCallback; target: Element | null }
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, target: null }
        observers.push(this.entry)
      }
      observe(target: Element) {
        this.entry.target = target
      }
      disconnect() {
        this.entry.target = null
      }
    },
  )
  return {
    observed: () => observers.filter(({ target }) => target !== null).length,
    resize: (width: number, height: number) =>
      act(() => {
        for (const { callback, target } of observers) {
          if (!target) continue
          callback(
            [{ contentRect: { height, width }, target } as unknown as ResizeObserverEntry],
            {} as ResizeObserver,
          )
        }
      }),
  }
}

function renderEnvelope(fill: boolean) {
  render(
    <EnvelopeEditor
      color="var(--crt-acc)"
      fill={fill}
      helpText="Shapes the sound over time."
      levels={[99, 80, 60, 0]}
      onChange={ignore}
      onGestureEnd={ignore}
      onGestureStart={ignore}
      rates={[50, 40, 30, 20]}
      title="Envelope"
    />,
  )
}

const graph = () => screen.getByRole('group', { name: 'Envelope' })
const point = (index: number) => screen.getByRole('slider', { name: `Envelope point ${index}` })

beforeAll(() => i18nReady)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('envelope editor', () => {
  it('keeps the fixed drawing’s shape unless asked to fill', () => {
    const observer = stubResizeObserver()
    renderEnvelope(false)

    observer.resize(400, 300)

    expect(observer.observed()).toBe(0)
    expect(graph().getAttribute('viewBox')).toBe('0 0 400 180')
  })

  it('redraws a filling graph to the shape of its box', () => {
    const observer = stubResizeObserver()
    renderEnvelope(true)

    observer.resize(400, 300)

    expect(graph().getAttribute('viewBox')).toBe('0 0 400 300')
  })

  it('spans the levels across the whole height of a filling graph', () => {
    const observer = stubResizeObserver()
    renderEnvelope(true)

    observer.resize(400, 300)

    // Level 0 sits on the plot's bottom, which leaves the stage numbers room below it.
    expect(Number(point(4).getAttribute('y')) + 6).toBe(276)
    expect(Number(point(1).getAttribute('y')) + 6).toBe(20)
  })

  it('never draws a filling graph shorter than the fixed one', () => {
    const observer = stubResizeObserver()
    renderEnvelope(true)

    observer.resize(400, 90)

    expect(graph().getAttribute('viewBox')).toBe('0 0 400 180')
  })

  it('stops measuring once it is removed', () => {
    const observer = stubResizeObserver()
    renderEnvelope(true)

    cleanup()

    expect(observer.observed()).toBe(0)
  })
})
