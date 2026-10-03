/**
 * Which firmware the connected FM1 runs, from the updater's identity query. M-VAVE's firmware and
 * the FM-1+VA replacement firmware both answer it with their `MODEL_NNN` name, such as `FM-1_015`
 * (docs/fm1-research.md §6.3). The query is the one `00 32` message the editor may send: it reads
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
 * M-VAVE numbers its own releases up to V19, and FM-1+VA's run from FM-1_020. Felucca, another
 * replacement firmware, answers FM-1_904, so the 900s are left to it and stay unidentified.
 */
const lastMvaveVersion = 19
const lastFm1VaVersion = 899

/**
 * An FM1 that answered with a name the editor does not recognise keeps that name for the MIDI log;
 * one that never answered has none.
 */
export type Fm1Firmware =
  | { kind: 'checking' }
  | { identity?: string; kind: 'unidentified' }
  | { identity: string; kind: 'fm1-va' | 'mvave' }

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
 * M-VAVE's firmware, and only one numbered as FM-1+VA's counts as FM-1+VA, releases after the
 * tested one included. Any other name, Felucca's among them, is unidentified, so the editor assumes
 * neither firmware's behaviour.
 */
export function classifyFm1Firmware(identity: string): Fm1Firmware {
  const match = /^FM-1_(\d{3})$/.exec(identity)
  const version = match ? Number(match[1]) : null
  if (version === null || version > lastFm1VaVersion) return { identity, kind: 'unidentified' }
  return { identity, kind: version <= lastMvaveVersion ? 'mvave' : 'fm1-va' }
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

/**
 * The release as its maker names it. M-VAVE calls `FM-1_015` V15, while FM-1+VA's releases go by
 * the name the FM1 reports, such as `FM-1_089`.
 */
export function fm1FirmwareRelease({
  identity,
  kind,
}: Extract<Fm1Firmware, { kind: 'fm1-va' | 'mvave' }>) {
  return kind === 'mvave' ? `V${Number(identity.slice(-3))}` : identity
}
