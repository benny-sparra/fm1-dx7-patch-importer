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
  importFetchedBanks,
  importVoices,
  isRenumberedByBankDeletion,
  makeBankFingerprint,
  makeDemoVoices,
  makePatches,
  maximumWorkspaceBanks,
  moveVoice,
  normalizeWorkspaceBankNameForSave,
  patchMatchesSearch,
  patchSlotCode,
  renameBank,
  renameVoice,
  replaceVoice,
  saveSound,
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
import { favouritePatchId, toggleFavourite } from '@/lib/favourites'
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

describe('importing banks read from the FM1', () => {
  const fetched = makeDemoVoices().map((voice) => updateDx7VoiceName(voice, `FM1 ${voice.name}`))
  const sounds = fetched.map((voice) => ({ voice }))

  it('replaces the patches of each bank it is given', () => {
    const before = importVoices(emptyPatchLibrary(), 'B', makeDemoVoices())

    const result = importFetchedBanks(before, [{ bank: 'B', sounds }])

    expect(getBankVoices(result, 'B')).toEqual(fetched)
    expect(result.loadedBanks).toEqual(['B'])
  })

  it('leaves the banks it is not given as they are', () => {
    const before = importVoices(emptyPatchLibrary(), 'C', makeDemoVoices())

    const result = importFetchedBanks(before, [{ bank: 'A', sounds }])

    expect(getBankVoices(result, 'C')).toEqual(getBankVoices(before, 'C'))
    expect(result.loadedBanks).toEqual(['A', 'C'])
  })

  it('keeps the patch in a slot the FM1 could not supply', () => {
    const before = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const withGap = sounds.map((sound, index) => (index === 4 ? null : sound))

    const result = importFetchedBanks(before, [{ bank: 'A', sounds: withGap }])

    expect(result.voices[voiceId('A', 5)]).toBe(before.voices[voiceId('A', 5)])
    expect(result.effects[voiceId('A', 5)]).toBe(before.effects[voiceId('A', 5)])
    expect(result.voices[voiceId('A', 6)]).toBe(fetched[5])
  })

  it('gives each imported patch the effects it was read with', () => {
    const before = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const filterOn = makeDefaultFm1Effects()
    filterOn[0] = 1

    const result = importFetchedBanks(before, [
      { bank: 'A', sounds: sounds.map((sound) => ({ ...sound, effects: filterOn })) },
    ])

    expect(result.effects[voiceId('A', 1)]).toEqual(filterOn)
  })

  it('gives a patch read without effects the default effects', () => {
    const before = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    const reverbOn = {
      ...before,
      effects: { ...before.effects, [voiceId('A', 1)]: Uint8Array.of(1) },
    }

    const result = importFetchedBanks(reverbOn, [{ bank: 'A', sounds }])

    expect(result.effects[voiceId('A', 1)]).toEqual(makeDefaultFm1Effects())
  })

  it('puts a bank into whichever workspace bank it names', () => {
    const before = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())

    const result = importFetchedBanks(before, [{ bank: 'C', sounds }])

    expect(getBankVoices(result, 'C')).toEqual(fetched)
    expect(getBankVoices(result, 'A')).toEqual(getBankVoices(before, 'A'))
  })

  it('adds a bank given a new bank title after the others, with that title', () => {
    const before = deleteWorkspaceBank(emptyPatchLibrary(), 'D')

    const result = importFetchedBanks(before, [
      { newBankTitle: 'FM-1+VA A', sounds },
      { newBankTitle: 'FM-1+VA B', sounds },
    ])

    expect(result.workspaceBanks).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(getBankVoices(result, 'D')).toEqual(fetched)
    expect(result.bankNames).toMatchObject({ D: 'FM-1+VA A', E: 'FM-1+VA B' })
  })

  it('leaves a new bank empty in a slot the FM1 could not supply', () => {
    const withGap = sounds.map((sound, index) => (index === 4 ? null : sound))

    const result = importFetchedBanks(emptyPatchLibrary(), [
      { newBankTitle: 'FM-1+VA A', sounds: withGap },
    ])

    expect(result.voices[voiceId('E', 5)]).toBeUndefined()
    expect(result.voices[voiceId('E', 6)]).toBe(fetched[5])
  })

  it('rejects a workspace bank that does not exist', () => {
    const before = deleteWorkspaceBank(emptyPatchLibrary(), 'D')

    expect(() => importFetchedBanks(before, [{ bank: 'D', sounds }])).toThrow(
      WorkspaceBankUnavailableError,
    )
  })

  it('rejects a new bank once the workspace holds as many banks as it can', () => {
    let full = emptyPatchLibrary()
    while (full.workspaceBanks.length < maximumWorkspaceBanks) {
      full = addWorkspaceBank(full, getNextWorkspaceBank(full.workspaceBanks) ?? '')
    }

    expect(() => importFetchedBanks(full, [{ newBankTitle: 'FM-1+VA A', sounds }])).toThrow(
      WorkspaceBankUnavailableError,
    )
  })

  it('rejects two banks that replace the same workspace bank', () => {
    expect(() =>
      importFetchedBanks(emptyPatchLibrary(), [
        { bank: 'B', sounds },
        { bank: 'B', sounds },
      ]),
    ).toThrow('Two banks read from the FM1 cannot replace the same workspace bank.')
  })

  it('keeps bank titles, descriptions and favourites', () => {
    const titled = updateBankInformation(emptyPatchLibrary(), 'A', 'Live set', 'For Friday')

    const result = importFetchedBanks(titled, [{ bank: 'A', sounds }])

    expect(result.bankNames).toEqual(titled.bankNames)
    expect(result.bankDescriptions).toBe(titled.bankDescriptions)
    expect(result.favourites).toBe(titled.favourites)
  })

  it('rejects a bank that is not 32 patches long', () => {
    expect(() =>
      importFetchedBanks(emptyPatchLibrary(), [{ bank: 'A', sounds: sounds.slice(1) }]),
    ).toThrow('A browser bank requires exactly 32 DX7 voices.')
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

  it('shows only a favourite’s place in Favourites', () => {
    expect(patchSlotCode({ bank: 'favourites', number: 7 })).toBe('07')
  })
})

describe('favourites in the workspace', () => {
  const voices = makeDemoVoices()
  const edited = updateDx7VoiceName(voices[0], 'EDITED')
  const editedEffects = makeDefaultFm1Effects()
  editedEffects[0] = 1

  /** Bank A holds the demo voices, and Favourites holds A1's sound. */
  function withFavouriteA1() {
    const loaded = importVoices(emptyPatchLibrary(), 'A', voices)
    return toggleFavourite(loaded, { voice: voices[0] }, { bankNumber: 1 }, 'f1').snapshot
  }

  it('updates the favourite of a slot saved in the editor, as its own copy', () => {
    const { linked, snapshot } = saveSound(
      withFavouriteA1(),
      voiceId('A', 1),
      edited,
      editedEffects,
    )

    expect(linked).toBe(1)
    expect(snapshot.voices[voiceId('A', 1)]).toBe(edited)
    expect(snapshot.favourites[0]).toMatchObject({
      effects: editedEffects,
      id: 'f1',
      voice: edited,
    })
    expect(snapshot.favourites[0].voice).not.toBe(edited)
  })

  it('updates every bank slot that held a favourite saved in the editor', () => {
    const withCopy = copyVoice(withFavouriteA1(), voiceId('A', 1), 'A', 9)

    const { linked, snapshot } = saveSound(withCopy, favouritePatchId('f1'), edited, editedEffects)

    expect(linked).toBe(2)
    expect(snapshot.favourites[0].voice).toBe(edited)
    expect(snapshot.voices[voiceId('A', 1)]).toEqual(edited)
    expect(snapshot.voices[voiceId('A', 9)]).toEqual(edited)
    expect(snapshot.effects[voiceId('A', 9)]).toEqual(editedEffects)
    expect(snapshot.voices[voiceId('A', 2)]).toBe(voices[1])
  })

  it('leaves Favourites alone when a slot it does not hold is saved', () => {
    const before = withFavouriteA1()

    const { linked, snapshot } = saveSound(before, voiceId('A', 2), edited, editedEffects)

    expect(linked).toBe(0)
    expect(snapshot.favourites).toBe(before.favourites)
  })

  it('leaves the library unchanged when the saved sound is gone', () => {
    const before = withFavouriteA1()

    expect(saveSound(before, favouritePatchId('gone'), edited, editedEffects)).toEqual({
      linked: 0,
      snapshot: before,
    })
  })

  it('copies a favourite into a bank slot', () => {
    const copied = copyVoice(withFavouriteA1(), favouritePatchId('f1'), 'A', 5)

    expect(copied.voices[voiceId('A', 5)]).toEqual(voices[0])
  })

  it('keeps favourites when a bank is deleted, imported over, or reset to the factory patches', () => {
    const before = addWorkspaceBank(withFavouriteA1(), 'E')

    expect(deleteWorkspaceBank(before, 'A').favourites).toBe(before.favourites)
    expect(importVoices(before, 'A', makeDemoVoices()).favourites).toBe(before.favourites)
    expect(clearLibraryBank(before, 'A').favourites).toBe(before.favourites)
    expect(restoreFactoryPatchLibrary(before).favourites).toBe(before.favourites)
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

describe('FM-1+VA settings records in the workspace', () => {
  const record = (seed: number) =>
    Uint8Array.from({ length: 59 }, (_, index) => (index + seed) & 0xff)
  const withRecords = () => {
    const library = importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
    return {
      ...library,
      records: { [voiceId('A', 1)]: record(1), [voiceId('A', 2)]: record(2) },
    }
  }

  it('keeps the record each patch read from the FM1 carries', () => {
    const voices = makeDemoVoices()
    const sounds = voices.map((voice, index) =>
      index === 0 ? { record: record(9), voice } : { voice },
    )

    const result = importFetchedBanks(withRecords(), [{ bank: 'A', sounds }])

    expect(result.records[voiceId('A', 1)]).toEqual(record(9))
    // A patch read without a record replaces the slot's record with none.
    expect(result.records[voiceId('A', 2)]).toBeUndefined()
  })

  it('keeps the record of a slot the FM1 import leaves as it is', () => {
    const sounds = makeDemoVoices().map((voice, index) => (index === 1 ? null : { voice }))

    expect(importFetchedBanks(withRecords(), [{ bank: 'A', sounds }]).records).toEqual({
      [voiceId('A', 2)]: record(2),
    })
  })

  it('drops the records of slots a DX7 bank replaces, which carries none', () => {
    expect(importVoices(withRecords(), 'A', makeDemoVoices()).records).toEqual({})
  })

  it('moves a record with its patch when patches are reordered', () => {
    const moved = moveVoice(withRecords(), 'A', 1, 3)

    expect(moved.records).toEqual({ [voiceId('A', 1)]: record(2), [voiceId('A', 3)]: record(1) })
  })

  it('copies a record with its patch, as its own copy', () => {
    const library = withRecords()
    const copied = copyVoice(library, voiceId('A', 1), 'A', 5)

    expect(copied.records[voiceId('A', 5)]).toEqual(record(1))
    expect(copied.records[voiceId('A', 5)]).not.toBe(library.records[voiceId('A', 1)])
  })

  it('clears the record of a slot a patch without one is copied over', () => {
    const copied = copyVoice(withRecords(), voiceId('A', 7), 'A', 1)

    expect(copied.records[voiceId('A', 1)]).toBeUndefined()
  })

  it('puts a record from outside the workspace over a slot, or none when there is none', () => {
    const [voice] = makeDemoVoices()

    expect(replaceVoice(withRecords(), 'A', 1, voice, undefined, record(5)).records).toMatchObject({
      [voiceId('A', 1)]: record(5),
    })
    expect(replaceVoice(withRecords(), 'A', 2, voice).records[voiceId('A', 2)]).toBeUndefined()
  })

  it('removes the records of a cleared bank', () => {
    expect(clearLibraryBank(withRecords(), 'A').records).toEqual({})
  })

  it('moves records up a letter with their bank when an earlier bank is deleted', () => {
    const library = importVoices(withRecords(), 'B', makeDemoVoices())
    const withB = { ...library, records: { [voiceId('B', 4)]: record(4) } }

    expect(deleteWorkspaceBank(withB, 'A').records).toEqual({ [voiceId('A', 4)]: record(4) })
  })

  it('keeps a slot its record when the editor saves its sound', () => {
    const library = withRecords()
    const voice = updateDx7VoiceName(library.voices[voiceId('A', 1)], 'EDITED')

    const { snapshot } = saveSound(library, voiceId('A', 1), voice, makeDefaultFm1Effects())

    expect(snapshot.records[voiceId('A', 1)]).toEqual(record(1))
  })

  it('updates only the favourite whose record matches the slot saved', () => {
    const library = withRecords()
    const id = voiceId('A', 1)
    const sound = { effects: library.effects[id], voice: library.voices[id] }
    const withFavourites = toggleFavourite(
      toggleFavourite(library, { ...sound, record: record(1) }, { bankNumber: 1 }, 'same').snapshot,
      { ...sound, record: record(3) },
      { bankNumber: 1 },
      'other',
    ).snapshot
    const voice = updateDx7VoiceName(library.voices[id], 'EDITED')

    const { linked, snapshot } = saveSound(withFavourites, id, voice, makeDefaultFm1Effects())

    expect(linked).toBe(1)
    expect(snapshot.favourites.map(({ voice: { name } }) => name)).toEqual([
      'EDITED',
      library.voices[id].name,
    ])
  })
})
