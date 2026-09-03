export const operatorColors = [
  'hsl(198 100% 58%)',
  'hsl(151 78% 49%)',
  'hsl(31 100% 58%)',
  'hsl(276 92% 68%)',
  'hsl(352 94% 66%)',
  'hsl(181 92% 48%)',
] as const

export function clampEnvelopeValue(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(99, Math.max(0, Math.round(value)))
}

export function rotaryControlAngle(value: number, min: number, max: number) {
  if (max <= min) return -135
  const clampedValue = Math.min(max, Math.max(min, value))
  return -135 + ((clampedValue - min) / (max - min)) * 270
}

export function formatOperatorRatio(ratio: number) {
  return `${ratio.toFixed(2)}×`
}

export function formatOperatorFixedFrequency(coarse: number, fine: number) {
  const frequency = 10 ** ((coarse & 0b11) + fine / 100)

  if (frequency >= 1000) return `${(frequency / 1000).toFixed(2)} kHz`
  if (frequency >= 10) return `${frequency.toFixed(1)} Hz`
  return `${frequency.toFixed(2)} Hz`
}

const plotTop = 20
const plotBottom = 156
const pitchCenter = 88
const slotWidth = 90

type EnvelopePointPosition = {
  x: number
  y: number
}

type EnvelopePointPositionFunction = (
  rate: number,
  level: number,
  index: number,
) => EnvelopePointPosition

export function envelopePointPosition(rate: number, level: number, index: number) {
  return {
    x: 28 + index * slotWidth + ((99 - rate) / 99) * 58,
    y: plotBottom - (level / 99) * (plotBottom - plotTop),
  }
}

export function pitchEnvelopePointPosition(rate: number, level: number, index: number) {
  const clampedLevel = clampEnvelopeValue(level, 50)
  const y =
    clampedLevel >= 50
      ? pitchCenter - ((clampedLevel - 50) / 49) * (pitchCenter - plotTop)
      : pitchCenter + ((50 - clampedLevel) / 50) * (plotBottom - pitchCenter)

  return {
    x: 28 + index * slotWidth + ((99 - rate) / 99) * 58,
    y,
  }
}

export function pitchEnvelopeLevelFromY(y: number) {
  const clampedY = Math.min(plotBottom, Math.max(plotTop, y))
  const level =
    clampedY <= pitchCenter
      ? 50 + ((pitchCenter - clampedY) / (pitchCenter - plotTop)) * 49
      : 50 - ((clampedY - pitchCenter) / (plotBottom - pitchCenter)) * 50

  return clampEnvelopeValue(level, 50)
}

export function envelopePath(
  rates: number[],
  levels: number[],
  pointPosition: EnvelopePointPositionFunction = envelopePointPosition,
) {
  const points = rates.map((rate, index) => pointPosition(rate, levels[index], index))
  return [
    `M 8 ${pointPosition(0, levels[3] ?? 0, 0).y}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
  ].join(' ')
}
