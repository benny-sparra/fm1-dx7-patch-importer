/**
 * When this browser last downloaded a backup. The `fm1-last-backup` key is stored data under the
 * legacy rules in AGENTS.md: it holds an ISO date, and anything else reads as no backup.
 */
const storageKey = 'fm1-last-backup'

const listeners = new Set<() => void>()
// Kept in memory as well, so a backup made while storage is blocked still shows this session.
let recordedTime: string | null = null

function readStoredTime() {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored && !Number.isNaN(Date.parse(stored)) ? stored : null
  } catch {
    return null
  }
}

export function getLastBackupTime() {
  return recordedTime ?? readStoredTime()
}

export function recordBackupTime(time: string) {
  recordedTime = time
  try {
    localStorage.setItem(storageKey, time)
  } catch {
    // The backup itself was made; only the reminder is lost when storage is unavailable.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeLastBackupTime(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Forgets the time held in memory, so each test starts from storage. */
export function resetLastBackupTimeForTests() {
  recordedTime = null
}
