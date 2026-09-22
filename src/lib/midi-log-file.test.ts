import { describe, expect, it } from 'vitest'

import type { MidiLogEntry } from '@/lib/midi'
import { formatMidiHexRows, makeMidiLogFile } from '@/lib/midi-log-file'

function entry(
  id: string,
  direction: MidiLogEntry['direction'],
  message: string,
  data?: number[],
): MidiLogEntry {
  return {
    createdAt: Date.parse(`2026-09-17T08:54:${id.padStart(2, '0')}.000Z`),
    data: data ? Uint8Array.from(data) : undefined,
    direction,
    id,
    message,
  }
}

const context = {
  exportedAt: new Date('2026-09-17T08:55:10.123Z'),
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0',
}

describe('formatMidiHexRows', () => {
  it('writes upper-case bytes sixteen to a row', () => {
    const data = Uint8Array.from({ length: 18 }, (_, index) => index + 0x0a)

    expect(formatMidiHexRows(data)).toBe('0A 0B 0C 0D 0E 0F 10 11 12 13 14 15 16 17 18 19\n1A 1B')
  })
})

describe('makeMidiLogFile', () => {
  it('lists entries oldest first after a header naming the browser and export time', () => {
    const log = [
      entry('2', 'out', 'Sent FM1 parameter 123 = 14.'),
      entry('1', 'system', 'MIDI connected with SysEx enabled.'),
    ]

    expect(makeMidiLogFile(log, context).text).toBe(
      [
        'FM1 editor MIDI log',
        'Exported: 2026-09-17T08:55:10.123Z',
        'Browser: Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0',
        '',
        '2026-09-17T08:54:01.000Z  SYSTEM  MIDI connected with SysEx enabled.',
        '2026-09-17T08:54:02.000Z  OUT  Sent FM1 parameter 123 = 14.',
        '',
      ].join('\n'),
    )
  })

  it('includes the byte count and full hex of every message with data', () => {
    const log = [
      entry('3', 'out', 'Sent FM1 parameter 123 = 14.', [0xf0, 0x43, 0x10, 0x00, 0x7b, 0x0e, 0xf7]),
    ]

    expect(makeMidiLogFile(log, context).text).toContain(
      '2026-09-17T08:54:03.000Z  OUT  Sent FM1 parameter 123 = 14.\n  7 bytes\n  F0 43 10 00 7B 0E F7\n',
    )
  })

  it('names the file after the export time without characters file systems reject', () => {
    expect(makeMidiLogFile([], context).filename).toBe('fm1-midi-log-2026-09-17T08-55-10.txt')
  })
})
