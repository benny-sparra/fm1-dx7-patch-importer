/** Synthetic 176-byte block with a known chain; no FM1 capture or application encoder. */
export function makeSettingsBlock(order = [2, 0, 1, 3, 5, 4]) {
  const bytes = Array.from({ length: 176 }, () => 0)
  bytes[0] = 0x0e
  ;[...order, 6, 7, 8].forEach((effect, entry) => {
    bytes[0x92 + entry * 3] = effect
    bytes[0x92 + entry * 3 + 1] = 1
  })
  return bytes
}

// A reply to a read of V16's settings block, built with a packer of its own, so the codec's
// parser is not checked against the codec's packer.
export function makeSettingsBlockReply(block: readonly number[]) {
  const bytes = [
    0x00,
    0x59,
    0x23,
    block.length & 0xff,
    block.length >> 8,
    0,
    ...block,
    ~block.reduce((sum, byte) => sum + byte, 0) & 0xff,
  ]
  const septets: number[] = []
  let accumulator = 0
  let count = 0
  for (const byte of bytes) {
    accumulator |= byte << count
    count += 8
    while (count >= 7) {
      septets.push(accumulator & 0x7f)
      accumulator >>= 7
      count -= 7
    }
  }
  if (count > 0) septets.push(accumulator & 0x7f)
  return Uint8Array.of(0xf0, ...septets, 0xf7)
}
