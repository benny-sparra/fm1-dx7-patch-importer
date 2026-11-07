import { describe, expect, it } from 'vitest'

import {
  algorithmBounds,
  featuredCentre,
  featuredGrid,
  pathPolylines,
} from '@/lib/algorithm-layout'
import { dx7Algorithms } from '@/lib/dx7-algorithms'

describe('pathPolylines', () => {
  it('reads each M as a new line and V and H as corners', () => {
    expect(pathPolylines('M 1 2 V 5 H 9 M 0 0 V 3')).toEqual([
      [
        [1, 2],
        [1, 5],
        [9, 5],
      ],
      [
        [0, 0],
        [0, 3],
      ],
    ])
  })
})

describe('featuredCentre', () => {
  it('lies inside every algorithm’s drawing taken together', () => {
    const all = dx7Algorithms.map((operators) => algorithmBounds(featuredGrid, operators))
    expect(featuredCentre[0]).toBeGreaterThan(Math.min(...all.map((b) => b.minX)))
    expect(featuredCentre[0]).toBeLessThan(Math.max(...all.map((b) => b.maxX)))
    expect(featuredCentre[1]).toBeGreaterThan(Math.min(...all.map((b) => b.minY)))
    expect(featuredCentre[1]).toBeLessThan(Math.max(...all.map((b) => b.maxY)))
  })
})
