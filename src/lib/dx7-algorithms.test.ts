import { describe, expect, it } from 'vitest'

import { dx7Algorithms, getDx7OperatorRole } from './dx7-algorithms'

describe('DX7 algorithm diagrams', () => {
  it('provides all 32 selectable algorithms', () => {
    expect(dx7Algorithms).toHaveLength(32)
  })

  it('shows every operator exactly once in every algorithm', () => {
    expect(
      dx7Algorithms.map((algorithm) =>
        algorithm
          .map(({ id }) => id)
          .sort((a, b) => a - b)
          .join(''),
      ),
    ).toEqual([
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
      '123456',
    ])
  })

  it('renders algorithm 32 as six parallel carriers', () => {
    expect(dx7Algorithms[31]).toEqual([
      { feedback: 1, id: 6, link: 2, x: 5, y: 3 },
      { feedback: 0, id: 5, link: 1, x: 4, y: 3 },
      { feedback: 0, id: 4, link: 1, x: 3, y: 3 },
      { feedback: 0, id: 3, link: 1, x: 2, y: 3 },
      { feedback: 0, id: 2, link: 1, x: 1, y: 3 },
      { feedback: 0, id: 1, link: 1, x: 0, y: 3 },
    ])
  })

  it('classifies operators by whether they feed the audio output', () => {
    expect(dx7Algorithms[0].map((operator) => [operator.id, getDx7OperatorRole(operator)])).toEqual(
      [
        [6, 'modulator'],
        [5, 'modulator'],
        [4, 'modulator'],
        [3, 'carrier'],
        [2, 'modulator'],
        [1, 'carrier'],
      ],
    )
  })

  it('classifies every operator in algorithm 32 as a carrier', () => {
    expect(dx7Algorithms[31].map(getDx7OperatorRole)).toEqual(Array(6).fill('carrier'))
  })
})
