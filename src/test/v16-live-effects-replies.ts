// SYNTHETIC replies to the read of V16's live FX settings, made up from the research's layout and
// packed with a packer of their own, never captured from an FM1.
// Effect e's three values at 3e; the table's byte 0 is the chain order, 1 and 2 On/Off and Type.
export const values = [
  50, 3, 0, 40, 60, 0, 30, 20, 10, 70, 80, 90, 11, 12, 13, 21, 22, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]
export const table = [
  0, 1, 2, 1, 0, 1, 2, 1, 0, 3, 0, 0, 4, 1, 0, 5, 0, 0, 6, 0, 0, 7, 0, 0, 8, 0, 0,
]

export function frame(payload: number[], command = 0x23) {
  const bytes = [
    0,
    0x59,
    command,
    payload.length & 0xff,
    payload.length >> 8,
    0,
    ...payload,
    ~payload.reduce((sum, byte) => sum + byte, 0) & 0xff,
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

export const liveEffectsReply = frame([...values, ...table])
