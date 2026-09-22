import { describe, expect, it, vi } from 'vitest'

import { undoToastOptions } from '@/components/patches/undo-toast'
import { emptyPatchLibrary } from '@/lib/patch-library'

const t = ((key: string) => (key === 'toasts.undo' ? 'Undo' : key)) as never

describe('undoToastOptions', () => {
  it('offers an Undo that reverses exactly the change it was made for', () => {
    const library = { undoChange: vi.fn(() => true) }
    const changed = emptyPatchLibrary()

    const options = undoToastOptions(t, library, changed)
    options?.action.onAction()

    expect(options?.action.label).toBe('Undo')
    expect(library.undoChange).toHaveBeenCalledExactlyOnceWith(changed)
  })

  it('runs what must come first before reversing the change', () => {
    const order: string[] = []
    const library = { undoChange: vi.fn(() => order.push('undo') > 0) }

    undoToastOptions(t, library, emptyPatchLibrary(), () =>
      order.push('close editor'),
    )?.action.onAction()

    expect(order).toEqual(['close editor', 'undo'])
  })

  it('offers nothing when the change did not happen', () => {
    expect(undoToastOptions(t, { undoChange: vi.fn() }, null)).toBeUndefined()
  })
})
