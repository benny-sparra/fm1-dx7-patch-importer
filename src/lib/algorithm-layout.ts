import { dx7Algorithms, type Dx7AlgorithmOperator } from '@/lib/dx7-algorithms'

/*
  The spacing a diagram lays its operators out on. The picker's thumbnails use
  the compact grid; the featured diagram spreads the same layout wider, so each
  box can carry its operator's frequency under the number. The flat diagram and
  the wireframe view both read this one layout.
*/
export type DiagramGrid = {
  column: number
  halfHeight: number
  halfWidth: number
  /** How far a feedback loop reaches out from its operator's centre. */
  loop: number
  row: number
}

export const thumbnailGrid: DiagramGrid = {
  column: 18,
  halfHeight: 5.5,
  halfWidth: 6.5,
  loop: 10,
  row: 15,
}
export const featuredGrid: DiagramGrid = {
  column: 28,
  halfHeight: 9,
  halfWidth: 12,
  loop: 14,
  row: 22,
}

export const nodeX = (grid: DiagramGrid, operator: Dx7AlgorithmOperator) =>
  operator.x * grid.column + grid.column / 2
export const nodeY = (grid: DiagramGrid, operator: Dx7AlgorithmOperator) =>
  operator.y * grid.row + grid.halfHeight + 2.5

export const linkPath = (grid: DiagramGrid, operator: Dx7AlgorithmOperator) => {
  const { column } = grid
  const x = nodeX(grid, operator)
  const y = nodeY(grid, operator) + grid.halfHeight - 0.5
  // The next row's centre, and the bus that joins carriers below their boxes.
  const next = y + grid.row - grid.halfHeight + 0.5
  const bus = y + 7

  switch (operator.link) {
    case 0:
      return `M ${x} ${y} V ${next}`
    case 1:
      return `M ${x} ${y} V ${bus} H ${x + column}`
    case 2:
      return `M ${x} ${y} V ${bus + 1}`
    case 3:
      return `M ${x} ${y} V ${next} M ${x} ${bus} H ${x + column} V ${next}`
    case 4:
      return `M ${x} ${y} V ${next} M ${x - column} ${bus} V ${next} H ${x + column} V ${next}`
    case 6:
      return `M ${x} ${y} V ${bus} H ${x + column * 2}`
    case 7:
      return `M ${x} ${y} V ${bus} H ${x - column}`
  }
}

export const feedbackPath = (grid: DiagramGrid, operator: Dx7AlgorithmOperator) => {
  if (operator.feedback === 0) return undefined
  const x = nodeX(grid, operator)
  const y = nodeY(grid, operator)
  const top = y - grid.halfHeight + 0.5
  const rise = y - grid.halfHeight - 3.5
  // Feedback 2 and 3 return from the operator two rows or one row below.
  const returnRows = operator.feedback === 2 ? 2 : operator.feedback === 3 ? 1 : 0
  const back =
    returnRows === 0 ? y + grid.halfHeight + 1.5 : y + returnRows * grid.row + grid.halfHeight + 2.5
  const direction = operator.feedback === 4 ? -1 : 1
  return `M ${x} ${top} V ${rise} H ${x + grid.loop * direction} V ${back} H ${x}`
}

export type Point = readonly [number, number]

/** The polylines of an absolute `M`/`V`/`H` path, one per `M`. */
export const pathPolylines = (path: string): Point[][] => {
  const tokens = path.split(' ')
  const lines: Point[][] = []
  let x = 0
  let y = 0
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++]
    if (command === 'M') {
      x = Number(tokens[index++])
      y = Number(tokens[index++])
      lines.push([[x, y]])
    } else {
      if (command === 'H') x = Number(tokens[index++])
      else if (command === 'V') y = Number(tokens[index++])
      lines[lines.length - 1].push([x, y])
    }
  }
  return lines
}

type Bounds = { maxX: number; maxY: number; minX: number; minY: number }

// The extent of everything a diagram draws: operator boxes plus the polylines
// of its links and feedback loops.
export const algorithmBounds = (
  grid: DiagramGrid,
  operators: readonly Dx7AlgorithmOperator[],
): Bounds => {
  const bounds = { maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity }
  const include = (x: number, y: number) => {
    bounds.minX = Math.min(bounds.minX, x)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxY = Math.max(bounds.maxY, y)
  }

  for (const operator of operators) {
    include(nodeX(grid, operator) - grid.halfWidth, nodeY(grid, operator) - grid.halfHeight)
    include(nodeX(grid, operator) + grid.halfWidth, nodeY(grid, operator) + grid.halfHeight)

    for (const path of [linkPath(grid, operator), feedbackPath(grid, operator)]) {
      if (!path) continue
      for (const line of pathPolylines(path)) for (const [x, y] of line) include(x, y)
    }
  }

  return bounds
}

/** The middle of every algorithm's drawing taken together: what the wireframe turns about. */
export const featuredCentre: Point = (() => {
  const all = dx7Algorithms.map((operators) => algorithmBounds(featuredGrid, operators))
  return [
    (Math.min(...all.map((b) => b.minX)) + Math.max(...all.map((b) => b.maxX))) / 2,
    (Math.min(...all.map((b) => b.minY)) + Math.max(...all.map((b) => b.maxY))) / 2,
  ]
})()
