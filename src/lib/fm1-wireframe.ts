/*
  The welcome's turning wireframe: the FM1 as outlines, drawn with single-pixel lines the way Elite
  drew its ships. This file is the geometry and the camera, with no DOM, so tests can check
  projection and hidden-edge culling; `fm1-wireframe.tsx` paints what it returns.

  Model space: x to the right, y up, z away from the viewer (the panel's top edge), all in the
  photo's pixels from `fm1-outline.ts`, centred on the case.
*/

import {
  fm1Bezel,
  fm1Body,
  fm1BodyThickness,
  fm1ButtonGrid,
  fm1Heights,
  fm1Keys,
  fm1Knobs,
  fm1MasterMarkDegrees,
  fm1OctButtons,
  fm1Pads,
  fm1PhotoCentre,
  fm1Screen,
  fm1Slider,
  fm1Wells,
  type OutlineCircle,
  type OutlineRect,
} from './fm1-outline'

export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]

export type WireframeView = {
  /** Tilt of the camera above the panel, in radians. */
  pitch: number
  /** Turn about the vertical axis, in radians. */
  yaw: number
}

/** A straight line between two points on the canvas; `dim` lines are the hidden-side detail. */
export type WireLine = readonly [x1: number, y1: number, x2: number, y2: number, dim: boolean]

export const minPitch = (15 * Math.PI) / 180
export const maxPitch = (80 * Math.PI) / 180
export const restingView: WireframeView = { pitch: (45 * Math.PI) / 180, yaw: (18 * Math.PI) / 180 }

export function clampPitch(pitch: number) {
  return Math.min(maxPitch, Math.max(minPitch, pitch))
}

/** One outline, at a height, with an optional wall down to a base. `walls` are the sides' lines. */
type Loop = {
  base: number
  /** Whether the sides are drawn, with a vertical at each corner that is a silhouette. */
  bright: boolean
  points: readonly Vec2[]
  /** Indices of vertices that always get a post when their sides show (the case's corners). */
  posts: readonly number[]
  top: number
  walls: boolean
}

const cornerSegments = 4

/** The points around a rounded rectangle, in photo pixels moved to model space, going round once. */
export function roundedRectPoints([x, y, w, h, r]: OutlineRect, segments = cornerSegments): Vec2[] {
  const radius = Math.min(r, w / 2, h / 2)
  const centres: Vec3[] = [
    [x + w - radius, y + radius, -90], // top right
    [x + w - radius, y + h - radius, 0], // bottom right
    [x + radius, y + h - radius, 90], // bottom left
    [x + radius, y + radius, 180], // top left
  ]
  const points: Vec2[] = []
  for (const [cx, cy, start] of centres) {
    for (let step = 0; step <= segments; step += 1) {
      const angle = ((start + (step / segments) * 90) * Math.PI) / 180
      points.push(toModel(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius))
    }
  }
  return points
}

export function circlePoints([cx, cy, r]: OutlineCircle, count = 20): Vec2[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2
    return toModel(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  })
}

/** Photo pixels to model space: the photo's y runs down the panel, model z runs up it. */
function toModel(px: number, py: number): Vec2 {
  return [px - fm1PhotoCentre.x, fm1PhotoCentre.y - py]
}

function rectLoop(rect: OutlineRect, top: number, base = top, segments = cornerSegments): Loop {
  return {
    base,
    bright: false,
    points: roundedRectPoints(rect, segments),
    posts: [],
    top,
    walls: base !== top,
  }
}

