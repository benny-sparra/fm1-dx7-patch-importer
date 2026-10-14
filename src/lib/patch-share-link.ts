import { decodeVoiceName, dx7PackedVoiceSize, isSevenBitData, type Dx7Voice } from '@/lib/dx7'
import {
  fm1EffectParameterCount,
  fm1EffectParameterMaximums,
  normalizeFm1Effects,
} from '@/lib/fm1-effects'
import { isFm1VaEightBitVoice } from '@/lib/fm1-va-eight-bit'
import { fm1VaRecordEngine } from '@/lib/fm1-va-engine'
import { isFm1VaVirtualAnalogVoice } from '@/lib/fm1-va-virtual-analog'
import { fm1VaRecordSize, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { patchShareFragmentPrefix } from '@/lib/share-link-fragment'

/**
 * A patch's share link, such as `https://fm1-editor.com/#p=<payload>`, carries the whole patch in
 * its fragment, so no server ever receives it. It opens the site that made it, so a link copied from
 * a local or preview build opens there. Links are kept for years in chats and forums, so the
 * payload is a public stored format under the same rules as the workspace record: every later
 * version still reads version 1, and a changed shape is a new version.
 *
 * Version 1 is these bytes, base64url-encoded without padding:
 *
 * | Offset | Bytes | Contents                                                            |
 * | ------ | ----- | ------------------------------------------------------------------- |
 * | 0      | 1     | Version, 1                                                          |
 * | 1      | 1     | Engine: 0 a DX7 voice, 1 a Virtual Analog preset, 2 an 8-Bit preset |
 * | 2      | 128   | The voice: a packed DX7 voice, or the preset's voice bytes as read  |
 * | 130    | 24    | The FM1 effects, in the library's order                             |
 * | 154    | 59    | The FM-1+VA settings record, eight bits a byte, only when it has one |
 *
 * A Virtual Analog or 8-Bit preset always has its record. Version 1's effect count is fixed here
 * rather than taken from the editor's, so a release that adds an effect still reads it; such a
 * release writes a new version.
 */
const currentVersion = 1
const version1EffectCount = 24
const engineCodes = { dx7: 0, 'virtual-analog': 1, 'eight-bit': 2 } as const
const headerSize = 2
const version1Size = headerSize + dx7PackedVoiceSize + version1EffectCount
const version1SizeWithRecord = version1Size + fm1VaRecordSize

/**
 * A shared patch: a DX7 voice, with the FM-1+VA settings record of one that has it, or a Virtual
 * Analog or 8-Bit preset's voice bytes and record, each with its FM1 effects. It has the shape of a
 * search result's sound, so it goes into a slot the same way.
 */
export type SharedPatch = { effects: Uint8Array; name: string } & (
  | { record?: Uint8Array; voice: Dx7Voice }
  | { record: Uint8Array; virtualAnalog: Uint8Array }
  | { eightBit: Uint8Array; record: Uint8Array }
)

/** Why a share link cannot be opened, as a code the dialog explains in any language. */
type PatchShareLinkProblem = 'damaged' | 'newer-version'

export class PatchShareLinkError extends Error {
  readonly problem: PatchShareLinkProblem

  constructor(problem: PatchShareLinkProblem, message: string) {
    super(message)
    this.name = 'PatchShareLinkError'
    this.problem = problem
  }
}

function damaged(message: string): never {
  throw new PatchShareLinkError('damaged', message)
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  // A base64 text never leaves one character over in its last group of four.
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) {
    damaged('The share link is not base64url text.')
  }
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

/** The version 1 payload for `patch`, as the text a link carries. */
export function encodePatchSharePayload(patch: SharedPatch) {
  if (fm1EffectParameterCount !== version1EffectCount) {
    throw new Error('The FM1 effects changed: share links need a new version.')
  }
  const [engine, voice] =
    'voice' in patch
      ? [engineCodes.dx7, patch.voice.data]
      : 'virtualAnalog' in patch
        ? [engineCodes['virtual-analog'], patch.virtualAnalog]
        : [engineCodes['eight-bit'], patch.eightBit]
  if (voice.length !== dx7PackedVoiceSize) throw new RangeError('A voice is 128 bytes.')
  const effects = normalizeFm1Effects(patch.effects)
  const record = patch.record
  if (record && record.length !== fm1VaRecordSize) throw new RangeError('A record is 59 bytes.')

  const bytes = new Uint8Array(record ? version1SizeWithRecord : version1Size)
  bytes[0] = currentVersion
  bytes[1] = engine
  bytes.set(voice, headerSize)
  bytes.set(effects, headerSize + dx7PackedVoiceSize)
  if (record) bytes.set(record, version1Size)
  return toBase64Url(bytes)
}

function decodeVersion1(bytes: Uint8Array): SharedPatch {
  if (bytes.length !== version1Size && bytes.length !== version1SizeWithRecord) {
    damaged(`A version 1 share link holds ${version1Size} or ${version1SizeWithRecord} bytes.`)
  }
  const engine = bytes[1]
  const voice = bytes.slice(headerSize, headerSize + dx7PackedVoiceSize)
  const effects = bytes.slice(headerSize + dx7PackedVoiceSize, version1Size)
  const record = bytes.length === version1SizeWithRecord ? bytes.slice(version1Size) : undefined
  if (effects.some((value, index) => value > fm1EffectParameterMaximums[index])) {
    damaged('A shared effect setting is out of range.')
  }
  const name = decodeVoiceName(voice)

  if (engine === engineCodes.dx7) {
    if (!isSevenBitData(voice)) damaged('A shared DX7 voice holds bytes above seven bits.')
    return { effects, name, record, voice: { data: voice, name } }
  }
  if (engine === engineCodes['virtual-analog']) {
    if (!isFm1VaVirtualAnalogVoice(voice) || !record) {
      damaged('A shared Virtual Analog preset needs its voice bytes and record.')
    }
    if (fm1VaRecordEngine(record) !== 'virtual-analog') {
      damaged('A shared Virtual Analog preset’s record names another engine.')
    }
    return { effects, name, record, virtualAnalog: voice }
  }
  if (engine === engineCodes['eight-bit']) {
    if (!isFm1VaEightBitVoice(voice) || !record) {
      damaged('A shared 8-Bit preset needs its voice bytes and record.')
    }
    if (fm1VaRecordEngine(record) !== 'eight-bit') {
      damaged('A shared 8-Bit preset’s record names another engine.')
    }
    return { effects, eightBit: voice, name, record }
  }
  return damaged('The share link names an unknown engine.')
}

/** Reads a share link's payload, throwing `PatchShareLinkError` for anything it cannot open. */
export function decodePatchSharePayload(payload: string): SharedPatch {
  const bytes = fromBase64Url(payload)
  const version = bytes[0]
  if (version === 1) return decodeVersion1(bytes)
  if (version > currentVersion) {
    throw new PatchShareLinkError('newer-version', `Share link version ${version} is newer.`)
  }
  return damaged(`Share link version ${version} does not exist.`)
}

/** The library's sounds by patch id, the favourites with the slots. */
type ShareableLibrary = Pick<
  PatchLibrarySnapshot,
  'effects' | 'eightBit' | 'records' | 'virtualAnalog' | 'voices'
>

/**
 * The share link of the patch `id` names, or null for an empty slot. `page` is the address the link
 * opens, the page's own without its query or fragment, such as `https://fm1-editor.com/`.
 */
export function makePatchShareLink(library: ShareableLibrary, id: string, page: string) {
  const effects = normalizeFm1Effects(library.effects[id])
  const record = library.records[id]
  const voice = library.voices[id]
  const virtualAnalog = library.virtualAnalog[id]
  const eightBit = library.eightBit[id]
  const patch: SharedPatch | null = voice
    ? { effects, name: voice.name, record, voice }
    : virtualAnalog && record
      ? { effects, name: '', record, virtualAnalog }
      : eightBit && record
        ? { effects, eightBit, name: '', record }
        : null
  if (!patch) return null
  return `${page}${patchShareFragmentPrefix}${encodePatchSharePayload(patch)}`
}
