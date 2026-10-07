import { updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { fm1VaRecordEffects } from '@/lib/fm1-va-record-effects'

/**
 * The engines **Erase patch…** offers, FM first, as the FM1's own Erase Preset lists them. 8-Bit
 * joins once the library can hold an 8-Bit preset (docs/feature-backlog.md, FM-1+VA item 9).
 */
export const erasableFm1VaEngines = ['fm', 'virtualAnalog'] as const

export type ErasableFm1VaEngine = (typeof erasableFm1VaEngines)[number]

/**
 * A blank preset of one engine: its voice bytes, its settings record, the library's effects, and
 * the name as its voice bytes hold it.
 */
export type ErasedFm1VaPreset = { effects: Uint8Array; name: string; record: Uint8Array } & (
  { engine: 'fm'; voice: Dx7Voice } | { engine: 'virtualAnalog'; voice: Uint8Array }
)

const bytes = (text: string) =>
  Uint8Array.from(
    text
      .trim()
      .split(/\s+/)
      .map((byte) => Number.parseInt(byte, 16)),
  )

// The presets FM-1_096's Erase Preset stores, read back from preset 032 on 2026-10-07
// (docs/fm1-research.md, "Erase Preset on FM-1_096"). The two differ only in voice bytes 13 and 14,
// operator 6's Key Velocity and Output Level, which a Virtual Analog preset plays as Velocity to
// Level and Level, and in record byte 18, the engine.
const erasedFmVoice = bytes(
  `63 63 63 63 63 63 63 00 27 00 00 00 38 00 00 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00
   02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38
   00 00 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00 02 00 63 63 63 63 63 63 63 00 27 00 00
   00 38 00 63 02 00 63 63 63 63 32 32 32 32 00 08 23 00 00 00 30 18 49 4E 49 54 20 20 20 20 20 20`,
)
const erasedVirtualAnalogVoice = bytes(
  `63 63 63 63 63 63 63 00 27 00 00 00 38 0C 4E 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00
   02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38
   00 00 02 00 63 63 63 63 63 63 63 00 27 00 00 00 38 00 00 02 00 63 63 63 63 63 63 63 00 27 00 00
   00 38 00 63 02 00 63 63 63 63 32 32 32 32 00 08 23 00 00 00 30 18 49 4E 49 54 20 20 20 20 20 20`,
)
const erasedRecord = bytes(
  `6B 03 03 1E 1E 03 1E 1E 19 1E 37 46 1E 19 28 1E 32 14 A5 02 00 32 00 E4 80 80 80 00 00 00 01 00
   00 02 00 00 03 00 00 04 00 00 05 00 00 80 80 80 80 80 80 80 00 00 00 00 00 00 00`,
)
const engineByte = 18
const engineMarker: Record<ErasableFm1VaEngine, number> = { fm: 0xa5, virtualAnalog: 0x5a }

/**
 * The preset FM-1_096's Erase Preset makes for `engine`, byte for byte, named `name`: every effect
 * Off, as on the FM1. A name keeps the characters a DX7 voice name can hold; any other becomes a
 * space. Each call returns new copies.
 */
export function makeErasedFm1VaPreset(
  engine: ErasableFm1VaEngine,
  name: string,
): ErasedFm1VaPreset {
  const record = erasedRecord.slice()
  record[engineByte] = engineMarker[engine]
  const effects = fm1VaRecordEffects(record)
  if (engine === 'fm') {
    const voice = updateDx7VoiceName({ data: erasedFmVoice, name }, name)
    return { effects, engine, name: voice.name, record, voice }
  }
  const voice = updateDx7VoiceName({ data: erasedVirtualAnalogVoice, name }, name)
  return { effects, engine, name: voice.name, record, voice: voice.data }
}
