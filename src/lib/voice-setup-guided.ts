/**
 * Whether the V16 Voice strip's first-time "Set up your FM1's Voices" line is done with. The
 * `fm1-voice-setup-guided` key is stored data under the legacy rules in AGENTS.md. Version 1 is
 * the string `1`, written when the line is closed or the Set up Voices wizard finishes. A later
 * version writes another value, which every release reads the same way: any value in the key
 * means the line was dismissed, so it never comes back.
 */
const storageKey = 'fm1-voice-setup-guided'
const writtenValue = '1'

const listeners = new Set<() => void>()
// Kept in memory as well, so closing the line works this session when storage is blocked.
let dismissedInMemory = false

/** Whether the line has been closed or the wizard finished, in this session or an earlier one. */
export function getVoiceSetupGuided() {
  if (dismissedInMemory) return true
  try {
    return localStorage.getItem(storageKey) !== null
  } catch {
    return false
  }
}

export function markVoiceSetupGuided() {
  if (getVoiceSetupGuided()) return
  dismissedInMemory = true
  try {
    localStorage.setItem(storageKey, writtenValue)
  } catch {
    // The line stays closed for this session; only keeping it closed for the next visit is lost.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeVoiceSetupGuided(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Forgets what is held in memory, so each test starts from storage. */
export function resetVoiceSetupGuidedForTests() {
  dismissedInMemory = false
}
