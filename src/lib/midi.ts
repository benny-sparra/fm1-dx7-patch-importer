import { type Input, type Output } from 'webmidi'

import { makeDx7BankPayload, makeDx7SingleVoicePayload, type Dx7Voice } from '@/lib/dx7'

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
