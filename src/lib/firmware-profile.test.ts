import { describe, expect, it } from 'vitest'

import { resolveFirmwareProfile, sendsBankTo } from './firmware-profile'

const nothing = {
  bankDumps: false,
  bitcrush: false,
  effectControllers: false,
  effectOrder: false,
  knobChoices: false,
  liveEffectsRead: false,
  multitimbral: false,
  parameterChanges: false,
  presetEffects: false,
  presetRead: false,
  presetWrite: false,
  programChanges: false,
  selectedPresetWrite: false,
  selectedVoiceEdits: false,
  sharedEffects: false,
  singleVoiceDumps: false,
  soundControls: false,
  trackEngineRead: false,
}

// What every firmware but Official Open takes, whatever else it can do.
const cautious = {
  ...nothing,
  bankDumps: true,
  effectControllers: true,
  parameterChanges: true,
  presetEffects: true,
  programChanges: true,
}

const presetsPageTiming = { listenMs: 1500, spacingMs: 3000 }

function fm1Va(identity: string) {
  return resolveFirmwareProfile({ identity, kind: 'fm1-va' })
}

describe('resolveFirmwareProfile', () => {
  it('sends single-voice dumps to M-VAVE firmware and offers it cautious of FM-1+VA’s', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_015', kind: 'mvave' })).toEqual({
      capabilities: { ...cautious, singleVoiceDumps: true },
      effectControllerBase: 0,
      family: 'mvave',
      presetWriteTiming: presetsPageTiming,
    })
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_019', kind: 'mvave' }).capabilities.singleVoiceDumps,
    ).toBe(true)
  })

  it('places the effect controllers at CC 70 from V16, which moved them there', () => {
    const effectControllerBase = (identity: string) =>
      resolveFirmwareProfile({ identity, kind: 'mvave' }).effectControllerBase
    expect(effectControllerBase('FM-1_001')).toBe(0)
    expect(effectControllerBase('FM-1_015')).toBe(0)
    expect(effectControllerBase('FM-1_016')).toBe(70)
    expect(effectControllerBase('FM-1_019')).toBe(70)
  })

  it('sends a played patch’s effects only before V16, whose Voices share one FX group', () => {
    const presetEffects = (identity: string) =>
      resolveFirmwareProfile({ identity, kind: 'mvave' }).capabilities.presetEffects
    expect(presetEffects('FM-1_001')).toBe(true)
    expect(presetEffects('FM-1_015')).toBe(true)
    expect(presetEffects('FM-1_016')).toBe(false)
    expect(presetEffects('FM-1_019')).toBe(false)
  })

  it('shares one FX group across Voices only on M-VAVE firmware from V16', () => {
    const sharesEffects = (firmware: Parameters<typeof resolveFirmwareProfile>[0]) =>
      resolveFirmwareProfile(firmware).capabilities.sharedEffects
    expect(sharesEffects({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
    expect(sharesEffects({ identity: 'FM-1_016', kind: 'mvave' })).toBe(true)
    expect(sharesEffects({ identity: 'FM-1_019', kind: 'mvave' })).toBe(true)
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' },
    ] as const) {
      expect(sharesEffects(firmware)).toBe(false)
    }
  })

  it('says which Voice the editor reaches only from V16, which plays eight', () => {
    const selectedVoiceEdits = (identity: string) =>
      resolveFirmwareProfile({ identity, kind: 'mvave' }).capabilities.selectedVoiceEdits
    expect(selectedVoiceEdits('FM-1_015')).toBe(false)
    expect(selectedVoiceEdits('FM-1_016')).toBe(true)
    expect(selectedVoiceEdits('FM-1_019')).toBe(true)
    expect(resolveFirmwareProfile({ kind: 'checking' }).capabilities.selectedVoiceEdits).toBe(false)
  })

  it('lists several Voices only for M-VAVE’s stock firmware from V16', () => {
    const multitimbral = (firmware: Parameters<typeof resolveFirmwareProfile>[0]) =>
      resolveFirmwareProfile(firmware).capabilities.multitimbral
    expect(multitimbral({ identity: 'FM-1_015', kind: 'mvave' })).toBe(false)
    expect(multitimbral({ identity: 'FM-1_016', kind: 'mvave' })).toBe(true)
    expect(multitimbral({ identity: 'FM-1_019', kind: 'mvave' })).toBe(true)
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' },
    ] as const) {
      expect(multitimbral(firmware)).toBe(false)
    }
  })

  it('still sends V16 single-voice dumps, parameter changes, and Program Change', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_016', kind: 'mvave' })).toEqual({
      capabilities: {
        ...cautious,
        effectOrder: true,
        liveEffectsRead: true,
        multitimbral: true,
        presetEffects: false,
        selectedVoiceEdits: true,
        sharedEffects: true,
        singleVoiceDumps: true,
      },
      effectControllerBase: 70,
      family: 'mvave',
      presetWriteTiming: presetsPageTiming,
    })
  })

  it('offers the effect order to M-VAVE’s firmware from V16', () => {
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_016', kind: 'mvave' }).capabilities.effectOrder,
    ).toBe(true)
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_019', kind: 'mvave' }).capabilities.effectOrder,
    ).toBe(true)
  })

  it('offers no other firmware the effect order', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).capabilities.effectOrder).toBe(false)
    }
  })

  it('reads the live effects back from M-VAVE’s firmware from V16 only', () => {
    const reads = (firmware: Parameters<typeof resolveFirmwareProfile>[0]) =>
      resolveFirmwareProfile(firmware).capabilities.liveEffectsRead
    expect(reads({ identity: 'FM-1_016', kind: 'mvave' })).toBe(true)
    expect(reads({ identity: 'FM-1_019', kind: 'mvave' })).toBe(true)
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' },
    ] as const) {
      expect(reads(firmware)).toBe(false)
    }
  })

  it('keeps every other firmware’s effect controllers at CC 0, whatever its release', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM1_OFFICIAL_OPEN', kind: 'official-open' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).effectControllerBase).toBe(0)
    }
    expect(fm1Va('FM-1_097').capabilities.presetEffects).toBe(true)
  })

  it('gives Felucca cautious, as it ignores DX7 voice data', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_904', kind: 'felucca' })).toEqual({
      capabilities: cautious,
      effectControllerBase: 0,
      family: 'felucca',
      presetWriteTiming: presetsPageTiming,
    })
    expect(resolveFirmwareProfile({ identity: 'FM-1_908', kind: 'felucca' }).capabilities).toEqual(
      cautious,
    )
  })

  it('gives a firmware it does not recognise cautious, whatever name it answered with', () => {
    for (const identity of [undefined, 'XR-9_015', 'FM-1_999X']) {
      expect(resolveFirmwareProfile({ identity, kind: 'unidentified' })).toEqual({
        capabilities: cautious,
        effectControllerBase: 0,
        family: 'unidentified',
        presetWriteTiming: presetsPageTiming,
      })
    }
  })

  it('gives cautious before the firmware is known', () => {
    expect(resolveFirmwareProfile({ kind: 'checking' })).toEqual({
      capabilities: cautious,
      effectControllerBase: 0,
      family: 'checking',
      presetWriteTiming: presetsPageTiming,
    })
  })

  it('never sends FM-1+VA a single-voice dump, which it writes over the selected preset', () => {
    expect(fm1Va('FM-1_089').capabilities.singleVoiceDumps).toBe(false)
    expect(fm1Va('FM-1_097').capabilities.singleVoiceDumps).toBe(false)
  })

  it('reads and writes presets on FM-1+VA from FM-1_079, the release that added both', () => {
    expect(fm1Va('FM-1_078').capabilities).toEqual(cautious)
    expect(fm1Va('FM-1_079').capabilities).toEqual({
      ...cautious,
      presetRead: true,
      presetWrite: true,
    })
    expect(fm1Va('FM-1_093').capabilities.presetRead).toBe(true)
  })

  it('sends sound controls on FM-1+VA from FM-1_086, which added the controllers', () => {
    expect(fm1Va('FM-1_085').capabilities.soundControls).toBe(false)
    expect(fm1Va('FM-1_086').capabilities.soundControls).toBe(true)
    expect(fm1Va('FM-1_093').capabilities.soundControls).toBe(true)
  })

  it('plays Bitcrush and knob choices on FM-1+VA from FM-1_096, which added them', () => {
    expect(fm1Va('FM-1_094').capabilities).toMatchObject({ bitcrush: false, knobChoices: false })
    expect(fm1Va('FM-1_096').capabilities).toEqual({
      ...cautious,
      bitcrush: true,
      knobChoices: true,
      presetRead: true,
      presetWrite: true,
      singleVoiceDumps: false,
      soundControls: true,
    })
    expect(fm1Va('FM-1_097').capabilities).toMatchObject({ bitcrush: true, knobChoices: true })
  })

  it('writes without waiting for a reply, 320 ms apart, from FM-1_096, where it was tested', () => {
    expect(fm1Va('FM-1_096').presetWriteTiming).toEqual({ listenMs: 0, spacingMs: 320 })
    expect(fm1Va('FM-1_098').presetWriteTiming).toEqual({ listenMs: 0, spacingMs: 320 })
  })

  it('keeps the Presets page’s 3 s and the 1.5 s reply wait for earlier releases', () => {
    expect(fm1Va('FM-1_094').presetWriteTiming).toEqual(presetsPageTiming)
    expect(fm1Va('FM-1_079').presetWriteTiming).toEqual(presetsPageTiming)
  })

  it('names the family the firmware was classified as', () => {
    expect(fm1Va('FM-1_089').family).toBe('fm1-va')
  })

  it('sends Official Open dumps to DX7 tracks it reads, and no channel message it misreads', () => {
    for (const identity of [
      'FM-1_8000012',
      'FM-1_8000013',
      'FM-1_8000099',
      'FM1_COMMUNITY_3',
      'FM1_OFFICIAL_OPEN',
    ]) {
      expect(resolveFirmwareProfile({ identity, kind: 'official-open' })).toEqual({
        capabilities: {
          ...nothing,
          bankDumps: true,
          singleVoiceDumps: true,
          trackEngineRead: true,
        },
        effectControllerBase: 0,
        family: 'official-open',
        presetWriteTiming: presetsPageTiming,
      })
    }
  })

  it('reads track engines only on Official Open, where a dump goes to a track', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).capabilities.trackEngineRead).toBe(false)
    }
  })

  it('keeps Program Change, parameter changes, and the effect controllers elsewhere', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_020', kind: 'fm1-va' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).capabilities).toMatchObject({
        effectControllers: true,
        parameterChanges: true,
        programChanges: true,
      })
    }
  })

  it('sends the SMK-37 only parameter changes, since it saves any dump over its presets', () => {
    for (const identity of ['SMK-37 Elite_016', 'MKE-P37_013', 'SMK-37 Pro_014']) {
      expect(resolveFirmwareProfile({ identity, kind: 'smk37' })).toEqual({
        capabilities: { ...nothing, parameterChanges: true },
        effectControllerBase: 0,
        family: 'smk37',
        presetWriteTiming: presetsPageTiming,
      })
    }
  })

  it('offers the SMK-37 a confirmed write over its selected preset only on V015, as tested', () => {
    for (const identity of ['SMK-37 Pro_015', 'SMK-37 Elite_015', 'MKE-P37_015']) {
      expect(resolveFirmwareProfile({ identity, kind: 'smk37' }).capabilities).toEqual({
        ...nothing,
        parameterChanges: true,
        selectedPresetWrite: true,
      })
    }
    for (const identity of ['SMK-37 Pro_014', 'SMK-37 Pro_016']) {
      expect(
        resolveFirmwareProfile({ identity, kind: 'smk37' }).capabilities.selectedPresetWrite,
      ).toBe(false)
    }
  })

  it('offers a write over the selected preset to no firmware but the SMK-37', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'SMK-37 Pro_8000001', kind: 'official-open' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).capabilities.selectedPresetWrite).toBe(false)
    }
  })

  it('sends DX747 parameter changes and single-voice dumps, and nothing else', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_8747747', kind: 'dx747' })).toEqual({
      capabilities: { ...nothing, parameterChanges: true, singleVoiceDumps: true },
      effectControllerBase: 0,
      family: 'dx747',
      presetWriteTiming: presetsPageTiming,
    })
  })

  it('sends a bank dump to every firmware but the SMK-37 and DX747', () => {
    for (const firmware of [
      { kind: 'checking' },
      { kind: 'unidentified' },
      { identity: 'FM-1_015', kind: 'mvave' },
      { identity: 'FM-1_016', kind: 'mvave' },
      { identity: 'FM-1_097', kind: 'fm1-va' },
      { identity: 'FM-1_908', kind: 'felucca' },
      { identity: 'FM-1_8000012', kind: 'official-open' },
    ] as const) {
      expect(resolveFirmwareProfile(firmware).capabilities.bankDumps).toBe(true)
    }
    expect(
      resolveFirmwareProfile({ identity: 'SMK-37 Pro_015', kind: 'smk37' }).capabilities.bankDumps,
    ).toBe(false)
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_8747747', kind: 'dx747' }).capabilities.bankDumps,
    ).toBe(false)
  })
})

describe('sendsBankTo', () => {
  it('sends no bank to a port named for the SMK-37 until its firmware is known', () => {
    for (const firmware of [{ kind: 'checking' }, { kind: 'unidentified' }] as const) {
      expect(sendsBankTo(firmware, 'SMK-37 Pro-Private')).toBe(false)
      expect(sendsBankTo(firmware, 'MIDIOUT2 (smk-37 pro)')).toBe(false)
      expect(sendsBankTo(firmware, 'USB Composite Device')).toBe(true)
      expect(sendsBankTo(firmware)).toBe(true)
    }
  })

  it('sends an identified firmware a bank by its profile, whatever the port is called', () => {
    expect(sendsBankTo({ identity: 'FM-1_015', kind: 'mvave' }, 'SMK-37 Pro-Private')).toBe(true)
    expect(sendsBankTo({ identity: 'SMK-37 Pro_015', kind: 'smk37' }, 'FM-1 MIDI 1')).toBe(false)
    expect(sendsBankTo({ identity: 'FM-1_8747747', kind: 'dx747' }, 'FM-1 MIDI 1')).toBe(false)
  })
})
