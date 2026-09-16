// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { type MidiController } from '@/hooks/use-midi'
import { PatchEditorPage } from '@/routes/patch-editor-page'

beforeAll(() => {
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
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
  const onBack = vi.fn()
  const onSave = vi.fn()
  const view = render(
    <PatchEditorPage
      effects={new Uint8Array(24)}
      midi={midi}
      onBack={onBack}
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
        onBack={onBack}
        onSave={onSave}
        patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
        voice={{ data: new Uint8Array(128), name: 'INIT' }}
      />,
    )
  return { midi, onBack, onSave, rerenderMidi }
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

  it('minimises and restores the effects unit from the panel title', async () => {
    setup()
    const user = userEvent.setup()

    expect(screen.getByRole('slider', { name: 'Reverb Decay' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Minimise Effects' }))
    expect(screen.queryByRole('slider', { name: 'Reverb Decay' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Expand Effects' }))
    expect(screen.getByRole('slider', { name: 'Reverb Decay' })).toBeTruthy()
  })

  it('folds each rack panel independently and keeps the toggles labelled for assistive tech', async () => {
    setup()
    const user = userEvent.setup()

    const minimiseOperators = screen.getByRole('button', { name: 'Minimise Operators' })
    expect(minimiseOperators.getAttribute('aria-expanded')).toBe('true')
    expect(minimiseOperators.getAttribute('aria-controls')).toBe('operator-rack')

    await user.click(minimiseOperators)

    // The fold animation keys off data-collapsed, so the attribute is part of
    // the contract rather than an implementation detail of the stylesheet.
    expect(document.getElementById('operator-rack')?.dataset.collapsed).toBe('true')
    expect(document.getElementById('effects-unit')?.dataset.collapsed).toBe('false')

    const expandOperators = screen.getByRole('button', { name: 'Expand Operators' })
    expect(expandOperators.getAttribute('aria-expanded')).toBe('false')

    // Minimising the operators leaves the effects unit open, and vice versa.
    expect(screen.getByRole('slider', { name: 'Reverb Decay' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Minimise Effects' }))
    expect(document.getElementById('operator-rack')?.dataset.collapsed).toBe('true')
    expect(document.getElementById('effects-unit')?.dataset.collapsed).toBe('true')
  })

  it('keeps edits made before a fold when the panel comes back', async () => {
    const { midi } = setup()
    const user = userEvent.setup()

    await waitFor(() => expect(midi.sendVoice).toHaveBeenCalled())

    const output = screen.getByRole('slider', { name: 'Operator 1 output level' })
    fireEvent.change(output, { target: { value: '42' } })

    await user.click(screen.getByRole('button', { name: 'Minimise Operators' }))
    await user.click(screen.getByRole('button', { name: 'Expand Operators' }))

    expect(
      screen.getByRole('slider', { name: 'Operator 1 output level' }).getAttribute('value'),
    ).toBe('42')
  })

  // Selecting an option and undoing over the full editor runs past the default
  // 5s timeout when the whole suite runs in parallel, so it gets its own.
  it('applies a pitch envelope preset as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const presets = screen.getByRole('combobox', { name: 'Presets' })
    const envelopeValues = () =>
      [1, 2, 3, 4].flatMap((point) => [
        (screen.getByLabelText(`Pitch envelope rate ${point}`) as HTMLInputElement).value,
        (screen.getByLabelText(`Pitch envelope level ${point}`) as HTMLInputElement).value,
      ])
    const before = envelopeValues()

    await user.selectOptions(presets, 'Attack drop')

    expect(envelopeValues()).toEqual(['99', '74', '55', '50', '99', '50', '99', '50'])
    // The dropdown is a starting point rather than a mode, so it resets.
    expect((presets as HTMLSelectElement).value).toBe('')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(envelopeValues()).toEqual(before)
  }, 15_000)

  it('applies a randomised sound as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const outputLevels = () =>
      [1, 6].map(
        (operator) =>
          (
            screen.getByRole('slider', {
              name: `Operator ${operator} output level`,
            }) as HTMLInputElement
          ).value,
      )

    await user.click(screen.getByRole('button', { name: 'Randomise' }))

    // Every operator's output level is raised to at least 36, so both edits are visible.
    expect(outputLevels().every((level) => Number(level) >= 36)).toBe(true)

    await user.keyboard('{Meta>}z{/Meta}')

    expect(outputLevels()).toEqual(['0', '0'])
  }, 15_000)

  it('applies the init voice as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const outputLevels = () =>
      [1, 2].map(
        (operator) =>
          (
            screen.getByRole('slider', {
              name: `Operator ${operator} output level`,
            }) as HTMLInputElement
          ).value,
      )

    await user.click(screen.getByRole('button', { name: 'Init voice' }))

    expect(outputLevels()).toEqual(['99', '0'])

    await user.keyboard('{Meta>}z{/Meta}')

    expect(outputLevels()).toEqual(['0', '0'])
  }, 15_000)

  it('does not resend the init voice when it is applied again unchanged', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const initVoice = screen.getByRole('button', { name: 'Init voice' })

    await user.click(initVoice)
    await waitFor(() => expect(initVoice).toHaveProperty('disabled', false))
    await waitFor(() => expect(midi.sendVoice).toHaveBeenCalled())
    const sends = vi.mocked(midi.sendVoice).mock.calls.length
    await user.click(initVoice)

    expect(midi.sendVoice).toHaveBeenCalledTimes(sends)
  }, 15_000)

  it('applies a reverb preset from the reverb box as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const reverb = within(screen.getByRole('region', { name: 'Reverb' }))
    const presets = reverb.getByRole('combobox', { name: 'Reverb Preset' })
    const reverbDecay = () =>
      (screen.getByRole('slider', { name: 'Reverb Decay' }) as HTMLInputElement).value

    await user.selectOptions(presets, 'Large hall')

    expect(reverb.getByRole('button', { name: 'Bypass Reverb' })).toBeTruthy()
    expect(reverbDecay()).toBe('70')
    expect((presets as HTMLSelectElement).value).toBe('')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(reverbDecay()).toBe('0')
    expect(reverb.getByRole('button', { name: 'Enable Reverb' })).toBeTruthy()
  }, 15_000)

  it('sends only the preset effect’s controls, and nothing when the preset is applied again', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const presets = screen.getByRole('combobox', { name: 'Delay Preset' })

    await user.selectOptions(presets, 'Echo')
    expect(vi.mocked(midi.sendEffectParameter).mock.calls).toEqual([
      [8, 1],
      [9, 45],
      [10, 55],
      [11, 30],
    ])
    await user.selectOptions(presets, 'Echo')

    expect(midi.sendEffectParameter).toHaveBeenCalledTimes(4)
    expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1)
  }, 15_000)

  it('offers presets only in the boxes of effects that have them', async () => {
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))

    expect(
      within(screen.getByRole('region', { name: 'Chorus' })).queryByRole('combobox', {
        name: 'Chorus Preset',
      }),
    ).toBeNull()
  })

  it('undoes a held arrow key on an effect slider as a single step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const reverb = within(screen.getByRole('region', { name: 'Reverb' }))
    await user.click(reverb.getByRole('button', { pressed: false }))
    const decay = screen.getByRole('slider', { name: 'Reverb Decay' }) as HTMLInputElement

    fireEvent.keyDown(decay, { key: 'ArrowRight' })
    fireEvent.change(decay, { target: { value: '1' } })
    fireEvent.keyDown(decay, { key: 'ArrowRight', repeat: true })
    fireEvent.change(decay, { target: { value: '2' } })
    fireEvent.change(decay, { target: { value: '3' } })
    fireEvent.keyUp(decay, { key: 'ArrowRight' })
    expect(decay.value).toBe('3')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(decay.value).toBe('0')
    expect(decay.disabled).toBe(false)
  }, 15_000)

  it('undoes a held arrow key on an envelope point as a single step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const point = screen.getByRole('slider', { name: 'Pitch envelope point 1' })
    const level = () => (screen.getByLabelText('Pitch envelope level 1') as HTMLInputElement).value

    fireEvent.keyDown(point, { key: 'ArrowUp' })
    fireEvent.keyDown(point, { key: 'ArrowUp', repeat: true })
    fireEvent.keyDown(point, { key: 'ArrowUp', repeat: true })
    fireEvent.keyUp(point, { key: 'ArrowUp' })
    expect(level()).toBe('3')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(level()).toBe('0')
  }, 15_000)

  it('stays local and explains the unavailable SysEx connection without attempting initial sync', async () => {
    const { midi } = setup({ sysexAvailable: false })

    expect(await screen.findByText('SysEx access unavailable.')).toBeTruthy()
    expect(midi.sendVoice).not.toHaveBeenCalled()
  })

  // Two userEvent clicks over the full editor leave this a hair under the
  // default 5s timeout when the whole suite runs in parallel, so it gets its own.
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
  }, 15_000)

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
    // The effects are their own always-visible section now, not a tab to open.
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

