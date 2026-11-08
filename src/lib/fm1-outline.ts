/*
  The FM1's top panel, traced from its product photo (src/assets/fm1-white-blue.webp, 923 × 554)
  for the welcome's turning wireframe.

  How it was derived: the white-and-blue finish has the most contrast, so a script read its pixels
  along rows and columns through each control and noted where the brightness jumps (key edges, slits,
  knob rims, the screen's bezel, the button wells). Where the photo is too soft to scan, such as the
  OCT buttons, the edges were read off a 3× crop. Then the outline was drawn over the photo and
  nudged until it sat on every edge; `docs/fm1-outline-check.png` is that comparison.

  Everything is in photo pixels, origin top-left, y down. The photo is a straight top-down view, so
  the panel needs no perspective correction. Only the heights (how far a part stands above the top
  surface, and how thick the case is) are estimates, since a top-down photo cannot show them.

  The FM1's USB-C and MIDI jacks sit on its back edge, which the photo does not show, so they are
  not drawn rather than guessed.
*/

/** A rounded rectangle: x, y, width, height, corner radius. */
export type OutlineRect = readonly [x: number, y: number, width: number, height: number, r: number]

/** A circle: centre x, centre y, radius. */
export type OutlineCircle = readonly [cx: number, cy: number, r: number]

export const fm1PhotoSize = { height: 554, width: 923 } as const

/** The photo's centre, which the wireframe turns about. */
export const fm1PhotoCentre = { x: 461.5, y: 277 } as const

/** The case: its top outline, and how thick it is (an estimate). */
export const fm1Body: OutlineRect = [2, 2, 919, 551, 40]
export const fm1BodyThickness = 90

/** The keybed tray, the button block, and the OCT block are recessed wells. */
export const fm1Wells: readonly OutlineRect[] = [
  [37, 317, 847, 198, 36], // keybed
  [490, 154, 369, 129, 22], // the twelve buttons
  [56, 238, 140, 44, 8], // OCT- and OCT+
]

/** The screen's bezel, and the glass inside it. */
export const fm1Bezel: OutlineRect = [238, 41, 218, 220, 32]
export const fm1Screen: OutlineRect = [269, 71, 158, 158, 4]

/** MASTER, SELECT, PRESETS, ALGORITHM, then KNOB1 to KNOB4. */
export const fm1Knobs: readonly OutlineCircle[] = [
  [76, 88, 22],
  [173, 88, 22],
  [75, 185, 22],
  [173, 185, 22],
  [518, 87, 22],
  [622, 87, 22],
  [726, 87, 22],
  [830, 87, 22],
]

/** The OCT- and OCT+ buttons. */
export const fm1OctButtons: readonly OutlineRect[] = [
  [65, 242, 50, 36, 8],
  [136, 242, 51, 36, 8],
]

/** The grid of twelve buttons, FX to GLO above, HOME to REC below. */
export const fm1ButtonGrid = { columns: 6, firstX: 508, pitchX: 58, rows: [165, 224], h: 47, w: 46 }

/** The ten pads (OP1 to POLY) and the long slider above the keys: centres, top, size, slit. */
export const fm1Pads = {
  centres: [98, 149, 200, 304, 356, 459, 511, 563, 666, 718],
  h: 84,
  slit: { h: 26, w: 6, y: 352 },
  w: 46,
  y: 329,
}
export const fm1Slider = { centre: 822, h: 82, slit: { h: 47, w: 8, y: 351 }, w: 47, y: 331 }

/** The sixteen keys: the first centre and the pitch between them, top, size, slit. */
export const fm1Keys = {
  count: 16,
  firstCentre: 72,
  h: 88,
  pitch: 51.8,
  slit: { h: 49, w: 6, y: 437 },
  w: 46,
  y: 417,
}

/** How far each kind of part stands above the top surface (up is positive); estimates. */
export const fm1Heights = {
  button: { base: -4, top: 6 },
  bezel: { base: 0, top: 6 },
  key: { base: -4, top: 10 },
  knob: { base: 0, top: 24 },
} as const

/** Where the MASTER knob's mark points, in degrees clockwise from straight up. */
export const fm1MasterMarkDegrees = -135
