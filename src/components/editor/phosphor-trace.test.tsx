// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { AdsrScope } from '@/components/editor/adsr-scope'
import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { LfoScope } from '@/components/editor/lfo-scope'

/** jsdom cannot animate, so each element's `animate` records the call; motion is allowed. */
const animate = vi.fn((_keyframes: unknown, _options: unknown) => ({
  currentTime: 0,
  playState: 'running',
}))

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn() })),
  )
  Object.assign(SVGElement.prototype, { animate })
  Object.assign(SVGElement.prototype, {
    getPointAtLength: () => ({ x: 1, y: 2 }),
    getTotalLength: () => 100,
  })
})

afterEach(() => {
  cleanup()
  animate.mockClear()
  Reflect.deleteProperty(SVGElement.prototype, 'animate')
  vi.unstubAllGlobals()
})

const envelope = (rates: number[], extra = {}) => (
  <EnvelopeEditor
    color="red"
    helpText="help"
    levels={[99, 80, 60, 0]}
    onChange={vi.fn()}
    onGestureEnd={vi.fn()}
    onGestureStart={vi.fn()}
    rates={rates}
    title="Operator 1 envelope"
    {...extra}
  />
)

describe('the envelope trace', () => {
  it('draws itself, with a dot leading it, when the editor opens', () => {
    render(envelope([99, 90, 80, 70]))

    expect(animate).toHaveBeenCalledTimes(1)
    const keyframes = animate.mock.calls[0][0] as { strokeDashoffset: number }[]
    expect(keyframes.map((frame) => frame.strokeDashoffset)).toEqual([1, 0])
  })

  it('draws again when a preset replaces the envelope', () => {
    const { rerender } = render(envelope([99, 90, 80, 70]))
    animate.mockClear()

    rerender(envelope([50, 40, 30, 20]))

    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('does not redraw while a point is being dragged', () => {
    const { container, rerender } = render(envelope([99, 90, 80, 70]))
    animate.mockClear()
    const grab = container.querySelector('rect[aria-hidden="true"]') as SVGRectElement
    grab.setPointerCapture = vi.fn()

    act(() => {
      grab.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    rerender(envelope([60, 90, 80, 70]))

    expect(animate).not.toHaveBeenCalled()
  })

  it('keeps the dot out of the accessible tree', () => {
    const { container } = render(envelope([99, 90, 80, 70]))

    const dots = container.querySelectorAll('svg[role="group"] circle')
    expect(dots).toHaveLength(1)
    expect(dots[0].getAttribute('aria-hidden')).toBe('true')
  })

  it('draws nothing when reduced motion is requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )

    render(envelope([99, 90, 80, 70]))

    expect(animate).not.toHaveBeenCalled()
  })
})

describe('the Virtual Analog envelope trace', () => {
  const adsr = (attack: number) => (
    <AdsrScope attack={attack} decay={40} enabled release={30} sustain={60} />
  )

  it('draws on mount and when the settings are replaced', () => {
    const { rerender } = render(adsr(20))
    expect(animate).toHaveBeenCalledTimes(1)

    rerender(adsr(70))

    expect(animate).toHaveBeenCalledTimes(2)
  })
})

describe('the LFO scope', () => {
  it('sweeps in from the left on mount and when the wave changes', () => {
    const { rerender } = render(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={0} />)
    expect(animate).toHaveBeenCalledTimes(1)

    rerender(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={4} />)

    expect(animate).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(animate.mock.calls[1][0])).toContain('inset(0 100% 0 0)')
  })
})

describe('the algorithm pulse', () => {
  const panel = (algorithm: number) => (
    <AlgorithmPanel
      algorithm={algorithm}
      feedback={0}
      onAlgorithmChange={vi.fn()}
      onFeedbackChange={vi.fn()}
      onFeedbackGestureEnd={vi.fn()}
      onFeedbackGestureStart={vi.fn()}
      operatorFrequencies={['1', '1', '1', '1', '1', '1']}
    />
  )

  it('stays still as the editor opens', () => {
    render(panel(0))

    expect(animate).not.toHaveBeenCalled()
  })

  it('sends one pulse along every link when another algorithm is chosen', async () => {
    const { container, rerender } = render(panel(0))

    rerender(panel(4))

    const pulses = container.querySelectorAll('g[aria-hidden="true"] path[pathLength]')
    expect(animate).toHaveBeenCalledTimes(pulses.length)
    expect(pulses.length).toBeGreaterThan(0)
  })

  it('does not pulse for a change of feedback alone', async () => {
    const user = userEvent.setup()
    void user
    const { rerender } = render(panel(3))

    rerender(<AlgorithmPanel {...panel(3).props} feedback={5} />)

    expect(animate).not.toHaveBeenCalled()
  })
})
