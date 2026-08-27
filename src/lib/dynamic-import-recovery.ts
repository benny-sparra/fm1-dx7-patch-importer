const recoveryStorageKey = 'fm1-dynamic-import-recovery'
const recoveryIntentStorageKey = 'fm1-dynamic-import-intent'

let recoveryIntent = ''

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>

type DynamicImportRecoveryOptions = {
  eventTarget?: Window
  reload?: () => void
  storage?: RecoveryStorage
}

export function beginDynamicImportRecovery(intent: string) {
  recoveryIntent = intent
}

export function cancelDynamicImportRecovery() {
  recoveryIntent = ''
  try {
    window.sessionStorage.removeItem(recoveryIntentStorageKey)
  } catch {
    // Recovery remains best-effort when storage access is blocked.
  }
}

export function getDynamicImportRecoveryIntent() {
  try {
    return window.sessionStorage.getItem(recoveryIntentStorageKey) ?? ''
  } catch {
    return ''
  }
}

export function installDynamicImportRecovery(options: DynamicImportRecoveryOptions = {}) {
  const eventTarget = options.eventTarget ?? window
  const reload = options.reload ?? (() => window.location.reload())
  let storage = options.storage
  let reloadRequested = false

  if (!storage) {
    try {
      storage = window.sessionStorage
    } catch {
      // The route error boundary remains available when storage access is blocked.
    }
  }

  const handlePreloadError = (event: Event) => {
    if (reloadRequested || !recoveryIntent || !storage) return

    const message = (event as VitePreloadErrorEvent).payload?.message.trim()
    if (!message) return

    try {
      const previousFailure = storage.getItem(recoveryStorageKey)
      storage.setItem(recoveryIntentStorageKey, recoveryIntent)
      if (previousFailure === message) return
      storage.setItem(recoveryStorageKey, message)
    } catch {
      return
    }

    reloadRequested = true
    try {
      reload()
      event.preventDefault()
    } catch {
      reloadRequested = false
    }
  }

  eventTarget.addEventListener('vite:preloadError', handlePreloadError)
  return () => eventTarget.removeEventListener('vite:preloadError', handlePreloadError)
}
