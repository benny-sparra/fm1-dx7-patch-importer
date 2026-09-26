// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PhraseTransport } from '@/components/midi/phrase-transport'
import { setLocale } from '@/i18n'
import german from '@/i18n/locales/de'
import { auditionPhrases, defaultAuditionPhraseId } from '@/lib/audition-phrases'

afterEach(async () => {
  cleanup()
  await setLocale('en')
})

function renderTransport(overrides: Partial<Parameters<typeof PhraseTransport>[0]> = {}) {
  const props = {
    onPhraseChange: vi.fn(),
    onTempoChange: vi.fn(),
    onToggle: vi.fn(),
    phraseId: defaultAuditionPhraseId,
    playing: false,
    tempo: 104,
    ...overrides,
  }

  return { props, user: userEvent.setup(), ...render(<PhraseTransport {...props} />) }
}

describe('PhraseTransport', () => {
  it('offers every phrase by its translated name', () => {
    renderTransport()

    const options = screen.getAllByRole('option').map((option) => option.textContent)

    expect(options).toHaveLength(auditionPhrases.length)
    expect(options).toContain('Electric piano')
  })

  it('lists the phrases alphabetically', () => {
    renderTransport()

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Arpeggio',
      'Bass',
      'Electric piano',
      'Lead',
      'Pad',
      'Velocity ramp',
    ])
  })

  it('lists the phrases alphabetically in the interface language', async () => {
    await setLocale('de')
    renderTransport()

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      german.ui.phrases.velocityRamp,
      german.ui.phrases.arpeggio,
      german.ui.phrases.bass,
      german.ui.phrases.electricPiano,
      german.ui.phrases.pad,
      german.ui.phrases.lead,
    ])
  })

  it('reads as Play while stopped and Stop while playing', () => {
    const { rerender, props } = renderTransport()

    expect(screen.getByRole('button', { name: 'Play the phrase' }).textContent).toBe('Play')

    rerender(<PhraseTransport {...props} playing />)

    expect(screen.getByRole('button', { name: 'Stop the phrase' }).textContent).toBe('Stop')
  })

  it('asks to start or stop when its button is pressed', async () => {
    const { props, user } = renderTransport()

    await user.click(screen.getByRole('button', { name: 'Play the phrase' }))

    expect(props.onToggle).toHaveBeenCalledTimes(1)
  })

  it('reports the phrase that was chosen', async () => {
    const { props, user } = renderTransport()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Phrase' }), 'bass')

    expect(props.onPhraseChange).toHaveBeenCalledWith('bass')
  })

  it('reads the tempo with its unit', () => {
    renderTransport({ tempo: 120 })

    expect(screen.getByRole('slider', { name: 'Tempo' }).getAttribute('aria-valuetext')).toBe(
      '120 BPM',
    )
  })

  it('names its controls and formats the tempo in the interface language', async () => {
    await setLocale('de')
    renderTransport({ tempo: 120 })

    expect(screen.getByRole('button', { name: german.ui.playPhrase }).textContent).toBe(
      german.ui.play,
    )
    expect(screen.getByRole('combobox', { name: german.ui.phrase })).toBeTruthy()
    expect(
      screen.getByRole('slider', { name: german.ui.tempo }).getAttribute('aria-valuetext'),
    ).toBe('120 BPM')
    expect(screen.getByText(german.ui.phrases.electricPiano)).toBeTruthy()
  })
})
