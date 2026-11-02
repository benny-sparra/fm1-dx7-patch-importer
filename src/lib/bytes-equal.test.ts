import { expect, it } from 'vitest'
import { bytesEqual } from './bytes-equal'

it('compares byte contents and lengths, including offset views', () => {
  expect(bytesEqual(new Uint8Array(), new Uint8Array())).toBe(true)
  expect(bytesEqual(Uint8Array.of(1), Uint8Array.of(1, 0))).toBe(false)
  expect(bytesEqual(Uint8Array.of(1, 2), Uint8Array.of(1, 3))).toBe(false)
  expect(bytesEqual(Uint8Array.of(0, 1, 2).subarray(1), Uint8Array.of(1, 2))).toBe(true)
})
