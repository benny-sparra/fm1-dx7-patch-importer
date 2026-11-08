import {
  feedbackPath,
  featuredCentre,
  featuredGrid,
  linkPath,
  nodeX,
  nodeY,
  pathPolylines,
  type Point,
} from '@/lib/algorithm-layout'
import { getDx7OperatorRole, type Dx7AlgorithmOperator } from '@/lib/dx7-algorithms'

export type Vec3 = readonly [number, number, number]

/** Turns a point about the scene's origin: about Y first, then about X. */
export function rotate([x, y, z]: Vec3, ax: number, ay: number): Vec3 {
  const cy = Math.cos(ay)
  const sy = Math.sin(ay)
  const x1 = x * cy + z * sy
  const z1 = -x * sy + z * cy
  const cx = Math.cos(ax)
  const sx = Math.sin(ax)
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx]
}

/**
 * Perspective: the camera sits `distance` in front of the origin, looking along +z, so a point
 * further away (larger z) is drawn smaller. Y points up; the result's y points down the screen.
 */
export function project([x, y, z]: Vec3, distance: number, scale: number): Point {
  const k = distance / (distance + z)
  return [x * scale * k, -y * scale * k]
}

// Each face of a unit cube: the vertex indices round it, and its outward normal.
const cubeVertices: readonly Vec3[] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
]
const cubeFaces: readonly { normal: Vec3; vertices: readonly number[] }[] = [
  { normal: [0, 0, -1], vertices: [0, 1, 2, 3] },
  { normal: [0, 0, 1], vertices: [4, 5, 6, 7] },
  { normal: [0, -1, 0], vertices: [0, 1, 5, 4] },
  { normal: [0, 1, 0], vertices: [3, 2, 6, 7] },
  { normal: [-1, 0, 0], vertices: [0, 3, 7, 4] },
  { normal: [1, 0, 0], vertices: [1, 2, 6, 5] },
]

/**
 * The edges of a box (centred at `centre`, `half` its half extents) that face the camera, each
 * once, after turning the scene. An edge is drawn if either face beside it faces the camera, and
 * faces turned away are culled, so a cube shows only the edges Elite-style wireframes show.
 */
export function visibleCubeEdges(
  centre: Vec3,
  half: Vec3,
  ax: number,
  ay: number,
  distance: number,
): (readonly [Vec3, Vec3])[] {
  const turned = cubeVertices.map(([x, y, z]) =>
    rotate([centre[0] + x * half[0], centre[1] + y * half[1], centre[2] + z * half[2]], ax, ay),
  )
  const seen = new Set<string>()
  const edges: (readonly [Vec3, Vec3])[] = []

  for (const { normal, vertices } of cubeFaces) {
    const n = rotate(normal, ax, ay)
    const faceCentre = rotate(
      [
        centre[0] + normal[0] * half[0],
        centre[1] + normal[1] * half[1],
        centre[2] + normal[2] * half[2],
      ],
      ax,
      ay,
    )
    // The camera is at (0, 0, -distance); a face shows when its normal points back at it.
    const towards =
      -n[0] * faceCentre[0] - n[1] * faceCentre[1] + n[2] * (-distance - faceCentre[2])
    if (towards <= 0) continue
    for (let index = 0; index < vertices.length; index++) {
      const a = vertices[index]
      const b = vertices[(index + 1) % vertices.length]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([turned[a], turned[b]])
    }
  }
  return edges
}

/** One operator in the wireframe: its place, and its link and feedback lines relative to it. */
export type WireOperator = {
  carrier: boolean
  /** The feedback loop, as polylines relative to the operator's place. */
  feedback: Point[][]
  id: number
  /** The links to the operators it modulates and to the bus, relative to its place. */
  links: Point[][]
  x: number
  y: number
}

/** Half extents of an operator's cube, a little under the flat box's so neighbours don't touch. */
export const wireCubeHalf: Vec3 = [
  featuredGrid.halfWidth - 2,
  featuredGrid.halfHeight - 1,
  featuredGrid.halfHeight - 1,
]

/**
 * An algorithm laid out for the wireframe: the flat diagram's own positions, links and feedback
 * (`algorithm-layout`), centred on the middle of all 32 and flipped to point y up. Operators are
 * in number order, so a scene tweens to another by index.
 */
export function wireScene(operators: readonly Dx7AlgorithmOperator[]): WireOperator[] {
  const [cx, cy] = featuredCentre
  const relative = (path: string | undefined, x: number, y: number) =>
    path
      ? pathPolylines(path).map((line) => line.map(([px, py]): Point => [px - x, -(py - y)]))
      : []

  return operators
    .map((operator) => {
      const x = nodeX(featuredGrid, operator)
      const y = nodeY(featuredGrid, operator)
      return {
        carrier: getDx7OperatorRole(operator) === 'carrier',
        feedback: relative(feedbackPath(featuredGrid, operator), x, y),
        id: operator.id,
        links: relative(linkPath(featuredGrid, operator), x, y),
        x: x - cx,
        y: -(y - cy),
      }
    })
    .sort((a, b) => a.id - b.id)
}

/** The places between two scenes' operators after `step` of `steps` equal moves. */
export function steppedPositions(
  from: readonly Point[],
  to: readonly Point[],
  step: number,
  steps: number,
): Point[] {
  const t = Math.min(step, steps) / steps
  return to.map(([x, y], index): Point => {
    const [fx, fy] = from[index] ?? [x, y]
    return [fx + (x - fx) * t, fy + (y - fy) * t]
  })
}
