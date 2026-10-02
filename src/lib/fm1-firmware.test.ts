import { describe, expect, it } from 'vitest'

import {
  classifyFm1Firmware,
  fm1IdentityQuery,
  parseFm1IdentityReply,
  sendsSingleVoiceDumps,
} from '@/lib/fm1-firmware'
import { feluccaIdentityReply, fm1VaIdentityReply, mvaveIdentityReply } from '@/test/fake-fm1-midi'

describe('fm1IdentityQuery', () => {
  it('is the updater identity query, which asks for item 0x40', () => {
    expect([...fm1IdentityQuery]).toEqual([
      0xf0, 0x00, 0x32, 0x45, 0x00, 0x00, 0x00, 0x40, 0x7f, 0xf7,
    ])
  })
})

describe('parseFm1IdentityReply', () => {
  it('reads the name from a reply captured on M-VAVE firmware', () => {
    expect(parseFm1IdentityReply(mvaveIdentityReply)).toBe('FM-1_015')
  })

  it('reads the name from a reply WebMidi hands over as a plain array', () => {
    expect(parseFm1IdentityReply([...mvaveIdentityReply])).toBe('FM-1_015')
  })

  it('reads the name from an FM-1+VA reply, which keeps M-VAVE V15’s checksum', () => {
    expect(parseFm1IdentityReply(fm1VaIdentityReply)).toBe('FM-1_089')
  })

  it('reads the name Felucca answers with', () => {
    expect(parseFm1IdentityReply(feluccaIdentityReply)).toBe('FM-1_904')
  })

  it('rejects a reply whose block does not declare a 27-byte name field', () => {
    const damaged = Uint8Array.from(mvaveIdentityReply)
    damaged[5] = 0x00

    expect(parseFm1IdentityReply(damaged)).toBeNull()
  })

  it('rejects a reply of the wrong length', () => {
    expect(parseFm1IdentityReply(mvaveIdentityReply.subarray(0, 40))).toBeNull()
  })

  it('rejects other SysEx, such as a DX7 parameter change', () => {
    expect(
      parseFm1IdentityReply(Uint8Array.of(0xf0, 0x43, 0x10, 0x01, 0x09, 0x20, 0xf7)),
    ).toBeNull()
  })

  it('rejects a reply carrying a byte above seven bits', () => {
    const damaged = Uint8Array.from(mvaveIdentityReply)
    damaged[20] = 0x80

    expect(parseFm1IdentityReply(damaged)).toBeNull()
  })
})

describe('classifyFm1Firmware', () => {
  it('counts FM-1_019 and below as M-VAVE firmware', () => {
    expect(classifyFm1Firmware('FM-1_015')).toEqual({ identity: 'FM-1_015', kind: 'mvave' })
    expect(classifyFm1Firmware('FM-1_019')).toEqual({ identity: 'FM-1_019', kind: 'mvave' })
  })

  it('counts FM-1_020 to FM-1_899 as FM-1+VA, including releases after the tested one', () => {
    expect(classifyFm1Firmware('FM-1_020')).toEqual({ identity: 'FM-1_020', kind: 'fm1-va' })
    expect(classifyFm1Firmware('FM-1_120')).toEqual({ identity: 'FM-1_120', kind: 'fm1-va' })
    expect(classifyFm1Firmware('FM-1_899')).toEqual({ identity: 'FM-1_899', kind: 'fm1-va' })
  })

  it('leaves Felucca, which answers FM-1_904, unidentified rather than FM-1+VA', () => {
    expect(classifyFm1Firmware('FM-1_904')).toEqual({ identity: 'FM-1_904', kind: 'unidentified' })
    expect(classifyFm1Firmware('FM-1_900')).toEqual({ identity: 'FM-1_900', kind: 'unidentified' })
  })

  it('leaves a name it does not recognise unidentified', () => {
    expect(classifyFm1Firmware('XR-9_015')).toEqual({ identity: 'XR-9_015', kind: 'unidentified' })
  })
})

describe('sendsSingleVoiceDumps', () => {
  it('sends single-voice dumps only to M-VAVE firmware', () => {
    expect(sendsSingleVoiceDumps({ identity: 'FM-1_015', kind: 'mvave' })).toBe(true)
    expect(sendsSingleVoiceDumps({ identity: 'FM-1_089', kind: 'fm1-va' })).toBe(false)
    expect(sendsSingleVoiceDumps({ kind: 'checking' })).toBe(false)
    expect(sendsSingleVoiceDumps({ kind: 'unidentified' })).toBe(false)
    expect(sendsSingleVoiceDumps({ identity: 'FM-1_904', kind: 'unidentified' })).toBe(false)
  })
})
