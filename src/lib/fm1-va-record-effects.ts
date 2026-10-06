import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import type { Fm1Firmware } from '@/lib/fm1-firmware'
import { FM1_VA_BITCRUSH_DEFAULTS, FM1_VA_STOCK_EFFECT_ORDER } from '@/lib/fm1-parameters'

const effectCount = 6

/** Each effect controller, CC 0 to 23, with the record byte that holds its value. */
const effectRecordBytes = Array.from({ length: effectCount }, (_, effect) => {
  const switchController = effect * 4
  // The Filter and Reverb have a type controller, so two settings rather than three.
  const typed = effect < 2
  const settingCount = typed ? 2 : 3
  return [
    [switchController, 28 + effect * 3],
    ...(typed ? [[switchController + 1, 29 + effect * 3]] : []),
    ...Array.from({ length: settingCount }, (_value, setting) => [
      switchController + 4 - settingCount + setting,
      effect * 3 + setting,
    ]),
  ]
}).flat() as [controller: number, recordByte: number][]

/** The record bytes that hold the FM1 effects; the rest hold the preset's other settings. */
export const fm1VaEffectRecordBytes: ReadonlySet<number> = new Set(
  effectRecordBytes.map(([, recordByte]) => recordByte),
)

/**
 * The FM1 effects a settings record holds, one value for each effect controller, CC 0 to 23, as
 * the effects panel edits them (docs/fm1-research.md, "What the record holds"). Effect _e_, in
 * controller order, keeps its switch in byte 28 + 3e and, for the Filter and Reverb, its type in
 * byte 29 + 3e. Its settings fill bytes 3e onwards in the order of their controllers. Each byte is
 * the value the FM1 uses, which is the value its controller sends.
 *
 * Lazy code alone imports this, so it does not import the record module, which the entry holds.
 */
export function fm1VaRecordEffects(record: Uint8Array) {
  const effects = new Uint8Array(fm1EffectParameterCount)
  for (const [controller, recordByte] of effectRecordBytes) {
    effects[controller] = record[recordByte]
  }
  return normalizeFm1Effects(effects)
}

/**
 * A copy of `record` holding `effects` in the bytes `fm1VaRecordEffects` reads them from, and
 * every other byte as it was, so a preset write carries the library's effects without changing
 * what the record holds beyond them.
 */
export function fm1VaRecordWithEffects(record: Uint8Array, effects: Uint8Array) {
  const normalized = normalizeFm1Effects(effects)
  const updated = record.slice()
  for (const [controller, recordByte] of effectRecordBytes) {
    updated[recordByte] = normalized[controller]
  }
  return updated
}

/** Record byte 38 (29 + 3 × 3) holds Distortion's type, which no controller sets. */
const distortionTypeByte = 38

/**
 * Distortion's types on FM-1+VA, each at the value the record stores it as. Soft Clip is M-VAVE's
 * original distortion; Hard Clip and Foldback are FM-1+VA's own (docs/fm1-research.md).
 */
export const fm1VaDistortionTypes = ['softClip', 'hardClip', 'foldback'] as const

/** Distortion's type as the record holds it, which may be a value no type is known for. */
export function fm1VaRecordDistortionType(record: Uint8Array) {
  return record[distortionTypeByte]
}

/** A copy of `record` with Distortion's type set to `type`, and every other byte as it was. */
export function fm1VaRecordWithDistortionType(record: Uint8Array, type: number) {
  const updated = record.slice()
  updated[distortionTypeByte] = type
  return updated
}

/** FM-1_096, the FM-1+VA release that added Bitcrush. */
const firstBitcrushRelease = 96

/** Whether the FM1 runs FM-1+VA from the release that plays Bitcrush. */
export function playsFm1VaBitcrush(firmware: Fm1Firmware) {
  // `classifyFm1Firmware` names firmware FM-1+VA only for an `FM-1_NNN` identity.
  if (firmware.kind !== 'fm1-va') return false
  return Number(firmware.identity.slice('FM-1_'.length)) >= firstBitcrushRelease
}

/**
 * Bitcrush's own record byte (docs/fm1-research.md, "FM-1_096"): `80` once it has been set, `08`
 * while it is on, and its place among the seven rows of the Effects list in bits 0–2. Its Bits,
 * Sample Rate, and Mix take the unused type bytes of Delay, Chorus, and Phaser.
 */
const bitcrushByte = 5
const bitcrushSet = 0x80
const bitcrushOn = 0x08
const bitcrushPlaceBits = 0x07
const bitcrushSettingBytes = [35, 41, 44] as const

/** Bitcrush's settings in the editor's order: switch, Bits, Sample Rate, and Mix. */
export const fm1VaBitcrushSettings = [
  { id: 'enabled', max: 1, min: 0 },
  { id: 'bits', max: 16, min: 1 },
  { id: 'sampleRate', max: 100, min: 0 },
  { id: 'mix', max: 100, min: 0 },
] as const

/** The chain bytes, 27 + 3k, which list the six effects other than Bitcrush top to bottom. */
const chainBytes = [27, 30, 33, 36, 39, 42] as const
const distortion = 3

