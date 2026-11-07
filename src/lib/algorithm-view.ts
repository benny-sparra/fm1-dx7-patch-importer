const storageKey = 'fm1-algorithm-view'

export type AlgorithmView = '2d' | '3d'

/** The view the Algorithm panel was last left in; the flat diagram where storage says nothing. */
export function readAlgorithmView(): AlgorithmView {
  try {
    return localStorage.getItem(storageKey) === '3d' ? '3d' : '2d'
  } catch {
    // Blocked storage leaves the default.
    return '2d'
  }
}

export function rememberAlgorithmView(view: AlgorithmView) {
  try {
    localStorage.setItem(storageKey, view)
  } catch {
    // The choice then lasts only until the editor closes.
  }
}
