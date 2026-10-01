import { resolveOperatorParameterIndex } from '@/lib/fm1-parameters'
import { operatorFixedHertz, operatorOscillatorMode, operatorRatio } from '@/lib/operator-frequency'

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
  const frequency = operatorFixedHertz(coarse, fine)

  if (frequency >= 1000) return `${(frequency / 1000).toFixed(2)} kHz`
  if (frequency >= 10) return `${frequency.toFixed(1)} Hz`
  return `${frequency.toFixed(2)} Hz`
}

/**
 * An operator's frequency as the rack and the algorithm diagram show it: a
 * ratio in ratio mode, where coarse 0 means 0.5, or a fixed frequency.
 * The compact form, for the diagram's small boxes, drops the ratio's × and
 * the space before a unit, so a bare number reads as a ratio there.
 */
export function formatOperatorFrequency(
  parameters: Uint8Array,
  operator: number,
  { compact = false }: { compact?: boolean } = {},
) {
  const coarse = parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')]
  const fine = parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.fine')]
  if (operatorOscillatorMode(parameters, operator) === 'fixed') {
    const frequency = formatOperatorFixedFrequency(coarse, fine)
    return compact ? frequency.replace(' ', '') : frequency
  }
  const ratio = operatorRatio(coarse, fine)
  return compact ? ratio.toFixed(2) : formatOperatorRatio(ratio)
}

/**
 * The band of an envelope graph the levels span, in its drawing's units. A
 * graph stretched to fill its column moves the bottom down; the default is
 * the fixed 400 by 180 drawing.
 */
export type EnvelopePlot = { bottom: number; top: number }

export const envelopePlot: EnvelopePlot = { bottom: 156, top: 20 }

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

export function envelopePointPosition(
  rate: number,
  level: number,
  index: number,
  plot: EnvelopePlot = envelopePlot,
) {
  return {
    x: 28 + index * slotWidth + ((99 - rate) / 99) * 58,
    y: plot.bottom - (level / 99) * (plot.bottom - plot.top),
  }
}

/** The pitch envelope's centre line, where level 50 leaves the pitch unchanged. */
const pitchCenter = (plot: EnvelopePlot) => (plot.top + plot.bottom) / 2

export function pitchEnvelopePointPosition(
  rate: number,
  level: number,
  index: number,
  plot: EnvelopePlot = envelopePlot,
) {
  const clampedLevel = clampEnvelopeValue(level, 50)
  const center = pitchCenter(plot)
  const y =
    clampedLevel >= 50
      ? center - ((clampedLevel - 50) / 49) * (center - plot.top)
      : center + ((50 - clampedLevel) / 50) * (plot.bottom - center)

  return {
    x: 28 + index * slotWidth + ((99 - rate) / 99) * 58,
    y,
  }
}

export function pitchEnvelopeLevelFromY(y: number, plot: EnvelopePlot = envelopePlot) {
  const center = pitchCenter(plot)
  const clampedY = Math.min(plot.bottom, Math.max(plot.top, y))
  const level =
    clampedY <= center
      ? 50 + ((center - clampedY) / (center - plot.top)) * 49
      : 50 - ((clampedY - center) / (plot.bottom - center)) * 50

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
