import { describe, expect, it } from 'vitest'

import {
  addWorkspaceBank,
  clearLibraryBank,
  copyVoice,
  createWorkspaceBank,
  deleteWorkspaceBank,
  emptyPatchLibrary,
  getNextWorkspaceBank,
  getBankVoices,
  importVoices,
  isRenumberedByBankDeletion,
  makeBankFingerprint,
  makeDemoVoices,
  makePatches,
  moveVoice,
  normalizeWorkspaceBankNameForSave,
  patchMatchesSearch,
  patchSlotCode,
  renameBank,
  renameVoice,
  replaceVoice,
  updateBankInformation,
  voiceId,
  WorkspaceBankUnavailableError,
  workspaceBankAfterDeletion,
} from '@/lib/patch-library'
import {
  initializePatchLibrary,
  makeFactoryPatchLibrary,
  restoreFactoryPatchLibrary,
} from '@/lib/factory-patch-library'
import { updateDx7VoiceName } from '@/lib/dx7'
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
    expect(deleted.voices[voiceId('B', 1)].name).toBe('BRASS 1')
    expect(deleted.effects[voiceId('B', 1)]).toEqual(effects[voiceId('C', 1)])
    expect(deleted.bankNames.B).toBe('Third bank')
    expect(deleted.bankDescriptions.B).toBe('Moves into B')
    expect(deleted.voices[voiceId('C', 1)].name).toBe('BOWOAN')
    expect(deleted.voices[voiceId('D', 1)]).toBeUndefined()
  })

  it('moves the second bank into A when the first bank is deleted', () => {
    const deleted = deleteWorkspaceBank(makeFactoryPatchLibrary(), 'A')

    expect(deleted.workspaceBanks).toEqual(['A', 'B', 'C'])
    expect(deleted.voices[voiceId('A', 1)].name).toBe('GUITAR 1')
    expect(deleted.voices[voiceId('B', 1)].name).toBe('BRASS 1')
    expect(deleted.voices[voiceId('C', 1)].name).toBe('BOWOAN')
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

  it('gives slots in banks A to D their FM1 program and slots in added banks none', () => {
    const added = addWorkspaceBank(emptyPatchLibrary(), 'E')
    const patches = makePatches(added)
    const addedBank = patches.filter((patch) => patch.bank === 'E')

    expect(patches.find((patch) => patch.id === voiceId('A', 1))?.program).toBe(0)
    expect(patches.find((patch) => patch.id === voiceId('D', 32))?.program).toBe(127)
    expect(addedBank).toHaveLength(32)
    expect(addedBank[0]).toMatchObject({ bank: 'E', number: 1 })
    expect(addedBank.every((patch) => patch.program === undefined)).toBe(true)
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

  it('loads the four FM-1 factory banks into browser banks A through D', () => {
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
    ]).toEqual(['PIANO 1', 'SYN LEAD 3', 'GUITAR 1', 'BRASS 1', 'BOWOAN'])
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

  it('moves an empty slot as empty instead of storing undefined entries', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const voices = { ...initial.voices }
    const effects = { ...initial.effects }
    delete voices[voiceId('A', 2)]
    delete effects[voiceId('A', 2)]

    const result = moveVoice({ ...initial, effects, voices }, 'A', 1, 3)

    expect(voiceId('A', 1) in result.voices).toBe(false)
    expect(voiceId('A', 1) in result.effects).toBe(false)
    expect(Object.values(result.voices)).not.toContain(undefined)
    expect(result.voices[voiceId('A', 3)]).toBe(initial.voices[voiceId('A', 1)])
  })

  it('normalizes unsupported rename characters for DX7 storage', () => {
    const initial = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const result = renameVoice(initial, voiceId('A', 1), 'BASS 🎹')

    expect(result.voices[voiceId('A', 1)].name).toBe('BASS')
  })
})

describe('bank deletion', () => {
  const banks = ['A', 'B', 'C', 'D']

  it('shows the next bank under the letter it takes after a deletion', () => {
    const library = banks.reduce(
      (current, bank) => importVoices(current, bank, makeDemoVoices()),
      emptyPatchLibrary(banks),
    )

    expect(workspaceBankAfterDeletion(banks, 'B')).toBe('B')
    expect(deleteWorkspaceBank(library, 'B').voices[voiceId('B', 1)]).toBe(
      library.voices[voiceId('C', 1)],
    )
  })

  it('shows the bank before when the last bank is deleted', () => {
    expect(workspaceBankAfterDeletion(banks, 'D')).toBe('C')
  })

  it('shows no other bank when the only bank cannot be deleted', () => {
    expect(workspaceBankAfterDeletion(['A'], 'A')).toBeNull()
  })

  it('treats the deleted bank and every later bank as renumbered', () => {
    expect(banks.map((bank) => isRenumberedByBankDeletion(banks, 'B', bank))).toEqual([
      false,
      true,
      true,
      true,
    ])
  })
})

describe('patchSlotCode', () => {
  it('pads the slot number to two digits', () => {
    expect(patchSlotCode({ bank: 'E', number: 3 })).toBe('E03')
    expect(patchSlotCode({ bank: 'A', number: 32 })).toBe('A32')
  })
})

describe('patchMatchesSearch', () => {
  const brass = { bank: 'B', name: 'BRASS   7', number: 7 }

  it('finds a patch by part of its name, ignoring case', () => {
    expect(patchMatchesSearch(brass, 'ass')).toBe(true)
  })

  it('finds a patch by the slot code it shows', () => {
    expect(patchMatchesSearch(brass, 'B07')).toBe(true)
  })

  it('finds a patch by its slot code without the padding zero', () => {
    expect(patchMatchesSearch(brass, 'b7')).toBe(true)
  })

  it('ignores spaces around the search', () => {
    expect(patchMatchesSearch(brass, '  b07 ')).toBe(true)
  })

  it('does not match another slot in the same bank', () => {
    expect(patchMatchesSearch(brass, 'b17')).toBe(false)
  })

  it('does not list a whole bank for its letter alone', () => {
    expect(patchMatchesSearch({ bank: 'B', name: 'PIANO 1', number: 1 }, 'b')).toBe(false)
  })

  it('does not match the voice format every patch shares', () => {
    expect(patchMatchesSearch(brass, 'dx7')).toBe(false)
  })

  it('still finds a name that looks like a slot code', () => {
    expect(patchMatchesSearch({ bank: 'A', name: 'JUNO A1', number: 5 }, 'a1')).toBe(true)
  })
})

describe('restoring factory banks', () => {
  it('clears the titles and descriptions of the four restored banks only', () => {
    const withAddedBank = addWorkspaceBank(makeFactoryPatchLibrary(), 'E')
    const named = updateBankInformation(
      updateBankInformation(withAddedBank, 'A', 'Pads', 'My soft pads'),
      'E',
      'Leads',
      'My leads',
    )

    const restored = restoreFactoryPatchLibrary(named)

    expect(restored.bankNames).toEqual({ E: 'Leads' })
    expect(restored.bankDescriptions).toEqual({ E: 'My leads' })
  })
})

describe('replacing a voice from outside the workspace', () => {
  function libraryWithBank() {
    const loaded = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const effects = makeDefaultFm1Effects()
    effects[0] = 1
    return { ...loaded, effects: { ...loaded.effects, [voiceId('A', 5)]: effects } }
  }
  const imported = updateDx7VoiceName(makeDemoVoices()[0], 'FROM FILE')

  it('puts the voice in the slot', () => {
    const replaced = replaceVoice(libraryWithBank(), 'A', 5, imported)

    expect(replaced.voices[voiceId('A', 5)]).toEqual(imported)
  })

  it('gives the slot its own copy of the voice', () => {
    const replaced = replaceVoice(libraryWithBank(), 'A', 5, imported)

    expect(replaced.voices[voiceId('A', 5)]?.data).not.toBe(imported.data)
  })

  it('keeps the effects that came with the voice', () => {
    const effects = makeDefaultFm1Effects()
    effects[2] = 1

    const replaced = replaceVoice(libraryWithBank(), 'A', 5, imported, effects)

    expect(replaced.effects[voiceId('A', 5)]).toEqual(effects)
  })

  it('returns the slot’s effects to their defaults when none came with the voice', () => {
    const replaced = replaceVoice(libraryWithBank(), 'A', 5, imported)

    expect(replaced.effects[voiceId('A', 5)]).toEqual(makeDefaultFm1Effects())
  })

  it('leaves every other slot unchanged', () => {
    const library = libraryWithBank()

    const replaced = replaceVoice(library, 'A', 5, imported)

    expect(replaced.voices[voiceId('A', 4)]).toBe(library.voices[voiceId('A', 4)])
  })

  it('refuses a bank that holds no sounds', () => {
    // Bank B exists in the workspace but nothing has been loaded into it.
    expect(() => replaceVoice(libraryWithBank(), 'B', 1, imported)).toThrow(
      WorkspaceBankUnavailableError,
    )
  })

  it('refuses a slot outside the bank', () => {
    expect(() => replaceVoice(libraryWithBank(), 'A', 33, imported)).toThrow(RangeError)
  })
})

describe('copying a voice', () => {
  function libraryWithBanks() {
    const voices = makeDemoVoices()
    const loaded = importVoices(importVoices(emptyPatchLibrary(), 'A', voices), 'B', voices)
    const effects = makeDefaultFm1Effects()
    effects[0] = 1
    return { ...loaded, effects: { ...loaded.effects, [voiceId('A', 1)]: effects } }
  }

  it('replaces the target slot with the source voice and its effects', () => {
    const library = libraryWithBanks()

    const copied = copyVoice(library, voiceId('A', 1), 'B', 5)

    expect(copied.voices[voiceId('B', 5)].data).toEqual(library.voices[voiceId('A', 1)].data)
    expect(copied.voices[voiceId('B', 5)].name).toBe(library.voices[voiceId('A', 1)].name)
    expect(copied.effects[voiceId('B', 5)]).toEqual(library.effects[voiceId('A', 1)])
  })

  it('leaves the source and every other slot unchanged', () => {
    const library = libraryWithBanks()

    const copied = copyVoice(library, voiceId('A', 1), 'B', 5)

    expect(copied.voices[voiceId('A', 1)]).toBe(library.voices[voiceId('A', 1)])
    expect(copied.voices[voiceId('B', 4)]).toBe(library.voices[voiceId('B', 4)])
    expect(library.voices[voiceId('B', 5)].name).not.toBe(copied.voices[voiceId('B', 5)].name)
  })

  it('gives the copy its own voice and effect data', () => {
    const library = libraryWithBanks()

    const copied = copyVoice(library, voiceId('A', 1), 'A', 2)

    expect(copied.voices[voiceId('A', 2)]).not.toBe(library.voices[voiceId('A', 1)])
    expect(copied.voices[voiceId('A', 2)].data).not.toBe(library.voices[voiceId('A', 1)].data)
    expect(copied.effects[voiceId('A', 2)]).not.toBe(library.effects[voiceId('A', 1)])
  })

  it('reports no change when a voice is copied onto its own slot', () => {
    const library = libraryWithBanks()

    expect(copyVoice(library, voiceId('A', 1), 'A', 1)).toBe(library)
  })

  it('reports no change when the source slot is empty', () => {
    const library = importVoices(emptyPatchLibrary(), 'B', makeDemoVoices())

    expect(copyVoice(library, voiceId('A', 1), 'B', 1)).toBe(library)
  })

  it('rejects a target bank that is missing or has no sounds', () => {
    const library = libraryWithBanks()

    expect(() => copyVoice(library, voiceId('A', 1), 'C', 1)).toThrow(WorkspaceBankUnavailableError)
    expect(() => copyVoice(library, voiceId('A', 1), 'Z', 1)).toThrow(WorkspaceBankUnavailableError)
  })

  it('rejects a slot outside the bank', () => {
    const library = libraryWithBanks()

    for (const slot of [0, 33, 1.5]) {
      expect(() => copyVoice(library, voiceId('A', 1), 'B', slot)).toThrow(RangeError)
    }
  })
})
