// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LfoScope } from '@/components/editor/lfo-scope'

afterEach(cleanup)

const scope = () => screen.getByTestId('lfo-scope')
const tracePath = () => scope().querySelector('path')?.getAttribute('d') ?? ''
const traceOpacity = () => scope().querySelector('g[opacity]')?.getAttribute('opacity')

/** The path's points as [x, y] pairs. */
const points = (path: string) =>
  path
    .slice(1)
    .split(' L')
    .map((point) => point.split(' ').map(Number))

describe('LfoScope', () => {
  it('draws a different trace for each waveform', () => {
    const { rerender } = render(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={0} />)
    const paths = [tracePath()]
    for (const wave of [1, 2, 3, 4, 5]) {
      rerender(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={wave} />)
      paths.push(tracePath())
    }
    expect(new Set(paths).size).toBe(6)
  })

  it('holds sample & hold level across each cycle', () => {
    render(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={5} />)
    const trace = points(tracePath())
    for (let index = 0; index < trace.length; index += 2) {
      expect(trace[index + 1][1]).toBe(trace[index][1])
    }
  })

  it('dims the trace while both mod depths are zero', () => {
    const { rerender } = render(<LfoScope ampModDepth={0} pitchModDepth={0} speed={50} wave={0} />)
    expect(traceOpacity()).toBe('0.4')

    rerender(<LfoScope ampModDepth={10} pitchModDepth={0} speed={50} wave={0} />)
    expect(traceOpacity()).toBe('1')

    rerender(<LfoScope ampModDepth={0} pitchModDepth={10} speed={50} wave={0} />)
    expect(traceOpacity()).toBe('1')
  })

  it('stays hidden from assistive tech', () => {
    render(<LfoScope ampModDepth={0} pitchModDepth={50} speed={50} wave={0} />)
    expect(scope().getAttribute('aria-hidden')).toBe('true')
  })
})
