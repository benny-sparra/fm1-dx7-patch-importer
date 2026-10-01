import { getOperatorParameterDefinition, resolveOperatorParameterIndex } from '@/lib/fm1-parameters'
import type { ParameterEdit } from '@/lib/patch-editor'

/*
  Typing an operator's frequency rather than turning Coarse and Fine.

  In ratio mode the DX7 plays (coarse, or 0.5 for coarse 0) × (1 + fine / 100),
  so 3.5 is Coarse 2 and Fine 75, not Coarse 3 with Fine somewhere between
  16 (3.48) and 17 (3.51). In fixed mode it plays
  10 ^ (decade + fine / 100) Hz, where the decade is Coarse's two low bits.
  Not every value is reachable, so an entry takes the nearest one, and the
  field then shows what the FM1 actually plays.
*/

export type OscillatorMode = 'ratio' | 'fixed'

type FrequencySetting = { coarse: number; fine: number }

const coarseMax = getOperatorParameterDefinition('operator.frequency.coarse').max
const fineMax = getOperatorParameterDefinition('operator.frequency.fine').max
const decadeBits = 0b11

/** The ratio an operator plays in ratio mode. */
export const operatorRatio = (coarse: number, fine: number) =>
  (coarse === 0 ? 0.5 : coarse) * (1 + fine / 100)

/** The frequency in hertz an operator plays in fixed mode. */
export const operatorFixedHertz = (coarse: number, fine: number) =>
  10 ** ((coarse & decadeBits) + fine / 100)

/**
 * The Coarse and Fine that play closest to a ratio. Of two equally close, the
 * one with less Fine wins, so 3 is Coarse 3 rather than Coarse 2 with Fine 50.
 */
export function nearestRatioSetting(ratio: number): FrequencySetting {
  let best: FrequencySetting = { coarse: 0, fine: 0 }
  let bestError = Infinity

  for (let coarse = 0; coarse <= coarseMax; coarse += 1) {
    const base = coarse === 0 ? 0.5 : coarse
    const fine = Math.min(fineMax, Math.max(0, Math.round((ratio / base - 1) * 100)))
    const error = Math.abs(operatorRatio(coarse, fine) - ratio)
    if (error < bestError - 1e-9 || (Math.abs(error - bestError) <= 1e-9 && fine < best.fine)) {
      best = { coarse, fine }
      bestError = error
    }
  }

  return best
}

/**
 * The Coarse and Fine that play closest to a fixed frequency in hertz. Only
 * Coarse's two low bits choose the decade, so its other bits are kept from
 * `coarse`, the value they replace, and ratio mode still finds it unchanged.
 */
export function nearestFixedFrequencySetting(hertz: number, coarse: number): FrequencySetting {
  const highestDecade = decadeBits
  const exponent = Math.min(highestDecade + fineMax / 100, Math.max(0, Math.log10(hertz)))
  let decade = Math.min(highestDecade, Math.floor(exponent))
  let fine = Math.round((exponent - decade) * 100)
  if (fine > fineMax) {
    decade += 1
    fine = 0
  }
  return { coarse: (coarse & ~decadeBits) | decade, fine }
}

/** The number the frequency field shows, without its unit. */
export function formatFrequencyEntry(mode: OscillatorMode, coarse: number, fine: number) {
  if (mode === 'ratio') return operatorRatio(coarse, fine).toFixed(2)
  const hertz = operatorFixedHertz(coarse, fine)
  if (hertz >= 1000) return hertz.toFixed(0)
  if (hertz >= 10) return hertz.toFixed(1)
  return hertz.toFixed(2)
}

/**
 * Reads a typed frequency: a ratio such as `3.5` or `3.5×` in ratio mode, or
 * hertz such as `440`, `440 Hz` or `1.2k` in fixed mode. A comma may stand for
 * the decimal point. Returns null for anything else, or for zero.
 */
export function parseFrequencyEntry(text: string, mode: OscillatorMode): number | null {
  const match = /^(\d+(?:\.\d*)?|\.\d+)(k)?(hz|×|x)?$/.exec(
    text.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.'),
  )
  if (!match) return null
  const [, digits, kilo, unit] = match
  if (mode === 'ratio' && (kilo || unit === 'hz')) return null
  if (mode === 'fixed' && (unit === '×' || unit === 'x')) return null

  const value = Number(digits) * (kilo ? 1000 : 1)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * The Coarse and Fine edits that bring an operator to a typed frequency, as
 * one change so they undo together, or null when the text is not a frequency.
 */
export function frequencyEntryEdits(
  parameters: Uint8Array,
  operator: number,
  text: string,
): ParameterEdit[] | null {
  const coarseIndex = resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')
  const fineIndex = resolveOperatorParameterIndex(operator, 'operator.frequency.fine')
  const mode = operatorOscillatorMode(parameters, operator)
  const value = parseFrequencyEntry(text, mode)
  if (value === null) return null

  const setting =
    mode === 'ratio'
      ? nearestRatioSetting(value)
      : nearestFixedFrequencySetting(value, parameters[coarseIndex])
  return [
    [coarseIndex, setting.coarse, 0, coarseMax],
    [fineIndex, setting.fine, 0, fineMax],
  ]
}

export function operatorOscillatorMode(parameters: Uint8Array, operator: number): OscillatorMode {
  return parameters[resolveOperatorParameterIndex(operator, 'operator.oscillatorMode')] === 0
    ? 'ratio'
    : 'fixed'
}
