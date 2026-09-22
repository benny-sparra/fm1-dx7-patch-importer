import { useEffect, useRef } from 'react'

/**
 * Reads the patch named by the history entry the open editor adds, or an empty string for any
 * other entry. The entry lives only in the tab's session history, and nothing else reads it.
 */
function entryPatchId(state: unknown) {
  const patchId = (state as { fm1Editor?: unknown } | null)?.fm1Editor
  return typeof patchId === 'string' ? patchId : ''
}

/**
 * Gives the open editor its own browser history entry, so the browser's Back button, or a phone's
 * back gesture, returns to the patch banks instead of leaving the app, and Forward opens the same
 * patch again.
 *
 * Back puts the entry straight back and calls `onBrowserLeave`, which leaves the editor the same
 * way its own back button does, asking first about unsaved changes. Closing the editor, whichever
 * way it closes, then takes the entry away again, so history never gathers stale editor steps.
 *
 * @param openPatchId The patch the editor is open on, empty while the patch banks are showing.
 * @param onBrowserLeave Leaves the open editor, as its own back button does.
 * @param onBrowserForward Opens the editor again on the patch the entry ahead names.
 */
export function useEditorHistoryEntry(
  openPatchId: string,
  onBrowserLeave: () => void,
  onBrowserForward: (patchId: string) => void,
) {
  const latest = useRef({ onBrowserForward, onBrowserLeave, openPatchId })
  const isLeavingEntry = useRef(false)
  const isFirstRun = useRef(true)

  useEffect(() => {
    latest.current = { onBrowserForward, onBrowserLeave, openPatchId }
  })

  useEffect(() => {
    const onEntry = entryPatchId(window.history.state)
    if (openPatchId) {
      if (!onEntry) window.history.pushState({ fm1Editor: openPatchId }, '')
    } else if (onEntry) {
      // A reload in the editor keeps the entry but opens the patch banks. Going back from a
      // reloaded page would load the page again, so that entry is only cleared.
      if (isFirstRun.current) window.history.replaceState(null, '')
      else {
        isLeavingEntry.current = true
        window.history.back()
      }
    }
    isFirstRun.current = false
  }, [openPatchId])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const leftByApp = isLeavingEntry.current
      isLeavingEntry.current = false
      const onEntry = entryPatchId(event.state)
      const openPatch = latest.current.openPatchId
      if (!openPatch) {
        // Forward, back to the editor's own step. The patch may be gone by now, in which case the
        // app leaves the patch banks showing.
        if (onEntry) latest.current.onBrowserForward(onEntry)
        return
      }
      if (onEntry) return
      // The editor is still open, either because it has to ask about unsaved changes or because
      // it was opened again before the app's own step back arrived. It keeps its entry either way.
      window.history.pushState({ fm1Editor: openPatch }, '')
      if (!leftByApp) latest.current.onBrowserLeave()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
}
