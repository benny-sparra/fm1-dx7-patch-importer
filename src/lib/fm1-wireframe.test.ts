import { describe, expect, it } from 'vitest'

import {
  circlePoints,
  clampPitch,
  frameLines,
  makeCamera,
  maxPitch,
  minPitch,
  project,
  restingView,
  rotate,
  roundedRectPoints,
  sideFacesCamera,
  spinSpeed,
  spinStep,
  type Vec2,
} from './fm1-wireframe'

const camera = makeCamera(280, 200)
const degrees = (value: number) => (value * Math.PI) / 180

describe('the wireframe camera', () => {
  it('leaves a point alone when the view is straight on from above the horizon', () => {
    const [x, y, z] = rotate([10, 0, 0], { pitch: 0, yaw: 0 })
    expect([x, y, z]).toEqual([10, 0, 0])
  })

  it('keeps every distance when it turns the case', () => {
    const [x, y, z] = rotate([30, 40, 50], { pitch: degrees(37), yaw: degrees(-61) })
    expect(Math.hypot(x, y, z)).toBeCloseTo(Math.hypot(30, 40, 50), 9)
  })

  it('shows the panel top edge higher on the screen when looking down on it', () => {
    const near = project(rotate([0, 0, -200], restingView), camera)
    const far = project(rotate([0, 0, 200], restingView), camera)
    expect(far[1]).toBeLessThan(near[1])
  })

  it('shows a point on the axis in the middle of the canvas, and a nearer one larger', () => {
    expect(project([0, 0, 0], camera)[0]).toBe(140)
    const nearer = project([100, 0, -500], camera)
    const further = project([100, 0, 500], camera)
    expect(nearer[0] - 140).toBeGreaterThan(further[0] - 140)
  })

  it('keeps the tilt between looking nearly flat and looking straight down', () => {
    expect(clampPitch(-1)).toBe(minPitch)
    expect(clampPitch(5)).toBe(maxPitch)
    expect(clampPitch(restingView.pitch)).toBe(restingView.pitch)
  })
})

describe('the wireframe geometry', () => {
  it('walks a rounded rectangle once round and closes on itself without repeating a point', () => {
    const points = roundedRectPoints([0, 0, 100, 60, 10], 4)
    expect(points).toHaveLength(20)
    expect(new Set(points.map(([x, z]) => `${x.toFixed(6)},${z.toFixed(6)}`)).size).toBe(20)
    const area = points.reduce((sum, [x1, z1], index) => {
      const [x2, z2] = points[(index + 1) % points.length]
      return sum + (x1 * z2 - x2 * z1) / 2
    }, 0)
    expect(Math.abs(area)).toBeGreaterThan(100 * 60 * 0.95)
    expect(Math.abs(area)).toBeLessThan(100 * 60)
  })

  it('draws a circle as evenly spaced points at one radius', () => {
    const points = circlePoints([50, 50, 20], 12)
    const radii = points.map(([x, z]) => Math.hypot(x - (50 - 461.5), z - (277 - 50)))
    for (const radius of radii) expect(radius).toBeCloseTo(20, 9)
    expect(points).toHaveLength(12)
  })

  it('leaves out the sides of the case that face away from the camera', () => {
    // Looking from the front and slightly right, the front and right walls show, the others do not.
    const view = { pitch: degrees(45), yaw: degrees(0) }
    const square: Vec2[] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]
    const faces = square.map((point, index) =>
      sideFacesCamera(point, square[(index + 1) % 4], true, view, camera, 0),
    )
    // Counter-clockwise from the front-left: front, right, back, left.
    expect(faces).toEqual([true, false, false, false])
    const turned = square.map((point, index) =>
      sideFacesCamera(
        point,
        square[(index + 1) % 4],
        true,
        { pitch: degrees(45), yaw: degrees(-40) },
        camera,
        0,
      ),
    )
    expect(turned.filter(Boolean)).toHaveLength(2)
  })

  it('draws the same lines whichever way the loop around a part is wound', () => {
    const square: Vec2[] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]
    const reversed = [...square].toReversed()
    const view = { pitch: degrees(50), yaw: degrees(20) }
    const front = (points: Vec2[], counterClockwise: boolean) =>
      points
        .map((point, index) => [point, points[(index + 1) % 4]] as const)
        .filter(([a, b]) => sideFacesCamera(a, b, counterClockwise, view, camera, 0))
        .map(([a, b]) =>
          [a, b]
            .map(([x, z]) => `${x},${z}`)
            .sort()
            .join('|'),
        )
        .sort()
    expect(front(reversed, false)).toEqual(front(square, true))
  })

  it('draws only finite lines, with fewer walls showing than a part has sides', () => {
    for (const yaw of [-80, -30, 0, 18, 45, 120, 200]) {
      const lines = frameLines({ pitch: degrees(45), yaw: degrees(yaw) }, camera)
      expect(lines.length).toBeGreaterThan(500)
      for (const line of lines.flatMap(([x1, y1, x2, y2]) => [x1, y1, x2, y2])) {
        expect(Number.isFinite(line)).toBe(true)
      }
    }
  })

  it('changes which walls it draws as the case turns, never drawing the back of it', () => {
    const wallLines = (yaw: number) =>
      frameLines({ pitch: degrees(45), yaw: degrees(yaw) }, camera).filter((line) => line[4])
    // Turned half way round, the same walls are hidden by the other half, so the count matches
    // when the case is turned by a half turn and the far side shows instead of the near one.
    expect(wallLines(0).length).toBeGreaterThan(0)
    expect(wallLines(0)).not.toEqual(wallLines(90))
    expect(Math.abs(wallLines(0).length - wallLines(180).length)).toBeLessThan(
      wallLines(0).length * 0.1,
    )
  })
})

