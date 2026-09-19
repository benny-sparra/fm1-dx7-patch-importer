import { type ClientRect, type CollisionDetection, type DroppableContainer } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'

import { bankDropId, droppedBank, patchDragCollision } from './bank-drop'

function rect(left: number, top: number, width: number, height: number): ClientRect {
  return { bottom: top + height, height, left, right: left + width, top, width }
}

// A bank tab in the rail, with two slots in the grid to its right.
const rects = new Map([
  [bankDropId('B'), rect(0, 0, 100, 30)],
  ['bank-A-1', rect(110, 0, 200, 30)],
  ['bank-A-2', rect(320, 0, 200, 30)],
])
const containers = [...rects.keys()].map((id) => ({ id }) as unknown as DroppableContainer)

function collide(
  collisionRect: ClientRect,
  pointerCoordinates: { x: number; y: number } | null,
): string[] {
  const args = {
    active: { id: 'bank-A-2' },
    collisionRect,
    droppableContainers: containers,
    droppableRects: rects,
    pointerCoordinates,
  } as unknown as Parameters<CollisionDetection>[0]
  return patchDragCollision(args).map(({ id }) => String(id))
}

describe('bank drop targets', () => {
  it('reads the bank back from its drop target id', () => {
    expect(droppedBank(bankDropId('AA'))).toBe('AA')
  })

  it('reads no bank from a slot id or a drop over nothing', () => {
    expect(droppedBank('bank-A-1')).toBeUndefined()
    expect(droppedBank(undefined)).toBeUndefined()
  })
})

describe('patchDragCollision', () => {
  it('drops on a bank tab while the pointer is inside it', () => {
    expect(collide(rect(20, 0, 200, 30), { x: 50, y: 15 })[0]).toBe(bankDropId('B'))
  })

  it('drops on the nearest slot when the pointer is in the grid, even beside the rail', () => {
    // The dragged slot's centre is nearer the tab's centre than any slot's, but the pointer is in the grid.
    expect(collide(rect(0, 0, 200, 30), { x: 150, y: 15 })[0]).toBe('bank-A-1')
  })

  it('leaves bank tabs out of a drag with no pointer, such as a keyboard drag', () => {
    expect(collide(rect(0, 0, 100, 30), null)).not.toContain(bankDropId('B'))
  })
})
