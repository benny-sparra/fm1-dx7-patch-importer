import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import catalogIndex from '@/data/dx7-catalog-index.json'
import type { Dx7Voice } from '@/lib/dx7'
import { loadDx7CatalogBank } from '@/lib/dx7-bank-catalog'
import type { NamedBank } from '@/lib/named-bank'
import { patchNameMatchesSearch } from '@/lib/patch-library'

/** The patch names of every catalog bank, by catalog id, in slot order. */
export type Dx7CatalogIndex = Record<string, string[]>

export type CatalogPatchMatch = {
  bankId: string
  bankName: string
  name: string
  slot: number
}

export type SavedPatchMatch = {
  bankId: string
  bankName: string
  effects: Uint8Array
  name: string
  slot: number
  voice: Dx7Voice
}

/**
 * The catalog's patch names, generated from the bank files by `npm run catalog:index`. A search
 * reads this rather than every bank file. This module loads only when the search first looks past
 * the workspace, and the names load with it.
 */
export const dx7CatalogIndex: Dx7CatalogIndex = catalogIndex

/** Catalog patches whose name contains the search, in the order the catalog lists its banks. */
export function findCatalogMatches(index: Dx7CatalogIndex, search: string): CatalogPatchMatch[] {
  if (!search.trim()) return []
  return dx7BankCatalog.flatMap((bank) =>
    (index[bank.id] ?? []).flatMap((name, slotIndex) =>
      patchNameMatchesSearch(name, search)
        ? [{ bankId: bank.id, bankName: bank.name, name, slot: slotIndex + 1 }]
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
              voice: slot.voice,
            },
          ]
        : [],
    ),
  )
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
