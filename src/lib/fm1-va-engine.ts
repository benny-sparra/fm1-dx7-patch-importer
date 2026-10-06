/**
 * The engine an FM-1+VA preset plays on, named by settings record byte 18 (docs/fm1-research.md,
 * "The engine marker"): `5A` for Virtual Analog and, from FM-1_096, `C3` for 8-Bit. Any other value
 * is FM: the FM1 stores `03` after Reset Bank, and FM-1+VA's own tools write `A5`.
 */
export type Fm1VaEngine = 'eight-bit' | 'fm' | 'virtual-analog'

const engineMarkerByte = 18
const virtualAnalogMarker = 0x5a
const eightBitMarker = 0xc3

/** The engine a settings record, eight bits a byte, names. */
export function fm1VaRecordEngine(record: Uint8Array): Fm1VaEngine {
  const marker = record[engineMarkerByte]
  if (marker === virtualAnalogMarker) return 'virtual-analog'
  return marker === eightBitMarker ? 'eight-bit' : 'fm'
}
