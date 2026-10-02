import {
  dx7BankArchiveMaximumBanks,
  Dx7BankFileError,
  dx7BankFileSize,
  parseDx7Bank,
  type Dx7Voice,
} from '@/lib/dx7'

/**
 * Reads a `.syx` file that may hold several DX7 32-voice banks one after another, as archive
 * collections often do. It loads when a bank file is chosen, so the initial page does without it.
 */

const maximumFileSize = dx7BankArchiveMaximumBanks * dx7BankFileSize

/** A bank in a file: its 32 patches, or null when the bank is damaged. */
export type Dx7ArchiveBank = { voices: Dx7Voice[] | null }

// F0 43 0n 09 20 00: Yamaha, any channel, a 32-voice bulk dump of 4,096 bytes.
function isBankHeader(bytes: Uint8Array<ArrayBuffer>, start: number) {
  return (
    bytes[start] === 0xf0 &&
    bytes[start + 1] === 0x43 &&
    (bytes[start + 2] & 0xf0) === 0x00 &&
    bytes[start + 3] === 0x09 &&
    bytes[start + 4] === 0x20 &&
    bytes[start + 5] === 0x00
  )
}

/** Each bank dump in the file, from its F0 to its F7 or the end of the file. */
function findBankMessages(bytes: Uint8Array<ArrayBuffer>) {
  const messages: Uint8Array<ArrayBuffer>[] = []
  let start = bytes.indexOf(0xf0)
  while (start !== -1) {
    const end = bytes.indexOf(0xf7, start)
    const next = end === -1 ? bytes.length : end + 1
    if (isBankHeader(bytes, start)) messages.push(bytes.slice(start, next))
    start = bytes.indexOf(0xf0, next)
  }
  return messages
}

function readBank(message: Uint8Array<ArrayBuffer>): Dx7ArchiveBank {
  try {
    return { voices: parseDx7Bank(message.buffer) }
  } catch (error) {
    if (error instanceof Dx7BankFileError) return { voices: null }
    throw error
  }
}

function fileSizeError(receivedBytes: number) {
  return new Dx7BankFileError(
    receivedBytes > maximumFileSize ? 'too-large' : 'size',
    `Expected DX7 banks of ${dx7BankFileSize} bytes each; received ${receivedBytes} bytes.`,
    receivedBytes,
  )
}

/**
 * Splits a file into its DX7 banks, in file order. Other SysEx messages and bytes between dumps
 * are passed over. A damaged bank is reported in its place rather than failing the file; a file
 * holding one bank is refused for the problem that bank has, as before banks could be joined.
 */
export function parseDx7BankArchive(file: ArrayBuffer): Dx7ArchiveBank[] {
  const bytes = new Uint8Array(file)
  if (bytes.length > maximumFileSize) throw fileSizeError(bytes.length)

  const messages = findBankMessages(bytes)
  if (messages.length === 0) {
    if (bytes.length % dx7BankFileSize !== 0) throw fileSizeError(bytes.length)
    throw new Dx7BankFileError(
      'format',
      'This is not a Yamaha DX7 32-voice bulk SysEx bank.',
      bytes.length,
    )
  }
  if (messages.length === 1) return [{ voices: parseDx7Bank(messages[0].buffer) }]

  const banks = messages.map(readBank)
  if (banks.every(({ voices }) => voices === null)) {
    throw new Dx7BankFileError('checksum', 'Every DX7 bank in the file is damaged.', bytes.length)
  }
  return banks
}

/** Reads a bank file the user chose, refusing one too large to hold banks before loading it. */
export async function readDx7BankArchive(file: Blob) {
  if (file.size > maximumFileSize) throw fileSizeError(file.size)
  return parseDx7BankArchive(await file.arrayBuffer())
}
