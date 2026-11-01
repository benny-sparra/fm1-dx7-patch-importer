import { describe, expect, it } from 'vitest'

import { positionMenuBeside } from '@/lib/menu-beside'

describe('positionMenuBeside', () => {
  it('opens to the right of the trigger, level with its top', () => {
    expect(positionMenuBeside({ right: 200, top: 100 }, 214, 180, 1280, 800)).toEqual({
      left: 210,
      top: 100,
    })
  })

  it('moves up rather than running off the bottom of the screen', () => {
    expect(positionMenuBeside({ right: 200, top: 700 }, 214, 180, 1280, 800)?.top).toBe(608)
  })

  it('gives way to the menu under the trigger without room on the right', () => {
    expect(positionMenuBeside({ right: 300, top: 100 }, 214, 180, 480, 800)).toBeUndefined()
  })
})
