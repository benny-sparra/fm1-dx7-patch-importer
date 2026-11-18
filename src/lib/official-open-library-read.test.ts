import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { makeDx7BankPayload, unpackDx7Voice } from './dx7'
import { officialOpenLibraryBank, officialOpenTrackVoice } from './official-open-library-read'
import { OfficialOpenReadError } from './official-open-transfer'

// The reads of 2026-10-20 on Official Open V14, exactly as the FM1 sent them
// (docs/hardware-runs/official-open-v14-reads-2026-10-20.md).
const capture: { captures: { hex?: string; what: string }[] } = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      '../../docs/hardware-runs/official-open-v14-reads-capture-2026-10-20.json',
    ),
    'utf8',
  ),
)

function captured(what: string) {
  const hex = capture.captures.find((entry) => entry.what === what)?.hex
  if (!hex) throw new Error(`The capture holds no ${what}.`)
  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16))
}

function unexpectedRead(run: () => unknown) {
  try {
    run()
  } catch (caughtError) {
    return caughtError instanceof OfficialOpenReadError && caughtError.problem === 'unexpected'
  }
  return false
}

describe('officialOpenTrackVoice', () => {
  it('reads the captured tracks as the patches the FM1 names', () => {
    expect(officialOpenTrackVoice(captured('voice, track 1')).name.trim()).toBe('DRY CLAV')
    expect(officialOpenTrackVoice(captured('voice, track 4')).name.trim()).toBe('SOFT BRASS')
  })

  it('keeps every edit-buffer byte and drops the operator switches', () => {
    const bytes = captured('voice, track 1')
    expect(Array.from(unpackDx7Voice(officialOpenTrackVoice(bytes)))).toEqual(
      Array.from(bytes.slice(0, 155)),
    )
  })

  it('reads a track with operators switched off as the same patch', () => {
    const bytes = captured('voice, track 1')
    const muted = bytes.slice()
    muted[155] = 0b000101
    expect(officialOpenTrackVoice(muted)).toEqual(officialOpenTrackVoice(bytes))
  })

  it('refuses a voice of another length or with a byte above seven bits', () => {
    const bytes = captured('voice, track 1')
    expect(unexpectedRead(() => officialOpenTrackVoice(bytes.slice(0, 155)))).toBe(true)
    const damaged = bytes.slice()
    damaged[10] = 0x80
    expect(unexpectedRead(() => officialOpenTrackVoice(damaged))).toBe(true)
  })
})

describe('officialOpenLibraryBank', () => {
  it('reads each captured bank as 32 patches, in the FM1’s order', () => {
    const firstAndLast = [0, 1, 2, 3].map((bank) => {
      const voices = officialOpenLibraryBank(captured(`bank ${bank}`))
      expect(voices).toHaveLength(32)
      return [voices[0].name.trim(), voices[31].name.trim()]
    })
    expect(firstAndLast).toEqual([
      ['PIANO 1', 'SYN PAD 8'],
      ['GUITAR 1', 'SYN BASS8'],
      ['BRASS 1', 'VOICE 8'],
      ['BOWOAN', 'WHAT IF'],
    ])
  })

  it('keeps the bank’s bytes exactly, as a DX7 bank dump of it shows', () => {
    const bytes = captured('bank 0')
    const payload = makeDx7BankPayload(officialOpenLibraryBank(bytes))
    expect(Array.from(payload.slice(4, 4 + 4096))).toEqual(Array.from(bytes))
  })

  it('refuses a bank of another length or with a byte above seven bits', () => {
    const bytes = captured('bank 0')
    expect(unexpectedRead(() => officialOpenLibraryBank(bytes.slice(1)))).toBe(true)
    const damaged = bytes.slice()
    damaged[200] = 0xff
    expect(unexpectedRead(() => officialOpenLibraryBank(damaged))).toBe(true)
  })
})
