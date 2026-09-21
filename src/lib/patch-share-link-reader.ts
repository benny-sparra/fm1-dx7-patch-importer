import {
  isSevenBitData,
  normalizeStoredDx7Voice,
  dx7PackedVoiceSize,
  type Dx7Voice,
} from '@/lib/dx7'
import { fm1EffectParameterMaximums } from '@/lib/fm1-effects'
import {
  isPatchShareFragment,
  patchShareFragmentKey,
  patchShareLinkVersion,
  patchSharePayloadSize,
} from '@/lib/patch-share-link'

// 'version' is a link from a newer release, which this one cannot read.
type PatchShareLinkProblem = 'damaged' | 'version'

/** A share link that cannot be opened, with a code the UI can explain in any language. */
export class PatchShareLinkError extends Error {
  readonly problem: PatchShareLinkProblem

  constructor(problem: PatchShareLinkProblem, message: string) {
    super(message)
    this.name = 'PatchShareLinkError'
    this.problem = problem
  }
}

export type SharedPatch = { effects: Uint8Array; voice: Dx7Voice }

function decodeBase64Url(value: string) {
  if (!/^[\w-]*$/u.test(value)) return null
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function damaged(message: string): never {
  throw new PatchShareLinkError('damaged', message)
}

/**
 * Reads the patch a share link carries. Anything that is not a share link returns null; a share
 * link that cannot be read throws a `PatchShareLinkError`. A voice byte above seven bits or an
 * effect beyond its range rejects the link rather than being masked, as a `.syx` import would.
 */
export function readPatchShareFragment(hash: string): SharedPatch | null {
  if (!isPatchShareFragment(hash)) return null
  const value = hash.replace(/^#/u, '').slice(patchShareFragmentKey.length + 1)
  const separator = value.indexOf('.')
  const version = separator > 0 ? value.slice(0, separator) : ''
  if (!/^[1-9]\d*$/u.test(version)) damaged('The share link has no version.')
  if (Number(version) > patchShareLinkVersion) {
    throw new PatchShareLinkError('version', `Share link version ${version} is not supported.`)
  }

  const payload = decodeBase64Url(value.slice(separator + 1))
  if (!payload || payload.length !== patchSharePayloadSize)
    damaged('The share link data is incomplete.')
  const data = payload.slice(0, dx7PackedVoiceSize)
  const effects = payload.slice(dx7PackedVoiceSize)
  if (!isSevenBitData(data)) damaged('The shared voice contains bytes outside the 7-bit range.')
  if (effects.some((parameter, index) => parameter > fm1EffectParameterMaximums[index])) {
    damaged('The shared FM1 effects are out of range.')
  }

  const voice = normalizeStoredDx7Voice({ data })
  if (!voice) damaged('The shared voice could not be read.')
  return { effects, voice }
}
