import { describe, expect, it } from 'vitest'

import { updateDx7VoiceName } from '@/lib/dx7'
import {
  favouritePatchId,
  favouriteSoundKeys,
  makeFavouritePatches,
  makeFavouritesTransfer,
  moveFavourite,
  readFavourites,
  toggleFavourite,
} from '@/lib/favourites'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { makeInitDx7Voice } from '@/lib/init-voice'
import { emptyPatchLibrary, makeDemoVoices } from '@/lib/patch-library'
import { soundKey } from '@/lib/sound-key'

const voices = makeDemoVoices()

/** A workspace whose Favourites holds the first `count` demo voices, with ids f1, f2, … */
function withFavourites(count: number) {
  return Array.from({ length: count }, (_, index) => index).reduce(
    (snapshot, index) =>
      toggleFavourite(snapshot, { voice: voices[index] }, { bankNumber: 1 }, `f${index + 1}`)
        .snapshot,
    emptyPatchLibrary(),
  )
}

describe('toggleFavourite', () => {
  it('adds a sound to the end of Favourites as its own copy', () => {
    const effects = makeDefaultFm1Effects()
    effects[0] = 1

    const { added, snapshot } = toggleFavourite(
      withFavourites(1),
      { effects, voice: voices[5] },
      { bankName: 'Pianos' },
      'new',
    )

    expect(added).toBe(true)
    expect(snapshot.favourites.map(({ id }) => id)).toEqual(['f1', 'new'])
    expect(snapshot.favourites[1]).toEqual({
      effects,
      id: 'new',
      origin: { bankName: 'Pianos' },
      voice: voices[5],
    })
    expect(snapshot.favourites[1].voice).not.toBe(voices[5])
    expect(snapshot.favourites[1].effects).not.toBe(effects)
  })

  it('takes out a sound already in Favourites, matched by what it sounds like', () => {
    const copy = { ...voices[0], data: voices[0].data.slice() }

    const { added, snapshot } = toggleFavourite(
      withFavourites(2),
      { voice: copy },
      {
        bankNumber: 3,
      },
      'again',
    )

    expect(added).toBe(false)
    expect(snapshot.favourites.map(({ id }) => id)).toEqual(['f2'])
  })

  it('adds the same voice again when its FM1 effects differ', () => {
    const effects = makeDefaultFm1Effects()
    effects[2] = 1

    const { added, snapshot } = toggleFavourite(
      withFavourites(1),
      { effects, voice: voices[0] },
      { bankNumber: 1 },
      'effects',
    )

    expect(added).toBe(true)
    expect(snapshot.favourites).toHaveLength(2)
  })

  it('adds a voice renamed from a favourite, since its name is part of its data', () => {
    const renamed = updateDx7VoiceName(voices[0], 'RENAMED')

    expect(
      toggleFavourite(withFavourites(1), { voice: renamed }, { bankNumber: 1 }, 'r').added,
    ).toBe(true)
  })
})

describe('favourite patches', () => {
  it('numbers favourites in their order under the Favourites bank', () => {
    expect(makeFavouritePatches(withFavourites(2).favourites)).toEqual([
      { bank: 'favourites', family: 'DX7', id: 'favourite-f1', name: voices[0].name, number: 1 },
      { bank: 'favourites', family: 'DX7', id: 'favourite-f2', name: voices[1].name, number: 2 },
    ])
  })

  it('keys each favourite by its sound, as the search does', () => {
    expect(favouriteSoundKeys(withFavourites(1).favourites)).toEqual(
      new Set([soundKey(voices[0], makeDefaultFm1Effects())]),
    )
  })

  it('names each favourite with its own patch id', () => {
    expect(favouritePatchId('f1')).toBe('favourite-f1')
  })
})

describe('moveFavourite', () => {
  it('moves a favourite and shifts those between', () => {
    const moved = moveFavourite(withFavourites(4), 4, 2)

    expect(moved.favourites.map(({ id }) => id)).toEqual(['f1', 'f4', 'f2', 'f3'])
  })

  it('leaves Favourites unchanged for a position it does not have', () => {
    const snapshot = withFavourites(2)

    expect(moveFavourite(snapshot, 1, 3)).toBe(snapshot)
    expect(moveFavourite(snapshot, 0, 1)).toBe(snapshot)
  })
})

describe('makeFavouritesTransfer', () => {
  const initVoice = makeInitDx7Voice()

  it('fills the slots after a short Favourites with INIT VOICE', () => {
    const transfer = makeFavouritesTransfer(withFavourites(3).favourites, initVoice)

    expect(transfer.initCount).toBe(29)
    expect(transfer.leftOutCount).toBe(0)
    expect(transfer.voices).toHaveLength(32)
    expect(transfer.voices.slice(0, 3)).toEqual(voices.slice(0, 3))
    expect(transfer.voices.slice(3).every((voice) => voice === initVoice)).toBe(true)
  })

  it('sends exactly 32 favourites as they are', () => {
    const transfer = makeFavouritesTransfer(withFavourites(32).favourites, initVoice)

    expect(transfer).toMatchObject({ initCount: 0, leftOutCount: 0 })
    expect(transfer.voices).toEqual(voices)
  })

  it('sends only the first 32 of a longer Favourites', () => {
    const favourites = withFavourites(32).favourites
    const longer = [
      ...favourites,
      { ...favourites[0], id: 'extra-1' },
      { ...favourites[1], id: 'extra-2' },
    ]

    const transfer = makeFavouritesTransfer(longer, initVoice)

    expect(transfer).toMatchObject({ initCount: 0, leftOutCount: 2 })
    expect(transfer.voices).toEqual(voices)
  })
})

describe('readFavourites', () => {
  it('reads no favourites from a record that predates them', () => {
    expect(readFavourites(undefined)).toEqual([])
  })

  it('normalises missing effects and an unreadable origin rather than dropping the sound', () => {
    expect(readFavourites([{ id: 'f1', origin: { bankNumber: 0 }, voice: voices[0] }])).toEqual([
      { effects: makeDefaultFm1Effects(), id: 'f1', origin: { bankName: '' }, voice: voices[0] },
    ])
  })

  it('keeps the first favourite of a repeated id', () => {
    const favourites = readFavourites([
      { id: 'f1', origin: { bankNumber: 1 }, voice: voices[0] },
      { id: 'f1', origin: { bankNumber: 2 }, voice: voices[1] },
    ])

    expect(favourites?.map(({ voice }) => voice)).toEqual([voices[0]])
  })

  it('refuses favourites with an unreadable voice, so none is lost on the next save', () => {
    expect(readFavourites([{ id: 'f1', voice: { data: 'bad' } }])).toBeNull()
    expect(readFavourites({})).toBeNull()
  })
})
