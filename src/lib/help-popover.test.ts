import { describe, expect, it } from 'vitest'

import { positionHelpPopover } from '@/lib/help-popover'

describe('positionHelpPopover', () => {
  it('places the popover below the trigger when there is room', () => {
    expect(positionHelpPopover(
      { bottom: 120, left: 100, top: 100 },
      280,
      100,
      1000,
      800,
    )).toEqual({ left: 92, top: 128 })
  })

  it('moves the popover above a trigger near the bottom edge', () => {
    expect(positionHelpPopover(
      { bottom: 770, left: 100, top: 750 },
      280,
      100,
      1000,
      800,
    )).toEqual({ left: 92, top: 642 })
  })

  it('keeps the popover within a narrow viewport', () => {
    expect(positionHelpPopover(
      { bottom: 50, left: 310, top: 30 },
      296,
      120,
      320,
      480,
    )).toEqual({ left: 12, top: 58 })
  })

  it('clamps an unusually tall popover to the viewport margin', () => {
    expect(positionHelpPopover(
      { bottom: 250, left: 0, top: 230 },
      280,
      500,
      320,
      480,
    )).toEqual({ left: 12, top: 12 })
  })
})
