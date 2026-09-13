// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ChorusScope,
  DelayScope,
  delayTaps,
  distortionShape,
  DistortionScope,
  FilterScope,
  phaserPath,
  reverbEnvelope,
  ReverbScope,
} from '@/components/editor/effect-scopes'

afterEach(cleanup)

const curvePath = () =>
  screen.getByTestId('filter-scope').querySelector('path[fill="none"]')?.getAttribute('d')

describe('effect scopes', () => {
  it('redraws the filter curve when cutoff, resonance or type change', () => {
    const { rerender } = render(<FilterScope cutoff={40} enabled resonance={0} type={0} />)
    const lowCutoff = curvePath()
    rerender(<FilterScope cutoff={90} enabled resonance={0} type={0} />)
    const highCutoff = curvePath()
    rerender(<FilterScope cutoff={90} enabled resonance={10} type={0} />)
    const resonant = curvePath()
    rerender(<FilterScope cutoff={90} enabled resonance={10} type={2} />)
    expect(new Set([lowCutoff, highCutoff, resonant, curvePath()]).size).toBe(4)
  })

  it('spaces delay taps by rate and lets decay set how many echoes remain', () => {
    expect(delayTaps(0, 50)).toHaveLength(1)
    expect(delayTaps(90, 100).length).toBeLessThan(delayTaps(90, 0).length)
    const taps = delayTaps(80, 30)
    expect(taps[1].level).toBeLessThan(taps[0].level)
    expect(taps[2].x - taps[1].x).toBeCloseTo(taps[1].x - taps[0].x)
    render(<DelayScope decay={80} enabled mix={50} rate={30} />)
    expect(screen.getAllByTestId('delay-tap')).toHaveLength(taps.length)
  })

  it('dims a bypassed scope and fades chorus copies with mix', () => {
    const { rerender } = render(<ChorusScope depth={50} enabled={false} frequency={50} mix={0} />)
    const scope = screen.getByTestId('chorus-scope')
    expect(scope.querySelector('g[opacity]')?.getAttribute('opacity')).toBe('0.4')
    const quiet = Number(screen.getAllByTestId('chorus-voice')[0].getAttribute('opacity'))
    rerender(<ChorusScope depth={50} enabled frequency={50} mix={100} />)
    expect(scope.querySelector('g[opacity]')?.getAttribute('opacity')).toBe('1')
    expect(
      Number(screen.getAllByTestId('chorus-voice')[0].getAttribute('opacity')),
    ).toBeGreaterThan(quiet)
  })

  it('lengthens the reverb tail with decay and gives each space its own reflections', () => {
    expect(reverbEnvelope(0, 90, 150)).toBeGreaterThan(reverbEnvelope(0, 10, 150))
    expect(reverbEnvelope(1, 50, 150)).toBeGreaterThan(reverbEnvelope(0, 50, 150))
    const { rerender } = render(<ReverbScope decay={50} enabled mix={50} space={1} />)
    expect(screen.getAllByTestId('reverb-reflection')).toHaveLength(6)
    rerender(<ReverbScope decay={50} enabled mix={50} space={2} />)
    expect(screen.queryAllByTestId('reverb-reflection')).toHaveLength(0)
  })

  it('squashes the distortion wave with gain and sharpens it with tone', () => {
    expect(distortionShape(0, 0, 0.5)).toBeLessThan(distortionShape(100, 0, 0.5))
    expect(distortionShape(60, 100, 0.9)).toBe(1)
    expect(distortionShape(60, 0, 0.9)).toBeLessThan(1)
    const { rerender } = render(<DistortionScope enabled gain={20} level={50} tone={50} />)
    const before = screen.getByTestId('distortion-trace').getAttribute('d')
    rerender(<DistortionScope enabled gain={20} level={100} tone={50} />)
    expect(screen.getByTestId('distortion-trace').getAttribute('d')).not.toBe(before)
  })

  it('cuts deeper phaser notches with more mix', () => {
    const lowest = (path: string) =>
      Math.max(...path.split(' L').map((point) => Number(point.split(' ')[1])))
    expect(lowest(phaserPath(100, 100))).toBeGreaterThan(lowest(phaserPath(100, 0)))
    render(<ReverbScope decay={0} enabled={false} mix={0} space={0} />)
    expect(
      screen.getByTestId('reverb-scope').querySelector('g[opacity]')?.getAttribute('opacity'),
    ).toBe('0.4')
  })
})
