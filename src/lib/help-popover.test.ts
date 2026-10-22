import { describe, expect, it } from 'vitest'

import { positionHelpPopover, positionMenu } from '@/lib/help-popover'

describe('positionHelpPopover', () => {
  it('places the popover below the trigger when there is room', () => {
    expect(positionHelpPopover({ bottom: 120, left: 100, top: 100 }, 280, 100, 1000, 800)).toEqual({
      left: 92,
      top: 128,
    })
  })

  it('moves the popover above a trigger near the bottom edge', () => {
    expect(positionHelpPopover({ bottom: 770, left: 100, top: 750 }, 280, 100, 1000, 800)).toEqual({
      left: 92,
      top: 642,
    })
  })

  it('keeps the popover within a narrow viewport', () => {
    expect(positionHelpPopover({ bottom: 50, left: 310, top: 30 }, 296, 120, 320, 480)).toEqual({
      left: 12,
      top: 58,
    })
  })

  it('clamps an unusually tall popover to the viewport margin', () => {
    expect(positionHelpPopover({ bottom: 250, left: 0, top: 230 }, 280, 500, 320, 480)).toEqual({
      left: 12,
      top: 12,
    })
  })
})

describe('positionMenu', () => {
  it('places a menu that fits as a popover is placed', () => {
    expect(positionMenu({ bottom: 120, left: 100, top: 100 }, 186, 300, 320, 640)).toEqual({
      left: 92,
      top: 128,
    })
  })

  it('scrolls a menu too tall for either side above its trigger when there is more room there', () => {
    expect(positionMenu({ bottom: 379, left: 118, top: 355 }, 186, 363, 320, 640)).toEqual({
      left: 110,
      maxHeight: 335,
      top: 12,
    })
  })

  it('scrolls a menu too tall for either side below its trigger when there is more room there', () => {
    expect(positionMenu({ bottom: 260, left: 118, top: 236 }, 186, 400, 320, 640)).toEqual({
      left: 110,
      maxHeight: 360,
      top: 268,
    })
  })
})
