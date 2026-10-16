import { describe, expect, it } from 'vitest'

import { resolveFirmwareProfile } from './firmware-profile'

const nothing = {
  bitcrush: false,
  effectControllers: false,
  knobChoices: false,
  parameterChanges: false,
  presetRead: false,
  presetWrite: false,
  programChanges: false,
  singleVoiceDumps: false,
  soundControls: false,
  trackEngineRead: false,
}

// What every firmware but Official Open takes, whatever else it can do.
const cautious = {
  ...nothing,
  effectControllers: true,
  parameterChanges: true,
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
      family: 'mvave',
      presetWriteTiming: presetsPageTiming,
    })
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_019', kind: 'mvave' }).capabilities.singleVoiceDumps,
    ).toBe(true)
  })

  it('gives Felucca cautious, as it ignores DX7 voice data', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_904', kind: 'felucca' })).toEqual({
      capabilities: cautious,
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
        family: 'unidentified',
        presetWriteTiming: presetsPageTiming,
      })
    }
  })

  it('gives cautious before the firmware is known', () => {
    expect(resolveFirmwareProfile({ kind: 'checking' })).toEqual({
      capabilities: cautious,
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
      'FM-1_8000099',
      'FM1_COMMUNITY_3',
      'FM1_OFFICIAL_OPEN',
    ]) {
      expect(resolveFirmwareProfile({ identity, kind: 'official-open' })).toEqual({
        capabilities: { ...nothing, singleVoiceDumps: true, trackEngineRead: true },
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
})
