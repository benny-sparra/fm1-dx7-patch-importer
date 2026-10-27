/**
 * Whether the V16 Set up Voices wizard has opened by itself in this browser. The
 * `fm1-voice-setup-guided` key is stored data under the legacy rules in AGENTS.md. Version 1 is
 * the string `1`, written as the wizard first opens on its own when the Voice strip first shows.
 * A later version writes another value, which every release reads the same way: any value in the
 * key means it already opened, so it never opens by itself again. **Set up Voices…** in the
 * Voices menu opens it whenever it is wanted.
 */
const storageKey = 'fm1-voice-setup-guided'
const writtenValue = '1'

// Kept in memory as well, so it opens once a session even when storage is blocked.
let openedInMemory = false

/** Whether the wizard has opened by itself, in this session or an earlier one. */
export function getVoiceSetupGuided() {
  if (openedInMemory) return true
  try {
    return localStorage.getItem(storageKey) !== null
  } catch {
    return false
  }
}

export function markVoiceSetupGuided() {
  openedInMemory = true
  try {
    localStorage.setItem(storageKey, writtenValue)
  } catch {
    // It stays done for this session; only keeping it done for the next visit is lost.
  }
}

/** Forgets what is held in memory, so each test starts from storage. */
export function resetVoiceSetupGuidedForTests() {
  openedInMemory = false
}
