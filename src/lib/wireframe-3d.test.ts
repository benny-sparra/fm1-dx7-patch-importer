import { describe, expect, it } from 'vitest'

import { dx7Algorithms, getDx7OperatorRole } from '@/lib/dx7-algorithms'
import {
  project,
  rotate,
  steppedPositions,
  visibleCubeEdges,
  wireScene,
  type Vec3,
} from '@/lib/wireframe-3d'

const cubeHalf: Vec3 = [1, 1, 1]

describe('wireframe projection', () => {
  it('leaves a point where it is when turned by nothing', () => {
    expect(rotate([3, 4, 5], 0, 0)).toEqual([3, 4, 5])
  })

  it('keeps a point the same distance from the origin when turned', () => {
    const [x, y, z] = rotate([3, 4, 5], 0.7, -1.1)
    expect(Math.hypot(x, y, z)).toBeCloseTo(Math.hypot(3, 4, 5))
  })

  it('draws a further point nearer the middle and flips y to point down the screen', () => {
    const [nearX, nearY] = project([10, 10, 0], 100, 2)
    const [farX, farY] = project([10, 10, 100], 100, 2)
    expect([nearX, nearY]).toEqual([20, -20])
    expect(Math.abs(farX)).toBeLessThan(Math.abs(nearX))
    expect(Math.abs(farY)).toBeLessThan(Math.abs(nearY))
  })
})

describe('cube culling', () => {
  it('shows only the near face of a cube seen straight on', () => {
    expect(visibleCubeEdges([0, 0, 0], cubeHalf, 0, 0, 700)).toHaveLength(4)
  })

  it('shows three faces, nine edges, of a cube turned to a corner', () => {
    expect(visibleCubeEdges([0, 0, 0], cubeHalf, -0.35, 0.45, 700)).toHaveLength(9)
  })

  it('never draws an edge twice', () => {
    const edges = visibleCubeEdges([0, 0, 0], cubeHalf, -0.35, 0.45, 700)
    const keys = edges.map(([p, q]) => [p.join(), q.join()].sort().join('|'))
    expect(new Set(keys).size).toBe(edges.length)
  })

  it('draws every face of a cube behind the camera as culled rather than as an inside-out box', () => {
    // Turned a half circle, the cube shows its other face; still four edges.
    expect(visibleCubeEdges([0, 0, 0], cubeHalf, 0, Math.PI, 700)).toHaveLength(4)
  })
})

describe('wireScene', () => {
  it.each([0, 4, 14, 31])('lays out algorithm %i as six operators in number order', (index) => {
    const scene = wireScene(dx7Algorithms[index])
    expect(scene.map((operator) => operator.id)).toEqual([1, 2, 3, 4, 5, 6])
    for (const operator of scene) {
      const source = dx7Algorithms[index].find(({ id }) => id === operator.id)!
      expect(operator.carrier).toBe(getDx7OperatorRole(source) === 'carrier')
      expect(operator.links.length).toBeGreaterThan(0)
    }
  })

  it('puts carriers below the modulators that feed them, with y pointing up', () => {
    const scene = wireScene(dx7Algorithms[4])
    const carrier = scene.find((operator) => operator.carrier)!
    const modulator = scene.find((operator) => !operator.carrier)!
    expect(carrier.y).toBeLessThan(modulator.y)
  })

  it('gives feedback to the operators that have it and to no others', () => {
    const scene = wireScene(dx7Algorithms[14])
    const withFeedback = dx7Algorithms[14].filter((operator) => operator.feedback !== 0)
    expect(scene.filter((operator) => operator.feedback.length > 0).map((o) => o.id)).toEqual(
      withFeedback.map((operator) => operator.id).sort((a, b) => a - b),
    )
  })

  it('draws every algorithm about the same middle, so turning it does not shift between them', () => {
    const middles = dx7Algorithms.map((operators) => {
      const xs = wireScene(operators).map((operator) => operator.x)
      return (Math.min(...xs) + Math.max(...xs)) / 2
    })
    expect(Math.max(...middles) - Math.min(...middles)).toBeLessThan(120)
  })
})

describe('steppedPositions', () => {
  const from = [[0, 0]] as const
  const to = [[6, -12]] as const

  it('moves a sixth of the way each step and lands exactly on the target', () => {
    expect(steppedPositions(from, to, 0, 6)).toEqual([[0, 0]])
    expect(steppedPositions(from, to, 1, 6)).toEqual([[1, -2]])
    expect(steppedPositions(from, to, 6, 6)).toEqual([[6, -12]])
  })

  it('never overshoots when asked for more steps than there are', () => {
    expect(steppedPositions(from, to, 9, 6)).toEqual([[6, -12]])
  })
})