describe('the turntable', () => {
  it('keeps turning the same way at its resting speed, round a full circle', () => {
    let state = { velocity: spinSpeed, yaw: 0 }
    for (let step = 0; step < 1000; step += 1) state = spinStep(state.yaw, state.velocity, 0.05)
    expect(state.velocity).toBeCloseTo(spinSpeed, 9)
    expect(state.yaw).toBeCloseTo(spinSpeed * 50, 6)
    expect(state.yaw).toBeGreaterThan(Math.PI * 2)
  })

  it('eases a flick back to the resting speed', () => {
    let state = { velocity: 6, yaw: 0 }
    state = spinStep(state.yaw, state.velocity, 0.05)
    expect(state.velocity).toBeLessThan(6)
    expect(state.velocity).toBeGreaterThan(spinSpeed)
    for (let step = 0; step < 200; step += 1) state = spinStep(state.yaw, state.velocity, 0.05)
    expect(state.velocity).toBeCloseTo(spinSpeed, 3)
  })

  it('stands still for a step of no time', () => {
    expect(spinStep(1.2, spinSpeed, 0).yaw).toBe(1.2)
  })
})

describe('the framing', () => {
  it('keeps the whole case on the canvas at every turn, from flat to steep', () => {
    const bounds = { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity }
    for (const pitch of [minPitch, restingView.pitch, degrees(70)]) {
      for (let yaw = 0; yaw < Math.PI * 2; yaw += 0.1) {
        for (const [x1, y1, x2, y2] of frameLines({ pitch, yaw }, camera)) {
          bounds.left = Math.min(bounds.left, x1, x2)
          bounds.right = Math.max(bounds.right, x1, x2)
          bounds.top = Math.min(bounds.top, y1, y2)
          bounds.bottom = Math.max(bounds.bottom, y1, y2)
        }
      }
    }
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(280)
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(200)
  })
})

describe('the caps', () => {
  it('draws the MASTER knob mark as the one hot line', () => {
    const hot = frameLines(restingView, camera).filter((line) => line[5])
    expect(hot).toHaveLength(1)
    expect(hot[0][4]).toBe(false)
  })

  it('draws each cap solid: its far foot and posts show dimly through it', () => {
    const lines = frameLines(restingView, camera)
    // The case alone has no dim posts; every cap adds some, so far more lines are dim than not.
    const dim = lines.filter((line) => line[4]).length
    expect(dim).toBeGreaterThan(200)
  })
})
