import { describe, expect, it } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  createNamedBank,
  duplicateNamedBank,
  loadNamedBank,
  makeNamedBankSysexFile,
  makeNamedBankSysexFilename,
  renameNamedBank,
  validateNamedBank,
  type NamedBank,
} from '@/lib/named-bank'
import { parseDx7Bank } from '@/lib/dx7'
import {
  emptyPatchLibrary,
  getBankVoices,
  importVoices,
  makeDemoVoices,
  voiceId,
} from '@/lib/patch-library'

const createdAt = '2026-08-13T12:00:00.000Z'

function makeLoadedLibrary() {
  return importVoices(emptyPatchLibrary(), 'A', makeDemoVoices())
}

describe('named bank operations', () => {
  it('captures 32 independent voice and effect snapshots', () => {
    const library = makeLoadedLibrary()
    library.effects[voiceId('A', 1)][0] = 1

    const bank = createNamedBank(library, 'A', {
      description: 'For Saturday',
      id: 'bank-1',
      name: '  Gig bank  ',
      now: createdAt,
    })
    library.voices[voiceId('A', 1)].data[0] = 0
    library.effects[voiceId('A', 1)][0] = 0

    expect(bank.name).toBe('Gig bank')
    expect(bank.description).toBe('For Saturday')
    expect(bank.slots).toHaveLength(32)
    expect(bank.slots[0].voice.data[0]).not.toBe(0)
    expect(bank.slots[0].effects[0]).toBe(1)
  })

  it('rejects an empty name and an incomplete source bank', () => {
    expect(() =>
      createNamedBank(makeLoadedLibrary(), 'A', {
        description: '',
        id: 'bank-1',
        name: '  ',
        now: createdAt,
      }),
    ).toThrow('name')

    expect(() =>
      createNamedBank(emptyPatchLibrary(), 'A', {
        description: '',
        id: 'bank-1',
        name: 'Empty',
        now: createdAt,
      }),
    ).toThrow('32')
  })

  it('loads a saved bank into a different workspace destination', () => {
    const source = makeLoadedLibrary()
    source.effects[voiceId('A', 1)][0] = 1
    const bank = createNamedBank(source, 'A', {
      description: '',
      id: 'bank-1',
      name: 'Source',
      now: createdAt,
    })

    const loaded = loadNamedBank(emptyPatchLibrary(), 'C', bank)

    expect(loaded.loadedBanks).toEqual(['C'])
    expect(loaded.bankNames.C).toBe('Source')
    expect(getBankVoices(loaded, 'C')).toHaveLength(32)
    expect(loaded.effects[voiceId('C', 1)][0]).toBe(1)
    expect(loaded.effects[voiceId('C', 2)]).toEqual(makeDefaultFm1Effects())
  })

  it('titles the workspace bank with as much of a long saved-bank name as a title holds', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Electric Pianos',
      now: createdAt,
    })

    const loaded = loadNamedBank(emptyPatchLibrary(), 'C', bank)

    expect(loaded.bankNames.C).toBe('Electric P')
  })

  it('renames and duplicates without mutating the source bank', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Original',
      now: createdAt,
    })
    const renamed = renameNamedBank(bank, 'Renamed', 'New notes', '2026-08-13T13:00:00.000Z')
    const duplicate = duplicateNamedBank(bank, 'bank-2', '2026-08-13T14:00:00.000Z')

    expect(renamed.name).toBe('Renamed')
    expect(renamed.description).toBe('New notes')
    expect(duplicate.id).toBe('bank-2')
    expect(duplicate.name).toBe('Original copy')
    duplicate.slots[0].voice.data[0] = 0
    expect(bank.slots[0].voice.data[0]).not.toBe(0)
  })

  it('exports the saved bank as a standard 32-voice DX7 SysEx file', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Gig bank',
      now: createdAt,
    })

    const exported = parseDx7Bank(makeNamedBankSysexFile(bank).buffer as ArrayBuffer)

    expect(exported).toHaveLength(32)
    expect(exported.map(({ name }) => name)).toEqual(bank.slots.map(({ voice }) => voice.name))
    expect(exported[0].data).toEqual(bank.slots[0].voice.data)
    expect(exported[31].data).toEqual(bank.slots[31].voice.data)
  })

  it('uses a safe .syx filename derived from the saved bank name', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '',
      id: 'bank-1',
      name: '../../Gig: Friday*?',
      now: createdAt,
    })

    expect(makeNamedBankSysexFilename(bank)).toBe('fm1-Gig-Friday.syx')
  })

  it('rejects exporting a malformed saved bank', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Incomplete',
      now: createdAt,
    })
    bank.slots.pop()

    expect(() => makeNamedBankSysexFile(bank)).toThrow('invalid')
  })
})

describe('saved banks with FM-1+VA records', () => {
  const record = (seed: number) =>
    Uint8Array.from({ length: 59 }, (_, index) => (index + seed) & 0xff)
  const options = { description: '', id: 'bank-1', name: 'Recorded', now: createdAt }

  function withRecord() {
    const library = makeLoadedLibrary()
    return { ...library, records: { [voiceId('A', 2)]: record(2) } }
  }

  // A saved bank exactly as version 1 stored it, before slots could carry a record.
  function versionOneBank(): NamedBank {
    return {
      createdAt,
      description: '',
      id: 'old',
      name: 'Old bank',
      slots: makeDemoVoices().map((voice, index) => ({
        effects: makeDefaultFm1Effects(),
        slot: index + 1,
        voice,
      })),
      updatedAt: createdAt,
      version: 1,
    }
  }

  it('saves each slot’s record as its own copy, as version 2', () => {
    const library = withRecord()

    const bank = createNamedBank(library, 'A', options)

    expect(bank.version).toBe(2)
    expect(bank.slots[1].record).toEqual(record(2))
    expect(bank.slots[1].record).not.toBe(library.records[voiceId('A', 2)])
    expect(bank.slots[0]).not.toHaveProperty('record')
  })

  it('loads each slot’s record into the destination bank, replacing the records there', () => {
    const bank = createNamedBank(withRecord(), 'A', options)
    const destination = { ...makeLoadedLibrary(), records: { [voiceId('A', 5)]: record(5) } }

    expect(loadNamedBank(destination, 'A', bank).records).toEqual({ [voiceId('A', 2)]: record(2) })
  })

  it('keeps the records when a bank is duplicated', () => {
    const bank = createNamedBank(withRecord(), 'A', options)

    expect(duplicateNamedBank(bank, 'copy', createdAt).slots[1].record).toEqual(record(2))
  })

  it('reads a version 1 bank, which has no records, and loads it without any', () => {
    const bank = versionOneBank()

    expect(() => validateNamedBank(bank)).not.toThrow()
    expect(loadNamedBank(withRecord(), 'A', bank).records).toEqual({})
  })

  it('writes a renamed version 1 bank back as version 2', () => {
    expect(renameNamedBank(versionOneBank(), 'New', '', createdAt).version).toBe(2)
  })

  it('refuses a slot whose record is the wrong size', () => {
    const bank = createNamedBank(withRecord(), 'A', options)
    bank.slots[1].record = new Uint8Array(58)

    expect(() => validateNamedBank(bank)).toThrow('32 valid sound slots')
  })
})
