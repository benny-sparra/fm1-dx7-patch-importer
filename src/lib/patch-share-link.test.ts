import { describe, expect, it } from 'vitest'

import { dx7PackedVoiceSize, updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'

import { isPatchShareFragment, makePatchShareFragment, makePatchShareUrl } from './patch-share-link'
import { PatchShareLinkError, readPatchShareFragment } from './patch-share-link-reader'

// A fragment exactly as version 1 wrote it. The voice's first 118 bytes count up from 0 to 99 and
// round again, its name is "SHARED 1", and its effects start 1 1 64 5 1 1 30 20. The data holds a
// `-`, so it also checks the base64url alphabet.
const versionOneFragment =
  '#patch=1.SHARED-1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiYwABAgMEBQYHCAkKCwwNDg8QEVNIQVJFRCAxICABAUAFAQEeFAAAAAAAAAAAAAAAAAAAAAA'
// The same voice as version 1 wrote it with every FM1 effect off, which leaves the effects out.
const versionOneFragmentWithoutEffects =
  '#patch=1.SHARED-1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiYwABAgMEBQYHCAkKCwwNDg8QEVNIQVJFRCAxICA'
const versionOnePrefix = '#patch=1.SHARED-1.'

function fixtureVoiceBytes() {
  const data = new Uint8Array(dx7PackedVoiceSize)
  for (let index = 0; index < 118; index += 1) data[index] = index % 100
  data.set(new TextEncoder().encode('SHARED 1  '), 118)
  return data
}

function fixtureEffects() {
  const effects = makeDefaultFm1Effects()
  effects.set([1, 1, 64, 5, 1, 1, 30, 20])
  return effects
}

/** The problem a share link that cannot be read reports, or null for one that reads. */
function problemOf(hash: string) {
  try {
    readPatchShareFragment(hash)
  } catch (error) {
    return error instanceof PatchShareLinkError ? error.problem : error
  }
  return null
}

/** The version 1 fragment with one payload byte changed. */
function fragmentWithByte(index: number, value: number) {
  const payload = Uint8Array.from(
    atob(
      versionOneFragment.slice(versionOnePrefix.length).replaceAll('-', '+').replaceAll('_', '/'),
    ),
    (character) => character.charCodeAt(0),
  )
  payload[index] = value
  return makeFragmentFromPayload(payload)
}

function makeFragmentFromPayload(payload: Uint8Array) {
  const data = btoa(String.fromCharCode(...payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
  return `${versionOnePrefix}${data}`
}

describe('patch share links', () => {
  it('reads a version 1 link as that version wrote it', () => {
    const shared = readPatchShareFragment(versionOneFragment)

    expect(shared?.voice.name).toBe('SHARED 1')
    expect(shared?.voice.data).toEqual(fixtureVoiceBytes())
    expect(shared?.effects).toEqual(fixtureEffects())
  })

  it('reads a version 1 link without effects as every effect off', () => {
    const shared = readPatchShareFragment(versionOneFragmentWithoutEffects)

    expect(shared?.voice.data).toEqual(fixtureVoiceBytes())
    expect(shared?.effects).toEqual(makeDefaultFm1Effects())
  })

  it('leaves effects that are all off out of the link', () => {
    const voice = { data: fixtureVoiceBytes(), name: 'SHARED 1' }

    expect(`#${makePatchShareFragment(voice, makeDefaultFm1Effects())}`).toBe(
      versionOneFragmentWithoutEffects,
    )
  })

  it('names the patch in the link in letters, digits, and dashes', () => {
    const voice = updateDx7VoiceName({ data: fixtureVoiceBytes(), name: '' }, ' E.PIANO/1 ')

    expect(makePatchShareFragment(voice, undefined)).toMatch(/^patch=1\.E-PIANO-1\./u)
  })

  it('reads a link whose name was left empty or changed, since the data holds the name', () => {
    const data = versionOneFragment.slice(versionOnePrefix.length)

    expect(readPatchShareFragment(`#patch=1..${data}`)?.voice.name).toBe('SHARED 1')
    expect(readPatchShareFragment(`#patch=1.anything-else.${data}`)?.voice.name).toBe('SHARED 1')
  })

  it('writes the current version in the version 1 shape', () => {
    const voice = { data: fixtureVoiceBytes(), name: 'SHARED 1' }

    expect(`#${makePatchShareFragment(voice, fixtureEffects())}`).toBe(versionOneFragment)
  })

  it('gives back the patch it was made from', () => {
    const voice = updateDx7VoiceName({ data: fixtureVoiceBytes(), name: '' }, 'E.PIANO 1')
    const effects = fixtureEffects()
    effects[23] = 100

    const shared = readPatchShareFragment(makePatchShareFragment(voice, effects))

    expect(shared?.voice).toEqual(voice)
    expect(shared?.effects).toEqual(effects)
  })

  it('shares the default effects for a patch that has none stored', () => {
    const voice = { data: fixtureVoiceBytes(), name: 'SHARED 1' }

    const shared = readPatchShareFragment(makePatchShareFragment(voice, undefined))

    expect(shared?.effects).toEqual(makeDefaultFm1Effects())
  })

  it('links to the page it was made on, keeping only the origin and path', () => {
    const voice = { data: fixtureVoiceBytes(), name: 'SHARED 1' }

    const url = makePatchShareUrl(voice, fixtureEffects(), {
      origin: 'https://fm1-editor.com',
      pathname: '/',
    })

    expect(url).toBe(`https://fm1-editor.com/${versionOneFragment}`)
  })

  it('ignores a fragment that is not a share link', () => {
    expect(isPatchShareFragment('#section')).toBe(false)
    expect(readPatchShareFragment('')).toBeNull()
    expect(readPatchShareFragment('#section')).toBeNull()
  })

  it('reads a fragment given without its #', () => {
    expect(readPatchShareFragment(versionOneFragment.slice(1))?.voice.name).toBe('SHARED 1')
  })

  it('rejects a link from a newer release as a version it cannot read', () => {
    expect(problemOf(versionOneFragment.replace('patch=1.', 'patch=2.'))).toBe('version')
  })

  it('rejects a link with no version as damaged', () => {
    expect(problemOf('#patch=AAEC')).toBe('damaged')
    expect(problemOf(versionOneFragment.replace('patch=1.', 'patch='))).toBe('damaged')
    expect(problemOf(versionOneFragment.replace('patch=1.', 'patch=0.'))).toBe('damaged')
  })

  it('rejects a truncated link as damaged', () => {
    expect(problemOf(versionOneFragment.slice(0, -10))).toBe('damaged')
    expect(problemOf(versionOnePrefix)).toBe('damaged')
  })

  it('rejects a link with more parts than version 1 has as damaged', () => {
    expect(problemOf(`${versionOneFragment}.AAEC`)).toBe('damaged')
  })

  it('rejects a link whose data is not base64url as damaged', () => {
    expect(problemOf(versionOneFragment.replace('AAEC', 'AA+C'))).toBe('damaged')
    expect(problemOf(`${versionOnePrefix}A`)).toBe('damaged')
  })

  it('rejects a voice byte above seven bits rather than masking it', () => {
    expect(problemOf(fragmentWithByte(3, 0x80))).toBe('damaged')
  })

  it('rejects an FM1 effect beyond its range', () => {
    // The filter type is the second effect and runs from 0 to 2.
    expect(problemOf(fragmentWithByte(dx7PackedVoiceSize + 1, 3))).toBe('damaged')
  })

  it('accepts an effect at the top of its range', () => {
    expect(readPatchShareFragment(fragmentWithByte(dx7PackedVoiceSize + 1, 2))).not.toBeNull()
  })
})
