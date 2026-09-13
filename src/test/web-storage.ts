/**
 * Web Storage repair for the test environment.
 *
 * Node 26 ships an experimental `localStorage` global that stays unavailable
 * unless the process is started with `--localstorage-file`. It collides with
 * the one jsdom installs: the property survives on `window`, but reading it
 * yields `undefined`, so any component touching storage throws before the
 * assertion under test ever runs.
 *
 * The collision is environmental, not a defect in the app — the same code
 * works in a browser and on earlier Node releases — so rather than rewriting
 * the tests around it, this installs a working Storage whenever the
 * environment failed to provide one. A real implementation is used, not a
 * stub, so tests that read back what they wrote still mean something.
 */

class MemoryStorage implements Storage {
  #entries = new Map<string, string>()

  get length() {
    return this.#entries.size
  }

  clear() {
    this.#entries.clear()
  }

  getItem(key: string) {
    return this.#entries.get(String(key)) ?? null
  }

  key(index: number) {
    return [...this.#entries.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.#entries.delete(String(key))
  }

  setItem(key: string, value: string) {
    this.#entries.set(String(key), String(value))
  }
}

function install(name: 'localStorage' | 'sessionStorage') {
  // A working implementation is left alone; only the broken binding is replaced.
  const existing = Reflect.get(globalThis, name) as Storage | undefined
  if (existing && typeof existing.setItem === 'function') return

  const storage = new MemoryStorage()
  const descriptor = { configurable: true, value: storage, writable: true }
  Object.defineProperty(globalThis, name, descriptor)
  if (typeof window !== 'undefined') Object.defineProperty(window, name, descriptor)
}

if (typeof window !== 'undefined') {
  install('localStorage')
  install('sessionStorage')
}
