// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import {
  LfoWaveControl,
  ParameterControl,
  RadioParameterControl,
  RotaryParameterControl,
  SliderParameterControl,
  SwitchParameterControl,
  TypedValueControl,
} from '@/components/editor/parameter-controls'

afterEach(cleanup)

describe('editor parameter controls', () => {
  it('emits the selected stored value from numeric and enumerated inputs', async () => {
    const user = userEvent.setup()
    const onNumberChange = vi.fn()
    const onOptionChange = vi.fn()
    const { rerender } = render(
      <ParameterControl label="Level" max={99} onChange={onNumberChange} value={20} />,
    )
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Level' }), {
      target: { value: '73' },
    })
    expect(onNumberChange).toHaveBeenLastCalledWith(73)

    rerender(
      <ParameterControl
        label="Curve"
        max={3}
        onChange={onOptionChange}
        options={['A', 'B', 'C', 'D']}
        value={0}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'Curve' }), '2')
    expect(onOptionChange).toHaveBeenLastCalledWith(2)
  })

  it('names an on/off parameter’s switch by the parameter alone, whether it is on or off', () => {
    const { rerender } = render(
      <SwitchParameterControl label="Sync" onChange={vi.fn()} value={0} />,
    )
    expect(screen.getByRole<HTMLInputElement>('switch', { name: 'Sync' }).checked).toBe(false)

    rerender(<SwitchParameterControl label="Sync" onChange={vi.fn()} value={1} />)

    expect(screen.getByRole<HTMLInputElement>('switch', { name: 'Sync' }).checked).toBe(true)
  })

  it('emits binary and radio stored values', async () => {
    const user = userEvent.setup()
    const onSwitchChange = vi.fn()
    const onRadioChange = vi.fn()
    const { rerender } = render(
      <SwitchParameterControl label="Sync" onChange={onSwitchChange} value={0} />,
    )
    await user.click(screen.getByRole('switch', { name: 'Sync' }))
    expect(onSwitchChange).toHaveBeenCalledWith(1)

    rerender(
      <RadioParameterControl
        label="Mode"
        name="mode"
        onChange={onRadioChange}
        options={['Ratio', 'Fixed']}
        value={0}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Fixed' }))
    expect(onRadioChange).toHaveBeenCalledWith(1)
  })

  it('emits the selected LFO waveform value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LfoWaveControl onChange={onChange} value={0} />)
    await user.click(screen.getByRole('radio', { name: /Sine/i }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('groups slider pointer and keyboard gestures at the same boundaries', () => {
    const onChange = vi.fn()
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
    render(
      <SliderParameterControl
        label="Feedback"
        max={7}
        onChange={onChange}
        onGestureEnd={onGestureEnd}
        onGestureStart={onGestureStart}
        value={3}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Feedback' })
    fireEvent.pointerDown(slider)
    fireEvent.change(slider, { target: { value: '6' } })
    fireEvent.pointerUp(slider)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyUp(slider, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(6)
    expect(onGestureStart).toHaveBeenCalledTimes(2)
    expect(onGestureEnd).toHaveBeenCalledTimes(2)
  })

  it('supports keyboard adjustment and grouping for rotary controls', () => {
    const onChange = vi.fn()
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
    render(
      <RotaryParameterControl
        label="Detune"
        max={7}
        min={-7}
        onChange={onChange}
        onGestureEnd={onGestureEnd}
        onGestureStart={onGestureStart}
        value={0}
      />,
    )
    const rotary = screen.getByRole('slider', { name: 'Detune' })
    fireEvent.keyDown(rotary, { key: 'ArrowLeft' })
    fireEvent.keyUp(rotary, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(-1)
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
  })
})

describe('typed value control', () => {
  function renderTyped(onCommit: (text: string) => boolean = () => true, value = '1.00') {
    return render(
      <TypedValueControl
        invalidMessage="Type the ratio as a number, such as 3.5."
        label="Ratio"
        onCommit={onCommit}
        value={value}
      />,
    )
  }
  const field = () => screen.getByRole('textbox', { name: 'Ratio' }) as HTMLInputElement

  it('applies the typed text on Enter', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn(() => true)
    renderTyped(onCommit)

    await user.clear(field())
    await user.type(field(), '3.5{Enter}')

    expect(onCommit).toHaveBeenCalledExactlyOnceWith('3.5')
  })

  it('applies the typed text when focus leaves', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn(() => true)
    renderTyped(onCommit)

    await user.clear(field())
    await user.type(field(), '2')
    await user.tab()

    expect(onCommit).toHaveBeenCalledExactlyOnceWith('2')
  })

  it('shows the value the text produced once applied', async () => {
    const user = userEvent.setup()
    const { rerender } = renderTyped()

    await user.clear(field())
    await user.type(field(), '3.5{Enter}')
    rerender(
      <TypedValueControl invalidMessage="" label="Ratio" onCommit={() => true} value="3.51" />,
    )

    expect(field().value).toBe('3.51')
  })

  it('applies nothing when the text is unchanged', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn(() => true)
    renderTyped(onCommit)

    await user.click(field())
    await user.keyboard('{Enter}')
    await user.tab()

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('explains text it cannot use and keeps it for correcting', async () => {
    const user = userEvent.setup()
    renderTyped(() => false)

    await user.clear(field())
    await user.type(field(), 'loud{Enter}')

    expect(screen.getByRole('alert').textContent).toBe('Type the ratio as a number, such as 3.5.')
    expect(field().value).toBe('loud')
    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(field().getAttribute('aria-describedby')).toBe(
      screen.getByRole('alert').parentElement?.id,
    )
  })

  it('clears the explanation as the text is corrected', async () => {
    const user = userEvent.setup()
    renderTyped(() => false)

    await user.clear(field())
    await user.type(field(), 'loud{Enter}')
    await user.type(field(), '{Backspace}')

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('puts the current value back on Escape', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn(() => true)
    renderTyped(onCommit)

    await user.clear(field())
    await user.type(field(), '9{Escape}')

    expect(field().value).toBe('1.00')
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('puts the current value back when focus leaves text it cannot use', async () => {
    const user = userEvent.setup()
    renderTyped(() => false)

    await user.clear(field())
    await user.type(field(), 'loud')
    await user.tab()

    expect(field().value).toBe('1.00')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
