import { dx7PackedVoiceSize, type Dx7Voice } from '@/lib/dx7'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'

/**
 * A share link carries one patch in its fragment, which the browser never sends to a server:
 * `#patch=1.<name>.<data>`. The name is the patch name in letters, digits, and dashes, so a person
 * can tell links apart; it may be empty and is never read back, because the data holds the name
 * too. The data is the 128-byte packed DX7 voice followed by the patch's FM1 effects, in unpadded
 * base64url, and effects that are all off are left out. Links outlive releases, so this is a
 * public format: a new shape takes a new version, and every earlier version stays readable. Links
 * are read by `patch-share-link-reader.ts`, which loads only when a page opens with one.
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

/** The patch name as it reads in a link, such as `E-PIANO-1` for "E.PIANO 1". */
function linkName(name: string) {
  return name.replace(/[^a-z\d]+/giu, '-').replace(/^-+|-+$/gu, '')
}

/** The fragment that shares a patch, without its leading `#`. */
export function makePatchShareFragment(voice: Dx7Voice, effects: Uint8Array | undefined) {
  const shared = normalizeFm1Effects(effects)
  const hasEffects = shared.some((parameter) => parameter !== 0)
  const payload = new Uint8Array(hasEffects ? patchSharePayloadSize : dx7PackedVoiceSize)
  payload.set(voice.data)
  if (hasEffects) payload.set(shared, dx7PackedVoiceSize)
  const data = encodeBase64Url(payload)
  return `${patchShareFragmentKey}=${patchShareLinkVersion}.${linkName(voice.name)}.${data}`
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
