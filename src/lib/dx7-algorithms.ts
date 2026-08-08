export type Dx7AlgorithmOperator = {
  feedback: 0 | 1 | 2 | 3 | 4
  id: 1 | 2 | 3 | 4 | 5 | 6
  link: 0 | 1 | 2 | 3 | 4 | 6 | 7
  x: number
  y: number
}

export type Dx7OperatorRole = 'carrier' | 'modulator'

// Operators on the diagram's output row feed the audio bus directly. Operators
// above that row feed another operator and therefore act as modulators.
export const getDx7OperatorRole = (operator: Dx7AlgorithmOperator): Dx7OperatorRole => (
  operator.y === 3 ? 'carrier' : 'modulator'
)

const op = (
  id: Dx7AlgorithmOperator['id'],
  x: number,
  y: number,
  link: Dx7AlgorithmOperator['link'],
  feedback: Dx7AlgorithmOperator['feedback'] = 0,
): Dx7AlgorithmOperator => ({ feedback, id, link, x, y })

// Coordinates follow the compact layout printed for the original DX7 algorithms.
// Link and feedback variants preserve the few routings that cannot be represented
// by a simple vertical operator stack (notably algorithms 4 and 6).
export const dx7Algorithms: readonly (readonly Dx7AlgorithmOperator[])[] = [
  [op(6, 3, 0, 0, 1), op(5, 3, 1, 0), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 3, 0, 0), op(5, 3, 1, 0), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0, 1), op(1, 2, 3, 1)],
  [op(6, 3, 1, 0, 1), op(5, 3, 2, 0), op(4, 3, 3, 2), op(3, 2, 1, 0), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 3, 1, 0, 2), op(5, 3, 2, 0), op(4, 3, 3, 2), op(3, 2, 1, 0), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 2, 0, 1), op(5, 4, 3, 2), op(4, 3, 2, 0), op(3, 3, 3, 1), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 2, 0, 3), op(5, 4, 3, 2), op(4, 3, 2, 0), op(3, 3, 3, 1), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 1, 0, 1), op(5, 4, 2, 7), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 1, 0), op(5, 4, 2, 7), op(4, 3, 2, 0, 4), op(3, 3, 3, 2), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 1, 0), op(5, 4, 2, 7), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0, 1), op(1, 2, 3, 1)],
  [op(6, 2, 2, 0), op(5, 1, 2, 1), op(4, 2, 3, 1), op(3, 3, 1, 0, 1), op(2, 3, 2, 0), op(1, 3, 3, 2)],
  [op(6, 2, 2, 0, 1), op(5, 1, 2, 1), op(4, 2, 3, 1), op(3, 3, 1, 0), op(2, 3, 2, 0), op(1, 3, 3, 2)],
  [op(6, 3, 2, 7), op(5, 2, 2, 0), op(4, 1, 2, 1), op(3, 2, 3, 6), op(2, 4, 2, 0, 1), op(1, 4, 3, 2)],
  [op(6, 3, 2, 7, 1), op(5, 2, 2, 0), op(4, 1, 2, 1), op(3, 2, 3, 6), op(2, 4, 2, 0), op(1, 4, 3, 2)],
  [op(6, 4, 1, 7, 1), op(5, 3, 1, 0), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 1, 7), op(5, 3, 1, 0), op(4, 3, 2, 0), op(3, 3, 3, 2), op(2, 2, 2, 0, 4), op(1, 2, 3, 1)],
  [op(6, 4, 1, 0, 1), op(5, 4, 2, 7), op(4, 3, 1, 0), op(3, 3, 2, 0), op(2, 2, 2, 1), op(1, 3, 3, 0)],
  [op(6, 4, 1, 0), op(5, 4, 2, 7), op(4, 3, 1, 0), op(3, 3, 2, 0), op(2, 2, 2, 1, 4), op(1, 3, 3, 0)],
  [op(6, 4, 0, 0), op(5, 4, 1, 0), op(4, 4, 2, 7), op(3, 3, 2, 0, 4), op(2, 2, 2, 1), op(1, 3, 3, 0)],
  [op(6, 3, 2, 3, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 1, 0), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 2, 0), op(5, 3, 2, 1), op(4, 4, 3, 2), op(3, 1, 2, 3, 1), op(2, 2, 3, 6), op(1, 1, 3, 1)],
  [op(6, 3, 2, 3), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 1, 2, 3, 1), op(2, 2, 3, 1), op(1, 1, 3, 1)],
  [op(6, 3, 2, 4, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 3, 1), op(2, 1, 2, 0), op(1, 1, 3, 1)],
  [op(6, 3, 2, 3, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 2, 0), op(2, 2, 3, 1), op(1, 1, 3, 1)],
  [op(6, 3, 2, 4, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 3, 1), op(2, 1, 3, 1), op(1, 0, 3, 1)],
  [op(6, 3, 2, 3, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 3, 1), op(2, 1, 3, 1), op(1, 0, 3, 1)],
  [op(6, 4, 2, 0, 1), op(5, 3, 2, 1), op(4, 4, 3, 2), op(3, 2, 2, 0), op(2, 2, 3, 6), op(1, 1, 3, 1)],
  [op(6, 4, 2, 0), op(5, 3, 2, 1), op(4, 4, 3, 2), op(3, 2, 2, 0, 1), op(2, 2, 3, 6), op(1, 1, 3, 1)],
  [op(6, 4, 3, 2), op(5, 3, 1, 0, 1), op(4, 3, 2, 0), op(3, 3, 3, 1), op(2, 2, 2, 0), op(1, 2, 3, 1)],
  [op(6, 4, 2, 0, 1), op(5, 4, 3, 2), op(4, 3, 2, 0), op(3, 3, 3, 1), op(2, 2, 3, 1), op(1, 1, 3, 1)],
  [op(6, 4, 3, 2), op(5, 3, 1, 0, 1), op(4, 3, 2, 0), op(3, 3, 3, 1), op(2, 2, 3, 1), op(1, 1, 3, 1)],
  [op(6, 4, 2, 0, 1), op(5, 4, 3, 2), op(4, 3, 3, 1), op(3, 2, 3, 1), op(2, 1, 3, 1), op(1, 0, 3, 1)],
  [op(6, 5, 3, 2, 1), op(5, 4, 3, 1), op(4, 3, 3, 1), op(3, 2, 3, 1), op(2, 1, 3, 1), op(1, 0, 3, 1)],
]
