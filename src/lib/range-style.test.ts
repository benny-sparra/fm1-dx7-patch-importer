import { describe, expect, it } from 'vitest'

import { rangeStyle } from './range-style'

describe('rangeStyle', () => {
  it('fills an ordinary range from its minimum to its value', () => {
    expect(rangeStyle(25, 0, 100)).toMatchObject({
      '--range-start': '0%',
      '--range-end': '25%',
    })
  })

  it('fills a bipolar range left from its zero point for negative values', () => {
    expect(rangeStyle(-7, -7, 7, 'green', 0)).toMatchObject({
      '--range-start': '0%',
      '--range-end': '50%',
    })
  })

  it('has no bipolar fill at zero', () => {
    expect(rangeStyle(0, -7, 7, 'green', 0)).toMatchObject({
      '--range-start': '50%',
      '--range-end': '50%',
    })
  })

  it('fills a bipolar range right from its zero point for positive values', () => {
    expect(rangeStyle(7, -7, 7, 'green', 0)).toMatchObject({
      '--range-start': '50%',
      '--range-end': '100%',
    })
  })

  it('clamps bipolar fill endpoints to the slider range', () => {
    expect(rangeStyle(20, -7, 7, 'green', 0)).toMatchObject({
      '--range-start': '50%',
      '--range-end': '100%',
    })
  })
})
