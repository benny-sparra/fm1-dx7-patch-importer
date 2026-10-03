import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'

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
