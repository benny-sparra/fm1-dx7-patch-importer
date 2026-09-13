// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { EnvelopeEditor } from '@/components/editor/envelope-editor'
import { LfoWaveControl, RotaryParameterControl } from '@/components/editor/parameter-controls'
import { i18nReady, setLocale } from '@/i18n'

const ignore = () => {}

function renderControls() {
  render(
    <>
      <RotaryParameterControl
        helpText="Shifts the voice by semitones."
        label="Transpose"
        max={24}
        min={-24}
        onChange={ignore}
        onGestureEnd={ignore}
        onGestureStart={ignore}
        value={0}
      />
      <LfoWaveControl onChange={ignore} value={1} />
      <EnvelopeEditor
        color="var(--crt-acc)"
        helpText="Shapes the sound over time."
        levels={[99, 80, 60, 0]}
        onChange={ignore}
        onGestureEnd={ignore}
        onGestureStart={ignore}
        rates={[50, 40, 30, 20]}
        title="Envelope"
      />
    </>,
  )
}

beforeAll(() => i18nReady)

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

describe('editor control labels', () => {
  it('names editor controls in English', () => {
    renderControls()

    expect(screen.getByRole('button', { name: 'Help: Transpose' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Transpose' }).getAttribute('title')).toBe(
      'Transpose: 0. Drag up or down to adjust.',
    )
    expect(screen.getAllByText('Saw down')).not.toHaveLength(0)
    expect(
      screen.getByRole('slider', { name: 'Envelope point 1' }).getAttribute('aria-valuetext'),
    ).toBe('Rate 50, level 99')
    expect(screen.getByRole('spinbutton', { name: 'Envelope rate 2' })).toBeTruthy()
  })

  it('names editor controls in the interface language', async () => {
    await setLocale('fr')
    renderControls()

    expect(screen.getByRole('button', { name: 'Aide : Transpose' })).toBeTruthy()
    expect(screen.getAllByText('Dent de scie descendante')).not.toHaveLength(0)
    expect(
      screen.getByRole('slider', { name: 'Envelope, point 1' }).getAttribute('aria-valuetext'),
    ).toBe('Vitesse 50, niveau 99')
    expect(screen.getByRole('spinbutton', { name: 'Envelope, niveau 2' })).toBeTruthy()
  })
})
