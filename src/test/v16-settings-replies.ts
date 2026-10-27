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
