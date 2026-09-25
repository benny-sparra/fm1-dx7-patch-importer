import type { Input, Output } from 'webmidi'

import {
  makeDx7BankPayload,
  makeDx7SingleVoicePayload,
  yamahaManufacturerId,
  type Dx7Voice,
} from '@/lib/dx7'
import { fm1EffectParameterMaximums, fm1EffectParameterCount } from '@/lib/fm1-effects'
import { fm1VoiceParameterMaximums } from '@/lib/fm1-parameters'
import { createId } from '@/lib/id'

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
  /** When the entry was logged, in milliseconds since the epoch; shown in the interface language. */
  createdAt: number
  data?: Uint8Array
}

export function getMidiSupport() {
  if (!window.isSecureContext) {
    return 'insecure'
  }

  if (!navigator.requestMIDIAccess) {
    return 'unsupported'
  }

  return 'supported'
}

export function portsToDevices<TPort extends MidiPort>(ports: TPort[]) {
  return ports.map((port) => ({
    id: port.id,
    name: port.name ?? 'Unnamed MIDI device',
    manufacturer: port.manufacturer ?? 'Unknown maker',
    state: port.state,
    port,
  }))
}

/**
 * Ports every system of that kind lists whether or not an instrument is attached: Linux's ALSA
 * loopback, which Chrome usually lists first, and the Windows built-in software synth. Choosing
 * one automatically sends everything meant for the FM1 nowhere, with no error to explain why.
 */
const builtInMidiPortNames = [/^midi through\b/i, /^microsoft gs wavetable synth\b/i]

function isBuiltInMidiPort(name: string) {
  return builtInMidiPortNames.some((pattern) => pattern.test(name.trim()))
}

/**
 * The FM1 names its port after itself on Linux (`FM-1 MIDI 1`). macOS lists it as the generic
 * `USB Composite Device`, so a name match is a preference, never a requirement.
 */
const fm1PortName = /\bfm-?1\b/i

type MidiPortChoice = { id: string; name: string }

/**
 * Picks the port to use after the device list is read. When MIDI connects, a remembered port that
 * is missing gives way to the first one available, preferring a port named for the FM1, then any
 * real device over a built-in loopback or software synth. Once a port is in use it is never
 * swapped for another device when it disappears, because notes, sounds, and banks meant for the
 * FM1 could then reach a different instrument; nothing is selected until that port returns or
 * another is chosen.
 */
export function resolveMidiPortSelection(
  ports: readonly MidiPortChoice[],
  chosenId: string,
  reason: 'changed' | 'connected',
) {
  if (ports.some((port) => port.id === chosenId)) return chosenId
  if (reason === 'changed' && chosenId) return ''
  const automaticChoice =
    ports.find((port) => fm1PortName.test(port.name)) ??
    ports.find((port) => !isBuiltInMidiPort(port.name)) ??
    ports[0]
  return automaticChoice?.id ?? ''
}

export function sendDx7Voice(output: Output, channel: number, voice: Dx7Voice) {
  output.sendSysex(yamahaManufacturerId, makeDx7SingleVoicePayload(voice, channel))
}

export function sendDx7Bank(output: Output, channel: number, voices: Dx7Voice[]) {
  output.sendSysex(yamahaManufacturerId, makeDx7BankPayload(voices, channel))
}

function assertMidiChannel(channel: number) {
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }
}

function assertFm1ProgramChange(program: number, channel: number) {
  if (!Number.isInteger(program) || program < 0 || program > 127) {
    throw new RangeError('FM1 program must be an integer from 0 to 127.')
  }
  assertMidiChannel(channel)
}

export function makeFm1ProgramChangeMessage(program: number, channel = 1) {
  assertFm1ProgramChange(program, channel)
  return Uint8Array.from([0xc0 | ((channel - 1) & 0x0f), program])
}

export function sendFm1ProgramChange(output: Output, channel: number, program: number) {
  assertFm1ProgramChange(program, channel)
  output.sendProgramChange(program, { channels: channel })
}

/**
 * FM1/DX7 single-parameter write payload, excluding F0/43 and F7.
 * The complete message is F0 43 10 pp qq vv F7.
 */
export function makeFm1ParameterPayload(parameter: number, value: number) {
  if (
    !Number.isInteger(parameter) ||
    parameter < 0 ||
    parameter >= fm1VoiceParameterMaximums.length
  ) {
    throw new RangeError(
      `FM1 voice parameter must be an integer from 0 to ${fm1VoiceParameterMaximums.length - 1}.`,
    )
  }
  if (!Number.isInteger(value) || value < 0 || value > fm1VoiceParameterMaximums[parameter]) {
    throw new RangeError(
      `FM1 voice parameter ${parameter} value must be an integer from 0 to ${fm1VoiceParameterMaximums[parameter]}.`,
    )
  }
  return Uint8Array.from([0x10, Math.floor(parameter / 128), parameter % 128, value])
}

export function sendFm1Parameter(output: Output, parameter: number, value: number) {
  output.sendSysex(yamahaManufacturerId, makeFm1ParameterPayload(parameter, value))
}

