import type { Patch } from '@/data/patches'
import type { Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { FM1_VOICE_NAME_LENGTH } from '@/lib/fm1-parameters'
import { fm1VaRecordKey } from '@/lib/fm1-va-record'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

// Where a packed DX7 voice keeps its name, which the comparison leaves out.
const nameOffset = 118

/** Patches whose voices sound the same, in library order. */
export type DuplicatePatchGroup = {
  /** True when the copies' FM1 effects are not all the same, so they may not play alike. */
  effectsDiffer: boolean
  patches: Patch[]
  /**
   * True when the copies' FM-1+VA settings records are not all the same, or only some have one, so
   * they may not play alike on FM-1+VA.
   */
  settingsDiffer: boolean
}

/**
 * A fingerprint of a voice's bytes without its name, so renamed copies match. A Virtual Analog
 * preset keeps its name in the same bytes as a DX7 voice; the two engines never match each other.
 */
function settingsFingerprint(data: Uint8Array, engine: 'dx7' | 'virtual-analog') {
  const named = data.slice()
  named.fill(0x20, nameOffset, nameOffset + FM1_VOICE_NAME_LENGTH)
  return `${engine}:${voiceFingerprint(named)}`
}

/**
 * Groups the patches in `banks` whose packed voice data matches apart from the name, so an imported
 * archive's repeats can be found and tidied. FM1 effects and FM-1+VA settings records are not
 * part of the match; a group says when they differ. Virtual Analog presets match on their voice
 * bytes the same way, and only each other. Groups come in the order of their first patch, and each
 * lists its patches in library order. An empty slot is left out.
 */
export function findDuplicatePatches(
  patches: readonly Patch[],
  voices: Readonly<Record<string, Dx7Voice>>,
  virtualAnalog: Readonly<Record<string, Uint8Array>>,
  effects: Readonly<Record<string, Uint8Array>>,
  records: Readonly<Record<string, Uint8Array>>,
  banks: readonly string[],
): DuplicatePatchGroup[] {
  const groups = new Map<string, Patch[]>()
  for (const patch of patches) {
    if (!banks.includes(patch.bank)) continue
    const voice = voices[patch.id]
    const virtualAnalogVoice = virtualAnalog[patch.id]
    const key = voice
      ? settingsFingerprint(voice.data, 'dx7')
      : virtualAnalogVoice
        ? settingsFingerprint(virtualAnalogVoice, 'virtual-analog')
        : undefined
    if (key === undefined) continue
    const group = groups.get(key)
    if (group) group.push(patch)
    else groups.set(key, [patch])
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      effectsDiffer:
        new Set(group.map((patch) => normalizeFm1Effects(effects[patch.id]).join(','))).size > 1,
      patches: group,
      settingsDiffer: new Set(group.map((patch) => fm1VaRecordKey(records[patch.id]))).size > 1,
    }))
}
