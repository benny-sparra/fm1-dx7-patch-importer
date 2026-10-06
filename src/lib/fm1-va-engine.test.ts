import { describe, expect, it } from 'vitest'

import { fm1VaRecordEngine } from './fm1-va-engine'

function recordMarked(marker: number) {
  const record = new Uint8Array(59)
  record[18] = marker
  return record
}

describe('fm1VaRecordEngine', () => {
  it('reads 5A in byte 18 as Virtual Analog', () => {
    expect(fm1VaRecordEngine(recordMarked(0x5a))).toBe('virtual-analog')
  })

  it('reads C3 in byte 18 as 8-Bit', () => {
    expect(fm1VaRecordEngine(recordMarked(0xc3))).toBe('eight-bit')
  })

  it('reads the low seven bits of 8-Bit’s marker alone as FM', () => {
    expect(fm1VaRecordEngine(recordMarked(0x43))).toBe('fm')
  })

  it('reads the FM markers the FM1 and FM-1+VA’s tools store as FM', () => {
    expect([0x03, 0xa5].map((marker) => fm1VaRecordEngine(recordMarked(marker)))).toEqual([
      'fm',
      'fm',
    ])
  })
})
