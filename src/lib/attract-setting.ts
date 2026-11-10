/*
  Whether attract mode, the screen saver, may start: on unless the viewer switched it off in the
  Settings menu. The menu and the idle watch both read it here, so the key has one home.
*/

const storageKey = 'fm1-attract-mode'

export function readAttractModeEnabled() {
  try {
    return localStorage.getItem(storageKey) !== 'off'
  } catch {
    // Blocked storage leaves it on, the default.
    return true
  }
}

export function rememberAttractModeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(storageKey, enabled ? 'on' : 'off')
  } catch {
    // The choice then lasts only until the page closes.
  }
}
