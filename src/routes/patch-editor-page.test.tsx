// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { type MidiController } from '@/hooks/use-midi'
import { PatchEditorPage } from '@/routes/patch-editor-page'

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  delete window.umami
})

function setup() {
  const midi = {
    sendEffectParameter: vi.fn(() => true),
    sendEffectSettings: vi.fn(async () => true),
    sendParameter: vi.fn(() => true),
    sendVoice: vi.fn(async () => true),
  } as unknown as MidiController
  const onSave = vi.fn()
  render(
    <PatchEditorPage
      effects={new Uint8Array(24)}
      midi={midi}
      onBack={vi.fn()}
      onSave={onSave}
      patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
      voice={{ data: new Uint8Array(128), name: 'INIT' }}
    />,
  )
  return { midi, onSave }
}

describe('PatchEditorPage MIDI paths', () => {
  it('synchronizes once, then sends a global edit through the voice parameter path', async () => {
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const feedback = screen.getByRole('slider', { name: 'Feedback' })
    fireEvent.change(feedback, { target: { value: '6' } })
    expect(midi.sendParameter).toHaveBeenLastCalledWith(135, 6)
    expect(midi.sendEffectParameter).not.toHaveBeenCalled()
  })

  it('sends effect edits through the dedicated controller path', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('tab', { name: 'Effects' }))
    await user.click(screen.getByRole('button', { name: 'Enable Filter' }))
    expect(midi.sendEffectParameter).toHaveBeenCalledWith(0, 1)
    expect(midi.sendParameter).not.toHaveBeenCalled()
  })

  it('keeps mute audition-only and excludes it from saved voice data', async () => {
    const user = userEvent.setup()
    const { midi, onSave } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /Mute operator 1/ }))
    expect(midi.sendParameter).toHaveBeenCalledWith(121, 0)
    expect(onSave).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: /Unmute operator 1/ }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})

describe('PatchEditorPage analytics', () => {
  it('tracks the first real edit once per editor session', async () => {
    const track = vi.fn()
    window.umami = { track }
    setup()
    await waitFor(() => expect(screen.getByRole('slider', { name: 'Feedback' })).toBeTruthy())

    const feedback = screen.getByRole('slider', { name: 'Feedback' })
    fireEvent.change(feedback, { target: { value: '6' } })
    fireEvent.change(feedback, { target: { value: '5' } })

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('patch_edit_started', undefined)
  })

  it('tracks saving an edited patch', async () => {
    const user = userEvent.setup()
    const track = vi.fn()
    window.umami = { track }
    setup()
    await waitFor(() => expect(screen.getByRole('slider', { name: 'Feedback' })).toBeTruthy())
    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), {
      target: { value: '6' },
    })

    await user.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(track).toHaveBeenNthCalledWith(2, 'patch_saved', undefined)
  })
})
