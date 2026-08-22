export type ParameterEdit = [index: number, value: number, min?: number, max?: number]

export type EditorHistory = {
  future: Uint8Array[]
  past: Uint8Array[]
  present: Uint8Array
}

const historyLimit = 100

export function makeEditorHistory(parameters: Uint8Array): EditorHistory {
  return {
    future: [],
    past: [],
    present: parameters.slice(),
  }
}

export function editParameters(history: EditorHistory, edits: ParameterEdit[]): EditorHistory {
  const next = history.present.slice()
  let changed = false

  for (const [index, value, min = 0, max = 127] of edits) {
    if (!Number.isInteger(index) || index < 0 || index >= next.length) {
      throw new RangeError(`Patch parameter index ${index} is out of range.`)
    }
    if (![value, min, max].every(Number.isFinite)) {
      throw new TypeError('Patch parameter values and bounds must be finite numbers.')
    }
    if (min > max) {
      throw new RangeError('Patch parameter minimum cannot exceed its maximum.')
    }
    const normalized = Math.max(min, Math.min(max, Math.round(value)))
    if (next[index] !== normalized) {
      next[index] = normalized
      changed = true
    }
  }

  if (!changed) return history

  return {
    future: [],
    past: [...history.past, history.present].slice(-historyLimit),
    present: next,
  }
}

export function undoParameters(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1)
  if (!previous) return history

  return {
    future: [history.present, ...history.future],
    past: history.past.slice(0, -1),
    present: previous,
  }
}

export function redoParameters(history: EditorHistory): EditorHistory {
  const next = history.future[0]
  if (!next) return history

  return {
    future: history.future.slice(1),
    past: [...history.past, history.present].slice(-historyLimit),
    present: next,
  }
}
