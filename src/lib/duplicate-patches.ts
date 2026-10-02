import type { Patch } from '@/data/patches'
import type { Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { FM1_VOICE_NAME_LENGTH } from '@/lib/fm1-parameters'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

// Where a packed DX7 voice keeps its name, which the comparison leaves out.
const nameOffset = 118

/** Patches whose voices sound the same, in library order. */
export type DuplicatePatchGroup = {
  /** True when the copies' FM1 effects are not all the same, so they may not play alike. */
  effectsDiffer: boolean
  patches: Patch[]
}

/** A fingerprint of a voice's settings without its name, so renamed copies match. */
function settingsFingerprint(voice: Dx7Voice) {
  const data = voice.data.slice()
  data.fill(0x20, nameOffset, nameOffset + FM1_VOICE_NAME_LENGTH)
  return voiceFingerprint(data)
}

/**
 * Groups the patches in `banks` whose packed voice data matches apart from the name, so an imported
 * archive's repeats can be found and tidied. FM1 effects are not part of the match; a group says
 * when they differ. Groups come in the order of their first patch, and each lists its patches in
 * library order. A patch without a voice is left out.
 */
export function findDuplicatePatches(
  patches: readonly Patch[],
  voices: Readonly<Record<string, Dx7Voice>>,
  effects: Readonly<Record<string, Uint8Array>>,
  banks: readonly string[],
): DuplicatePatchGroup[] {
  const groups = new Map<number, Patch[]>()
  for (const patch of patches) {
    const voice = voices[patch.id]
    if (!voice || !banks.includes(patch.bank)) continue
    const key = settingsFingerprint(voice)
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
    }))
}
