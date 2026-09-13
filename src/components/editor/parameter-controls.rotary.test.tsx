// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import '@/i18n'
import { RotaryParameterControl } from '@/components/editor/parameter-controls'

afterEach(cleanup)

const ignore = () => {}

function pointerTransform(value: number) {
  const { container } = render(
    <RotaryParameterControl
      label="Transpose"
      max={24}
      min={-24}
      onChange={ignore}
      onGestureEnd={ignore}
      onGestureStart={ignore}
      value={value}
    />,
  )
  return container.querySelector('line[y1="16"]')?.getAttribute('transform')
}

describe('RotaryParameterControl pointer', () => {
  it('points at the middle of its travel for a centred value', () => {
    expect(pointerTransform(0)).toBe('rotate(0 38 38)')
  })

  it('stops at the end of its travel for a value outside its range', () => {
    expect(pointerTransform(30)).toBe('rotate(135 38 38)')
  })
})
