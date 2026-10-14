/**
 * A share link carries its patch in the URL fragment, `#p=<payload>`, which browsers never send to
 * a server. The page reads only this much of it itself; the payload's format is in
 * `src/lib/patch-share-link.ts`, which loads with the dialog that opens it.
 */
export const patchShareFragmentPrefix = '#p='

/** The payload of the share link `hash` holds, or null when it holds none. */
export function sharedPatchPayload(hash: string) {
  return hash.startsWith(patchShareFragmentPrefix)
    ? hash.slice(patchShareFragmentPrefix.length)
    : null
}

/**
 * Takes a share link's fragment out of the address bar, keeping the history entry and its state, so
 * reloading the page does not open the patch again.
 */
export function clearShareFragment() {
  try {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  } catch {
    // A page whose history cannot change keeps the fragment; the dialog still opens only once.
  }
}
