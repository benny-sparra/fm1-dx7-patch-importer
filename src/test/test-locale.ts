/**
 * Pins the browser's language for tests to British English, the complete English resources, so a
 * test reads the same text on every machine. jsdom reports American English, and Node reports the
 * machine's own language. A test of language choice passes its own browser languages.
 */
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'languages', { configurable: true, value: ['en-GB'] })
}
