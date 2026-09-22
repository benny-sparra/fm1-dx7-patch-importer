/**
 * A 53-bit fingerprint of voice data, so that exact copies can be found without holding the data
 * itself, as the catalog index does. It is cyrb53 over the bytes, and fits a JavaScript number, so
 * JSON keeps it exactly. Two different voices share a fingerprint with a chance of about one in
 * 10^15 per pair, which is far below anything a library of a few thousand patches could reach.
 */
export function voiceFingerprint(data: Uint8Array) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (const byte of data) {
    h1 = Math.imul(h1 ^ byte, 2654435761)
    h2 = Math.imul(h2 ^ byte, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (h2 & 0x1fffff) + (h1 >>> 0)
}
