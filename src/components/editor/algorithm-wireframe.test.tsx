// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { setLocale } from '@/i18n'
import { makeFakeCanvas } from '@/test/fake-canvas'

const noop = () => {}

function renderPanel(algorithm = 14) {
  return render(
    <AlgorithmPanel
      algorithm={algorithm}
      feedback={0}
      onAlgorithmChange={noop}
      onFeedbackChange={noop}
      onFeedbackGestureEnd={noop}
      onFeedbackGestureStart={noop}
      operatorFrequencies={['1.00', '2.00', '3.00', '4.00', '5.00', '6.00']}
    />,
  )
}

beforeEach(() => {
  const { context } = makeFakeCanvas()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  )
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  await setLocale('en-GB')
})

describe('Algorithm panel wireframe toggle', () => {
  it('shows the flat diagram, with the toggle not pressed, until it is chosen', () => {
    const { container } = renderPanel()

    expect(
      screen.getByRole('button', { name: '3D wireframe view' }).getAttribute('aria-pressed'),
    ).toBe('false')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('swaps to a hidden canvas with a named, focusable frame, and remembers the choice', async () => {
    const user = userEvent.setup()
    const { container } = renderPanel()

    await user.click(screen.getByRole('button', { name: '3D wireframe view' }))

    const canvas = container.querySelector('canvas')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(
      screen.getByRole('button', {
        name: 'Algorithm 15 as a wireframe. Use the arrow keys to turn it.',
      }).tabIndex,
    ).toBe(0)
    expect(
      screen.getByRole('button', { name: '3D wireframe view' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(localStorage.getItem('fm1-algorithm-view')).toBe('3d')

    await user.click(screen.getByRole('button', { name: '3D wireframe view' }))
    expect(container.querySelector('canvas')).toBeNull()
    expect(localStorage.getItem('fm1-algorithm-view')).toBe('2d')
  })

  it('opens on the wireframe when it was left there', () => {
    localStorage.setItem('fm1-algorithm-view', '3d')
    const { container } = renderPanel()

    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('still toggles when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const user = userEvent.setup()
    const { container } = renderPanel()

    expect(container.querySelector('canvas')).toBeNull()
    await user.click(screen.getByRole('button', { name: '3D wireframe view' }))
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('turns the view with the arrow keys when its frame is focused, without leaving it', async () => {
    localStorage.setItem('fm1-algorithm-view', '3d')
    const user = userEvent.setup()
    renderPanel()
    const frame = screen.getByRole('button', { name: /Algorithm 15/ })

    frame.focus()
    await user.keyboard('{ArrowLeft}')

    expect(document.activeElement).toBe(frame)
  })

  it('names the toggle and the frame in the interface language', async () => {
    await setLocale('de')
    localStorage.setItem('fm1-algorithm-view', '3d')
    renderPanel()

    expect(screen.getByRole('button', { name: '3D-Drahtmodell' })).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Algorithmus 15 als Drahtmodell. Mit den Pfeiltasten drehen.',
      }),
    ).toBeTruthy()
  })
})
