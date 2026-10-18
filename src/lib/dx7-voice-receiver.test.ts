import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { makeDx7BankFile, parseDx7Bank } from '@/lib/dx7'
import { makeDx7VoiceFile } from '@/lib/dx7-voice-file'

import { Dx7VoiceReceiver, type Dx7VoiceReceipt } from './dx7-voice-receiver'

// BRASS 1, the first voice of Yamaha's ROM1A factory cartridge, as Dexed or a DX7 sends it.
const factoryBank = parseDx7Bank(
  Uint8Array.from(readFileSync(resolve('public/dx7-banks/factory/rom1a.syx'))).buffer,
)
const brass = factoryBank[0]

function dump() {
  return makeDx7VoiceFile(brass)
}

function problemOf(receipt: Dx7VoiceReceipt | null) {
  return receipt?.kind === 'error' ? receipt.error.problem : receipt?.kind
}

describe('Dx7VoiceReceiver', () => {
  it('reads a single-voice dump that arrives in one message', () => {
    const receipt = new Dx7VoiceReceiver().receive(dump())

    expect(receipt?.kind).toBe('voice')
    if (receipt?.kind !== 'voice') return
    expect(receipt.voice.name).toBe('BRASS   1')
    expect(receipt.voice.data).toEqual(brass.data)
  })

  it('accepts a dump sent on another MIDI channel', () => {
    const bytes = dump()
    bytes[2] = 0x05

    expect(new Dx7VoiceReceiver().receive(bytes)?.kind).toBe('voice')
  })

  it('joins a dump split across several messages', () => {
    const receiver = new Dx7VoiceReceiver()
    const bytes = dump()

    expect(receiver.receive(bytes.slice(0, 40))).toBeNull()
    expect(receiver.receive(bytes.slice(40, 100))).toBeNull()
    expect(receiver.receive(bytes.slice(100))?.kind).toBe('voice')
  })

  it('keeps joining a split dump through a timing clock between its parts', () => {
    const receiver = new Dx7VoiceReceiver()
    const bytes = dump()

    receiver.receive(bytes.slice(0, 80))
    receiver.receive([0xf8])

    expect(receiver.receive(bytes.slice(80))?.kind).toBe('voice')
  })

  it('drops a split dump that another message interrupts', () => {
    const receiver = new Dx7VoiceReceiver()
    const bytes = dump()

    receiver.receive(bytes.slice(0, 80))
    receiver.receive([0x90, 60, 100])

    expect(receiver.receive(bytes.slice(80))).toBeNull()
  })

  it('forgets a part-way dump when reset', () => {
    const receiver = new Dx7VoiceReceiver()
    const bytes = dump()

    receiver.receive(bytes.slice(0, 80))
    receiver.reset()

    expect(receiver.receive(bytes.slice(80))).toBeNull()
  })

  it('ignores notes, controllers, clocks, and program changes', () => {
    const receiver = new Dx7VoiceReceiver()

    for (const message of [[0x90, 60, 100], [0x80, 60, 0], [0xb0, 7, 90], [0xf8], [0xc0, 3]]) {
      expect(receiver.receive(message)).toBeNull()
    }
  })

  it('ignores a Yamaha parameter change, as Dexed sends when a knob turns', () => {
    expect(new Dx7VoiceReceiver().receive([0xf0, 0x43, 0x10, 0x01, 0x06, 0x05, 0xf7])).toBeNull()
  })

  it('ignores another maker’s SysEx, such as an identity reply', () => {
    const reply = [0xf0, 0x7e, 0x00, 0x06, 0x02, 0x00, 0x32, 0x00, 0x00, 0xf7]

    expect(new Dx7VoiceReceiver().receive(reply)).toBeNull()
  })

  it('still reads a dump after ignoring other messages', () => {
    const receiver = new Dx7VoiceReceiver()
    receiver.receive([0xf0, 0x7e, 0x00, 0xf7])
    receiver.receive([0x90, 60, 100])

    expect(receiver.receive(dump())?.kind).toBe('voice')
  })

  it('rejects a Yamaha bulk dump in another format as not a DX7 voice', () => {
    const bytes = dump()
    bytes[3] = 0x03

    expect(problemOf(new Dx7VoiceReceiver().receive(bytes))).toBe('format')
  })

  it('rejects a dump of the wrong length', () => {
    const bytes = dump()
    const short = [...bytes.slice(0, 120), 0xf7]

    expect(problemOf(new Dx7VoiceReceiver().receive(short))).toBe('size')
  })

  it('names a 32-voice bank dump as a bank', () => {
    expect(problemOf(new Dx7VoiceReceiver().receive(makeDx7BankFile(factoryBank)))).toBe('bank')
  })

  it('rejects a dump whose checksum does not match', () => {
    const bytes = dump()
    bytes[161] = (bytes[161] + 1) & 0x7f

    expect(problemOf(new Dx7VoiceReceiver().receive(bytes))).toBe('checksum')
  })

  it('rejects a dump carrying a byte above 7-bit', () => {
    const bytes = dump()
    bytes[50] = 0x85

    expect(problemOf(new Dx7VoiceReceiver().receive(bytes))).toBe('high-bit-data')
  })
})
