import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'

const effectCount = 6

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
  for (let effect = 0; effect < effectCount; effect += 1) {
    const switchController = effect * 4
    effects[switchController] = record[28 + effect * 3]
    // The Filter and Reverb have a type controller, so two settings rather than three.
    const typed = effect < 2
    if (typed) effects[switchController + 1] = record[29 + effect * 3]
    const settingCount = typed ? 2 : 3
    for (let setting = 0; setting < settingCount; setting += 1) {
      effects[switchController + 4 - settingCount + setting] = record[effect * 3 + setting]
    }
  }
  return normalizeFm1Effects(effects)
}
