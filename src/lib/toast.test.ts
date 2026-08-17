import { describe, expect, it } from 'vitest'

import { appendToast, removeToast, type ToastMessage } from './toast'

const toast = (id: number, message = `Toast ${id}`): ToastMessage => ({
  id,
  kind: 'success',
  message,
})

describe('toast queue', () => {
  it('keeps repeated completion messages as separate events', () => {
    const first = appendToast([], toast(1, 'Saved'))
    expect(appendToast(first, toast(2, 'Saved'))).toEqual([
      toast(1, 'Saved'),
      toast(2, 'Saved'),
    ])
  })

  it('keeps the newest notifications within the visible limit', () => {
    const result = [1, 2, 3].reduce(
      (current, id) => appendToast(current, toast(id), 2),
      [] as ToastMessage[],
    )
    expect(result).toEqual([toast(2), toast(3)])
  })

  it('ignores empty messages and removes a notification by id', () => {
    const current = [toast(1), toast(2)]
    expect(appendToast(current, toast(3, '   '))).toBe(current)
    expect(removeToast(current, 1)).toEqual([toast(2)])
  })
})
