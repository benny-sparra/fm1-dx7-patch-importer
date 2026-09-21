import { useEffect, useRef } from 'react'

import { isPatchShareFragment } from '@/lib/patch-share-link'
import type { SharedPatch } from '@/lib/patch-share-link-reader'

/** Why a share link did not open: it could not be read, it is from a newer release, or the reader did not load. */
type SharedPatchLinkProblem = 'damaged' | 'unavailable' | 'version'

type SharedPatchLinkHandlers = {
  onError: (problem: SharedPatchLinkProblem) => void
  onOpen: (shared: SharedPatch) => void
}

/**
 * Reads a share link in the page address as the page opens, and again when one is pasted into an
 * open tab, which changes only the fragment and does not reload. The fragment is removed once it
 * is read, so a reload does not offer the patch again, but not before: a mount torn down while the
 * reader loads, as StrictMode does, leaves the link for the next one. The reader loads only for a
 * share link, and reading never writes to the library. Only the latest link opens.
 */
export function useSharedPatchLink(handlers: SharedPatchLinkHandlers) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    let latest = 0
    let disposed = false

    const read = async () => {
      const { hash, pathname, search } = window.location
      if (!isPatchShareFragment(hash)) return
      const request = (latest += 1)

      let reader: typeof import('@/lib/patch-share-link-reader')
      try {
        reader = await import('@/lib/patch-share-link-reader')
      } catch {
        if (!disposed && request === latest) handlersRef.current.onError('unavailable')
        return
      }
      if (disposed || request !== latest) return
      try {
        window.history.replaceState(window.history.state, '', `${pathname}${search}`)
      } catch {
        // A browser that refuses to change the address still gets the patch.
      }

      let shared: SharedPatch | null
      try {
        shared = reader.readPatchShareFragment(hash)
      } catch (error) {
        handlersRef.current.onError(
          error instanceof reader.PatchShareLinkError ? error.problem : 'damaged',
        )
        return
      }
      if (shared) handlersRef.current.onOpen(shared)
    }
    const readLink = () => void read()

    readLink()
    window.addEventListener('hashchange', readLink)
    return () => {
      disposed = true
      window.removeEventListener('hashchange', readLink)
    }
  }, [])
}
