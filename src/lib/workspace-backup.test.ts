import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize, updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects, normalizeFm1Effects } from '@/lib/fm1-effects'
import type { NamedBank } from '@/lib/named-bank'
import {
  emptyPatchLibrary,
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
  WorkspaceBackupError,
} from './workspace-backup'

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
      slot: index + 1,
      voice,
    })),
    updatedAt: '2026-09-01T10:00:00.000Z',
    version: 1,
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
      version: 1,
    })
    expect(backup.savedBanks[0].slots[31].voice.name).toBe('BACKUP 1')
    expect(backup.damagedSavedBankCount).toBe(0)
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
      problemOf(() => parseWorkspaceBackup(JSON.stringify(versionOneFixture({ version: 2 })))),
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
