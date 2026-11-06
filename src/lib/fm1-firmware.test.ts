import { describe, expect, it } from 'vitest'

import {
  classifyFm1Firmware,
  fm1Device,
  fm1FirmwareRelease,
  fm1IdentityQuery,
  mayBeSloop,
  parseFm1IdentityReply,
} from '@/lib/fm1-firmware'
import {
  feluccaIdentityReply,
  fm1VaIdentityReply,
  mvaveIdentityReply,
  officialOpenIdentityReply,
  smk37IdentityReply,
} from '@/test/fake-fm1-midi'

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

  it('reads the name from a reply captured on Official Open V12', () => {
    expect(parseFm1IdentityReply(officialOpenIdentityReply)).toBe('FM-1_8000012')
  })

  it('reads the name from a reply captured on the SMK-37 Pro’s stock V015', () => {
    expect(smk37IdentityReply).toHaveLength(41)
    expect(parseFm1IdentityReply(smk37IdentityReply)).toBe('SMK-37 Pro_015')
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

  it('counts FM-1_900 to FM-1_999 as Felucca rather than FM-1+VA', () => {
    expect(classifyFm1Firmware('FM-1_900')).toEqual({ identity: 'FM-1_900', kind: 'felucca' })
    expect(classifyFm1Firmware('FM-1_904')).toEqual({ identity: 'FM-1_904', kind: 'felucca' })
    expect(classifyFm1Firmware('FM-1_999')).toEqual({ identity: 'FM-1_999', kind: 'felucca' })
  })

  it('counts every name Official Open’s updater accepts as Official Open', () => {
    for (const identity of [
      'FM-1_8000012',
      'FM-1_8000013',
      'FM-1_8000014',
      'FM-1_8000999',
      'FM1_COMMUNITY_0',
      'FM1_COMMUNITY_42',
      'FM1_OFFICIAL_OPEN',
    ]) {
      expect(classifyFm1Firmware(identity)).toEqual({ identity, kind: 'official-open' })
    }
  })

  it('counts the one name DX747 reports as DX747, not Official Open', () => {
    expect(classifyFm1Firmware('FM-1_8747747')).toEqual({
      identity: 'FM-1_8747747',
      kind: 'dx747',
    })
  })

  it('leaves every other Official Open name above release 999 unidentified', () => {
    for (const identity of [
      'FM-1_8001000',
      'FM-1_8747746',
      'FM-1_8747748',
      'FM-1_8747747 ',
      'FM-1_87477470',
      'FM-1_8999999',
    ]) {
      expect(classifyFm1Firmware(identity)).toEqual({ identity, kind: 'unidentified' })
    }
  })

  it('keeps three-digit names in the 800s as FM-1+VA rather than Official Open', () => {
    expect(classifyFm1Firmware('FM-1_800')).toEqual({ identity: 'FM-1_800', kind: 'fm1-va' })
    expect(classifyFm1Firmware('FM-1_812')).toEqual({ identity: 'FM-1_812', kind: 'fm1-va' })
  })

  it('counts the stock releases of each SMK-37 model as the SMK-37', () => {
    for (const identity of [
      'SMK-37 Pro_015',
      'SMK-37 Pro_016',
      'SMK-37 Elite_016',
      'MKE-P37_013',
    ]) {
      expect(classifyFm1Firmware(identity)).toEqual({ identity, kind: 'smk37' })
    }
  })

  it('leaves FM-1 firmware ported to the SMK-37 unidentified', () => {
    for (const identity of [
      'SMK-37 Pro_714',
      'SMK-37 Elite_714',
      'MKE-P37_714',
      'SMK-37 Pro_904',
      'SMK-37_970',
      'SMK-37 Pro_15',
      'smk-37 pro_015',
    ]) {
      expect(classifyFm1Firmware(identity)).toEqual({ identity, kind: 'unidentified' })
    }
  })

  it('leaves a name it does not recognise unidentified', () => {
    expect(classifyFm1Firmware('XR-9_015')).toEqual({ identity: 'XR-9_015', kind: 'unidentified' })
  })

  it('leaves names close to Official Open’s unidentified', () => {
    for (const identity of [
      'FM-1_800012',
      'FM-1_80000120',
      'FM-1_9000012',
      'FM1_COMMUNITY_',
      'FM1_COMMUNITY_X',
      'fm1_official_open',
      'FM1_OFFICIAL_OPEN_2',
    ]) {
      expect(classifyFm1Firmware(identity)).toEqual({ identity, kind: 'unidentified' })
    }
  })
})

