import type { Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

/**
 * What a patch plays: its voice data, which includes its name, and its FM1 effects. Two patches
 * with the same key sound the same, so a search lists only the first, and a favourite lights the
 * heart of every slot that holds it.
 */
export function makeSoundKey(fingerprint: number, effectsKey: string) {
  return `${fingerprint}/${effectsKey}`
}

/** The sound key of a voice and its effects. Missing effects are the defaults, as they play. */
export function soundKey(voice: Dx7Voice, effects: Uint8Array | undefined) {
  return makeSoundKey(voiceFingerprint(voice.data), normalizeFm1Effects(effects).join(','))
}
