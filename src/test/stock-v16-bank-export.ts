import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The one message a stock FM1 on M-VAVE's V16 (`FM-1_016`) sent for Bank Export of bank A on
 * 2026-10-23: a 4104-byte Yamaha 32-voice bulk dump, captured from its USB-MIDI input
 * (`docs/hardware-runs/stock-v16-2026-10-23.md`, step 7).
 */
export function stockV16BankExport() {
  const capture = JSON.parse(
    readFileSync(resolve('docs/hardware-runs/stock-v16-bank-export-2026-10-23.json'), 'utf8'),
  ) as { messages: { hex: string }[] }
  const [message] = capture.messages
  return Uint8Array.from(message.hex.match(/../g)!, (pair) => Number.parseInt(pair, 16))
}

/** The names of the capture's first patches, as the FM1 held them. */
export const stockV16BankExportNames = ['j.piano 7+', 'ORGAN 1', 'SYN LEAD 1', 'SYN PAD 1']
