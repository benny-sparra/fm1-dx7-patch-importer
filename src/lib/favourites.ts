import type { Patch } from '@/data/patches'
import { dx7BankVoiceCount, normalizeStoredDx7Voice, type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { readFm1VaRecord } from '@/lib/fm1-va-record'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'
import { soundKey } from '@/lib/sound-key'

/**
 * The bank id favourites show under, as a `Patch` bank and in the librarian's view. A workspace
 * bank id is one capital letter, so the two never meet.
 */
export const favouritesBank = 'favourites'

/**
 * Where a favourite was added from: the bank's own title, or the position of a workspace bank that
 * still has its default title, which the interface names in its own language.
 */
export type FavouriteOrigin = { bankName: string } | { bankNumber: number }

/**
 * A sound kept in Favourites. It is a copy, so it outlives the bank it came from; saving a sound in
 * the editor updates the other copies that sounded the same (`saveSound`).
 */
export type Favourite = {
  effects: Uint8Array
  id: string
  origin: FavouriteOrigin
  /** The FM-1+VA settings record of the sound it copies, when that sound had one. */
  record?: Uint8Array
  voice: Dx7Voice
}

/** A sound a heart is pressed on: a slot's, a favourite's, or a search result's. */
type FavouriteSound = { effects?: Uint8Array; record?: Uint8Array; voice: Dx7Voice }

const favouritePatchIdPrefix = 'favourite-'

export function favouritePatchId(id: string) {
  return `${favouritePatchIdPrefix}${id}`
}

/** The favourites as patches, numbered in their order, which is the order they are sent in. */
export function makeFavouritePatches(favourites: readonly Favourite[]): Patch[] {
  return favourites.map((favourite, index) => ({
    bank: favouritesBank,
    family: 'DX7',
    id: favouritePatchId(favourite.id),
    name: favourite.voice.name,
    number: index + 1,
  }))
}

export function findFavourite(favourites: readonly Favourite[], patchId: string) {
  return favourites.find((favourite) => favouritePatchId(favourite.id) === patchId)
}

export function favouriteSoundKey(favourite: FavouriteSound) {
  return soundKey(favourite.voice, favourite.effects, favourite.record)
}

/** The sound key of every favourite, so a slot can show whether it holds one. */
export function favouriteSoundKeys(favourites: readonly Favourite[]) {
  return new Set(favourites.map(favouriteSoundKey))
}

/**
 * Adds a sound to the end of Favourites, as its own copy. A sound already there is not added
 * again, as a search lists a sound once.
 */
function addFavourite(
  snapshot: PatchLibrarySnapshot,
  sound: FavouriteSound,
  origin: FavouriteOrigin,
  id: string,
): PatchLibrarySnapshot {
  const key = favouriteSoundKey(sound)
  if (snapshot.favourites.some((favourite) => favouriteSoundKey(favourite) === key)) return snapshot
  return {
    ...snapshot,
    favourites: [
      ...snapshot.favourites,
      {
        effects: normalizeFm1Effects(sound.effects),
        id,
        origin,
        ...(sound.record ? { record: sound.record.slice() } : {}),
        voice: { ...sound.voice, data: sound.voice.data.slice() },
      },
    ],
  }
}

/**
 * What a heart does: it adds the sound to Favourites, or, when the sound is there already, takes
 * out every favourite that sounds like it, so the hearts of all the slots holding it go out.
 */
export function toggleFavourite(
  snapshot: PatchLibrarySnapshot,
  sound: FavouriteSound,
  origin: FavouriteOrigin,
  id: string,
) {
  const key = favouriteSoundKey(sound)
  const favourites = snapshot.favourites.filter((favourite) => favouriteSoundKey(favourite) !== key)
  if (favourites.length < snapshot.favourites.length) {
    return { added: false, snapshot: { ...snapshot, favourites } }
  }
  return { added: true, snapshot: addFavourite(snapshot, sound, origin, id) }
}

/** Moves the favourite at position `from` to position `to`, both counted from 1. */
export function moveFavourite(
  snapshot: PatchLibrarySnapshot,
  from: number,
  to: number,
): PatchLibrarySnapshot {
  const count = snapshot.favourites.length
  if (from === to || from < 1 || to < 1 || from > count || to > count) return snapshot
  const favourites = [...snapshot.favourites]
  const [moved] = favourites.splice(from - 1, 1)
  favourites.splice(to - 1, 0, moved)
  return { ...snapshot, favourites }
}

/**
 * The 32 voices sent to the FM1 for Favourites. A bank holds 32, so later favourites stay behind,
 * and the slots past a shorter list hold `initVoice`.
 */
export function makeFavouritesTransfer(favourites: readonly Favourite[], initVoice: Dx7Voice) {
  const sent = favourites.slice(0, dx7BankVoiceCount).map(({ voice }) => voice)
  const initCount = dx7BankVoiceCount - sent.length
  return {
    initCount,
    leftOutCount: favourites.length - sent.length,
    voices: [...sent, ...Array.from({ length: initCount }, () => initVoice)],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readOrigin(value: unknown): FavouriteOrigin {
  if (isRecord(value)) {
    if (typeof value.bankName === 'string' && value.bankName.trim()) {
      return { bankName: value.bankName.trim() }
    }
    if (Number.isInteger(value.bankNumber) && (value.bankNumber as number) >= 1) {
      return { bankNumber: value.bankNumber as number }
    }
  }
  // An origin that cannot be read still leaves the sound usable, under an unnamed bank.
  return { bankName: '' }
}

/**
 * Reads favourites from storage or a backup, or returns null when one cannot be read, so the caller
 * refuses the record as it does an unreadable slot rather than dropping a sound. `readVoice` decides
 * how strictly voice bytes are checked. Missing or out-of-range effects are normalised, a settings
 * record of the wrong shape is dropped, as one from before records were kept has none, and a
 * repeated id keeps its first favourite.
 */
export function readFavourites(
  value: unknown,
  readVoice: (value: unknown) => Dx7Voice | null = normalizeStoredDx7Voice,
): Favourite[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const favourites: Favourite[] = []
  for (const entry of value) {
    const voice = isRecord(entry) ? readVoice(entry.voice) : null
    if (!isRecord(entry) || !voice || typeof entry.id !== 'string' || !entry.id) return null
    if (favourites.some(({ id }) => id === entry.id)) continue
    const record = readFm1VaRecord(entry.record)
    favourites.push({
      effects: normalizeFm1Effects(entry.effects),
      id: entry.id,
      origin: readOrigin(entry.origin),
      ...(record ? { record } : {}),
      voice,
    })
  }
  return favourites
}
