import {
  assertOfficialOpenToken,
  officialOpenChecksum,
  officialOpenHeader,
  packSevenBitStream,
  parseOfficialOpenReply,
  type OfficialOpenLink,
} from './official-open-transfer'

/**
 * The read commands of M-VAVE's Official Open transfer protocol, `F0 7D 46 4D 02` (docs/fm1-research.md,
 * "Official Open: released source" and "Official Open V14"), approved on 2026-10-20: 1, begin an
 * export, for a track's DX7 voice, a track's sound, and a DX7 bank of V14's library; 2, read a chunk
 * of one; 6, cancel; 9, a project slot's name; and 22, capabilities. None changes anything on the
 * FM1. Every other command needs its own approval recorded in AGENTS.md first, so each builder here
 * takes only what its command is approved for, and nothing here sends an arbitrary command.
 */

const beginExportCommand = 1
const readChunkCommand = 2
const cancelCommand = 6
const slotNameCommand = 9
const capabilitiesCommand = 22

/** What a transfer reads, with the size the FM1 gives it and how many targets there are. */
const exportKinds = {
  /** One of V14's four DX7 banks: 32 standard 128-byte voices (`groove_fm_library_read`). */
  bank: { kind: 4, size: 4096, targets: 4 },
  /** One track's sound, a 223-byte `struct groove_preset`, whatever the engine (`.fm1t`'s payload). */
  sound: { kind: 2, size: 223, targets: 8 },
  /** One DX7 voice of a track, in the 156-byte form the engine edits (`groove_fm_copy`). */
  voice: { kind: 1, size: 156, targets: 8 },
} as const

export type OfficialOpenExportKind = keyof typeof exportKinds

/** The most one command 2 reads. */
const chunkBytes = 64

/** `F0 7D 46 4D 02 <command> <token lo> <token hi> <packed payload> <checksum> F7`. */
function makeRequest(command: number, token: number, payload: readonly number[] = []) {
  assertOfficialOpenToken(token)
  const body = [...officialOpenHeader.slice(1), command, token & 0x7f, token >> 7]
  body.push(...packSevenBitStream(payload))
  return Uint8Array.of(0xf0, ...body, officialOpenChecksum(body), 0xf7)
}

/** Command 1: starts an export of `kind` for track `target` (0–7), or bank `target` (0–3). */
export function makeOfficialOpenBeginExportRequest(
  token: number,
  kind: OfficialOpenExportKind,
  target: number,
) {
  const { kind: number, targets } = exportKinds[kind]
  if (!Number.isInteger(target) || target < 0 || target >= targets) {
    throw new RangeError(
      `An Official Open ${kind} export has ${targets} targets; received ${target}.`,
    )
  }
  return makeRequest(beginExportCommand, token, [number, target])
}

/** Command 2: `count` bytes (1–64) of the export in progress, from `offset`. */
export function makeOfficialOpenReadChunkRequest(token: number, offset: number, count: number) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 0xffff) {
    throw new RangeError(`An Official Open chunk offset is 0 to 65535; received ${offset}.`)
  }
  if (!Number.isInteger(count) || count < 1 || count > chunkBytes) {
    throw new RangeError(`An Official Open chunk is 1 to ${chunkBytes} bytes; received ${count}.`)
  }
  return makeRequest(readChunkCommand, token, [offset & 0xff, offset >> 8, count])
}

/** Command 6: ends the transfer in progress, which frees the FM1's buffer. */
export function makeOfficialOpenCancelRequest(token: number) {
  return makeRequest(cancelCommand, token)
}

/** Command 9: the name of project slot `slot` (0–15). */
export function makeOfficialOpenSlotNameRequest(token: number, slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 15) {
    throw new RangeError(`An Official Open project slot is 0 to 15; received ${slot}.`)
  }
  return makeRequest(slotNameCommand, token, [slot])
}

/** Command 22: what this release can do, with no payload. */
export function makeOfficialOpenCapabilitiesRequest(token: number) {
  return makeRequest(capabilitiesCommand, token)
}

export type OfficialOpenReadProblem =
  'cancelled' | 'no-reply' | 'refused' | 'send-failed' | 'unexpected'

/** A read that did not finish. `status` is the FM1's, when it refused. */
export class OfficialOpenReadError extends Error {
  readonly problem: OfficialOpenReadProblem
  readonly status: number | undefined

  constructor(problem: OfficialOpenReadProblem, message: string, status?: number) {
    super(message)
    this.name = 'OfficialOpenReadError'
    this.problem = problem
    this.status = status
  }
}

type ReadOptions = {
  /** How many times to send a request before giving up. */
  attempts?: number
  /** Aborted when the ports change or MIDI is switched off. */
  signal?: AbortSignal
  /** How long to wait for an answer before asking again. */
  timeoutMs?: number
  /** A token no recent request used: the FM1 answers a repeated request with the reply it kept. */
  takeToken: () => number
}

/**
 * Sends the request `makeRequestFor(token)` builds and resolves with the data of its reply, asking
 * again with the same token when no answer comes within `timeoutMs`, as the Workbench does.
 */
