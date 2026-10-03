/**
 * The settings record FM-1+VA stores with each preset: its effects and their order, its Envelope,
 * its own Filter, its engine, and settings not mapped yet (docs/fm1-research.md, "What the record
 * holds"). A patch keeps the record exactly as read, eight bits a byte, so a byte nobody understands
 * yet reaches the FM1 again unchanged. A patch that never came from FM-1+VA has none.
 */
export const fm1VaRecordSize = 59

/** A copy of a stored record, or undefined when the value is not one. */
export function readFm1VaRecord(value: unknown) {
  return value instanceof Uint8Array && value.length === fm1VaRecordSize ? value.slice() : undefined
}

/** The record as text for a sound key, empty for a patch without one. */
export function fm1VaRecordKey(record: Uint8Array | undefined) {
  return record ? Array.from(record, (byte) => byte.toString(16).padStart(2, '0')).join('') : ''
}
