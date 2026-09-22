const helpSeenStorageKey = 'fm1-librarian-help-seen'

/** Whether the guide has been closed before, so it no longer opens itself on arrival. */
export function hasSeenHelp() {
  try {
    return localStorage.getItem(helpSeenStorageKey) === 'true'
  } catch {
    // An unreadable store leaves the guide opening itself, as a first visit does.
    return false
  }
}

export function rememberHelpWasSeen() {
  try {
    localStorage.setItem(helpSeenStorageKey, 'true')
  } catch {
    // The help button remains available when storage is unavailable.
  }
}
