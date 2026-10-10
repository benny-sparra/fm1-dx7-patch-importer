import { describe, expect, it } from 'vitest'

import type { Patch } from '@/data/patches'
import { updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { readFactoryBank } from '@/test/factory-voices'
import { capturedVirtualAnalogVoice } from '@/test/fm1-va-virtual-analog'

import { findDuplicatePatches } from './duplicate-patches'

// Three distinct voices from Yamaha's ROM1A factory cartridge.
const [brass, , , , strings, , , piano] = readFactoryBank('rom1a')

function slot(bank: string, number: number): Patch {
  return { bank, family: '', id: `bank-${bank}-${number}`, name: '', number }
}

function library(entries: [Patch, Dx7Voice][]) {
  return {
    patches: entries.map(([patch]) => patch),
    voices: Object.fromEntries(entries.map(([patch, voice]) => [patch.id, voice])),
  }
}

const ids = (groups: ReturnType<typeof findDuplicatePatches>) =>
  groups.map((group) => group.patches.map(({ id }) => id))

describe('findDuplicatePatches', () => {
  it('groups patches whose voice data matches, across banks', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), piano],
      [slot('B', 1), brass],
    ])

    expect(ids(findDuplicatePatches(patches, voices, {}, {}, {}, ['A', 'B']))).toEqual([
      ['bank-A-1', 'bank-B-1'],
    ])
  })

  it('matches copies whose names differ', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), updateDx7VoiceName(brass, 'MY BRASS')],
    ])

    expect(ids(findDuplicatePatches(patches, voices, {}, {}, {}, ['A']))).toEqual([
      ['bank-A-1', 'bank-A-2'],
    ])
  })

  it('keeps apart voices that differ in a setting', () => {
    const changed = { ...brass, data: brass.data.slice() }
    changed.data[0] = (changed.data[0] + 1) & 0x7f
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), changed],
    ])

    expect(findDuplicatePatches(patches, voices, {}, {}, {}, ['A'])).toEqual([])
  })

  it('lists groups in the order of their first patch', () => {
    const { patches, voices } = library([
      [slot('A', 1), piano],
      [slot('A', 2), strings],
      [slot('A', 3), strings],
      [slot('A', 4), piano],
    ])

    expect(ids(findDuplicatePatches(patches, voices, {}, {}, {}, ['A']))).toEqual([
      ['bank-A-1', 'bank-A-4'],
      ['bank-A-2', 'bank-A-3'],
    ])
  })

  it('leaves out banks that are not listed', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('B', 1), brass],
    ])

    expect(findDuplicatePatches(patches, voices, {}, {}, {}, ['A'])).toEqual([])
  })

  it('says when the copies’ FM1 effects differ', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), brass],
    ])
    const reverb = makeDefaultFm1Effects()
    reverb[0] = (reverb[0] + 1) & 0x7f

    const [group] = findDuplicatePatches(patches, voices, {}, { 'bank-A-2': reverb }, {}, ['A'])

    expect(group.effectsDiffer).toBe(true)
  })

  it('treats missing effects as the defaults', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), brass],
    ])

    const effects = { 'bank-A-1': makeDefaultFm1Effects() }

    const [group] = findDuplicatePatches(patches, voices, {}, effects, {}, ['A'])

    expect(group.effectsDiffer).toBe(false)
  })

  it('says when the copies’ FM-1+VA settings records differ, or only one has a record', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), brass],
    ])

    const [group] = findDuplicatePatches(
      patches,
      voices,
      {},
      {},
      { 'bank-A-1': new Uint8Array(59) },
      ['A'],
    )

    expect(group.settingsDiffer).toBe(true)
    expect(group.effectsDiffer).toBe(false)
  })

  it('says nothing about settings when the copies’ records match', () => {
    const { patches, voices } = library([
      [slot('A', 1), brass],
      [slot('A', 2), brass],
    ])
    const records = { 'bank-A-1': new Uint8Array(59), 'bank-A-2': new Uint8Array(59) }

    const [group] = findDuplicatePatches(patches, voices, {}, {}, records, ['A'])

    expect(group.settingsDiffer).toBe(false)
  })

  it('groups 8-Bit presets whose bytes match apart from the name, and only each other', () => {
    const voice = capturedVirtualAnalogVoice()
    const renamed = updateDx7VoiceName({ data: voice, name: '' }, 'MY 8BIT').data
    const patches = [slot('A', 1), slot('A', 2), slot('A', 3)]

    const groups = findDuplicatePatches(patches, {}, { 'bank-A-3': voice }, {}, {}, ['A'], {
      'bank-A-1': voice,
      'bank-A-2': renamed,
    })

    expect(ids(groups)).toEqual([['bank-A-1', 'bank-A-2']])
  })

  it('groups Virtual Analog presets whose bytes match apart from the name, and only each other', () => {
    const virtualAnalog = capturedVirtualAnalogVoice()
    const renamed = updateDx7VoiceName({ data: virtualAnalog, name: '' }, 'MY VA').data
    const patches = [slot('A', 1), slot('A', 2), slot('A', 3)]
    // A DX7 voice with the same bytes as the Virtual Analog preset is a different sound.
    const voices = { 'bank-A-3': { data: virtualAnalog, name: 'VOICE 97' } }

    const groups = findDuplicatePatches(
      patches,
      voices,
      { 'bank-A-1': virtualAnalog, 'bank-A-2': renamed },
      {},
      {},
      ['A'],
    )

    expect(ids(groups)).toEqual([['bank-A-1', 'bank-A-2']])
  })
})
