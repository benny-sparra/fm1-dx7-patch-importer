// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { GlobalConfigurationPanel } from '@/components/editor/global-configuration-panel'
import { i18nReady } from '@/i18n'
import {
  FM1_VOICE_PARAMETER_COUNT,
  getGlobalParameterDefinition,
  resolveOperatorParameterIndex,
  type OperatorParameterId,
} from '@/lib/fm1-parameters'

const ignore = () => {}

// Algorithm 32: six carriers side by side, every one of them drawn.
const allCarriers = 31

function voice(edits: [operator: number, id: OperatorParameterId, value: number][] = []) {
  const parameters = new Uint8Array(FM1_VOICE_PARAMETER_COUNT)
  parameters[getGlobalParameterDefinition('global.algorithm').voiceIndex] = allCarriers
  for (let operator = 1; operator <= 6; operator += 1) {
    parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')] = 1
  }
  for (const [operator, id, value] of edits) {
    parameters[resolveOperatorParameterIndex(operator, id)] = value
  }
  return parameters
}

function renderPanel(parameters: Uint8Array) {
  return render(
    <GlobalConfigurationPanel
      beginGesture={ignore}
      endGesture={ignore}
      parameters={parameters}
      setParameter={ignore}
    />,
  )
}

/** The frequency the featured diagram shows in each operator's box, by operator number. */
function diagramFrequencies() {
  const region = screen.getByRole('region', { name: 'Algorithm' })
  const boxes = region.querySelectorAll('.crt-well svg g:has(> rect)')
  return Object.fromEntries(
    [...boxes].map((box) => {
      const [number, frequency] = box.querySelectorAll('text')
      return [number.textContent, frequency?.textContent]
    }),
  )
}

beforeAll(() => i18nReady)

afterEach(cleanup)

describe('algorithm diagram', () => {
  it('shows each operator’s ratio under its number', () => {
    renderPanel(voice([[2, 'operator.frequency.coarse', 14]]))

    expect(diagramFrequencies()).toEqual({
      1: '1.00',
      2: '14.00',
      3: '1.00',
      4: '1.00',
      5: '1.00',
      6: '1.00',
    })
  })

  it('shows a fixed-frequency operator in hertz', () => {
    renderPanel(
      voice([
        [1, 'operator.oscillatorMode', 1],
        [1, 'operator.frequency.coarse', 2],
      ]),
    )

    expect(diagramFrequencies()[1]).toBe('100.0Hz')
  })

  it('redraws a ratio when the voice changes', () => {
    const { rerender } = renderPanel(voice())

    rerender(
      <GlobalConfigurationPanel
        beginGesture={ignore}
        endGesture={ignore}
        parameters={voice([[3, 'operator.frequency.fine', 50]])}
        setParameter={ignore}
      />,
    )

    expect(diagramFrequencies()[3]).toBe('1.50')
  })

  it('keeps the diagram out of the accessibility tree', () => {
    renderPanel(voice())

    const region = screen.getByRole('region', { name: 'Algorithm' })
    expect(region.querySelector('.crt-well svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('help', () => {
  // British English help arrives with the editor rather than with the page, and this file imports
  // the panel before i18next is ready.
  it('explains the pitch envelope in British English', async () => {
    const user = userEvent.setup()
    renderPanel(voice())

    await user.hover(screen.getAllByRole('button', { name: 'Help: Pitch envelope' })[0])

    expect(screen.getByRole('note').textContent).toContain(
      'Changes the pitch over the life of each note.',
    )
  })
})
