// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { OperatorLayoutProps } from '@/components/editor/editor-workspace'
import { OperatorTable } from '@/components/editor/operator-table'
import { i18nReady, setLocale } from '@/i18n'
import {
  FM1_VOICE_PARAMETER_COUNT,
  getGlobalParameterDefinition,
  resolveOperatorParameterIndex,
} from '@/lib/fm1-parameters'
import { translatePageText } from '@/test/page-translator'

function makeParameters() {
  const parameters = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
  // Algorithm 32: six carriers, so every operator reads as one.
  parameters[getGlobalParameterDefinition('global.algorithm').voiceIndex] = 31
  for (let operator = 1; operator <= 6; operator += 1) {
    parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')] = operator
    parameters[resolveOperatorParameterIndex(operator, 'operator.outputLevel')] = 90 + operator
  }
  return parameters
}

function TableHarness(overrides: Partial<OperatorLayoutProps>) {
  const [selectedOperator, setSelectedOperator] = useState(1)
  return (
    <OperatorTable
      algorithm={31}
      mutedOperators={new Set()}
      onCopyOperator={vi.fn()}
      onGestureEnd={vi.fn()}
      onGestureStart={vi.fn()}
      onOutputChange={vi.fn()}
      onPasteOperator={vi.fn()}
      onSelect={setSelectedOperator}
      onToggleMute={vi.fn()}
      onToggleSolo={vi.fn()}
      parameters={makeParameters()}
      pasteSource={null}
      renderOperatorDetail={(operator) => <p>Operator {operator} controls</p>}
      selectedOperator={selectedOperator}
      soloOperator={null}
      syncState="live"
      {...overrides}
    />
  )
}

const operatorButton = (operator: number) =>
  screen.getByRole('button', { name: new RegExp(`^Operator ${operator}, `) })
const operatorRow = (operator: number) => operatorButton(operator).parentElement!

beforeAll(() => i18nReady)

afterEach(async () => {
  cleanup()
  await setLocale('en-GB')
})

describe('operator table', () => {
  it('lists the six operators as rows, each named as in the rack', () => {
    render(<TableHarness />)

    for (let operator = 1; operator <= 6; operator += 1) {
      expect(operatorButton(operator).getAttribute('aria-label')).toBe(
        `Operator ${operator}, Carrier`,
      )
    }
  })

  it('heads the readout columns once for every row', () => {
    render(<TableHarness />)

    expect(screen.getAllByText('RATIO')).toHaveLength(1)
    expect(within(operatorRow(4)).getByText('4.00×')).toBeTruthy()
  })

  it('opens the operator whose row is clicked and closes the one that was open', async () => {
    const user = userEvent.setup()
    render(<TableHarness />)

    await user.click(operatorButton(3))

    expect(operatorButton(3).getAttribute('aria-expanded')).toBe('true')
    expect(operatorButton(1).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: /^Operator 3, / }).textContent).toBe(
      'Operator 3 controls',
    )
  })

  it('keeps the open operator’s readouts in its row', async () => {
    const user = userEvent.setup()
    render(<TableHarness />)

    await user.click(operatorButton(5))

    expect(within(operatorButton(5)).getByText('5.00×')).toBeTruthy()
  })

  it('grows the open operator’s controls out of its row and folds the others away', async () => {
    const user = userEvent.setup()
    render(<TableHarness />)
    const fold = (operator: number) =>
      operatorRow(operator).querySelector('.rack-collapsible')?.getAttribute('data-collapsed')

    await user.click(operatorButton(2))

    expect(fold(2)).toBe('false')
    expect(fold(1)).toBe('true')
  })

  it('holds the closing row open until its fold has finished', async () => {
    const user = userEvent.setup()
    render(<TableHarness />)
    const closingFold = operatorRow(1).querySelector('.rack-collapsible')!
    const placeholders = () => closingFold.firstElementChild!.children.length

    await user.click(operatorButton(2))
    expect(placeholders()).toBe(1)

    // A transition inside the fold, such as a button's colour, is not the fold finishing.
    fireEvent.transitionEnd(closingFold.firstElementChild!, { propertyName: 'height' })
    expect(placeholders()).toBe(1)

    fireEvent.transitionEnd(closingFold, { propertyName: 'height' })
    expect(placeholders()).toBe(0)
  })

  it('trims and silences an operator without opening it', async () => {
    const user = userEvent.setup()
    const onOutputChange = vi.fn()
    const onToggleMute = vi.fn()
    render(<TableHarness onOutputChange={onOutputChange} onToggleMute={onToggleMute} />)

    fireEvent.change(screen.getByRole('slider', { name: 'Operator 4 output level' }), {
      target: { value: '40' },
    })
    await user.click(screen.getByRole('button', { name: 'Mute operator 4 for audition' }))

    expect(onOutputChange).toHaveBeenCalledWith(4, 40)
    expect(onToggleMute).toHaveBeenCalledWith(4)
    expect(operatorButton(4).getAttribute('aria-expanded')).toBe('false')
  })

  it('offers copy and paste only on the open operator', () => {
    render(<TableHarness />)

    expect(screen.getAllByRole('button', { name: /actions$/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Operator 1 actions' })).toBeTruthy()
  })

  it('keeps working when a page translator rewrites its text', async () => {
    const user = userEvent.setup()
    render(<TableHarness />)

    translatePageText(document.body)
    await user.click(operatorButton(6))

    expect(operatorButton(6).getAttribute('aria-expanded')).toBe('true')
  })

  it('names the operators in the interface language', async () => {
    await setLocale('de')
    render(<TableHarness />)

    expect(screen.getByRole('group', { name: 'Operatoren' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Operator 2, Carrier' })).toBeTruthy()
  })
})
