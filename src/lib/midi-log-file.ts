import type { MidiLogEntry } from '@/lib/midi'

const hexBytesPerRow = 16

/** Upper-case hex bytes, sixteen to a row, as the log shows a message's data. */
export function formatMidiHexRows(data: Uint8Array) {
  const bytes = Array.from(data, (byte) => byte.toString(16).padStart(2, '0').toUpperCase())
  return Array.from({ length: Math.ceil(bytes.length / hexBytesPerRow) }, (_, row) =>
    bytes.slice(row * hexBytesPerRow, (row + 1) * hexBytesPerRow).join(' '),
  ).join('\n')
}

type MidiLogFileContext = {
  exportedAt: Date
  userAgent: string
}

function formatLogEntry(entry: MidiLogEntry) {
  // Times are ISO, like the export time, so a report reads the same in any language.
  const time = new Date(entry.createdAt).toISOString()
  const lines = [`${time}  ${entry.direction.toUpperCase()}  ${entry.message}`]
  if (entry.data) {
    lines.push(`  ${entry.data.length} bytes`)
    lines.push(
      ...formatMidiHexRows(entry.data)
        .split('\n')
        .map((row) => `  ${row}`),
    )
  }
  return lines.join('\n')
}

/**
 * The MIDI log as a plain-text file to attach to a bug report. The log keeps its newest entry
 * first; the file reads oldest first, like a transcript. The file stays on the user's device, and
 * the browser's user agent is included because transfer problems depend on the browser and system.
 * The log itself is technical and is not translated.
 */
export function makeMidiLogFile(log: readonly MidiLogEntry[], context: MidiLogFileContext) {
  const timestamp = context.exportedAt.toISOString()
  const text = [
    'FM1 editor MIDI log',
    `Exported: ${timestamp}`,
    `Browser: ${context.userAgent}`,
    '',
    ...log.toReversed().map(formatLogEntry),
    '',
  ].join('\n')
  const filename = `fm1-midi-log-${timestamp.slice(0, 19).replaceAll(':', '-')}.txt`
  return { filename, text }
}
