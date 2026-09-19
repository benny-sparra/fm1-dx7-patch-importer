import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core'

// Patch ids never take this form, so a bank tab can share the grid's drag context with its slots.
const bankDropPrefix = 'bank-drop:'

/** The drop target id for a bank's tab in the bank rail. */
export function bankDropId(bank: string) {
  return `${bankDropPrefix}${bank}`
}

/** The bank whose tab a drag ended over, or undefined when it ended over a slot or nothing. */
export function droppedBank(id: UniqueIdentifier | undefined) {
  if (typeof id !== 'string' || !id.startsWith(bankDropPrefix)) return undefined
  return id.slice(bankDropPrefix.length)
}

/**
 * A bank tab takes the drop only while the pointer is inside it; everywhere else the nearest slot
 * does, as reordering always has. The nearest centre alone would let a tab win a drop made in the
 * grid beside the rail.
 */
export const patchDragCollision: CollisionDetection = (args) => {
  const isBank = (id: UniqueIdentifier) => droppedBank(id) !== undefined
  const overBank = pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => isBank(container.id)),
  })
  if (overBank.length > 0) return overBank
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => !isBank(container.id)),
  })
}
