import { type Input, type Output } from 'webmidi'

import { makeDx7BankPayload, makeDx7SingleVoicePayload, type Dx7Voice } from '@/lib/dx7'
import {
  fm1EffectParameterMaximums,
  fm1EffectParameterCount,
} from '@/lib/fm1-effects'

export type MidiPort = Input | Output

export type MidiDevice<TPort extends MidiPort> = {
  id: string
  name: string
  manufacturer: string
  state: TPort['state']
  port: TPort
}

export type MidiLogEntry = {
  id: string
  direction: 'in' | 'out' | 'system'
  message: string
  createdAt: string
  data?: Uint8Array
}

export type Fm1CapabilityKind = 'identity' | 'voice' | 'bank'

export type Fm1CapabilityResponse = {
  kind: Fm1CapabilityKind
  valid: boolean
}

export function makeFm1CapabilityRequest(
  kind: Fm1CapabilityKind,
  channel = 1,
) {
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }

  if (kind === 'identity') {
    return Uint8Array.from([0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7])
  }

  return Uint8Array.from([
    0xf0,
    0x43,
    0x20 | ((channel - 1) & 0x0f),
    kind === 'voice' ? 0x00 : 0x09,
    0xf7,
  ])
}

function hasValidYamahaChecksum(data: Uint8Array, checksum: number) {
  const expected = (128 - (data.reduce((sum, byte) => sum + byte, 0) & 0x7f)) & 0x7f
  return checksum === expected
}

export function classifyFm1CapabilityResponse(
  message: Uint8Array,
): Fm1CapabilityResponse | null {
  if (
    message.length >= 7 &&
    message[0] === 0xf0 &&
    message[1] === 0x7e &&
    message[3] === 0x06 &&
    message[4] === 0x02 &&
    message.at(-1) === 0xf7
  ) {
    return { kind: 'identity', valid: true }
  }

  if (message[0] !== 0xf0 || message[1] !== 0x43 || message.at(-1) !== 0xf7) {
    return null
  }

  if (message.length === 163 && message[3] === 0x00 && message[4] === 0x01 && message[5] === 0x1b) {
    return {
      kind: 'voice',
      valid: hasValidYamahaChecksum(message.slice(6, 161), message[161]),
    }
  }

  if (message.length === 4104 && message[3] === 0x09 && message[4] === 0x20 && message[5] === 0x00) {
    return {
      kind: 'bank',
      valid: hasValidYamahaChecksum(message.slice(6, 4102), message[4102]),
    }
  }

  return null
}

export function getMidiSupport() {
  if (!navigator.requestMIDIAccess) {
    return 'unsupported'
  }

  if (!window.isSecureContext) {
    return 'insecure'
  }

  return 'supported'
}

export function portsToDevices<TPort extends MidiPort>(
  ports: TPort[],
) {
  return ports.map((port) => ({
    id: port.id,
    name: port.name ?? 'Unnamed MIDI device',
    manufacturer: port.manufacturer ?? 'Unknown maker',
    state: port.state,
    port,
  }))
}

export function sendDx7Voice(output: Output, channel: number, voice: Dx7Voice) {
  output.sendSysex(0x43, makeDx7SingleVoicePayload(voice, channel))
}

export function sendDx7Bank(output: Output, channel: number, voices: Dx7Voice[]) {
  output.sendSysex(0x43, makeDx7BankPayload(voices, channel))
}

export function makeFm1ProgramChangeMessage(program: number, channel = 1) {
  if (!Number.isInteger(program) || program < 0 || program > 127) {
    throw new RangeError('FM1 program must be an integer from 0 to 127.')
  }
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }

  return Uint8Array.from([0xc0 | ((channel - 1) & 0x0f), program])
}

export function sendFm1ProgramChange(
  output: Output,
  channel: number,
  program: number,
) {
  makeFm1ProgramChangeMessage(program, channel)
  output.sendProgramChange(program, { channels: channel })
}

/**
 * FM1/DX7 single-parameter write payload, excluding F0/43 and F7.
 * The complete message is F0 43 1n pp qq vv F7.
 */
export function makeFm1ParameterPayload(
  parameter: number,
  value: number,
  channel = 1,
) {
  if (!Number.isInteger(parameter) || parameter < 0 || parameter > 155) {
    throw new RangeError('FM1 parameter must be an integer from 0 to 155.')
  }
  if (!Number.isInteger(value) || value < 0 || value > 127) {
    throw new RangeError('FM1 parameter value must be an integer from 0 to 127.')
  }
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }

  return Uint8Array.from([
    0x10 | ((channel - 1) & 0x0f),
    Math.floor(parameter / 128),
    parameter % 128,
    value,
  ])
}

export function sendFm1Parameter(
  output: Output,
  channel: number,
  parameter: number,
  value: number,
) {
  output.sendSysex(0x43, makeFm1ParameterPayload(parameter, value, channel))
}

export function makeFm1EffectControlMessage(
  controller: number,
  value: number,
  channel = 2,
) {
  if (!Number.isInteger(controller) || controller < 0 || controller >= fm1EffectParameterCount) {
    throw new RangeError('FM1 effect controller must be an integer from 0 to 23.')
  }
  if (!Number.isInteger(value) || value < 0 || value > fm1EffectParameterMaximums[controller]) {
    throw new RangeError(
      `FM1 effect controller ${controller} value must be an integer from 0 to ${fm1EffectParameterMaximums[controller]}.`,
    )
  }
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }

  return Uint8Array.from([
    0xb0 | ((channel - 1) & 0x0f),
    controller,
    value,
  ])
}

export function sendFm1EffectControl(
  output: Output,
  channel: number,
  controller: number,
  value: number,
) {
  makeFm1EffectControlMessage(controller, value, channel)
  output.sendControlChange(controller, value, { channels: channel })
}

export function sendNoteOn(
  output: Output,
  channel: number,
  note: number,
  velocity = 96,
) {
  output.sendNoteOn(note, { channels: channel, rawAttack: velocity })
}

export function sendNoteOff(
  output: Output,
  channel: number,
  note: number,
  velocity = 0,
) {
  output.sendNoteOff(note, { channels: channel, rawRelease: velocity })
}

export function formatMidiBytes(data: Uint8Array | number[]) {
  const bytes = Array.from(data)
  const [status, note, velocity] = bytes
  const messageType = status & 0xf0

  if (
    bytes.length >= 3 &&
    note >= 0 &&
    note <= 127 &&
    velocity >= 0 &&
    velocity <= 127 &&
    (messageType === 0x80 || messageType === 0x90)
  ) {
    const channel = (status & 0x0f) + 1
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]
    const noteName = `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`
    const isNoteOff = messageType === 0x80 || velocity === 0

    return `Ch ${channel} Note ${isNoteOff ? 'Off' : 'On'}: ${noteName} (velocity ${velocity})`
  }

  return bytes
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')
}

export function makeLogEntry(
  direction: MidiLogEntry['direction'],
  message: string,
  data?: Uint8Array | number[],
): MidiLogEntry {
  return {
    id: crypto.randomUUID(),
    direction,
    message,
    data: data ? Uint8Array.from(data) : undefined,
    createdAt: new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
  }
}
