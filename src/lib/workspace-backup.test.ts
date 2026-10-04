import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize, updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects, normalizeFm1Effects } from '@/lib/fm1-effects'
import type { NamedBank } from '@/lib/named-bank'
import {
  emptyPatchLibrary,
  importFetchedBanks,
  importVoices,
  makeDemoVoices,
  voiceId,
  type PatchLibrarySnapshot,
} from '@/lib/patch-library'

import {
  makeWorkspaceBackup,
  makeWorkspaceBackupFilename,
  maximumWorkspaceBackupFileSize,
  parseWorkspaceBackup,
  readWorkspaceBackupFile,
  workspaceBackupVersion,
  WorkspaceBackupError,
} from './workspace-backup'
import {
  capturedVirtualAnalogRecord,
  virtualAnalogVoiceBeyondDx7Ranges,
} from '@/test/fm1-va-virtual-analog'
import { slotVoice } from '@/test/slot-voice'

// A voice and its effects exactly as version 1 wrote them. The voice's first 118 bytes count up
// from 0 to 99 and round again, and its name is "BACKUP 1".
const fixtureVoice =
  'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiYwABAgMEBQYHCAkKCwwNDg8QEUJBQ0tVUCAxICA='
const fixtureEffects = 'AUAAAAEAAAAAAAAAAAAAAAAAAAAAAAAA'
// The same voice with its fourth byte set to 0x80, above the seven bits a DX7 voice carries.
const highBitVoice =
  'AAECgAQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiYwABAgMEBQYHCAkKCwwNDg8QEUJBQ0tVUCAxICA='

function savedBankFixture(id: string, voice = fixtureVoice) {
  return {
    createdAt: '2026-09-01T10:00:00.000Z',
    description: 'Pads for the live set',
    id,
    name: 'Live pads',
    slots: Array.from({ length: 32 }, (_, index) => ({
      effects: fixtureEffects,
      slot: index + 1,
      voice,
    })),
    updatedAt: '2026-09-02T10:00:00.000Z',
  }
}

function versionOneFixture(overrides: Record<string, unknown> = {}) {
  return {
    format: 'fm1-librarian-backup',
    savedAt: '2026-09-21T13:03:00.000Z',
    savedBanks: [savedBankFixture('saved-1')],
    version: 1,
    workspace: {
      bankDescriptions: { A: 'Keys for the set' },
      bankNames: { A: 'Keys', B: 'Spare' },
      loadedBanks: ['A'],
      slots: [{ bank: 'A', effects: fixtureEffects, slot: 1, voice: fixtureVoice }],
      workspaceBanks: ['A', 'B'],
    },
    ...overrides,
  }
}

// Version 2 adds favourites to the workspace, written as version 2 writes them.
function versionTwoFixture(overrides: Record<string, unknown> = {}) {
  const fixture = versionOneFixture()
  return {
    ...fixture,
    version: 2,
    workspace: {
      ...fixture.workspace,
      favourites: [
        {
          effects: fixtureEffects,
          id: 'favourite-1',
          origin: { bankName: 'Keys' },
          voice: fixtureVoice,
        },
        {
          effects: fixtureEffects,
          id: 'favourite-2',
          origin: { bankNumber: 2 },
          voice: fixtureVoice,
        },
      ],
    },
    ...overrides,
  }
}

// FM-1+VA settings records as version 3 writes them: ORGAN 3's record as FM-1_093 read it, and
// preset 097's after the record-mapping reads, which sets 13 bytes above 0x7F.
const fixtureRecord =
  'UAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAAAAAQAAAgAAAwAABAAABQAABgAABwAACAAAAAAAAAA='
const fixtureHighRecord =
  'KAUDA00DAyEDAywDAzcDAwNCWgIyZADkgICAAQECAAACAgAAAwABBAAABQEAgICAgICAgAAAAAAAAAA='

