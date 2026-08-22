import { describe, expect, it } from 'vitest'

import {
  addWorkspaceBank,
  clearLibraryBank,
  createWorkspaceBank,
  deleteWorkspaceBank,
  emptyPatchLibrary,
  getNextWorkspaceBank,
  getBankVoices,
  initializePatchLibrary,
  importVoices,
  makeBankFingerprint,
  makeDemoVoices,
  makeFactoryPatchLibrary,
  makePatches,
  moveVoice,
  normalizeWorkspaceBankNameForSave,
  renameBank,
  renameVoice,
  restoreFactoryPatchLibrary,
  updateBankInformation,
  voiceId,
} from '@/lib/patch-library'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'

describe('patch library operations', () => {
  it('starts every workspace with the four DX7 banks', () => {
    expect(emptyPatchLibrary().workspaceBanks).toEqual(['A', 'B', 'C', 'D'])
  })

  it('adds the next empty workspace bank once', () => {
    const initial = emptyPatchLibrary()
    const added = addWorkspaceBank(initial, 'E')

    expect(added.workspaceBanks).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(added.loadedBanks).toEqual([])
    expect(addWorkspaceBank(added, 'E')).toBe(added)
  })

  it('creates and names a workspace bank from imported voices atomically', () => {
    const created = createWorkspaceBank(
      emptyPatchLibrary(),
      'E',
      'Imported favourites',
      'Studio collection',
      makeDemoVoices(),
    )

    expect(created.bankNames.E).toBe('Imported f')
    expect(created.loadedBanks).toEqual(['E'])
    expect(getBankVoices(created, 'E')).toHaveLength(32)
  })

  it('rejects invalid new-bank details without changing the source snapshot', () => {
    const initial = emptyPatchLibrary()

    expect(() => createWorkspaceBank(initial, 'E', '   ', '', makeDemoVoices())).toThrow('name')
    expect(() =>
      createWorkspaceBank(
        initial,
        'E',
        'Missing sounds',
        '',
        undefined as unknown as ReturnType<typeof makeDemoVoices>,
      ),
    ).toThrow('sound data')
    expect(() =>
      createWorkspaceBank(initial, 'E', 'Incomplete', '', makeDemoVoices().slice(0, 31)),
    ).toThrow('exactly 32')
    expect(initial).toEqual(emptyPatchLibrary())
  })

  it('deletes a workspace bank and all of its stored data', () => {
    const populated = updateBankInformation(
      createWorkspaceBank(emptyPatchLibrary(), 'E', 'Live set', '', makeDemoVoices()),
      'E',
      'Live set',
      'Friday performance',
    )
    const deleted = deleteWorkspaceBank(populated, 'E')

    expect(deleted.workspaceBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(deleted.bankNames.E).toBeUndefined()
    expect(deleted.bankDescriptions.E).toBeUndefined()
    expect(deleted.loadedBanks).toEqual([])
    expect(getBankVoices(deleted, 'E')).toEqual([])
  })

  it('compacts later banks and their data when a middle bank is deleted', () => {
    const factory = makeFactoryPatchLibrary()
    const described = updateBankInformation(factory, 'C', 'Third bank', 'Moves into B')
    const effects = {
      ...described.effects,
      [voiceId('C', 1)]: Uint8Array.from({ length: 24 }, (_, index) => index),
    }
    const deleted = deleteWorkspaceBank({ ...described, effects }, 'B')

    expect(deleted.workspaceBanks).toEqual(['A', 'B', 'C'])
    expect(deleted.loadedBanks).toEqual(['A', 'B', 'C'])
    expect(deleted.voices[voiceId('B', 1)].name).toBe('PICCOLO')
    expect(deleted.effects[voiceId('B', 1)]).toEqual(effects[voiceId('C', 1)])
    expect(deleted.bankNames.B).toBe('Third bank')
    expect(deleted.bankDescriptions.B).toBe('Moves into B')
    expect(deleted.voices[voiceId('C', 1)].name).toBe('SYN-LEAD 2')
    expect(deleted.voices[voiceId('D', 1)]).toBeUndefined()
  })

  it('moves the second bank into A when the first bank is deleted', () => {
    const deleted = deleteWorkspaceBank(makeFactoryPatchLibrary(), 'A')

    expect(deleted.workspaceBanks).toEqual(['A', 'B', 'C'])
    expect(deleted.voices[voiceId('A', 1)].name).toBe('PIANO   4')
    expect(deleted.voices[voiceId('B', 1)].name).toBe('PICCOLO')
    expect(deleted.voices[voiceId('C', 1)].name).toBe('SYN-LEAD 2')
  })

  it('keeps the sole remaining workspace bank', () => {
    const soleBank = emptyPatchLibrary(['A'])

    expect(deleteWorkspaceBank(soleBank, 'A')).toBe(soleBank)
    expect(deleteWorkspaceBank(soleBank, 'Z')).toBe(soleBank)
  })

  it('stops adding workspace banks after 10', () => {
    const full = Array.from({ length: 6 }, (_, index) => String.fromCharCode(69 + index)).reduce(
      (snapshot, bank) => addWorkspaceBank(snapshot, bank),
      emptyPatchLibrary(),
    )

    expect(full.workspaceBanks).toHaveLength(10)
    expect(getNextWorkspaceBank(full.workspaceBanks)).toBeNull()
    expect(addWorkspaceBank(full, 'K')).toBe(full)
    expect(() => createWorkspaceBank(full, 'K', 'Eleventh', '', makeDemoVoices())).toThrow(
      'no longer available',
    )
  })

  it('uses the first free bank ID while enforcing the total bank limit', () => {
    const withGapAtLimit = emptyPatchLibrary(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K'])
    const withGapBelowLimit = emptyPatchLibrary(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'])

    expect(getNextWorkspaceBank(withGapAtLimit.workspaceBanks)).toBeNull()
    expect(getNextWorkspaceBank(withGapBelowLimit.workspaceBanks)).toBe('I')
  })

  it('creates patch slots for added banks without invalid MIDI programs', () => {
    const added = addWorkspaceBank(emptyPatchLibrary(), 'E')
    const patches = makePatches(added).filter((patch) => patch.bank === 'E')

    expect(patches).toHaveLength(32)
    expect(patches[0]).toMatchObject({ bank: 'E', number: 1, program: 0 })
    expect(patches[31]).toMatchObject({ bank: 'E', number: 32, program: 31 })
  })

  it('imports voices into a newly added workspace bank', () => {
    const added = addWorkspaceBank(emptyPatchLibrary(), 'E')
    const imported = importVoices(added, 'E', makeDemoVoices())

    expect(imported.loadedBanks).toEqual(['E'])
    expect(getBankVoices(imported, 'E')).toHaveLength(32)
  })

  it('restores the four factory banks without removing added banks', () => {
    const added = addWorkspaceBank(emptyPatchLibrary(), 'E')
    const imported = importVoices(added, 'E', makeDemoVoices())
    const restored = restoreFactoryPatchLibrary(imported)

    expect(restored.workspaceBanks).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(restored.loadedBanks).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(getBankVoices(restored, 'E')[0].name).toBe('E.PIANO1')
  })

  it('recreates four slots when factory banks are restored after a deletion', () => {
    const reduced = deleteWorkspaceBank(makeFactoryPatchLibrary(), 'B')
    const restored = restoreFactoryPatchLibrary(reduced)

    expect(restored.workspaceBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(restored.loadedBanks).toEqual(['A', 'B', 'C', 'D'])
  })

  it('maps the first four Yamaha factory ROM banks to browser banks A through D', () => {
    const result = makeFactoryPatchLibrary()

    expect(result.loadedBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(getBankVoices(result, 'A')).toHaveLength(32)
    expect(getBankVoices(result, 'B')).toHaveLength(32)
    expect(getBankVoices(result, 'C')).toHaveLength(32)
    expect(getBankVoices(result, 'D')).toHaveLength(32)
    expect([
      result.voices[voiceId('A', 1)].name,
      result.voices[voiceId('A', 11)].name,
      result.voices[voiceId('B', 1)].name,
      result.voices[voiceId('C', 1)].name,
      result.voices[voiceId('D', 1)].name,
    ]).toEqual(['BRASS   1', 'E.PIANO 1', 'PIANO   4', 'PICCOLO', 'SYN-LEAD 2'])
  })

  it('creates fresh factory voice data for each initialization or reset', () => {
    const first = makeFactoryPatchLibrary()
    first.voices[voiceId('A', 1)].data[0] = 0

    const second = makeFactoryPatchLibrary()

    expect(second.voices[voiceId('A', 1)].data[0]).not.toBe(0)
  })

  it('seeds only an absent library and preserves an intentionally empty saved library', () => {
    const savedEmptyLibrary = emptyPatchLibrary()

    expect(initializePatchLibrary(null).loadedBanks).toEqual(['A', 'B', 'C', 'D'])
    expect(initializePatchLibrary(savedEmptyLibrary)).toBe(savedEmptyLibrary)
    expect(initializePatchLibrary(savedEmptyLibrary).loadedBanks).toEqual([])
  })

  it('stores trimmed workspace bank names and removes blank names', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const renamed = renameBank(initial, 'A', '  Saturday set  ')
    const reset = renameBank(renamed, 'A', '   ')

    expect(renamed.bankNames.A).toBe('Saturday s')
    expect(reset.bankNames.A).toBeUndefined()
  })

  it('stores normalized workspace bank titles and descriptions', () => {
    const updated = updateBankInformation(
      emptyPatchLibrary(),
      'A',
      `  ${'x'.repeat(90)}  `,
      `  ${'y'.repeat(510)}  `,
    )

    expect(updated.bankNames.A).toBe('xxxxxxxxxx')
    expect(updated.bankDescriptions.A).toHaveLength(500)
    expect(() => updateBankInformation(updated, 'A', '   ', 'Description')).toThrow('title')
    expect(updateBankInformation(updated, 'Z', 'Wrong', 'Wrong')).toBe(updated)
  })

  it('preserves bank information when sounds are imported or cleared', () => {
    const described = updateBankInformation(
      emptyPatchLibrary(),
      'A',
      'Live set',
      'Friday performance',
    )
    const imported = importVoices(described, 'A', makeDemoVoices())
    const cleared = clearLibraryBank(imported, 'A')

    expect(cleared.bankNames.A).toBe('Live set')
    expect(cleared.bankDescriptions.A).toBe('Friday performance')
  })

  it('rejects invalid workspace banks and limits stored names to 10 characters', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())

    expect(renameBank(initial, 'Z', 'Wrong')).toBe(initial)
    expect(renameBank(initial, 'A', 'x'.repeat(90)).bankNames.A).toHaveLength(10)
  })

  it('only prepares non-empty workspace bank names for saving', () => {
    expect(normalizeWorkspaceBankNameForSave('  Live set  ')).toBe('Live set')
    expect(normalizeWorkspaceBankNameForSave('ABCDEFGHIJKLM')).toBe('ABCDEFGHIJ')
    expect(normalizeWorkspaceBankNameForSave('   ')).toBeNull()
  })

  it('fingerprints equal bank contents identically and detects a voice edit', () => {
    const voices = makeDemoVoices()
    const copied = voices.map((voice) => ({ ...voice, data: voice.data.slice() }))
    const edited = copied.map((voice) => ({ ...voice, data: voice.data.slice() }))
    edited[0].data[0] = 98

    expect(makeBankFingerprint(voices)).toBe(makeBankFingerprint(copied))
    expect(makeBankFingerprint(voices)).not.toBe(makeBankFingerprint(edited))
  })

  it('imports exactly 32 voices into a browser bank', () => {
    const result = importVoices(emptyPatchLibrary(), 'B', makeDemoVoices())

    expect(result.loadedBanks).toEqual(['B'])
    expect(getBankVoices(result, 'B')).toHaveLength(32)
    expect(result.voices[voiceId('B', 1)].name).toBe('E.PIANO1')
    expect(result.effects[voiceId('B', 1)]).toEqual(makeDefaultFm1Effects())
  })

  it('rejects incomplete bank imports', () => {
    expect(() => importVoices(emptyPatchLibrary(), 'A', makeDemoVoices().slice(0, 31))).toThrow(
      'exactly 32',
    )
  })

  it('moves a voice and shifts the intervening slots', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const firstName = initial.voices[voiceId('A', 1)].name
    const secondName = initial.voices[voiceId('A', 2)].name
    const result = moveVoice(initial, 'A', 1, 3)

    expect(result.voices[voiceId('A', 1)].name).toBe(secondName)
    expect(result.voices[voiceId('A', 3)].name).toBe(firstName)
  })

  it('normalizes unsupported rename characters for DX7 storage', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const result = renameVoice(initial, voiceId('A', 1), 'BASS 🎹')

    expect(result.voices[voiceId('A', 1)].name).toBe('BASS')
  })
})
