import { describe, expect, it, vi } from 'vitest'

import {
  countGridColumns,
  isGridNavigationKey,
  resolveGridKey,
  resolveGridNavigation,
} from '@/lib/patch-grid-navigation'

describe('isGridNavigationKey', () => {
  it('claims the arrows and the row ends', () => {
    expect(isGridNavigationKey('ArrowDown')).toBe(true)
    expect(isGridNavigationKey('Home')).toBe(true)
    expect(isGridNavigationKey('End')).toBe(true)
  })

  it('leaves other keys to the slot', () => {
    expect(isGridNavigationKey('Enter')).toBe(false)
    expect(isGridNavigationKey(' ')).toBe(false)
    expect(isGridNavigationKey('Escape')).toBe(false)
  })
})

describe('countGridColumns', () => {
  it('counts the slots sharing the first row', () => {
    expect(countGridColumns([0, 0, 0, 0, 40, 40, 40, 40])).toBe(4)
  })

  it('tolerates sub-pixel row positions', () => {
    expect(countGridColumns([0, 0.4, 0.7, 39.8, 40.2])).toBe(3)
  })

  it('reads a single-column layout', () => {
    expect(countGridColumns([0, 40, 80])).toBe(1)
  })

  it('falls back to one column with nothing rendered', () => {
    expect(countGridColumns([])).toBe(1)
  })
})

describe('resolveGridNavigation', () => {
  // A 4-column grid of 10 slots: a full row of 4, another, then a short row of 2.
  const columns = 4
  const count = 10

  it('steps along a row', () => {
    expect(resolveGridNavigation('ArrowRight', 1, count, columns)).toBe(2)
    expect(resolveGridNavigation('ArrowLeft', 1, count, columns)).toBe(0)
  })

  it('steps a whole row at a time', () => {
    expect(resolveGridNavigation('ArrowDown', 1, count, columns)).toBe(5)
    expect(resolveGridNavigation('ArrowUp', 5, count, columns)).toBe(1)
  })

  it('stops at the first and last slot rather than wrapping', () => {
    expect(resolveGridNavigation('ArrowLeft', 0, count, columns)).toBe(0)
    expect(resolveGridNavigation('ArrowRight', 9, count, columns)).toBe(9)
  })

  it('stays put rather than leaving the top row', () => {
    expect(resolveGridNavigation('ArrowUp', 2, count, columns)).toBe(2)
  })

  it('reaches the short final row from any column above it', () => {
    // Slot 7 is above nothing, so down goes to the last slot instead of nowhere.
    expect(resolveGridNavigation('ArrowDown', 7, count, columns)).toBe(9)
    expect(resolveGridNavigation('ArrowDown', 4, count, columns)).toBe(8)
  })

  it('stays on the last slot when there is no row below', () => {
    expect(resolveGridNavigation('ArrowDown', 9, count, columns)).toBe(9)
  })

  it('jumps to the ends of the grid', () => {
    expect(resolveGridNavigation('Home', 6, count, columns)).toBe(0)
    expect(resolveGridNavigation('End', 6, count, columns)).toBe(9)
  })

  it('leaves the index alone in an empty grid', () => {
    expect(resolveGridNavigation('End', 0, 0, columns)).toBe(0)
  })
})

describe('resolveGridKey', () => {
  const twoRows = () => [0, 0, 0, 40, 40, 40]

  it('moves down a row using the measured layout', () => {
    expect(resolveGridKey('ArrowDown', 1, twoRows)).toBe(4)
  })

  it('ignores a key that does not move', () => {
    const readTops = vi.fn(twoRows)

    expect(resolveGridKey('Enter', 1, readTops)).toBeNull()
    expect(readTops).not.toHaveBeenCalled()
  })

  it('ignores a key when nothing in the grid has focus', () => {
    expect(resolveGridKey('ArrowRight', -1, twoRows)).toBeNull()
  })
})