function buildLoops(): Loop[] {
  const loops: Loop[] = []
  const { button, bezel, key, knob } = fm1Heights

  const bodyPoints = roundedRectPoints(fm1Body, 6)
  loops.push({
    base: -fm1BodyThickness,
    bright: true,
    points: bodyPoints,
    // The middle of each corner's arc: its posts mark the case's four corners.
    posts: [3, 10, 17, 24],
    top: 0,
    walls: true,
  })
  for (const well of fm1Wells) loops.push(rectLoop(well, -3))
  loops.push(rectLoop(fm1Bezel, bezel.top, bezel.base, 5))
  loops.push(rectLoop(fm1Screen, bezel.top, bezel.top, 2))

  for (const rect of fm1OctButtons) loops.push(rectLoop(rect, button.top, button.base, 3))
  const grid = fm1ButtonGrid
  for (const y of grid.rows) {
    for (let column = 0; column < grid.columns; column += 1) {
      loops.push(
        rectLoop(
          [grid.firstX + column * grid.pitchX, y, grid.w, grid.h, 10],
          button.top,
          button.base,
          3,
        ),
      )
    }
  }

  for (const centre of fm1Pads.centres) {
    const x = centre - fm1Pads.w / 2
    loops.push(rectLoop([x, fm1Pads.y, fm1Pads.w, fm1Pads.h, fm1Pads.w / 2], key.top, key.base))
    const slit = fm1Pads.slit
    loops.push(
      rectLoop([centre - slit.w / 2, slit.y, slit.w, slit.h, slit.w / 2], key.top, key.top, 2),
    )
  }
  const slider = fm1Slider
  loops.push(
    rectLoop(
      [slider.centre - slider.w / 2, slider.y, slider.w, slider.h, slider.w / 2],
      key.top,
      key.base,
    ),
  )
  loops.push(
    rectLoop(
      [
        slider.centre - slider.slit.w / 2,
        slider.slit.y,
        slider.slit.w,
        slider.slit.h,
        slider.slit.w / 2,
      ],
      key.top,
      key.top,
      2,
    ),
  )

  for (let index = 0; index < fm1Keys.count; index += 1) {
    const centre = fm1Keys.firstCentre + index * fm1Keys.pitch
    loops.push(
      rectLoop(
        [centre - fm1Keys.w / 2, fm1Keys.y, fm1Keys.w, fm1Keys.h, fm1Keys.w / 2],
        key.top,
        key.base,
      ),
    )
    const slit = fm1Keys.slit
    loops.push(
      rectLoop([centre - slit.w / 2, slit.y, slit.w, slit.h, slit.w / 2], key.top, key.top, 2),
    )
  }

  for (const knobCircle of fm1Knobs) {
    loops.push({
      base: knob.base,
      bright: false,
      points: circlePoints(knobCircle),
      posts: [],
      top: knob.top,
      walls: true,
    })
    const [cx, cy, r] = knobCircle
    // The grip ring on the knob's cap.
    loops.push({
      base: knob.top,
      bright: false,
      points: circlePoints([cx, cy, r * 0.62], 14),
      posts: [],
      top: knob.top,
      walls: false,
    })
  }
  return loops
}

let cachedLoops: Loop[] | undefined
const loops = () => (cachedLoops ??= buildLoops())

/** The MASTER knob's mark: a line from the knob's rim towards its centre, on the cap. */
function masterMark(): readonly [Vec3, Vec3] {
  const [cx, cy, r] = fm1Knobs[0]
  const angle = (fm1MasterMarkDegrees * Math.PI) / 180
  const dx = Math.sin(angle)
  const dy = -Math.cos(angle)
  const top = fm1Heights.knob.top
  const [x1, z1] = toModel(cx + dx * r * 0.3, cy + dy * r * 0.3)
  const [x2, z2] = toModel(cx + dx * r * 0.9, cy + dy * r * 0.9)
  return [
    [x1, top, z1],
    [x2, top, z2],
  ]
}

/** Half the case's thickness: the point the case turns about is its middle, not its top. */
const lift = fm1BodyThickness / 2

/** Turn a model point to camera space: yaw about the vertical, then tilt the camera down. */
export function rotate([x, y, z]: Vec3, { pitch, yaw }: WireframeView): Vec3 {
  const cosYaw = Math.cos(yaw)
  const sinYaw = Math.sin(yaw)
  const turnedX = x * cosYaw + z * sinYaw
  const turnedZ = -x * sinYaw + z * cosYaw
  const cosPitch = Math.cos(pitch)
  const sinPitch = Math.sin(pitch)
  return [turnedX, y * cosPitch + turnedZ * sinPitch, -y * sinPitch + turnedZ * cosPitch]
}

