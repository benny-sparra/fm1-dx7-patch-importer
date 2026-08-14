import { describe, expect, it } from 'vitest'

import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import {
  createNamedBank,
  duplicateNamedBank,
  loadNamedBank,
  makeNamedBankSysexFile,
  makeNamedBankSysexFilename,
  renameNamedBank,
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
    expect(() => createNamedBank(makeLoadedLibrary(), 'A', {
      description: '', id: 'bank-1', name: '  ', now: createdAt,
    })).toThrow('name')

    expect(() => createNamedBank(emptyPatchLibrary(), 'A', {
      description: '', id: 'bank-1', name: 'Empty', now: createdAt,
    })).toThrow('32')
  })

  it('loads a saved bank into a different workspace destination', () => {
    const source = makeLoadedLibrary()
    source.effects[voiceId('A', 1)][0] = 1
    const bank = createNamedBank(source, 'A', {
      description: '', id: 'bank-1', name: 'Source', now: createdAt,
    })

    const loaded = loadNamedBank(emptyPatchLibrary(), 'C', bank)

    expect(loaded.loadedBanks).toEqual(['C'])
    expect(loaded.bankNames.C).toBe('Source')
    expect(getBankVoices(loaded, 'C')).toHaveLength(32)
    expect(loaded.effects[voiceId('C', 1)][0]).toBe(1)
    expect(loaded.effects[voiceId('C', 2)]).toEqual(makeDefaultFm1Effects())
  })

  it('renames and duplicates without mutating the source bank', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '', id: 'bank-1', name: 'Original', now: createdAt,
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
      description: '', id: 'bank-1', name: 'Gig bank', now: createdAt,
    })

    const exported = parseDx7Bank(makeNamedBankSysexFile(bank).buffer as ArrayBuffer)

    expect(exported).toHaveLength(32)
    expect(exported.map(({ name }) => name)).toEqual(bank.slots.map(({ voice }) => voice.name))
    expect(exported[0].data).toEqual(bank.slots[0].voice.data)
    expect(exported[31].data).toEqual(bank.slots[31].voice.data)
  })

  it('uses a safe .sysex filename derived from the saved bank name', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '', id: 'bank-1', name: '../../Gig: Friday*?', now: createdAt,
    })

    expect(makeNamedBankSysexFilename(bank)).toBe('fm1-Gig-Friday.sysex')
  })

  it('rejects exporting a malformed saved bank', () => {
    const bank = createNamedBank(makeLoadedLibrary(), 'A', {
      description: '', id: 'bank-1', name: 'Incomplete', now: createdAt,
    })
    bank.slots.pop()

    expect(() => makeNamedBankSysexFile(bank)).toThrow('invalid')
  })
})
