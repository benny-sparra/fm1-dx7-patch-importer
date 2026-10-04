// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { rememberDialogOpeners } from '@/lib/dialog-zoom'
import { zoomRectsArriveMs } from '@/lib/zoom-rects'

import { Dialog } from './dialog'

beforeAll(() => {
  rememberDialogOpeners()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.querySelectorAll('.zoom-rects').forEach((layer) => layer.remove())
})

/** Gives an element a box on screen, as jsdom lays nothing out. */
function place(element: Element, left: number, top: number, width: number, height: number) {
  element.getBoundingClientRect = () => new DOMRect(left, top, width, height)
}

/** The browser's toggle events, which jsdom's dialog does not send. */
function toggle(dialog: HTMLElement, type: 'beforetoggle' | 'toggle', newState: string) {
  dialog.dispatchEvent(Object.assign(new Event(type), { newState, oldState: '' }))
}

function renderDialog() {
  render(
    <>
      <button type="button">Find duplicate patches…</button>
      <Dialog aria-label="Duplicate patches" />
    </>,
  )
  const opener = screen.getByRole('button', { name: 'Find duplicate patches…' })
  const dialog = document.querySelector('dialog')!
  place(opener, 900, 20, 160, 32)
  place(dialog, 300, 100, 600, 400)
  return { dialog, opener }
}

describe('Dialog zoom', () => {
  it('zooms out of the control clicked to open it', async () => {
    const { dialog, opener } = renderDialog()

    await userEvent.click(opener)
    toggle(dialog, 'toggle', 'open')

    expect(document.querySelectorAll('.zoom-rects')).toHaveLength(1)
  })

  it('keeps the dialog hidden until the zoom arrives, then shows it', async () => {
    const { dialog, opener } = renderDialog()
    await userEvent.click(opener)
    vi.useFakeTimers()

    toggle(dialog, 'beforetoggle', 'open')
    toggle(dialog, 'toggle', 'open')
    expect(dialog.hasAttribute('data-zooming')).toBe(true)
    vi.advanceTimersByTime(zoomRectsArriveMs)

    expect(dialog.hasAttribute('data-zooming')).toBe(false)
  })

  it('does not zoom a dialog that opens without a click', () => {
    const { dialog } = renderDialog()

    toggle(dialog, 'toggle', 'open')

    expect(document.querySelectorAll('.zoom-rects')).toHaveLength(0)
  })

  it('zooms back into the control that opened it as it closes', async () => {
    const { dialog, opener } = renderDialog()
    await userEvent.click(opener)
    toggle(dialog, 'toggle', 'open')
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })

    toggle(dialog, 'beforetoggle', 'closed')
    opener.focus()
    dialog.dispatchEvent(new Event('close'))
    vi.advanceTimersToNextFrame()

    expect(document.querySelectorAll('.zoom-rects')).toHaveLength(2)
  })
})
