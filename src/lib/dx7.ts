export const dx7BankVoiceCount = 32
export const dx7PackedVoiceSize = 128
export const dx7BankDataSize = dx7BankVoiceCount * dx7PackedVoiceSize
export const dx7BankFileSize = dx7BankDataSize + 8

export type Dx7Voice = { data: Uint8Array; name: string }

export type Dx7Operator = {
  rates: number[]
  levels: number[]
  breakpoint: number
  leftDepth: number
  rightDepth: number
  leftCurve: number
  rightCurve: number
  rateScaling: number
  detune: number
  amplitudeModulationSensitivity: number
  keyVelocitySensitivity: number
  outputLevel: number
  oscillatorMode: number
  frequencyCoarse: number
  frequencyFine: number
}

export type Dx7VoiceParameters = {
  operators: Dx7Operator[]
  pitchRates: number[]
  pitchLevels: number[]
  algorithm: number
  feedback: number
  oscillatorSync: number
  lfoSpeed: number
  lfoDelay: number
  pitchModulationDepth: number
  amplitudeModulationDepth: number
  lfoSync: number
  lfoWave: number
  pitchModulationSensitivity: number
  transpose: number
}

export function parseDx7Bank(file: ArrayBuffer): Dx7Voice[] {
  const bytes = new Uint8Array(file)
  if (bytes.length !== dx7BankFileSize) {
    throw new Error(`Expected a 4104-byte DX7 bank; received ${bytes.length} bytes.`)
  }
  if (bytes[0] !== 0xf0 || bytes[1] !== 0x43 || bytes[3] !== 0x09 || bytes[4] !== 0x20 || bytes[5] !== 0x00 || bytes.at(-1) !== 0xf7) {
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

export function decodeDx7Voice(voice: Dx7Voice): Dx7VoiceParameters {
  const data = voice.data
  const operators = Array.from({ length: 6 }, (_, displayIndex) => {
    const offset = (5 - displayIndex) * 17
    return {
      rates: Array.from(data.slice(offset, offset + 4)),
      levels: Array.from(data.slice(offset + 4, offset + 8)),
      breakpoint: data[offset + 8], leftDepth: data[offset + 9], rightDepth: data[offset + 10],
      leftCurve: data[offset + 11] & 0x03, rightCurve: (data[offset + 11] >> 2) & 0x03,
      rateScaling: data[offset + 12] & 0x07, detune: (data[offset + 12] >> 3) & 0x0f,
      amplitudeModulationSensitivity: data[offset + 13] & 0x03,
      keyVelocitySensitivity: (data[offset + 13] >> 2) & 0x07,
      outputLevel: data[offset + 14], oscillatorMode: data[offset + 15] & 0x01,
      frequencyCoarse: (data[offset + 15] >> 1) & 0x1f, frequencyFine: data[offset + 16],
    }
  })
  return {
    operators, pitchRates: Array.from(data.slice(102, 106)), pitchLevels: Array.from(data.slice(106, 110)),
    algorithm: data[110], feedback: data[111] & 0x07, oscillatorSync: (data[111] >> 3) & 0x01,
    lfoSpeed: data[112], lfoDelay: data[113], pitchModulationDepth: data[114], amplitudeModulationDepth: data[115],
    lfoSync: data[116] & 0x01, lfoWave: (data[116] >> 1) & 0x07,
    pitchModulationSensitivity: (data[116] >> 4) & 0x07, transpose: data[117],
  }
}

export function updateDx7VoiceByte(voice: Dx7Voice, offset: number, value: number): Dx7Voice {
  const data = voice.data.slice()
  data[offset] = value
  return { data, name: decodeVoiceName(data) }
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

export function updateDx7VoiceBits(
  voice: Dx7Voice,
  offset: number,
  mask: number,
  shift: number,
  value: number,
): Dx7Voice {
  const current = voice.data[offset]
  return updateDx7VoiceByte(voice, offset, (current & ~mask) | ((value << shift) & mask))
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

/** Yamaha DX7 single-voice bulk dump, excluding the F0/43 manufacturer prefix and F7 terminator. */
export function makeDx7SingleVoicePayload(voice: Dx7Voice, channel = 1) {
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
  return String.fromCharCode(...data.slice(118, 128)).replace(/[^\x20-\x7e]/g, ' ').trim() || 'UNTITLED'
}