function exchange(
  link: OfficialOpenLink,
  command: number,
  makeRequestFor: (token: number) => Uint8Array,
  { attempts = 3, signal, takeToken, timeoutMs = 1000 }: ReadOptions,
) {
  const token = takeToken()
  const request = makeRequestFor(token)

  return new Promise<number[]>((resolve, reject) => {
    let sent = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    let stopListening = () => {}

    const finish = (outcome: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stopListening()
      signal?.removeEventListener('abort', cancel)
      outcome()
    }
    const fail = (problem: OfficialOpenReadProblem, message: string, status?: number) =>
      finish(() => reject(new OfficialOpenReadError(problem, message, status)))

    function cancel() {
      fail('cancelled', 'The read was cancelled.')
    }

    const ask = () => {
      if (sent === attempts) {
        fail('no-reply', 'The FM1 did not answer the read.')
        return
      }
      sent += 1
      try {
        link.send(request)
      } catch {
        fail('send-failed', 'The read could not be sent.')
        return
      }
      // A reply heard while sending has already finished the read.
      if (!settled) timer = setTimeout(ask, timeoutMs)
    }

    const hear = (message: Uint8Array | readonly number[]) => {
      const reply = parseOfficialOpenReply(message, token, command)
      if (!reply) return
      if (reply.status !== 0) {
        fail('refused', `The FM1 refused the read (${reply.status}).`, reply.status)
      } else {
        finish(() => resolve(reply.fields))
      }
    }

    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel)
    stopListening = link.listen(hear)
    ask()
  })
}

type ExportRead = ReadOptions & {
  kind: OfficialOpenExportKind
  /** The track (0–7) of a voice or sound, or the bank (0–3) of a bank. */
  target: number
}

/**
 * Reads one export from the FM1 with commands 1 and 2, 64 bytes at a time, and resolves with its
 * bytes exactly as the FM1 sends them. The size the FM1 reports must be the kind's size, and every
 * chunk must come back whole. The transfer is ended with command 6 once it has finished or failed,
 * so the FM1 frees its buffer, but not when it was aborted: the ports may have changed by then, and
 * the FM1 frees an idle transfer itself after 10 s. Nothing is sent that changes the FM1.
 */
export async function readOfficialOpenExport(link: OfficialOpenLink, read: ExportRead) {
  const { kind, target } = read
  const { size } = exportKinds[kind]

  const endTransfer = () => {
    try {
      link.send(makeOfficialOpenCancelRequest(read.takeToken()))
    } catch {
      // The FM1 frees an idle transfer after 10 s.
    }
  }

  let begun = false
  try {
    const started = await exchange(
      link,
      beginExportCommand,
      (token) => makeOfficialOpenBeginExportRequest(token, kind, target),
      read,
    )
    begun = true
    if (started.length !== 2 || (started[0] | (started[1] << 8)) !== size) {
      throw new OfficialOpenReadError(
        'unexpected',
        `The FM1 reported a ${kind} of an unexpected size.`,
      )
    }

    const bytes = new Uint8Array(size)
    for (let offset = 0; offset < size; offset += chunkBytes) {
      const count = Math.min(chunkBytes, size - offset)
      const chunk = await exchange(
        link,
        readChunkCommand,
        (token) => makeOfficialOpenReadChunkRequest(token, offset, count),
        read,
      )
      if (chunk.length !== count) {
        throw new OfficialOpenReadError('unexpected', 'The FM1 sent a chunk of the wrong length.')
      }
      bytes.set(chunk, offset)
    }
    endTransfer()
    return bytes
  } catch (caughtError) {
    if (
      begun &&
      !(caughtError instanceof OfficialOpenReadError && caughtError.problem === 'cancelled')
    ) {
      endTransfer()
    }
    throw caughtError
  }
}

/** What command 22 says a release can do. */
export type OfficialOpenCapabilities = {
  /** The capability reply's own version, 1 on V14. */
  version: number
  /** How many DX7 programs the FM1 holds, 128 on V14. */
  programCount: number
  bankCount: number
  libraryAvailable: boolean
  /** The largest sample bank a new transfer may write, in bytes. */
  sampleBankLimit: number
  /** Bit 0: session roles. Bit 1: extended and synchronised delay. */
  features: number
}

const capabilitiesLength = 9

/** Asks command 22. Releases before V14 refuse it, which rejects with `problem` `refused`. */
export async function readOfficialOpenCapabilities(
  link: OfficialOpenLink,
  options: ReadOptions,
): Promise<OfficialOpenCapabilities> {
  const fields = await exchange(
    link,
    capabilitiesCommand,
    makeOfficialOpenCapabilitiesRequest,
    options,
  )
  if (fields.length !== capabilitiesLength || fields[0] !== 1 || fields[3] > 1) {
    throw new OfficialOpenReadError(
      'unexpected',
      'The FM1 answered with capabilities in an unknown layout.',
    )
  }
  const [version, programCount, bankCount, libraryAvailable, ...rest] = fields
  return {
    bankCount,
    features: rest[4],
    libraryAvailable: libraryAvailable === 1,
    programCount,
    sampleBankLimit: (rest[0] | (rest[1] << 8) | (rest[2] << 16) | (rest[3] << 24)) >>> 0,
    version,
  }
}

const slotNameLength = 12

/** Asks command 9 for project slot `slot`'s name, which is up to 12 printable characters. */
export async function readOfficialOpenSlotName(
  link: OfficialOpenLink,
  slot: number,
  options: ReadOptions,
) {
  const fields = await exchange(
    link,
    slotNameCommand,
    (token) => makeOfficialOpenSlotNameRequest(token, slot),
    options,
  )
  if (fields.length !== slotNameLength || fields.some((byte) => byte < 0x20 || byte > 0x7e)) {
    throw new OfficialOpenReadError(
      'unexpected',
      'The FM1 answered with a slot name in an unknown layout.',
    )
  }
  return String.fromCharCode(...fields).trimEnd()
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
  return value >>> 0
})

/** The standard CRC-32 the transfer protocol uses (polynomial `0xEDB88320`), for fixtures and logs. */
export function officialOpenCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
