import { IDBFactory } from 'fake-indexeddb'
import { vi } from 'vitest'

/**
 * Installs an empty in-memory IndexedDB for one test, so storage code runs its real transactions.
 * Undo it with `vi.unstubAllGlobals()`.
 *
 * The fake copies every value with `structuredClone`, and under jsdom that copy is made in Node's
 * realm, not in the one jsdom gives the tests. A byte array read back would then fail the
 * `instanceof Uint8Array` checks that storage applies to voices and effects, and every saved bank
 * would look damaged. Stored records hold only plain objects, arrays, and byte arrays, so the
 * clone rebuilds those in the test realm after the real `structuredClone` has copied them.
 */
export function installFakeIndexedDb() {
  const nodeStructuredClone = globalThis.structuredClone
  vi.stubGlobal('structuredClone', (value: unknown, options?: StructuredSerializeOptions) =>
    inTestRealm(nodeStructuredClone(value, options)),
  )
  vi.stubGlobal('indexedDB', new IDBFactory())
}

function inTestRealm(value: unknown): unknown {
  if (Object.prototype.toString.call(value) === '[object Uint8Array]') {
    return Uint8Array.from(value as ArrayLike<number>)
  }
  if (Array.isArray(value)) return value.map(inTestRealm)
  if (Object.prototype.toString.call(value) === '[object Object]') {
    return Object.fromEntries(
      Object.entries(value as object).map(([key, entry]) => [key, inTestRealm(entry)]),
    )
  }
  return value
}