describe('PatchEditorPage keyboard shortcuts', () => {
  async function setupEdited() {
    const context = setup()
    await waitFor(() => expect(context.midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), { target: { value: '6' } })

    return context
  }

  it('undoes the last edit on the undo shortcut', async () => {
    const user = userEvent.setup()
    await setupEdited()
    expect(screen.getByRole('slider', { name: 'Feedback' }).getAttribute('value')).toBe('6')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(screen.getByRole('slider', { name: 'Feedback' }).getAttribute('value')).toBe('0')
  })

  it('redoes an undone edit on the shifted undo shortcut', async () => {
    const user = userEvent.setup()
    await setupEdited()

    await user.keyboard('{Meta>}z{/Meta}')
    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')

    expect(screen.getByRole('slider', { name: 'Feedback' }).getAttribute('value')).toBe('6')
  })

  it('saves the edited patch on the save shortcut', async () => {
    const user = userEvent.setup()
    const { onSave } = await setupEdited()

    await user.keyboard('{Meta>}s{/Meta}')

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves without leaving the patch name field, where the space bar still types', async () => {
    const user = userEvent.setup()
    const { onSave } = await setupEdited()

    await user.click(screen.getByRole('textbox', { name: 'Patch name' }))
    await user.keyboard('{Meta>}s{/Meta}')

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('does not save an unedited patch, so the shortcut never reaches the browser', async () => {
    const user = userEvent.setup()
    const { midi, onSave } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))

    await user.keyboard('{Meta>}s{/Meta}')

    expect(onSave).not.toHaveBeenCalled()
  })

  it('leaves an unedited editor on Escape', async () => {
    const user = userEvent.setup()
    const { midi, onBack } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))

    await user.keyboard('{Escape}')

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('asks about unsaved changes on Escape rather than discarding them', async () => {
    const user = userEvent.setup()
    const { onBack } = await setupEdited()

    await user.keyboard('{Escape}')

    expect(onBack).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeTruthy()
  })

  it('leaves Escape to the unsaved-changes dialog once it is open', async () => {
    const user = userEvent.setup()
    const { onBack } = await setupEdited()

    await user.keyboard('{Escape}')
    await user.keyboard('{Escape}')

    expect(onBack).not.toHaveBeenCalled()
  })
})