/** Whether `effects` holds each of the effect numbers 0 to `count` − 1 once. */
function isOrder(effects: readonly number[], count: number) {
  return (
    effects.length === count &&
    [...effects].sort((first, second) => first - second).every((effect, index) => effect === index)
  )
}

/** The six effects other than Bitcrush, first to last. A chain that is not them once each plays in
 * the stock order. */
function recordChain(record: Uint8Array) {
  const chain = chainBytes.map((byte) => record[byte])
  return isOrder(chain, chainBytes.length) ? chain : [0, 1, 2, 3, 4, 5]
}

/**
 * Where a preset that never set Bitcrush plays it: straight after the Distortion, counted among
 * all seven rows.
 */
function placeAfterDistortion(record: Uint8Array) {
  return recordChain(record).indexOf(distortion) + 1
}

/**
 * Bitcrush as the record holds it, in the editor's order: switch (0 or 1), Bits, Sample Rate, and
 * Mix. A record that never set it, as before FM-1_096, holds it Off at its defaults, and a value
 * out of its range is brought into it.
 */
export function fm1VaRecordBitcrush(record: Uint8Array): number[] {
  if (!(record[bitcrushByte] & bitcrushSet)) return [...FM1_VA_BITCRUSH_DEFAULTS]
  const values = [
    record[bitcrushByte] & bitcrushOn ? 1 : 0,
    ...bitcrushSettingBytes.map((byte) => record[byte]),
  ]
  return values.map((value, index) => {
    const { max, min } = fm1VaBitcrushSettings[index]
    return Math.max(min, Math.min(max, value))
  })
}

/**
 * A copy of `record` holding `bitcrush`, in the editor's order. A record whose Bitcrush already
 * reads as `bitcrush` is returned as it was, so a patch whose Bitcrush was never touched keeps a
 * record that never set it. Setting it marks it set and writes all three settings, as the FM1 does
 * on the first edit, keeping its place, or putting it after the Distortion where it had none.
 */
export function fm1VaRecordWithBitcrush(record: Uint8Array, bitcrush: readonly number[]) {
  const current = fm1VaRecordBitcrush(record)
  if (current.every((value, index) => value === bitcrush[index])) return record
  const updated = record.slice()
  const place =
    record[bitcrushByte] & bitcrushSet
      ? record[bitcrushByte] & bitcrushPlaceBits
      : placeAfterDistortion(record)
  const [enabled, ...settings] = bitcrush
  updated[bitcrushByte] = bitcrushSet | (enabled ? bitcrushOn : 0) | place
  bitcrushSettingBytes.forEach((byte, index) => {
    const { max, min } = fm1VaBitcrushSettings[index + 1]
    updated[byte] = Math.max(min, Math.min(max, Math.round(settings[index])))
  })
  return updated
}

/** Bitcrush's Sample Rate setting, 0 to 100, in hertz: 300 Hz at 0 to 44.1 kHz at 100. */
export function fm1VaBitcrushSampleRateHz(value: number) {
  return 300 * (44118 / 300) ** (value / 100)
}

/** Bitcrush's number in an order of seven effects. */
const bitcrush = 6

/**
 * The order the record plays its seven effects in, first to last, as effect numbers: the chain of
 * six with Bitcrush at its place, or straight after the Distortion where it was never set.
 */
export function fm1VaRecordEffectOrder(record: Uint8Array): number[] {
  const order = recordChain(record)
  const place =
    record[bitcrushByte] & bitcrushSet
      ? Math.min(record[bitcrushByte] & bitcrushPlaceBits, order.length)
      : placeAfterDistortion(record)
  order.splice(place, 0, bitcrush)
  return order
}

/**
 * A copy of `record` playing its effects in `order`, seven effect numbers first to last. A record
 * already in that order is returned as it was, and so is one given an order that is not the seven
 * effects once each. The chain takes the six effects other than Bitcrush; Bitcrush's place goes in
 * its own byte, marking it set and writing its settings as the FM1 does, unless it stays where a
 * record that never set it already plays it.
 */
export function fm1VaRecordWithEffectOrder(record: Uint8Array, order: readonly number[]) {
  if (!isOrder(order, FM1_VA_STOCK_EFFECT_ORDER.length)) return record
  const current = fm1VaRecordEffectOrder(record)
  if (current.every((effect, index) => effect === order[index])) return record
  const updated = record.slice()
  order
    .filter((effect) => effect !== bitcrush)
    .forEach((effect, place) => (updated[chainBytes[place]] = effect))
  const place = order.indexOf(bitcrush)
  if (record[bitcrushByte] & bitcrushSet) {
    updated[bitcrushByte] = (record[bitcrushByte] & ~bitcrushPlaceBits) | place
  } else if (place !== fm1VaRecordEffectOrder(updated).indexOf(bitcrush)) {
    updated[bitcrushByte] = bitcrushSet | place
    bitcrushSettingBytes.forEach((byte, index) => {
      updated[byte] = FM1_VA_BITCRUSH_DEFAULTS[index + 1]
    })
  }
  return updated
}
