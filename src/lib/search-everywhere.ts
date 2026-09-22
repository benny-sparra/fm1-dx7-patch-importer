import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import catalogIndex from '@/data/dx7-catalog-index.json'
import type { Dx7Voice } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import type { NamedBank } from '@/lib/named-bank'
import { patchNameMatchesSearch } from '@/lib/patch-library'
import { voiceFingerprint } from '@/lib/voice-fingerprint'

/**
 * The patch name and voice fingerprint of every catalog patch, by catalog id, in slot order.
 */
export type Dx7CatalogIndex = Record<string, [name: string, fingerprint: number][]>

export type CatalogPatchMatch = {
  bankId: string
  bankName: string
  name: string
  slot: number
  soundKey: string
}

export type SavedPatchMatch = {
  bankId: string
  bankName: string
  effects: Uint8Array
  name: string
  slot: number
  soundKey: string
  voice: Dx7Voice
}

/**
 * The catalog's patch names and voice fingerprints, generated from the bank files by
 * `npm run catalog:index`. A search reads this rather than every bank file. This module loads only
 * when the search first looks past the workspace, and the index loads with it. JSON cannot type a
 * pair; the generating test writes every entry as one.
 */
export const dx7CatalogIndex = catalogIndex as unknown as Dx7CatalogIndex

const defaultEffectsKey = makeDefaultFm1Effects().join(',')

/**
 * What a patch plays: its voice data, which includes its name, and its FM1 effects. Two patches
 * with the same key sound the same, so a search lists only the first.
 */
function makeSoundKey(fingerprint: number, effectsKey: string) {
  return `${fingerprint}/${effectsKey}`
}

export function soundKey(voice: Dx7Voice, effects: Uint8Array) {
  return makeSoundKey(voiceFingerprint(voice.data), effects.join(','))
}

/** Catalog patches whose name contains the search, in the order the catalog lists its banks. */
export function findCatalogMatches(index: Dx7CatalogIndex, search: string): CatalogPatchMatch[] {
  if (!search.trim()) return []
  return dx7BankCatalog.flatMap((bank) =>
    (index[bank.id] ?? []).flatMap(([name, fingerprint], slotIndex) =>
      patchNameMatchesSearch(name, search)
        ? [
            {
              bankId: bank.id,
              bankName: bank.name,
              name,
              slot: slotIndex + 1,
              // A catalog patch plays with the default FM1 effects.
              soundKey: makeSoundKey(fingerprint, defaultEffectsKey),
            },
          ]
        : [],
    ),
  )
}

/** Patches in saved banks whose name contains the search, in the order the banks are listed. */
export function findSavedBankMatches(banks: NamedBank[], search: string): SavedPatchMatch[] {
  if (!search.trim()) return []
  return banks.flatMap((bank) =>
    bank.slots.flatMap((slot) =>
      patchNameMatchesSearch(slot.voice.name, search)
        ? [
            {
              bankId: bank.id,
              bankName: bank.name,
              effects: slot.effects,
              name: slot.voice.name,
              slot: slot.slot,
              soundKey: soundKey(slot.voice, slot.effects),
              voice: slot.voice,
            },
          ]
        : [],
    ),
  )
}

/**
 * Drops each match that sounds exactly like one listed before it, so an archive that repeats a
 * patch, or a catalog patch already in the user's banks, is listed once. `shown` holds the sound
 * keys of the workspace matches above the groups, which are slots and are never hidden. Patches
 * with the same name but different data, or the same voice with different FM1 effects, all stay.
 */
export function hideCopies<Match extends { soundKey: string }>(
  shown: Iterable<string>,
  groups: Match[][],
) {
  const seen = new Set(shown)
  return groups.map((group) => {
    const matches = group.filter((match) => {
      if (seen.has(match.soundKey)) return false
      seen.add(match.soundKey)
      return true
    })
    return { hidden: group.length - matches.length, matches }
  })
}

/**
 * Reads catalog voices, fetching each bank once. The same voice object comes back every time, so
 * playing a result twice does not send it to the FM1 twice. A bank that fails to arrive is
 * forgotten, so the next attempt fetches it again.
 */
export function createCatalogVoiceLoader(
  load: (bankId: string) => Promise<Dx7Voice[]> = (bankId) => loadDx7CatalogBank(bankId),
) {
  const banks = new Map<string, Promise<Dx7Voice[]>>()
  return async (bankId: string, slot: number) => {
    let bank = banks.get(bankId)
    if (!bank) {
      bank = load(bankId)
      banks.set(bankId, bank)
      bank.catch(() => {
        if (banks.get(bankId) === bank) banks.delete(bankId)
      })
    }
    const voice = (await bank)[slot - 1]
    if (!voice) throw new RangeError('Slot out of range.')
    return voice
  }
}
