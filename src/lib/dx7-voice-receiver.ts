import { yamahaManufacturerId, type Dx7Voice } from '@/lib/dx7'
import {
  Dx7VoiceFileError,
  dx7VoiceFileSize,
  dx7VoiceSizeError,
  parseDx7VoiceFile,
} from '@/lib/dx7-voice-file'

const sysexStart = 0xf0
const sysexEnd = 0xf7
// Timing Clock, Active Sensing, and the other real-time bytes may arrive between the parts of a
// SysEx message without ending it.
const realTimeStatusStart = 0xf8

/** What one incoming MIDI message did to a dump being received. */
export type Dx7VoiceReceipt =
  { kind: 'voice'; voice: Dx7Voice } | { error: Dx7VoiceFileError; kind: 'error' }

/**
 * Collects a Yamaha DX7 single-voice dump from incoming MIDI messages, checking it as
 * `parseDx7VoiceFile` checks a file.
 *
 * The Web MIDI API hands each SysEx message over in one event, but some systems split a long one
 * across several, each later part starting with a data byte, so the parts are joined until F7.
 * Everything that is not a Yamaha bulk dump is ignored: notes, controllers, clocks, a Yamaha
 * parameter change, such as Dexed sends as a knob turns, and another maker's SysEx. A dump is kept
 * to the size of a voice, so a long message cannot fill memory, but its length is still counted to
 * say what it was.
 */
export class Dx7VoiceReceiver {
  private bytes: number[] = []
  private ignoring = false
  private length = 0
  private receiving = false

  /**
   * Takes one incoming message. Returns the voice when a valid dump is complete, an error when a
   * complete Yamaha bulk dump is not one, and nothing for everything else.
   */
  receive(data: ArrayLike<number>): Dx7VoiceReceipt | null {
    if (data.length === 0) return null
    const first = data[0]
    if (data.length === 1 && first >= realTimeStatusStart) return null

    if (first === sysexStart) this.start()
    // Any other status byte starts another message, so a dump still being received was cut off.
    else if (first >= 0x80) this.reset()
    if (!this.receiving) return null

    for (let index = 0; index < data.length; index += 1) {
      const byte = data[index]
      if (byte === sysexEnd) return this.finish()
      this.take(byte)
    }
    return null
  }

  /** Forgets a dump part-way through, as when the input changes. */
  reset() {
    this.bytes = []
    this.ignoring = false
    this.length = 0
    this.receiving = false
  }

  private start() {
    this.reset()
    this.receiving = true
  }

  private take(byte: number) {
    this.length += 1
    if (this.ignoring) return
    if (this.bytes.length < dx7VoiceFileSize) this.bytes.push(byte)
    // F0 43 0n is a Yamaha bulk dump on channel n; F0 43 1n is a parameter change.
    if (this.bytes.length === 2 && this.bytes[1] !== yamahaManufacturerId) this.ignoring = true
    if (this.bytes.length === 3 && (this.bytes[2] & 0xf0) !== 0) this.ignoring = true
  }

  private finish(): Dx7VoiceReceipt | null {
    const bytes = [...this.bytes, sysexEnd]
    const length = this.length + 1
    const ignored = this.ignoring || bytes.length < 4
    this.reset()
    if (ignored) return null

    try {
      if (length !== dx7VoiceFileSize) throw dx7VoiceSizeError(length)
      return { kind: 'voice', voice: parseDx7VoiceFile(Uint8Array.from(bytes).buffer) }
    } catch (error) {
      if (error instanceof Dx7VoiceFileError) return { error, kind: 'error' }
      throw error
    }
  }
}