describe('fm1FirmwareRelease', () => {
  it('names an M-VAVE release as M-VAVE numbers it', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_015', kind: 'mvave' })).toBe('V15')
    expect(fm1FirmwareRelease({ identity: 'FM-1_009', kind: 'mvave' })).toBe('V9')
  })

  it('names an Official Open release as M-VAVE numbers it, and other builds by their name', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_8000012', kind: 'official-open' })).toBe('V12')
    expect(fm1FirmwareRelease({ identity: 'FM-1_8000013', kind: 'official-open' })).toBe('V13')
    expect(fm1FirmwareRelease({ identity: 'FM-1_8000014', kind: 'official-open' })).toBe('V14')
    expect(fm1FirmwareRelease({ identity: 'FM1_COMMUNITY_3', kind: 'official-open' })).toBe(
      'FM1_COMMUNITY_3',
    )
    expect(fm1FirmwareRelease({ identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' })).toBe(
      'FM1_OFFICIAL_OPEN',
    )
  })

  it('names DX747 by the name the FM1 reports, which carries no release', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_8747747', kind: 'dx747' })).toBe('FM-1_8747747')
  })

  it('names an SMK-37 release as M-VAVE numbers it', () => {
    expect(fm1FirmwareRelease({ identity: 'SMK-37 Pro_015', kind: 'smk37' })).toBe('V15')
    expect(fm1FirmwareRelease({ identity: 'MKE-P37_016', kind: 'smk37' })).toBe('V16')
  })

  it('names an FM-1+VA release by the name the FM1 reports', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_089', kind: 'fm1-va' })).toBe('FM-1_089')
  })

  it('names a Felucca release X.Y from its FM-1_9XY name', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_904', kind: 'felucca' })).toBe('0.4')
    expect(fm1FirmwareRelease({ identity: 'FM-1_908', kind: 'felucca' })).toBe('0.8')
    expect(fm1FirmwareRelease({ identity: 'FM-1_910', kind: 'felucca' })).toBe('1.0')
  })

  it('names a Felucca development build by the name the FM1 reports', () => {
    expect(fm1FirmwareRelease({ identity: 'FM-1_900', kind: 'felucca' })).toBe('FM-1_900')
  })
})

describe('mayBeSloop', () => {
  it('counts FM-1_900, which every SLOOP release reports, as possibly SLOOP', () => {
    expect(mayBeSloop({ identity: 'FM-1_900', kind: 'felucca' })).toBe(true)
  })

  it('counts a numbered Felucca release as Felucca alone', () => {
    expect(mayBeSloop({ identity: 'FM-1_909', kind: 'felucca' })).toBe(false)
  })

  it('counts no other firmware as possibly SLOOP', () => {
    expect(mayBeSloop({ identity: 'FM-1_089', kind: 'fm1-va' })).toBe(false)
    expect(mayBeSloop({ identity: 'FM-1_900', kind: 'unidentified' })).toBe(false)
    expect(mayBeSloop({ kind: 'checking' })).toBe(false)
  })
})

describe('fm1Device', () => {
  it('names an SMK-37 by its model, whatever firmware it runs', () => {
    for (const identity of [
      'SMK-37 Pro_015',
      'SMK-37 Elite_016',
      'MKE-P37_013',
      'SMK-37 Pro_714',
      'MKE-P37_714',
      'SMK-37_970',
    ]) {
      expect(fm1Device(classifyFm1Firmware(identity))).toBe('smk37')
    }
  })

  it('takes every other answer, and none, as an FM1', () => {
    for (const identity of [
      'FM-1_015',
      'FM-1_089',
      'FM-1_8000012',
      'FM-1_8747747',
      'XR-9_015',
      'SMK-37 Pro',
    ]) {
      expect(fm1Device(classifyFm1Firmware(identity))).toBe('fm1')
    }
    expect(fm1Device({ kind: 'checking' })).toBe('fm1')
    expect(fm1Device({ kind: 'unidentified' })).toBe('fm1')
  })
})