export type Camera = {
  distance: number
  height: number
  scale: number
  width: number
}

/** A camera for a canvas: far enough for a gentle perspective, and the case framed. */
export function makeCamera(width: number, height: number): Camera {
  return { distance: 2600, height, scale: width * 0.00063, width }
}

/** A point in camera space to the canvas, with perspective shrinking what is further away. */
export function project([x, y, z]: Vec3, camera: Camera): Vec2 {
  const shrink = camera.distance / (camera.distance + z)
  return [
    camera.width / 2 + x * camera.scale * shrink,
    camera.height * 0.4 - y * camera.scale * shrink,
  ]
}

function polygonArea(points: readonly Vec2[]) {
  let area = 0
  points.forEach(([x1, z1], index) => {
    const [x2, z2] = points[(index + 1) % points.length]
    area += x1 * z2 - x2 * z1
  })
  return area / 2
}

/**
 * Whether the side of a loop between two points faces the camera. A side is hidden when its outward
 * normal points away from the camera, which is how the far walls of the case are left out.
 */
export function sideFacesCamera(
  a: Vec2,
  b: Vec2,
  counterClockwise: boolean,
  view: WireframeView,
  camera: Camera,
  level: number,
) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  // Outward normal on the ground plane; which side that is depends on the loop's winding.
  const normal: Vec3 = counterClockwise ? [dz, 0, -dx] : [-dz, 0, dx]
  const middle = rotate([(a[0] + b[0]) / 2, level, (a[1] + b[1]) / 2], view)
  const turned = rotate(normal, { pitch: view.pitch, yaw: view.yaw })
  // From the face to the camera, at the origin of camera space, looking along +z.
  const toCamera: Vec3 = [-middle[0], -middle[1], -camera.distance - middle[2]]
  return turned[0] * toCamera[0] + turned[1] * toCamera[1] + turned[2] * toCamera[2] > 0
}

/** The lines of the case and everything on it, for one view. */
export function frameLines(view: WireframeView, camera: Camera): WireLine[] {
  const lines: WireLine[] = []
  const at = (x: number, y: number, z: number) => project(rotate([x, y - lift, z], view), camera)
  const push = (a: Vec2, b: Vec2, dim: boolean) => lines.push([a[0], a[1], b[0], b[1], dim])

  for (const loop of loops()) {
    const points = loop.points
    const counterClockwise = polygonArea(points) > 0
    const top = points.map(([x, z]) => at(x, loop.top, z))
    const facing = loop.walls
      ? points.map((point, index) =>
          sideFacesCamera(
            point,
            points[(index + 1) % points.length],
            counterClockwise,
            view,
            camera,
            loop.top - lift,
          ),
        )
      : []

    // The top outline, always in view since the camera looks down on the panel.
    top.forEach((point, index) =>
      push(point, top[(index + 1) % top.length], loop.top < 0 && !loop.walls),
    )
    if (!loop.walls) continue

    const base = points.map(([x, z]) => at(x, loop.base, z))
    facing.forEach((visible, index) => {
      const next = (index + 1) % points.length
      const previous = (index + points.length - 1) % points.length
      // The foot of a side that shows.
      if (visible) push(base[index], base[next], true)
      // A vertical edge where a side that shows meets one that does not (the outline's edge), and
      // at the case's corners, whenever a side that shows meets it.
      const silhouette = visible !== facing[previous]
      const post = loop.posts.includes(index) && (visible || facing[previous])
      if (silhouette || post) push(top[index], base[index], !loop.bright)
    })
  }

  const [from, to] = masterMark()
  push(at(from[0], from[1], from[2]), at(to[0], to[1], to[2]), false)
  return lines
}

/** The sway of the resting view: a slow swing about where the viewer left it. */
export function swayYaw(seconds: number) {
  return Math.sin(seconds * 0.4) * 0.42
}
