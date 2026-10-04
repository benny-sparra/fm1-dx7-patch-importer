// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { changedSlotGlowMs, type SlotSounds, useChangedSlots } from './use-changed-slots'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const piano = { name: 'PIANO 1' }
const organ = { name: 'ORGAN 1' }
const brass = { name: 'BRASS 1' }

function sounds(entries: Record<string, unknown>): SlotSounds {
  return new Map(Object.entries(entries).map(([id, voice]) => [id, [voice]]))
}

function renderChangedSlots(view: string, initial: SlotSounds) {
  return renderHook(
    ({ slotSounds, slotView }: { slotSounds: SlotSounds; slotView: string }) =>
      useChangedSlots(slotView, slotSounds),
    { initialProps: { slotSounds: initial, slotView: view } },
  )
}

describe('useChangedSlots', () => {
  it('lights nothing for the slots first shown', () => {
    const { result } = renderChangedSlots('A', sounds({ 'A-1': piano, 'A-2': organ }))

    expect(result.current).toBeNull()
  })

  it('lights a slot whose sound changed while it stayed on screen', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano, 'A-2': organ }))

    rerender({ slotSounds: sounds({ 'A-1': piano, 'A-2': brass }), slotView: 'A' })

    expect([...(result.current?.ids ?? [])]).toEqual(['A-2'])
  })

  it('lights a slot that fills while its bank is shown, such as by an import', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({}))

    rerender({ slotSounds: sounds({ 'A-1': piano }), slotView: 'A' })

    expect([...(result.current?.ids ?? [])]).toEqual(['A-1'])
  })

  it('lights nothing when the same sounds arrive in a new map', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano }))

    rerender({ slotSounds: sounds({ 'A-1': piano }), slotView: 'A' })

    expect(result.current).toBeNull()
  })

  it('lights nothing when another view comes in, such as another bank', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano }))

    rerender({ slotSounds: sounds({ 'B-1': organ }), slotView: 'B' })

    expect(result.current).toBeNull()
  })

  it('puts the glow out when the view changes while slots are lit', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano }))
    rerender({ slotSounds: sounds({ 'A-1': organ }), slotView: 'A' })

    rerender({ slotSounds: sounds({ 'B-1': brass }), slotView: 'B' })

    expect(result.current).toBeNull()
  })

  it('puts the glow out once it has faded', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano }))
    rerender({ slotSounds: sounds({ 'A-1': organ }), slotView: 'A' })

    act(() => {
      vi.advanceTimersByTime(changedSlotGlowMs)
    })

    expect(result.current).toBeNull()
  })

  it('gives a later change a new key, so a slot still glowing starts again', () => {
    const { rerender, result } = renderChangedSlots('A', sounds({ 'A-1': piano }))
    rerender({ slotSounds: sounds({ 'A-1': organ }), slotView: 'A' })
    const firstKey = result.current?.key

    rerender({ slotSounds: sounds({ 'A-1': brass }), slotView: 'A' })

    expect(result.current?.key).not.toBe(firstKey)
  })
})
