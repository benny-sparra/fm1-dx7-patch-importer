import { describe, expect, it } from 'vitest'

import {
  fm1Bezel,
  fm1Body,
  fm1ButtonGrid,
  fm1Keys,
  fm1Knobs,
  fm1OctButtons,
  fm1Pads,
  fm1PhotoSize,
  fm1Screen,
  fm1Slider,
  fm1Wells,
  type OutlineRect,
} from './fm1-outline'

const rect = ([x, y, w, h]: OutlineRect) => ({ bottom: y + h, left: x, right: x + w, top: y })
const inside = (inner: OutlineRect, outer: OutlineRect) => {
  const a = rect(inner)
  const b = rect(outer)
  return a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom
}
const overlap = (first: OutlineRect, second: OutlineRect) => {
  const a = rect(first)
  const b = rect(second)
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

const keyRects = Array.from({ length: fm1Keys.count }, (_, index): OutlineRect => [
  fm1Keys.firstCentre + index * fm1Keys.pitch - fm1Keys.w / 2,
  fm1Keys.y,
  fm1Keys.w,
  fm1Keys.h,
  fm1Keys.w / 2,
])
const padRects = [
  ...fm1Pads.centres.map((centre): OutlineRect => [
    centre - fm1Pads.w / 2,
    fm1Pads.y,
    fm1Pads.w,
    fm1Pads.h,
    fm1Pads.w / 2,
  ]),
  [
    fm1Slider.centre - fm1Slider.w / 2,
    fm1Slider.y,
    fm1Slider.w,
    fm1Slider.h,
    fm1Slider.w / 2,
  ] satisfies OutlineRect,
]
const gridRects = fm1ButtonGrid.rows.flatMap((y) =>
  Array.from({ length: fm1ButtonGrid.columns }, (_, column): OutlineRect => [
    fm1ButtonGrid.firstX + column * fm1ButtonGrid.pitchX,
    y,
    fm1ButtonGrid.w,
    fm1ButtonGrid.h,
    10,
  ]),
)
const [keybed, buttonWell, octWell] = fm1Wells

describe('the traced FM1 outline', () => {
  it('has the controls the FM1 has, in the counts its panel shows', () => {
    expect(fm1Knobs).toHaveLength(8)
    expect(fm1OctButtons).toHaveLength(2)
    expect(gridRects).toHaveLength(12)
    expect(fm1Pads.centres).toHaveLength(10)
    expect(keyRects).toHaveLength(16)
    expect(fm1Wells).toHaveLength(3)
  })

  it('keeps every part inside the photo it was traced from', () => {
    const photo: OutlineRect = [0, 0, fm1PhotoSize.width, fm1PhotoSize.height, 0]
    for (const part of [
      fm1Body,
      fm1Bezel,
      ...fm1Wells,
      ...padRects,
      ...keyRects,
      ...gridRects,
      ...fm1OctButtons,
    ]) {
      expect(inside(part, photo)).toBe(true)
    }
    for (const [cx, cy, r] of fm1Knobs) {
      expect(inside([cx - r, cy - r, 2 * r, 2 * r, r], photo)).toBe(true)
    }
  })

  it('keeps every part on the case, and each button, pad and key in its well', () => {
    for (const part of [fm1Bezel, ...fm1Wells]) expect(inside(part, fm1Body)).toBe(true)
    expect(inside(fm1Screen, fm1Bezel)).toBe(true)
    for (const part of [...padRects, ...keyRects]) expect(inside(part, keybed)).toBe(true)
    for (const part of gridRects) expect(inside(part, buttonWell)).toBe(true)
    for (const part of fm1OctButtons) expect(inside(part, octWell)).toBe(true)
    for (const [cx, cy, r] of fm1Knobs) {
      expect(inside([cx - r, cy - r, 2 * r, 2 * r, r], fm1Body)).toBe(true)
    }
  })

  it('keeps parts of one kind apart, as the photo has gaps between them', () => {
    for (const group of [keyRects, padRects, gridRects, fm1OctButtons]) {
      group.forEach((first, index) => {
        group.slice(index + 1).forEach((second) => expect(overlap(first, second)).toBe(false))
      })
    }
    // The pads sit above the keys, the knobs outside every well.
    for (const pad of padRects) for (const key of keyRects) expect(overlap(pad, key)).toBe(false)
    for (const [cx, cy, r] of fm1Knobs) {
      const knob: OutlineRect = [cx - r, cy - r, 2 * r, 2 * r, r]
      for (const part of [fm1Bezel, ...fm1Wells]) expect(overlap(knob, part)).toBe(false)
    }
  })

  it('has sizes a rounded rectangle can draw', () => {
    for (const [, , w, h, r] of [
      fm1Body,
      fm1Bezel,
      fm1Screen,
      ...fm1Wells,
      ...padRects,
      ...keyRects,
    ]) {
      expect(w).toBeGreaterThan(0)
      expect(h).toBeGreaterThan(0)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(Math.min(w, h) / 2)
    }
  })
})
