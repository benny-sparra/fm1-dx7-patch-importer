import { describe, expect, it, vi } from 'vitest'

import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import {
  createCatalogVoiceLoader,
  findCatalogMatches,
  findSavedBankMatches,
  dx7CatalogIndex,
  hideCopies,
  soundKey,
} from '@/lib/search-everywhere'

function savedBank(id: string, name: string, firstVoiceName: string) {
  const voices = makeDemoVoices()
  voices[0] = updateDx7VoiceName(voices[0], firstVoiceName)
  return createNamedBank(importVoices(emptyPatchLibrary(), 'A', voices), 'A', {
    description: '',
    id,
    name,
    now: '2026-09-21T00:00:00.000Z',
  })
}

describe('catalog search', () => {
  it('finds a catalog patch by part of its name, ignoring case', () => {
    const matches = findCatalogMatches(dx7CatalogIndex, 'brass   1')

    expect(matches[0]).toEqual({
      bankId: 'rom1a',
      bankName: 'ROM1A Master',
      name: 'BRASS   1',
      slot: 1,
      soundKey: expect.any(String),
    })
  })

  it('lists matches in catalog order', () => {
    const matches = findCatalogMatches(dx7CatalogIndex, 'brass')

    expect(matches.slice(0, 3).map(({ bankId, slot }) => `${bankId}:${slot}`)).toEqual([
      'rom1a:1',
      'rom1a:2',
      'rom1a:3',
    ])
  })

  it('finds nothing for an empty search', () => {
    expect(findCatalogMatches(dx7CatalogIndex, '  ')).toEqual([])
  })

  it('skips a catalog bank the index does not list', () => {
    expect(findCatalogMatches({}, 'brass')).toEqual([])
  })
})

describe('saved bank search', () => {
  it('finds a saved patch with its bank, slot, voice, and effects', () => {
    const bank = savedBank('saved-1', 'Leads', 'SOLO LEAD')

    const [match] = findSavedBankMatches([bank], 'solo')

    expect(match).toEqual({
      bankId: 'saved-1',
      bankName: 'Leads',
      effects: makeDefaultFm1Effects(),
      name: 'SOLO LEAD',
      slot: 1,
      soundKey: soundKey(bank.slots[0].voice, makeDefaultFm1Effects()),
      voice: bank.slots[0].voice,
    })
  })

  it('lists matches bank by bank', () => {
    const matches = findSavedBankMatches(
      [savedBank('saved-1', 'Leads', 'ZAP ONE'), savedBank('saved-2', 'Pads', 'ZAP TWO')],
      'zap',
    )

    expect(matches.map(({ bankName, name }) => `${bankName}:${name}`)).toEqual([
      'Leads:ZAP ONE',
      'Pads:ZAP TWO',
    ])
  })
})

describe('hiding copies', () => {
  const [voice] = makeDemoVoices()
  const effects = makeDefaultFm1Effects()
  const match = (label: string, key: string) => ({ label, soundKey: key })

  it('hides a result that sounds exactly like a workspace match', () => {
    const [saved] = hideCopies(
      [soundKey(voice, effects)],
      [[match('saved', soundKey({ ...voice, data: Uint8Array.from(voice.data) }, effects))]],
    )

    expect(saved).toEqual({ hidden: 1, matches: [] })
  })

  it('keeps the first of several copies and hides the later ones, across groups', () => {
    const key = soundKey(voice, effects)

    const groups = hideCopies(
      [],
      [[match('first', key)], [match('second', key), match('third', key)]],
    )

    expect(groups).toEqual([
      { hidden: 0, matches: [match('first', key)] },
      { hidden: 2, matches: [] },
    ])
  })

  it('keeps the same voice with different FM1 effects', () => {
    const changed = makeDefaultFm1Effects()
    changed[0] = 1

    const [group] = hideCopies(
      [soundKey(voice, effects)],
      [[match('saved', soundKey(voice, changed))]],
    )

    expect(group.hidden).toBe(0)
  })

  it('keeps a patch with the same name but different voice data', () => {
    const data = Uint8Array.from(voice.data)
    data[0] ^= 1
    const sameName = { ...voice, data }

    const [group] = hideCopies(
      [soundKey(voice, effects)],
      [[match('saved', soundKey(sameName, effects))]],
    )

    expect(group.hidden).toBe(0)
  })

  it('hides a catalog patch that repeats one from an earlier catalog bank', () => {
    const [group] = hideCopies([], [findCatalogMatches(dx7CatalogIndex, 'pipes   1')])

    expect(group.matches.map(({ bankId, slot }) => `${bankId}:${slot}`)).toEqual(['rom1a:18'])
    expect(group.hidden).toBe(1)
  })
})

describe('catalog voice loading', () => {
  it('fetches a bank once for several of its voices', async () => {
    const load = vi.fn(() => Promise.resolve(makeDemoVoices()))
    const loadVoice = createCatalogVoiceLoader(load)

    await loadVoice('rom1a', 1)
    await loadVoice('rom1a', 2)

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('returns the same voice object each time', async () => {
    const loadVoice = createCatalogVoiceLoader(() => Promise.resolve(makeDemoVoices()))

    expect(await loadVoice('rom1a', 3)).toBe(await loadVoice('rom1a', 3))
  })

  it('fetches a bank again after a failed attempt', async () => {
    const load = vi
      .fn<(bankId: string) => Promise<ReturnType<typeof makeDemoVoices>>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makeDemoVoices())
    const loadVoice = createCatalogVoiceLoader(load)

    await expect(loadVoice('rom1a', 1)).rejects.toThrow('offline')
    await expect(loadVoice('rom1a', 1)).resolves.toBeDefined()
  })

  it('refuses a slot outside the bank', async () => {
    const loadVoice = createCatalogVoiceLoader(() => Promise.resolve(makeDemoVoices()))

    await expect(loadVoice('rom1a', 33)).rejects.toThrow(RangeError)
  })
})
