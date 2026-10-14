import { describe, expect, it } from 'vitest'

import { resolveFirmwareProfile } from './firmware-profile'

const nothing = {
  bitcrush: false,
  knobChoices: false,
  presetRead: false,
  presetWrite: false,
  singleVoiceDumps: false,
  soundControls: false,
}

const presetsPageTiming = { listenMs: 1500, spacingMs: 3000 }

function fm1Va(identity: string) {
  return resolveFirmwareProfile({ identity, kind: 'fm1-va' })
}

describe('resolveFirmwareProfile', () => {
  it('sends single-voice dumps to M-VAVE firmware and offers it nothing of FM-1+VA’s', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_015', kind: 'mvave' })).toEqual({
      capabilities: { ...nothing, singleVoiceDumps: true },
      family: 'mvave',
      presetWriteTiming: presetsPageTiming,
    })
    expect(
      resolveFirmwareProfile({ identity: 'FM-1_019', kind: 'mvave' }).capabilities.singleVoiceDumps,
    ).toBe(true)
  })

  it('gives Felucca nothing, as it ignores DX7 voice data', () => {
    expect(resolveFirmwareProfile({ identity: 'FM-1_904', kind: 'felucca' })).toEqual({
      capabilities: nothing,
      family: 'felucca',
      presetWriteTiming: presetsPageTiming,
    })
    expect(resolveFirmwareProfile({ identity: 'FM-1_908', kind: 'felucca' }).capabilities).toEqual(
      nothing,
    )
  })

  it('gives a firmware it does not recognise nothing, whatever name it answered with', () => {
    for (const identity of [undefined, 'XR-9_015', 'FM-1_999X']) {
      expect(resolveFirmwareProfile({ identity, kind: 'unidentified' })).toEqual({
        capabilities: nothing,
        family: 'unidentified',
        presetWriteTiming: presetsPageTiming,
      })
    }
  })

  it('gives nothing before the firmware is known', () => {
    expect(resolveFirmwareProfile({ kind: 'checking' })).toEqual({
      capabilities: nothing,
      family: 'checking',
      presetWriteTiming: presetsPageTiming,
    })
  })

  it('never sends FM-1+VA a single-voice dump, which it writes over the selected preset', () => {
    expect(fm1Va('FM-1_089').capabilities.singleVoiceDumps).toBe(false)
    expect(fm1Va('FM-1_097').capabilities.singleVoiceDumps).toBe(false)
  })

  it('reads and writes presets on FM-1+VA from FM-1_079, the release that added both', () => {
    expect(fm1Va('FM-1_078').capabilities).toEqual(nothing)
    expect(fm1Va('FM-1_079').capabilities).toEqual({
      ...nothing,
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
})
