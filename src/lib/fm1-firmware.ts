/**
 * Which firmware the connected FM1 runs, from the updater's identity query. M-VAVE's firmware and
 * the FM-1+VA and Felucca replacement firmwares all answer it with their `MODEL_NNN` name, such as
 * `FM-1_015` (docs/fm1-research.md §6.3). The query is the one `00 32` message the editor may send: it reads
 * the name and changes nothing, and no other message in that family is sent.
 */
// prettier-ignore
export const fm1IdentityQuery = Uint8Array.of(
  0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f, 0xf7,
)

// The reply is F0, 39 bytes packing a 34-byte ID block seven bits at a time, least significant bit
// first, and F7. The block is 00 59 11, a 3-byte little-endian length of 27, the 27-byte name field
// (the name, then zeros), and a checksum byte. The checksum is not checked: FM-1+VA keeps M-VAVE
// V15's (20 06 on the wire) under its own name, as a capture from FM-1_089 showed on 2026-09-29.
const identityReplyLength = 41
const identityBlockLength = 34
const identityHeader = [0x00, 0x59, 0x11]
const identityNameStart = 6
const identityNameLength = 27

/**
 * M-VAVE numbers its own releases up to V19, and FM-1+VA's run from FM-1_020. Felucca names release
 * X.Y FM-1_9XY, one digit each, and a development build FM-1_900, so the 900s are Felucca's. SLOOP,
 * a firmware built on Felucca, reports FM-1_900 on every release, so that name may be either.
 */
const lastMvaveVersion = 19
const lastFm1VaVersion = 899
const feluccaOrSloopIdentity = 'FM-1_900'

/**
 * An FM1 that answered with a name the editor does not recognise keeps that name for the MIDI log;
 * one that never answered has none.
 */
export type Fm1Firmware =
  | { kind: 'checking' }
  | { identity?: string; kind: 'unidentified' }
  | { identity: string; kind: 'felucca' | 'fm1-va' | 'mvave' }

/** A firmware the editor names, with the release it reported. */
type NamedFm1Firmware = Extract<Fm1Firmware, { identity: string }>

/**
 * Unpacks 8-bit bytes sent seven bits at a time, least significant bit first, as the identity reply
 * and FM-1+VA's own replies are. Bits left over after the last whole byte are dropped.
 */
export function unpackSevenBitStream(bytes: Uint8Array) {
  const unpacked: number[] = []
  let accumulator = 0
  let bitCount = 0
  for (const byte of bytes) {
    accumulator |= byte << bitCount
    bitCount += 7
    while (bitCount >= 8) {
      unpacked.push(accumulator & 0xff)
      accumulator >>= 8
      bitCount -= 8
    }
  }
  return unpacked
}

/**
 * The name in an identity reply, such as `FM-1_089`, or null when the message is not a valid reply.
 * WebMidi hands an input message over as a plain array, so either form is read.
 */
export function parseFm1IdentityReply(message: Uint8Array | readonly number[]) {
  const data = Uint8Array.from(message)
  if (
    data.length !== identityReplyLength ||
    data[0] !== 0xf0 ||
    data[data.length - 1] !== 0xf7 ||
    data.subarray(1, -1).some((byte) => byte > 0x7f)
  ) {
    return null
  }

  const block = unpackSevenBitStream(data.subarray(1, -1)).slice(0, identityBlockLength)
  if (identityHeader.some((byte, index) => block[index] !== byte)) return null
  const declaredLength = block[3] | (block[4] << 8) | (block[5] << 16)
  if (declaredLength !== identityNameLength) return null

  const field = block.slice(identityNameStart, identityNameStart + identityNameLength)

  const end = field.indexOf(0)
  const name = field.slice(0, end < 0 ? field.length : end)
  if (
    name.length === 0 ||
    name.some((byte) => byte < 0x20 || byte > 0x7e) ||
    field.slice(name.length).some((byte) => byte !== 0)
  ) {
    return null
  }
  return String.fromCharCode(...name)
}

/**
 * The firmware an identity names. Only an FM1 name numbered as M-VAVE's own releases counts as
 * M-VAVE's firmware, only one numbered as FM-1+VA's counts as FM-1+VA, releases after the tested
 * one included, and only one in the 900s counts as Felucca, SLOOP included. Any other name is unidentified, so the
 * editor assumes no firmware's behaviour.
 */
export function classifyFm1Firmware(identity: string): Fm1Firmware {
  const match = /^FM-1_(\d{3})$/.exec(identity)
  if (!match) return { identity, kind: 'unidentified' }
  const version = Number(match[1])
  if (version <= lastMvaveVersion) return { identity, kind: 'mvave' }
  return { identity, kind: version <= lastFm1VaVersion ? 'fm1-va' : 'felucca' }
}

/**
 * Whether a patch may be sent as a DX7 single-voice dump. M-VAVE's firmware puts one in its edit
 * buffer, but FM-1+VA writes it straight over the selected stored preset, so every other firmware,
 * including one not yet identified, gets the patch as parameter changes, which it holds as an
 * unsaved edit (docs/fm1-research.md, "The editor on FM-1+VA").
 */
export function sendsSingleVoiceDumps(firmware: Fm1Firmware) {
  return firmware.kind === 'mvave'
}

/** FM-1_079, the FM-1+VA release that added the preset read and the preset write. */
const firstPresetCommandsRelease = 79

/**
 * Whether the FM1 runs FM-1+VA from the release that added its preset read and write. On any other
 * firmware those messages are unknown vendor commands. Lives here, with the firmware it names, so
 * the librarian can offer the preset dialogs without loading the code that sends them.
 */
export function hasFm1VaPresetCommands(firmware: Fm1Firmware) {
  // `classifyFm1Firmware` names firmware FM-1+VA only for an `FM-1_NNN` identity.
  if (firmware.kind !== 'fm1-va') return false
  return Number(firmware.identity.slice('FM-1_'.length)) >= firstPresetCommandsRelease
}

/**
 * Whether the FM1 may run SLOOP rather than Felucca. Every SLOOP release reports `FM-1_900`, as a
 * Felucca development build does, so the editor names both. They treat the editor's MIDI alike.
 */
export function mayBeSloop(firmware: Fm1Firmware) {
  return firmware.kind === 'felucca' && firmware.identity === feluccaOrSloopIdentity
}

/**
 * The release as its maker names it. M-VAVE calls `FM-1_015` V15 and Felucca calls `FM-1_908` 0.8,
 * while FM-1+VA's releases, and the `FM-1_900` that Felucca's development builds and SLOOP share, go
 * by the name the FM1 reports, such as `FM-1_089`.
 */
export function fm1FirmwareRelease({ identity, kind }: NamedFm1Firmware) {
  if (kind === 'mvave') return `V${Number(identity.slice(-3))}`
  if (kind === 'felucca' && identity !== feluccaOrSloopIdentity) {
    return `${identity.at(-2)}.${identity.at(-1)}`
  }
  return identity
}
