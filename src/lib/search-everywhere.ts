import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import catalogIndex from '@/data/dx7-catalog-index.json'
import type { Dx7Voice } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { fm1VaEightBitName } from '@/lib/fm1-va-eight-bit'
import { fm1VaVirtualAnalogName } from '@/lib/fm1-va-virtual-analog'
import type { NamedBank } from '@/lib/named-bank'
import { patchNameMatchesSearch } from '@/lib/patch-library'
import { eightBitSoundKey, makeSoundKey, soundKey, virtualAnalogSoundKey } from '@/lib/sound-key'

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

/** A saved-bank patch: a DX7 voice, or a Virtual Analog or 8-Bit preset's voice bytes and record. */
export type SavedPatchMatch = {
  bankId: string
  bankName: string
  effects: Uint8Array
  name: string
  slot: number
  soundKey: string
} & (
  | { record?: Uint8Array; voice: Dx7Voice }
  | { record: Uint8Array; virtualAnalog: Uint8Array }
  | { eightBit: Uint8Array; record: Uint8Array }
)

/**
 * The catalog's patch names and voice fingerprints, generated from the bank files by
 * `npm run catalog:index`. A search reads this rather than every bank file. This module loads only
 * when the search first looks past the workspace, and the index loads with it. JSON cannot type a
 * pair; the generating test writes every entry as one.
 */
export const dx7CatalogIndex = catalogIndex as unknown as Dx7CatalogIndex

const defaultEffectsKey = makeDefaultFm1Effects().join(',')

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

/**
 * Patches in saved banks whose name contains the search, in the order the banks are listed. A
 * Virtual Analog or 8-Bit preset is found by the name in its voice bytes, as a DX7 voice is.
 */
export function findSavedBankMatches(banks: NamedBank[], search: string): SavedPatchMatch[] {
  if (!search.trim()) return []
  return banks.flatMap((bank) =>
    bank.slots.flatMap((slot): SavedPatchMatch[] => {
      const found = { bankId: bank.id, bankName: bank.name, effects: slot.effects, slot: slot.slot }
      if ('virtualAnalog' in slot) {
        const name = fm1VaVirtualAnalogName(slot.virtualAnalog)
        return patchNameMatchesSearch(name, search)
          ? [
              {
                ...found,
                name,
                record: slot.record,
                soundKey: virtualAnalogSoundKey(slot.virtualAnalog, slot.effects, slot.record),
                virtualAnalog: slot.virtualAnalog,
              },
            ]
          : []
      }
      if ('eightBit' in slot) {
        const name = fm1VaEightBitName(slot.eightBit)
        return patchNameMatchesSearch(name, search)
          ? [
              {
                ...found,
                eightBit: slot.eightBit,
                name,
                record: slot.record,
                soundKey: eightBitSoundKey(slot.eightBit, slot.effects, slot.record),
              },
            ]
          : []
      }
      return patchNameMatchesSearch(slot.voice.name, search)
        ? [
            {
              ...found,
              name: slot.voice.name,
              record: slot.record,
              soundKey: soundKey(slot.voice, slot.effects, slot.record),
              voice: slot.voice,
            },
          ]
        : []
    }),
  )
}

/**
 * Drops each match that sounds exactly like one listed before it, so an archive that repeats a
 * patch, or a catalog patch already in the user's banks, is listed once. `shown` holds the sound
 * keys of the workspace matches above the groups, which are slots and are never hidden. Patches
 * with the same name but different data, or the same voice with different FM1 effects or FM-1+VA
 * records, all stay.
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
