// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function setup(overrides: Partial<MidiController> = {}) {
  const midi = {
    hasMidiOutput: true,
    midiAccess: true,
    sendEffectParameter: vi.fn(() => true),
    sendEffectSettings: vi.fn(async () => true),
    sendParameter: vi.fn(() => true),
    sendVoice: vi.fn(async () => true),
    sysexAvailable: true,
    ...overrides,
  } as unknown as MidiController
  const onSave = vi.fn()
  const view = render(
    <PatchEditorPage
      effects={new Uint8Array(24)}
      midi={midi}
      onBack={vi.fn()}
      onSave={onSave}
      patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
      voice={{ data: new Uint8Array(128), name: 'INIT' }}
    />,
  )
  const rerenderMidi = (nextMidi: MidiController) =>
    view.rerender(
      <PatchEditorPage
        effects={new Uint8Array(24)}
        midi={nextMidi}
        onBack={vi.fn()}
        onSave={onSave}
        patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
        voice={{ data: new Uint8Array(128), name: 'INIT' }}
      />,
    )
  return { midi, onSave, rerenderMidi }
}

describe('PatchEditorPage MIDI paths', () => {
  it('keeps LFO/global and pitch-envelope controls permanently visible without collapse buttons', () => {
    setup()
    const configurationPanel = screen.getByRole('complementary', { name: 'Patch configuration' })
    const panel = within(configurationPanel)

    expect(panel.getByRole('slider', { name: 'LFO speed' })).toBeTruthy()
    expect(panel.getByRole('slider', { name: 'Pitch envelope point 1' })).toBeTruthy()
    expect(panel.queryByRole('button', { name: 'Collapse LFO & global' })).toBeNull()
    expect(panel.queryByRole('button', { name: 'Collapse Pitch envelope' })).toBeNull()
  })

  it('stays local and explains the unavailable SysEx connection without attempting initial sync', async () => {
    const { midi } = setup({ sysexAvailable: false })

    expect(await screen.findByText('SysEx access unavailable.')).toBeTruthy()
    expect(midi.sendVoice).not.toHaveBeenCalled()
  })

  it('keeps full-sync editor actions local until SysEx becomes available', async () => {
    const user = userEvent.setup()
    const { midi, rerenderMidi } = setup({ sysexAvailable: false })

    await user.click(screen.getByRole('button', { name: 'Randomise' }))
    await user.click(screen.getByLabelText('More save options'))

    expect(screen.getByRole('menuitem', { name: /Resend to FM1/ }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(midi.sendVoice).not.toHaveBeenCalled()

    rerenderMidi({ ...midi, sysexAvailable: true })

    expect(screen.queryByText('SysEx access unavailable.')).toBeNull()
    expect(screen.getByRole('menuitem', { name: /Resend to FM1/ }).hasAttribute('disabled')).toBe(
      false,
    )
  })

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
