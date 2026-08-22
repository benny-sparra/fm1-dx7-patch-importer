const dx7BankVoiceCount = 32
const dx7PackedVoiceSize = 128
const dx7BankDataSize = dx7BankVoiceCount * dx7PackedVoiceSize
const dx7BankFileSize = dx7BankDataSize + 8

export type Dx7Voice = { data: Uint8Array; name: string }

export function parseDx7Bank(file: ArrayBuffer): Dx7Voice[] {
  const bytes = new Uint8Array(file)
  if (bytes.length !== dx7BankFileSize) {
    throw new Error(`Expected a 4104-byte DX7 bank; received ${bytes.length} bytes.`)
  }
  if (
    bytes[0] !== 0xf0 ||
    bytes[1] !== 0x43 ||
    bytes[3] !== 0x09 ||
    bytes[4] !== 0x20 ||
    bytes[5] !== 0x00 ||
    bytes.at(-1) !== 0xf7
  ) {
    throw new Error('This is not a Yamaha DX7 32-voice bulk SysEx bank.')
  }
  const voiceData = bytes.slice(6, 6 + dx7BankDataSize)
  const checksum = (128 - (voiceData.reduce((sum, byte) => sum + byte, 0) & 0x7f)) & 0x7f
  if (checksum !== bytes.at(-2)) throw new Error('The DX7 bank checksum is invalid.')

  return Array.from({ length: dx7BankVoiceCount }, (_, index) => {
    const data = voiceData.slice(index * dx7PackedVoiceSize, (index + 1) * dx7PackedVoiceSize)
    return { data, name: decodeVoiceName(data) }
  })
}

export function updateDx7VoiceName(voice: Dx7Voice, name: string): Dx7Voice {
  const data = voice.data.slice()
  const normalized = name.slice(0, 10).padEnd(10, ' ')
  for (let index = 0; index < 10; index += 1) {
    const code = normalized.charCodeAt(index)
    data[118 + index] = code >= 0x20 && code <= 0x7e ? code : 0x20
  }
  return { data, name: decodeVoiceName(data) }
}

export function makeDx7VoiceNameEdits(
  parameters: Uint8Array,
  name: string,
): [parameter: number, value: number][] {
  const normalized = name.slice(0, 10).padEnd(10, ' ')

  return Array.from({ length: 10 }, (_, offset) => {
    const code = normalized.charCodeAt(offset)
    const value = code >= 0x20 && code <= 0x7e ? code : 0x20
    return [145 + offset, value] as [number, number]
  }).filter(([parameter, value]) => parameters[parameter] !== value)
}

/** Converts a packed 128-byte bank voice to the DX7's 155-byte edit-buffer format. */
export function unpackDx7Voice(voice: Dx7Voice) {
  const packed = voice.data
  const unpacked: number[] = []

  for (let operator = 0; operator < 6; operator += 1) {
    const offset = operator * 17
    unpacked.push(
      ...packed.slice(offset, offset + 11),
      packed[offset + 11] & 0x03,
      (packed[offset + 11] >> 2) & 0x03,
      packed[offset + 12] & 0x07,
      packed[offset + 13] & 0x03,
      (packed[offset + 13] >> 2) & 0x07,
      packed[offset + 14],
      packed[offset + 15] & 0x01,
      (packed[offset + 15] >> 1) & 0x1f,
      packed[offset + 16],
      (packed[offset + 12] >> 3) & 0x0f,
    )
  }

  unpacked.push(
    ...packed.slice(102, 111),
    packed[111] & 0x07,
    (packed[111] >> 3) & 0x01,
    ...packed.slice(112, 116),
    packed[116] & 0x01,
    (packed[116] >> 1) & 0x07,
    (packed[116] >> 4) & 0x07,
    ...packed.slice(117, 128),
  )

  return Uint8Array.from(unpacked)
}

/** Converts the DX7's 155-byte edit-buffer format to a packed 128-byte bank voice. */
export function packDx7Voice(unpacked: Uint8Array): Dx7Voice {
  if (unpacked.length !== 155) {
    throw new Error(`Expected 155 DX7 edit-buffer bytes; received ${unpacked.length}.`)
  }
  if (unpacked.some((value) => value > 0x7f)) {
    throw new Error('DX7 edit-buffer data must contain only 7-bit values.')
  }

  const packed = new Uint8Array(128)
  for (let operator = 0; operator < 6; operator += 1) {
    const source = operator * 21
    const target = operator * 17
    packed.set(unpacked.slice(source, source + 11), target)
    packed[target + 11] = (unpacked[source + 11] & 0x03) | ((unpacked[source + 12] & 0x03) << 2)
    packed[target + 12] = (unpacked[source + 13] & 0x07) | ((unpacked[source + 20] & 0x0f) << 3)
    packed[target + 13] = (unpacked[source + 14] & 0x03) | ((unpacked[source + 15] & 0x07) << 2)
    packed[target + 14] = unpacked[source + 16]
    packed[target + 15] = (unpacked[source + 17] & 0x01) | ((unpacked[source + 18] & 0x1f) << 1)
    packed[target + 16] = unpacked[source + 19]
  }

  packed.set(unpacked.slice(126, 135), 102)
  packed[111] = (unpacked[135] & 0x07) | ((unpacked[136] & 0x01) << 3)
  packed.set(unpacked.slice(137, 141), 112)
  packed[116] =
    (unpacked[141] & 0x01) | ((unpacked[142] & 0x07) << 1) | ((unpacked[143] & 0x07) << 4)
  packed.set(unpacked.slice(144, 155), 117)

  return { data: packed, name: decodeVoiceName(packed) }
}

/** Yamaha DX7 single-voice bulk dump, excluding the F0/43 manufacturer prefix and F7 terminator. */
export function makeDx7SingleVoicePayload(voice: Dx7Voice, channel = 1) {
  if (voice.data.length !== dx7PackedVoiceSize) {
    throw new Error(
      `Expected a ${dx7PackedVoiceSize}-byte packed DX7 voice; received ${voice.data.length} bytes.`,
    )
  }
  const data = unpackDx7Voice(voice)
  const checksum = (128 - (data.reduce((sum, byte) => sum + byte, 0) & 0x7f)) & 0x7f

  return Uint8Array.from([(channel - 1) & 0x0f, 0x00, 0x01, 0x1b, ...data, checksum])
}

/** Yamaha DX7 32-voice bulk dump, excluding the F0/43 manufacturer prefix and F7 terminator. */
export function makeDx7BankPayload(voices: Dx7Voice[], channel = 1) {
  if (voices.length !== dx7BankVoiceCount) {
    throw new Error(`A DX7 bank must contain exactly ${dx7BankVoiceCount} voices.`)
  }

  const data = Uint8Array.from(voices.flatMap((voice) => Array.from(voice.data)))
  const checksum = (128 - (data.reduce((sum, byte) => sum + byte, 0) & 0x7f)) & 0x7f

  return Uint8Array.from([(channel - 1) & 0x0f, 0x09, 0x20, 0x00, ...data, checksum])
}

/** Complete Yamaha DX7 32-voice SysEx file, ready to save as a .syx file. */
export function makeDx7BankFile(voices: Dx7Voice[], channel = 1) {
  const payload = makeDx7BankPayload(voices, channel)
  return Uint8Array.from([0xf0, 0x43, ...payload, 0xf7])
}

function decodeVoiceName(data: Uint8Array) {
  return (
    String.fromCharCode(...data.slice(118, 128))
      .replace(/[^\x20-\x7e]/g, ' ')
      .trim() || 'UNTITLED'
  )
}