function assertFm1EffectControl(controller: number, value: number, channel: number) {
  if (!Number.isInteger(controller) || controller < 0 || controller >= fm1EffectParameterCount) {
    throw new RangeError('FM1 effect controller must be an integer from 0 to 23.')
  }
  if (!Number.isInteger(value) || value < 0 || value > fm1EffectParameterMaximums[controller]) {
    throw new RangeError(
      `FM1 effect controller ${controller} value must be an integer from 0 to ${fm1EffectParameterMaximums[controller]}.`,
    )
  }
  assertMidiChannel(channel)
}

export function makeFm1EffectControlMessage(controller: number, value: number, channel = 2) {
  assertFm1EffectControl(controller, value, channel)
  return Uint8Array.from([0xb0 | ((channel - 1) & 0x0f), controller, value])
}

export function sendFm1EffectControl(
  output: Output,
  channel: number,
  controller: number,
  value: number,
) {
  assertFm1EffectControl(controller, value, channel)
  output.sendControlChange(controller, value, { channels: channel })
}

function assertFm1EffectDiagnosticControl(controller: number, value: number, channel: number) {
  if (!Number.isInteger(controller) || controller < 0 || controller >= fm1EffectParameterCount) {
    throw new RangeError('FM1 effect diagnostic controller must be an integer from 0 to 23.')
  }
  if (!Number.isInteger(value) || value < 0 || value > 127) {
    throw new RangeError('FM1 effect diagnostic value must be an integer from 0 to 127.')
  }
  assertMidiChannel(channel)
}

/**
 * Development-only hardware-research probe for the known FM1 FX CC block.
 *
 * Unlike normal editor writes, this deliberately permits every MIDI 7-bit value so a hardware
 * test can establish whether a historical editor maximum is accepted or clamped by the device.
 * Production UI must not call this function.
 */
export function makeFm1EffectDiagnosticControlMessage(
  controller: number,
  value: number,
  channel = 2,
) {
  assertFm1EffectDiagnosticControl(controller, value, channel)
  return Uint8Array.from([0xb0 | ((channel - 1) & 0x0f), controller, value])
}

export function sendFm1EffectDiagnosticControl(
  output: Output,
  channel: number,
  controller: number,
  value: number,
) {
  assertFm1EffectDiagnosticControl(controller, value, channel)
  output.sendControlChange(controller, value, { channels: channel })
}

export const defaultNoteVelocity = 96
/** The softest and hardest strike a played note can ask for; a Note On at 0 releases the note. */
export const minNoteVelocity = 1
export const maxNoteVelocity = 127

function assertMidiNote(note: number, velocity: number, channel: number) {
  if (!Number.isInteger(note) || note < 0 || note > 127) {
    throw new RangeError('MIDI note must be an integer from 0 to 127.')
  }
  if (!Number.isInteger(velocity) || velocity < 0 || velocity > 127) {
    throw new RangeError('MIDI velocity must be an integer from 0 to 127.')
  }
  assertMidiChannel(channel)
}

export function sendNoteOn(
  output: Output,
  channel: number,
  note: number,
  velocity = defaultNoteVelocity,
) {
  assertMidiNote(note, velocity, channel)
  output.sendNoteOn(note, { channels: channel, rawAttack: velocity })
}

export function sendNoteOff(output: Output, channel: number, note: number, velocity = 0) {
  assertMidiNote(note, velocity, channel)
  output.sendNoteOff(note, { channels: channel, rawRelease: velocity })
}

export const midiNoteCount = 128

/**
 * Releases every note on `channel` with a Note Off for each of the 128 notes. The FM1 takes Control
 * Change only for its effect controllers, 0 to 23 on the effect channel, so the standard All Notes
 * Off (CC 123) and All Sound Off (CC 120) never reach its voices.
 */
export function sendEveryNoteOff(output: Output, channel: number) {
  assertMidiChannel(channel)
  for (let note = 0; note < midiNoteCount; note += 1) {
    output.sendNoteOff(note, { channels: channel, rawRelease: 0 })
  }
}

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const midiTimingClockStatus = 0xf8
const midiActiveSensingStatus = 0xfe

/**
 * Timing clock and active sensing repeat continuously while a sequencer or keyboard is connected.
 * Logging them would fill the monitor many times a second and hide the messages a user is reading.
 * Other system real-time messages are rare and stay visible.
 */
export function isHighRateMidiMessage(data: Uint8Array | number[]) {
  return data[0] === midiTimingClockStatus || data[0] === midiActiveSensingStatus
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
    const noteName = `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`
    const isNoteOff = messageType === 0x80 || velocity === 0

    return `Ch ${channel} Note ${isNoteOff ? 'Off' : 'On'}: ${noteName} (velocity ${velocity})`
  }

  return bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

export function makeLogEntry(
  direction: MidiLogEntry['direction'],
  message: string,
  data?: Uint8Array | number[],
): MidiLogEntry {
  return {
    id: createId(),
    direction,
    message,
    data: data ? Uint8Array.from(data) : undefined,
    createdAt: Date.now(),
  }
}
