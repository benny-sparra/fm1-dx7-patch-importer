// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { updateDx7VoiceName } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import { makeDemoVoices } from '@/lib/patch-library'
import { makePatchShareFragment } from '@/lib/patch-share-link'

import { useSharedPatchLink } from './use-shared-patch-link'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

function linkTo(name: string) {
  const voice = updateDx7VoiceName(makeDemoVoices()[0], name)
  return `#${makePatchShareFragment(voice, makeDefaultFm1Effects())}`
}

function renderLinkReader(options: { reactStrictMode?: boolean } = {}) {
  const onError = vi.fn()
  const onOpen = vi.fn()
  const hook = renderHook(() => useSharedPatchLink({ onError, onOpen }), options)
  return { ...hook, onError, onOpen }
}

describe('useSharedPatchLink', () => {
  it('opens the patch a link in the address carries, once', async () => {
    window.history.replaceState(null, '', `/${linkTo('FIRST')}`)

    const { onOpen } = renderLinkReader()

    await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
    expect(onOpen.mock.calls[0][0].voice.name).toBe('FIRST')
  })

  // StrictMode mounts, unmounts, and mounts again, as the development build does on a page load.
  it('opens a link in the address of a page that mounts twice', async () => {
    window.history.replaceState(null, '', `/${linkTo('FIRST')}`)

    const { onOpen } = renderLinkReader({ reactStrictMode: true })

    await waitFor(() => expect(onOpen).toHaveBeenCalledOnce())
    expect(onOpen.mock.calls[0][0].voice.name).toBe('FIRST')
    expect(window.location.hash).toBe('')
  })

  it('leaves the link in the address for a page that closes before reading it', async () => {
    const link = linkTo('FIRST')
    window.history.replaceState(null, '', `/${link}`)
    const { unmount } = renderLinkReader()

    unmount()
    await import('@/lib/patch-share-link-reader')
    await Promise.resolve()

    expect(window.location.hash).toBe(link)
  })

  it('opens nothing when the page closes before the link is read', async () => {
    window.history.replaceState(null, '', `/${linkTo('FIRST')}`)
    const { onError, onOpen, unmount } = renderLinkReader()

    unmount()
    await import('@/lib/patch-share-link-reader')
    await Promise.resolve()

    expect(onOpen).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('opens only the later of two links opened in quick succession', async () => {
    window.history.replaceState(null, '', `/${linkTo('FIRST')}`)
    const { onOpen } = renderLinkReader()

    act(() => {
      window.history.replaceState(null, '', `/${linkTo('SECOND')}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    await waitFor(() => expect(onOpen).toHaveBeenCalled())
    await import('@/lib/patch-share-link-reader')
    await Promise.resolve()
    expect(onOpen).toHaveBeenCalledOnce()
    expect(onOpen.mock.calls[0][0].voice.name).toBe('SECOND')
  })

  it('reports a damaged link as a problem code, not a message', async () => {
    window.history.replaceState(null, '', `/${linkTo('FIRST').slice(0, -8)}`)

    const { onError, onOpen } = renderLinkReader()

    await waitFor(() => expect(onError).toHaveBeenCalledExactlyOnceWith('damaged'))
    expect(onOpen).not.toHaveBeenCalled()
  })
})
