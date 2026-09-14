// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { ToastProvider, useToast } from '@/components/ui/toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Notify() {
  const toast = useToast()
  return (
    <button onClick={() => toast.success('Saved Piano.')} type="button">
      Notify
    </button>
  )
}

function showToast() {
  render(
    <ToastProvider>
      <Notify />
    </ToastProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }))
  return screen.getByRole('status')
}

describe('ToastProvider', () => {
  it('closes a notification after a few seconds', () => {
    showToast()

    act(() => {
      vi.advanceTimersByTime(4_500)
    })

    expect(screen.queryByText('Saved Piano.')).toBeNull()
  })

  it('keeps a notification open while the pointer is over it, then gives it its full time', () => {
    const toast = showToast()

    fireEvent.pointerEnter(toast)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText('Saved Piano.')).toBeTruthy()

    fireEvent.pointerLeave(toast)
    act(() => {
      vi.advanceTimersByTime(4_000)
    })
    expect(screen.getByText('Saved Piano.')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText('Saved Piano.')).toBeNull()
  })

  it('keeps a notification open while keyboard focus is inside it', () => {
    showToast()

    act(() => {
      screen.getByRole('button', { name: 'Dismiss notification' }).focus()
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByText('Saved Piano.')).toBeTruthy()
  })
})

function NotifyWithUndo({ onUndo }: { onUndo: () => void }) {
  const toast = useToast()
  return (
    <button
      onClick={() =>
        toast.success('Deleted Bank 2.', { action: { label: 'Undo', onAction: onUndo } })
      }
      type="button"
    >
      Delete
    </button>
  )
}

describe('ToastProvider actions', () => {
  it('runs a notification’s action once and closes the notification', () => {
    const onUndo = vi.fn()
    render(
      <ToastProvider>
        <NotifyWithUndo onUndo={onUndo} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(onUndo).toHaveBeenCalledOnce()
    expect(screen.queryByText('Deleted Bank 2.')).toBeNull()
  })
})

describe('ToastProvider action timing', () => {
  it('keeps a notification with an action open long enough to reach it', () => {
    render(
      <ToastProvider>
        <NotifyWithUndo onUndo={vi.fn()} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    act(() => {
      vi.advanceTimersByTime(9_000)
    })
    expect(screen.getByText('Deleted Bank 2.')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.queryByText('Deleted Bank 2.')).toBeNull()
  })
})