function decodeFixture(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

// Version 3 adds a record to each slot and favourite that has one, written as version 3 writes it.
function versionThreeFixture(overrides: Record<string, unknown> = {}) {
  const fixture = versionTwoFixture()
  const [slot] = fixture.workspace.slots
  const [favourite, otherFavourite] = fixture.workspace.favourites
  const [savedBank] = fixture.savedBanks
  return {
    ...fixture,
    savedBanks: [
      {
        ...savedBank,
        slots: savedBank.slots.map((saved, index) =>
          index === 0 ? { ...saved, record: fixtureHighRecord } : saved,
        ),
      },
    ],
    version: 3,
    workspace: {
      ...fixture.workspace,
      favourites: [{ ...favourite, record: fixtureHighRecord }, otherFavourite],
      slots: [{ ...slot, record: fixtureRecord }],
    },
    ...overrides,
  }
}

// A Virtual Analog preset's voice bytes and record, from version 4: preset 097 as FM-1_093 read it
// back, with LFO Speed at 127, above the 99 a DX7 voice allows, as FM-1+VA's preset pack holds.
const fixtureVirtualAnalog =
  'Y2NjY2NjYwAnAAAAOABjAgBjY2NjY2NjACcAAAA4AAACAGNjY2NjY2MAJwAAADgAAAIAY2NjY2NjYwAnAAAAOAAAAgBjY2NjY2NjACcAAAA4AAACAGNjY2NjY2MAJwAAADgAYwIAY2NjYzIyMjIACH8AAAAwGFZPSUNFIDk3ICA='
const fixtureVirtualAnalogRecord =
  'UAMDAwMDAwMDAwMDAwMDAwMDWgIyZADkgICAAAEAAQAAAgAAAwAABAAABQAAgICAgICAgAAAAAAAAAA='

// Version 4 lets a slot hold a Virtual Analog preset, written as version 4 writes it: in workspace
// slot A2 and in the saved bank's slot 2.
function versionFourFixture() {
  const fixture = versionThreeFixture()
  const virtualAnalogSlot = {
    effects: fixtureEffects,
    record: fixtureVirtualAnalogRecord,
    slot: 2,
    virtualAnalog: fixtureVirtualAnalog,
  }
  const [savedBank] = fixture.savedBanks
  return {
    ...fixture,
    savedBanks: [
      {
        ...savedBank,
        slots: savedBank.slots.map((saved, index) => (index === 1 ? virtualAnalogSlot : saved)),
      },
    ],
    version: 4,
    workspace: {
      ...fixture.workspace,
      slots: [...fixture.workspace.slots, { bank: 'A', ...virtualAnalogSlot }],
    },
  }
}

function fixtureVoiceBytes() {
  const data = new Uint8Array(dx7PackedVoiceSize)
  for (let index = 0; index < 118; index += 1) data[index] = index % 100
  data.set(new TextEncoder().encode('BACKUP 1  '), 118)
  return data
}

function makeWorkspace(): PatchLibrarySnapshot {
  const loaded = importVoices(emptyPatchLibrary(['A', 'B', 'C']), 'B', makeDemoVoices())
  const effects = makeDefaultFm1Effects()
  effects[1] = 2
  return {
    ...loaded,
    bankDescriptions: { B: 'Demo patches' },
    bankNames: { B: 'Demo' },
    effects: { ...loaded.effects, [voiceId('B', 3)]: effects },
    records: { [voiceId('B', 5)]: decodeFixture(fixtureRecord) },
    favourites: [
      {
        effects,
        id: 'favourite-1',
        origin: { bankName: 'Demo' },
        record: decodeFixture(fixtureHighRecord),
        voice: makeDemoVoices()[4],
      },
      {
        effects: makeDefaultFm1Effects(),
        id: 'favourite-2',
        origin: { bankNumber: 1 },
        voice: makeDemoVoices()[9],
      },
    ],
  }
}

function makeSavedBank(id: string): NamedBank {
  return {
    createdAt: '2026-09-01T10:00:00.000Z',
    description: '',
    id,
    name: `Saved ${id}`,
    slots: makeDemoVoices().map((voice, index) => ({
      effects: makeDefaultFm1Effects(),
      ...(index === 2 ? { record: decodeFixture(fixtureRecord) } : {}),
      slot: index + 1,
      voice,
    })),
    updatedAt: '2026-09-01T10:00:00.000Z',
    version: 3,
  }
}

/** The problem a refused backup reports, or null when it was read. */
function problemOf(action: () => unknown) {
  try {
    action()
  } catch (error) {
    return error instanceof WorkspaceBackupError ? error.problem : 'unexpected error'
  }
  return null
}

describe('workspace backup', () => {
  it('reads a version 1 backup as that version wrote it', () => {
    const backup = parseWorkspaceBackup(JSON.stringify(versionOneFixture()))

    expect(backup.savedAt).toBe('2026-09-21T13:03:00.000Z')
    expect(backup.workspace.workspaceBanks).toEqual(['A', 'B'])
    expect(backup.workspace.loadedBanks).toEqual(['A'])
    expect(backup.workspace.bankNames).toEqual({ A: 'Keys', B: 'Spare' })
    expect(backup.workspace.bankDescriptions).toEqual({ A: 'Keys for the set' })
    expect(backup.workspace.voices[voiceId('A', 1)]).toEqual({
      data: fixtureVoiceBytes(),
      name: 'BACKUP 1',
    })
    expect(backup.workspace.effects[voiceId('A', 1)]).toEqual(
      normalizeFm1Effects(Uint8Array.from(atob(fixtureEffects), (c) => c.charCodeAt(0))),
    )
    expect(backup.savedBanks).toHaveLength(1)
    expect(backup.savedBanks[0]).toMatchObject({
      description: 'Pads for the live set',
      id: 'saved-1',
      name: 'Live pads',
      // A saved bank is read as the version this release writes; it has no records.
      version: 3,
    })
    expect(slotVoice(backup.savedBanks[0].slots[31]).name).toBe('BACKUP 1')
    expect(backup.damagedSavedBankCount).toBe(0)
    // Favourites arrived in version 2, and records in version 3.
    expect(backup.workspace.favourites).toEqual([])
    expect(backup.workspace.records).toEqual({})
  })

  it('reads a version 2 backup, with its favourites, as that version wrote it', () => {
    const backup = parseWorkspaceBackup(JSON.stringify(versionTwoFixture()))
    const effects = normalizeFm1Effects(
      Uint8Array.from(atob(fixtureEffects), (c) => c.charCodeAt(0)),
    )

    expect(backup.workspace.favourites).toEqual([
      {
        effects,
        id: 'favourite-1',
        origin: { bankName: 'Keys' },
        voice: { data: fixtureVoiceBytes(), name: 'BACKUP 1' },
      },
      {
        effects,
        id: 'favourite-2',
        origin: { bankNumber: 2 },
        voice: { data: fixtureVoiceBytes(), name: 'BACKUP 1' },
      },
    ])
    expect(backup.workspace.voices[voiceId('A', 1)]?.name).toBe('BACKUP 1')
  })

  it('reads a version 3 backup, with its records, as that version wrote it', () => {
    const backup = parseWorkspaceBackup(JSON.stringify(versionThreeFixture()))

    expect(backup.workspace.records).toEqual({ [voiceId('A', 1)]: decodeFixture(fixtureRecord) })
    expect(backup.workspace.favourites[0].record).toEqual(decodeFixture(fixtureHighRecord))
    expect(backup.workspace.favourites[1]).not.toHaveProperty('record')
    expect(backup.savedBanks[0].slots[0].record).toEqual(decodeFixture(fixtureHighRecord))
    expect(backup.savedBanks[0].slots[1]).not.toHaveProperty('record')
  })

  it('reads a version 4 backup, with its Virtual Analog presets, as that version wrote it', () => {
    const backup = parseWorkspaceBackup(JSON.stringify(versionFourFixture()))

    expect(backup.workspace.virtualAnalog).toEqual({
      [voiceId('A', 2)]: virtualAnalogVoiceBeyondDx7Ranges(),
    })
    expect(backup.workspace.records[voiceId('A', 2)]).toEqual(capturedVirtualAnalogRecord())
    expect(backup.workspace.voices[voiceId('A', 2)]).toBeUndefined()
    expect(backup.savedBanks[0].slots[1]).toMatchObject({
      record: capturedVirtualAnalogRecord(),
      virtualAnalog: virtualAnalogVoiceBeyondDx7Ranges(),
    })
  })

  it('backs up Virtual Analog presets and restores them exactly', () => {
    const sounds = Array.from({ length: 32 }, (_, index) =>
      index === 4
        ? {
            record: capturedVirtualAnalogRecord(),
            virtualAnalog: virtualAnalogVoiceBeyondDx7Ranges(),
          }
        : null,
    )
    const workspace = importFetchedBanks(makeWorkspace(), [{ bank: 'B', sounds }])

    const restored = parseWorkspaceBackup(
      makeWorkspaceBackup(workspace, [], '2026-10-04T08:00:00Z'),
    )

    expect(restored.workspace.virtualAnalog).toEqual(workspace.virtualAnalog)
    expect(restored.workspace.records).toEqual(workspace.records)
  })

  it('refuses a Virtual Analog preset in a backup of an earlier version', () => {
    const fixture = { ...versionFourFixture(), version: 3 }

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('reads no records from a version 2 backup', () => {
    const backup = parseWorkspaceBackup(JSON.stringify(versionTwoFixture()))

    expect(backup.workspace.records).toEqual({})
    expect(backup.workspace.favourites.every((favourite) => !favourite.record)).toBe(true)
  })

  it('refuses a version 3 workspace slot whose record is the wrong size', () => {
    const fixture = versionThreeFixture()
    fixture.workspace.slots[0].record = fixtureEffects

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a favourite voice with a byte above seven bits', () => {
    const fixture = versionTwoFixture()
    fixture.workspace.favourites[1].voice = highBitVoice

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a version 2 backup whose favourites are not a list', () => {
    const fixture = versionTwoFixture()
    const workspace = { ...fixture.workspace, favourites: 'none' }

    expect(
      problemOf(() => parseWorkspaceBackup(JSON.stringify(versionTwoFixture({ workspace })))),
    ).toBe('damaged')
  })

  it('restores the workspace and saved banks it backed up', () => {
    const workspace = makeWorkspace()
    const savedBanks = [makeSavedBank('one'), makeSavedBank('two')]

    const backup = parseWorkspaceBackup(
      makeWorkspaceBackup(workspace, savedBanks, '2026-09-21T13:03:00.000Z'),
    )

    expect(backup.workspace).toEqual(workspace)
    expect(backup.savedBanks).toEqual(savedBanks)
  })

  it('names a backup by the local date it was made', () => {
    expect(makeWorkspaceBackupFilename(new Date(2026, 8, 1, 23, 30))).toBe(
      'fm1-backup-2026-09-01.json',
    )
  })

  it('refuses a file that is not JSON', () => {
    expect(problemOf(() => parseWorkspaceBackup('F0 43 00 09'))).toBe('format')
  })

  it('refuses JSON that is not a backup', () => {
    expect(problemOf(() => parseWorkspaceBackup('{"name":"patches"}'))).toBe('format')
  })

  it('refuses a backup made by a newer release', () => {
    expect(
      problemOf(() =>
        parseWorkspaceBackup(
          JSON.stringify(versionOneFixture({ version: workspaceBackupVersion + 1 })),
        ),
      ),
    ).toBe('newer')
  })

  it('refuses a workspace voice with a byte above seven bits', () => {
    const fixture = versionOneFixture()
    fixture.workspace.slots[0].voice = highBitVoice

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a workspace with too many banks', () => {
    const fixture = versionOneFixture()
    fixture.workspace.workspaceBanks = 'ABCDEFGHIJK'.split('')

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a workspace patch in a bank the workspace does not have', () => {
    const fixture = versionOneFixture()
    fixture.workspace.slots[0].bank = 'C'

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a workspace voice that is not base64', () => {
    const fixture = versionOneFixture()
    fixture.workspace.slots[0].voice = 'not base64!'

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a workspace voice that is not text', () => {
    const workspace = versionOneFixture().workspace
    const slots = [{ ...workspace.slots[0], voice: [0, 1, 2] }]

    expect(
      problemOf(() =>
        parseWorkspaceBackup(
          JSON.stringify(versionOneFixture({ workspace: { ...workspace, slots } })),
        ),
      ),
    ).toBe('damaged')
  })

  it('refuses workspace effects that are not base64', () => {
    const fixture = versionOneFixture()
    fixture.workspace.slots[0].effects = 'not base64!'

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a backup with no workspace', () => {
    const { workspace: _workspace, ...fixture } = versionOneFixture()

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a workspace with no slot list', () => {
    const { slots: _slots, ...workspace } = versionOneFixture().workspace

    expect(
      problemOf(() => parseWorkspaceBackup(JSON.stringify(versionOneFixture({ workspace })))),
    ).toBe('damaged')
  })

  it('refuses a workspace patch that is not an object', () => {
    const workspace = { ...versionOneFixture().workspace, slots: ['A1'] }

    expect(
      problemOf(() => parseWorkspaceBackup(JSON.stringify(versionOneFixture({ workspace })))),
    ).toBe('damaged')
  })

  it('refuses a workspace that lists the same slot twice', () => {
    const fixture = versionOneFixture()
    fixture.workspace.slots.push({ ...fixture.workspace.slots[0] })

    expect(problemOf(() => parseWorkspaceBackup(JSON.stringify(fixture)))).toBe('damaged')
  })

  it('refuses a backup whose version is not a whole number from 1', () => {
    for (const version of ['1', 1.5, 0, undefined]) {
      expect(
        problemOf(() => parseWorkspaceBackup(JSON.stringify(versionOneFixture({ version })))),
      ).toBe('damaged')
    }
  })

  it('refuses a backup with no readable date', () => {
    for (const savedAt of ['yesterday', 1_758_459_780_000, undefined]) {
      expect(
        problemOf(() => parseWorkspaceBackup(JSON.stringify(versionOneFixture({ savedAt })))),
      ).toBe('damaged')
    }
  })

  it('leaves out a damaged saved bank and restores the rest', () => {
    const backup = parseWorkspaceBackup(
      JSON.stringify(
        versionOneFixture({
          savedBanks: [
            savedBankFixture('good'),
            savedBankFixture('high-bit', highBitVoice),
            { id: 'short', slots: [] },
          ],
        }),
      ),
    )

    expect(backup.savedBanks.map(({ id }) => id)).toEqual(['good'])
    expect(backup.damagedSavedBankCount).toBe(2)
  })

  it('keeps one copy of a saved bank listed twice', () => {
    const backup = parseWorkspaceBackup(
      JSON.stringify(
        versionOneFixture({ savedBanks: [savedBankFixture('same'), savedBankFixture('same')] }),
      ),
    )

    expect(backup.savedBanks).toHaveLength(1)
  })

  it('shortens bank titles and descriptions to the lengths the workspace keeps', () => {
    const fixture = versionOneFixture()
    fixture.workspace.bankNames = { A: 'A very long bank title', B: '  ' }

    const backup = parseWorkspaceBackup(JSON.stringify(fixture))

    expect(backup.workspace.bankNames).toEqual({ A: 'A very lon' })
  })

  it('refuses a file too large to be a backup before reading it', async () => {
    const file = {
      size: maximumWorkspaceBackupFileSize + 1,
      text: () => Promise.reject(new Error('The file was read.')),
    } as unknown as Blob

    await expect(readWorkspaceBackupFile(file)).rejects.toMatchObject({ problem: 'size' })
  })

  it('keeps a renamed voice name that its data carries', () => {
    const workspace = importVoices(emptyPatchLibrary(['A']), 'A', makeDemoVoices())
    const renamed = updateDx7VoiceName(workspace.voices[voiceId('A', 1)], 'RENAMED')
    const edited = { ...workspace, voices: { ...workspace.voices, [voiceId('A', 1)]: renamed } }

    const backup = parseWorkspaceBackup(makeWorkspaceBackup(edited, [], '2026-09-21T13:03:00Z'))

    expect(backup.workspace.voices[voiceId('A', 1)].name).toBe('RENAMED')
  })
})
