import type { Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { fm1VaRecordKey } from '@/lib/fm1-va-record'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

/**
 * What a patch plays: its voice data, which includes its name, its FM1 effects, and the FM-1+VA
 * settings record it carries, if any. Two patches with the same key sound the same, so a search
 * lists only the first, and a favourite lights the heart of every slot that holds it.
 */
export function makeSoundKey(fingerprint: number, effectsKey: string, recordKey = '') {
  return recordKey ? `${fingerprint}/${effectsKey}/${recordKey}` : `${fingerprint}/${effectsKey}`
}

/**
 * The sound key of a voice, its effects, and its record. Missing effects are the defaults, as they
 * play, and a patch without a record differs from every patch with one.
 */
export function soundKey(voice: Dx7Voice, effects: Uint8Array | undefined, record?: Uint8Array) {
  return makeSoundKey(
    voiceFingerprint(voice.data),
    normalizeFm1Effects(effects).join(','),
    fm1VaRecordKey(record),
  )
}

/**
 * The sound key of a Virtual Analog preset's voice bytes, its effects, and its record. It never
 * equals a DX7 voice's key, since the same bytes play differently on the other engine.
 */
export function virtualAnalogSoundKey(
  voice: Uint8Array,
  effects: Uint8Array | undefined,
  record: Uint8Array,
) {
  return `va:${makeSoundKey(
    voiceFingerprint(voice),
    normalizeFm1Effects(effects).join(','),
    fm1VaRecordKey(record),
  )}`
}
