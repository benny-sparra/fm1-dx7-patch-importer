import { dx7PackedVoiceSize, type Dx7Voice } from '@/lib/dx7'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'

/**
 * A share link carries one patch in its fragment, which the browser never sends to a server:
 * `#patch=1.<data>`, where the data is the 128-byte packed DX7 voice followed by the patch's FM1
 * effects, in unpadded base64url. Links outlive releases, so this is a public format: a new shape
 * takes a new version, and every earlier version stays readable. Links are read by
 * `patch-share-link-reader.ts`, which loads only when a page opens with one.
 */
export const patchShareFragmentKey = 'patch'
export const patchShareLinkVersion = 1
export const patchSharePayloadSize = dx7PackedVoiceSize + fm1EffectParameterCount

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

/** The fragment that shares a patch, without its leading `#`. */
export function makePatchShareFragment(voice: Dx7Voice, effects: Uint8Array | undefined) {
  const payload = new Uint8Array(patchSharePayloadSize)
  payload.set(voice.data)
  payload.set(normalizeFm1Effects(effects), dx7PackedVoiceSize)
  return `${patchShareFragmentKey}=${patchShareLinkVersion}.${encodeBase64Url(payload)}`
}

/** A link to this page that opens the patch in someone else's library. */
export function makePatchShareUrl(
  voice: Dx7Voice,
  effects: Uint8Array | undefined,
  page: Pick<Location, 'origin' | 'pathname'> = window.location,
) {
  return `${page.origin}${page.pathname}#${makePatchShareFragment(voice, effects)}`
}

/** Whether a location fragment, with or without its `#`, is a share link, readable or not. */
export function isPatchShareFragment(hash: string) {
  return hash.replace(/^#/u, '').startsWith(`${patchShareFragmentKey}=`)
}
