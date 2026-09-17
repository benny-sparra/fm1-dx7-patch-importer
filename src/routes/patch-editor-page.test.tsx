// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setLocale } from '@/i18n'
import { type MidiController } from '@/hooks/use-midi'
import { type Patch } from '@/data/patches'
import { resolveOperatorParameterIndex } from '@/lib/fm1-parameters'
import { type CopiedOperator } from '@/lib/operator-clipboard'
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

/** Opens the voice presets menu and chooses Init voice, which closes the menu again. */
async function chooseInitVoice(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText('Voice presets'))
  await user.click(screen.getByRole('button', { name: /^Init voice/ }))
  expect(screen.getByLabelText('Voice presets').closest('details')?.open).toBe(false)
}

/** Opens the voice presets menu and chooses Randomise, which closes the menu again. */
async function chooseRandomise(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText('Voice presets'))
  await user.click(screen.getByRole('button', { name: /^Randomise/ }))
  expect(screen.getByLabelText('Voice presets').closest('details')?.open).toBe(false)
}

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
      copiedOperator={null}
      effects={new Uint8Array(24)}
      midi={midi}
      onBack={onBack}
      onCopyOperator={vi.fn()}
      onSave={onSave}
      patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
      voice={{ data: new Uint8Array(128), name: 'INIT' }}
    />,
  )
  const rerenderMidi = (nextMidi: MidiController) =>
    view.rerender(
      <PatchEditorPage
        copiedOperator={null}
        effects={new Uint8Array(24)}
        midi={nextMidi}
        onBack={onBack}
        onCopyOperator={vi.fn()}
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

    await chooseRandomise(user)

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

    await chooseInitVoice(user)

    expect(outputLevels()).toEqual(['99', '0'])

    await user.keyboard('{Meta>}z{/Meta}')

    expect(outputLevels()).toEqual(['0', '0'])
  }, 15_000)

  it('switches effects off with the init voice, keeping their settings, in one undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const reverb = within(screen.getByRole('region', { name: 'Reverb' }))
    const reverbSettings = () =>
      ['Reverb Space', 'Reverb Decay', 'Reverb Mix'].map(
        (name) => (reverb.getByLabelText(name) as HTMLInputElement | HTMLSelectElement).value,
      )
    const operatorOneLevel = () =>
      (screen.getByRole('slider', { name: 'Operator 1 output level' }) as HTMLInputElement).value
    await user.click(reverb.getByRole('button', { name: 'Enable Reverb' }))
    await user.selectOptions(reverb.getByRole('combobox', { name: 'Reverb Preset' }), 'Large hall')

    await chooseInitVoice(user)

    expect(reverb.getByRole('button', { name: 'Enable Reverb' })).toBeTruthy()
    expect(reverbSettings()).toEqual(['1', '70', '35'])

    await user.keyboard('{Meta>}z{/Meta}')

    expect(reverb.getByRole('button', { name: 'Bypass Reverb' })).toBeTruthy()
    expect(operatorOneLevel()).toBe('0')
  }, 15_000)

  it('does not resend the init voice when it is applied again unchanged', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const initVoice = screen.getByRole('button', { name: /^Init voice/ })

    await chooseInitVoice(user)
    await waitFor(() => expect(initVoice).toHaveProperty('disabled', false))
    await waitFor(() => expect(midi.sendVoice).toHaveBeenCalled())
    const sends = vi.mocked(midi.sendVoice).mock.calls.length
    await chooseInitVoice(user)

    expect(midi.sendVoice).toHaveBeenCalledTimes(sends)
  }, 15_000)

  it('disables an effect’s preset menu while the effect is bypassed', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const reverb = within(screen.getByRole('region', { name: 'Reverb' }))
    const presets = reverb.getByRole('combobox', { name: 'Reverb Preset' }) as HTMLSelectElement

    expect(presets.disabled).toBe(true)

    await user.click(reverb.getByRole('button', { name: 'Enable Reverb' }))

    expect(presets.disabled).toBe(false)
  })

  it('applies a reverb preset from the reverb box as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const reverb = within(screen.getByRole('region', { name: 'Reverb' }))
    const presets = reverb.getByRole('combobox', { name: 'Reverb Preset' })
    const reverbSettings = () =>
      ['Reverb Space', 'Reverb Decay', 'Reverb Mix'].map(
        (name) => (reverb.getByLabelText(name) as HTMLInputElement | HTMLSelectElement).value,
      )
    await user.click(reverb.getByRole('button', { name: 'Enable Reverb' }))

    await user.selectOptions(presets, 'Large hall')

    expect(reverbSettings()).toEqual(['1', '70', '35'])
    expect((presets as HTMLSelectElement).value).toBe('')

    await user.keyboard('{Meta>}z{/Meta}')

    expect(reverbSettings()).toEqual(['0', '0', '0'])
    expect(reverb.getByRole('button', { name: 'Bypass Reverb' })).toBeTruthy()
  }, 15_000)

  it('sends only the preset effect’s controls, and nothing when the preset is applied again', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const delay = within(screen.getByRole('region', { name: 'Delay' }))
    const presets = delay.getByRole('combobox', { name: 'Delay Preset' })
    await user.click(delay.getByRole('button', { name: 'Enable Delay' }))
    vi.mocked(midi.sendEffectParameter).mockClear()

    await user.selectOptions(presets, 'Echo')
    expect(vi.mocked(midi.sendEffectParameter).mock.calls).toEqual([
      [8, 1],
      [9, 45],
      [10, 45],
      [11, 30],
    ])
    await user.selectOptions(presets, 'Echo')

    expect(midi.sendEffectParameter).toHaveBeenCalledTimes(4)
    expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1)
  }, 15_000)

  it('applies a phaser preset without changing the chorus', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const phaser = within(screen.getByRole('region', { name: 'Phaser' }))
    const chorusDepth = screen.getByRole('slider', { name: 'Chorus Depth' }) as HTMLInputElement
    await user.click(phaser.getByRole('button', { name: 'Enable Phaser' }))

    await user.selectOptions(phaser.getByRole('combobox', { name: 'Phaser Preset' }), 'Slow sweep')

    expect(
      ['Phaser Frequency', 'Phaser Depth', 'Phaser Mix'].map(
        (name) => (phaser.getByRole('slider', { name }) as HTMLInputElement).value,
      ),
    ).toEqual(['10', '60', '45'])
    expect(chorusDepth.value).toBe('0')
  }, 15_000)

  it('sets the filter type along with its other controls from a filter preset', async () => {
    const user = userEvent.setup()
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const filter = within(screen.getByRole('region', { name: 'Filter' }))
    await user.click(filter.getByRole('button', { name: 'Enable Filter' }))

    await user.selectOptions(filter.getByRole('combobox', { name: 'Filter Preset' }), 'Telephone')

    const type = filter.getByRole('combobox', { name: 'Filter Type' }) as HTMLSelectElement
    expect(type.selectedOptions[0].textContent).toBe('Band pass')
    expect((filter.getByRole('slider', { name: 'Filter Cutoff' }) as HTMLInputElement).value).toBe(
      '60',
    )
  }, 15_000)

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

    await chooseRandomise(user)
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

const firstPatch: Patch = {
  bank: 'A',
  family: 'Keys',
  id: 'a-1',
  name: 'Glass Keys',
  number: 1,
  program: 0,
}
const secondPatch: Patch = { ...firstPatch, id: 'a-2', name: 'Soft Bass', number: 2, program: 1 }

/** Keeps the copied operator above the editor, as the app does, across a change of sound. */
function ClipboardHarness({ midi, patch }: { midi: MidiController; patch: Patch }) {
  const [copiedOperator, setCopiedOperator] = useState<CopiedOperator | null>(null)
  return (
    <PatchEditorPage
      copiedOperator={copiedOperator}
      effects={new Uint8Array(24)}
      key={patch.id}
      midi={midi}
      onBack={vi.fn()}
      onCopyOperator={setCopiedOperator}
      onSave={vi.fn()}
      patch={patch}
      voice={{ data: new Uint8Array(128), name: patch.name }}
    />
  )
}

describe('PatchEditorPage operator copy and paste', () => {
  const setupClipboard = async () => {
    const midi = {
      hasMidiOutput: true,
      midiAccess: true,
      sendEffectParameter: vi.fn(() => true),
      sendEffectSettings: vi.fn(async () => true),
      sendParameter: vi.fn(() => true),
      sendVoice: vi.fn(async () => true),
      sysexAvailable: true,
    } as unknown as MidiController
    const view = render(<ClipboardHarness midi={midi} patch={firstPatch} />)
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    return { midi, view }
  }
  const outputLevel = (operator: number) =>
    screen.getByRole('slider', { name: `Operator ${operator} output level` }).getAttribute('value')
  const openOperator = (user: ReturnType<typeof userEvent.setup>, operator: number) =>
    user.click(screen.getByRole('button', { name: new RegExp(`^Operator ${operator}, `) }))
  const chooseFromOperatorMenu = async (
    user: ReturnType<typeof userEvent.setup>,
    operator: number,
    item: string,
    trigger = `Operator ${operator} actions`,
  ) => {
    await user.click(screen.getByRole('button', { name: trigger }))
    await user.click(screen.getByRole('menuitem', { name: item }))
  }

  afterEach(async () => {
    await setLocale('en')
  })

  it('offers Paste only once an operator has been copied', async () => {
    const user = userEvent.setup()
    await setupClipboard()

    await user.click(screen.getByRole('button', { name: 'Operator 1 actions' }))
    const paste = screen.getByRole('menuitem', {
      name: 'Paste (copy an operator first)',
    }) as HTMLButtonElement

    expect(paste.disabled).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Copy operator 1' }))
  })

  it('pastes a copied operator onto another as a single undo step', async () => {
    const user = userEvent.setup()
    const { midi } = await setupClipboard()
    fireEvent.change(screen.getByRole('slider', { name: 'Operator 2 output level' }), {
      target: { value: '77' },
    })
    await openOperator(user, 2)
    await chooseFromOperatorMenu(user, 2, 'Copy operator 2')
    await openOperator(user, 5)
    vi.mocked(midi.sendParameter).mockClear()

    await chooseFromOperatorMenu(user, 5, 'Paste operator 2')

    expect(screen.queryByRole('menu', { name: 'Operator 5' })).toBeNull()
    expect(outputLevel(5)).toBe('77')
    expect(midi.sendParameter).toHaveBeenCalledExactlyOnceWith(
      resolveOperatorParameterIndex(5, 'operator.outputLevel'),
      77,
    )

    await user.keyboard('{Meta>}z{/Meta}')

    expect(outputLevel(5)).toBe('0')
    expect(outputLevel(2)).toBe('77')
  }, 15_000)

  it('sends nothing when the operator already has the copied settings', async () => {
    const user = userEvent.setup()
    const { midi } = await setupClipboard()
    await chooseFromOperatorMenu(user, 1, 'Copy operator 1')
    vi.mocked(midi.sendParameter).mockClear()

    await chooseFromOperatorMenu(user, 1, 'Paste operator 1')

    expect(midi.sendParameter).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true)
  }, 15_000)

  it('pastes an operator copied from another sound', async () => {
    const user = userEvent.setup()
    const { midi, view } = await setupClipboard()
    fireEvent.change(screen.getByRole('slider', { name: 'Operator 1 output level' }), {
      target: { value: '64' },
    })
    await chooseFromOperatorMenu(user, 1, 'Copy operator 1')

    view.rerender(<ClipboardHarness midi={midi} patch={secondPatch} />)
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))
    expect(outputLevel(1)).toBe('0')
    await openOperator(user, 3)
    await chooseFromOperatorMenu(user, 3, 'Paste operator 1 from “Glass Keys”')

    expect(outputLevel(3)).toBe('64')
  }, 15_000)

  it('closes the operator menu on Escape without leaving the editor', async () => {
    const user = userEvent.setup()
    const midi = {
      hasMidiOutput: true,
      midiAccess: true,
      sendEffectParameter: vi.fn(() => true),
      sendEffectSettings: vi.fn(async () => true),
      sendParameter: vi.fn(() => true),
      sendVoice: vi.fn(async () => true),
      sysexAvailable: true,
    } as unknown as MidiController
    const onBack = vi.fn()
    render(
      <PatchEditorPage
        copiedOperator={null}
        effects={new Uint8Array(24)}
        midi={midi}
        onBack={onBack}
        onCopyOperator={vi.fn()}
        onSave={vi.fn()}
        patch={firstPatch}
        voice={{ data: new Uint8Array(128), name: firstPatch.name }}
      />,
    )
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    const trigger = screen.getByRole('button', { name: 'Operator 1 actions' })

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Operator 1' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onBack).not.toHaveBeenCalled()
  })

  it('names the copied operator’s sound in the interface language', async () => {
    await setLocale('de')
    const user = userEvent.setup()
    const { midi, view } = await setupClipboard()
    await chooseFromOperatorMenu(user, 1, 'Operator 1 kopieren', 'Aktionen für Operator 1')

    view.rerender(<ClipboardHarness midi={midi} patch={secondPatch} />)
    await user.click(await screen.findByRole('button', { name: 'Aktionen für Operator 1' }))

    expect(
      screen.getByRole('menuitem', { name: 'Operator 1 aus „Glass Keys“ einfügen' }),
    ).toBeTruthy()
  }, 15_000)
})

describe('PatchEditorPage compare with saved', () => {
  const feedbackValue = () => screen.getByRole('slider', { name: 'Feedback' }).getAttribute('value')
  const compareButton = () => screen.getByRole('button', { name: 'Compare with saved' })
  const sentVoiceData = (midi: MidiController, call: number) =>
    vi.mocked(midi.sendVoice).mock.calls[call][0].data

  async function setupEdited() {
    const context = setup()
    await waitFor(() => expect(context.midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), { target: { value: '6' } })
    return context
  }

  it('offers compare only once the sound has unsaved edits', async () => {
    const { midi } = setup()
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(1))
    expect((compareButton() as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), { target: { value: '6' } })

    expect((compareButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows and sends the saved version, then the edits, when compare is toggled', async () => {
    const user = userEvent.setup()
    const { midi } = await setupEdited()

    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    expect(compareButton().getAttribute('aria-pressed')).toBe('true')
    expect(feedbackValue()).toBe('0')
    expect(sentVoiceData(midi, 1)).toEqual(sentVoiceData(midi, 0))

    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(3))

    expect(compareButton().getAttribute('aria-pressed')).toBe('false')
    expect(feedbackValue()).toBe('6')
    expect(sentVoiceData(midi, 2)).not.toEqual(sentVoiceData(midi, 0))
  })

  it('keeps the edits and their undo history after comparing', async () => {
    const user = userEvent.setup()
    const { midi } = await setupEdited()

    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))
    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(3))

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(feedbackValue()).toBe('0')
    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(feedbackValue()).toBe('6')
  })

  it('pauses the editing controls and says why while comparing', async () => {
    const user = userEvent.setup()
    const { midi } = await setupEdited()

    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    expect(
      screen
        .getAllByRole('status')
        .some((status) => status.textContent?.includes('Playing the saved sound')),
    ).toBe(true)
    expect(screen.getByRole('slider', { name: 'Feedback' }).closest('[inert]')).not.toBeNull()
    expect(screen.getByLabelText('Voice presets').closest('[inert]')).not.toBeNull()
    expect(screen.getByLabelText('More save options').closest('[inert]')).not.toBeNull()
    for (const name of ['Undo', 'Back to patch banks', 'Save to Library']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true)
    }
    expect((screen.getByRole('textbox', { name: 'Patch name' }) as HTMLInputElement).disabled).toBe(
      true,
    )
  })

  it('ignores edits and the undo and save shortcuts while comparing', async () => {
    const user = userEvent.setup()
    const { midi, onSave } = await setupEdited()
    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), { target: { value: '3' } })
    await user.keyboard('{Meta>}z{/Meta}')
    await user.keyboard('{Meta>}s{/Meta}')

    expect(onSave).not.toHaveBeenCalled()
    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(3))
    expect(feedbackValue()).toBe('6')
  })

  it('moves focus to the notice’s close control when comparing starts', async () => {
    const user = userEvent.setup()
    await setupEdited()

    await user.click(compareButton())

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Stop comparing and return to your edits' }),
    )
  })

  it('returns to the edits and the Compare button when the notice is closed', async () => {
    const user = userEvent.setup()
    const { midi } = await setupEdited()
    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    await user.click(
      screen.getByRole('button', { name: 'Stop comparing and return to your edits' }),
    )
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(3))

    expect(compareButton().getAttribute('aria-pressed')).toBe('false')
    expect(feedbackValue()).toBe('6')
    expect(sentVoiceData(midi, 2)).not.toEqual(sentVoiceData(midi, 0))
    await waitFor(() => expect(document.activeElement).toBe(compareButton()))
  })

  it('returns to the edits on Escape while comparing, without leaving the editor', async () => {
    const user = userEvent.setup()
    const { midi, onBack } = await setupEdited()
    await user.click(compareButton())
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(3))

    expect(compareButton().getAttribute('aria-pressed')).toBe('false')
    expect(feedbackValue()).toBe('6')
    expect(onBack).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Discard changes' })).toBeNull()
  })

  it('sends the saved version once when compare is double-clicked', async () => {
    const user = userEvent.setup()
    const { midi } = await setupEdited()
    let finishSend = (_sent: boolean) => {}
    vi.mocked(midi.sendVoice).mockImplementationOnce(
      () => new Promise<boolean>((resolve) => (finishSend = resolve)),
    )

    await user.dblClick(compareButton())
    finishSend(true)
    await waitFor(() => expect(midi.sendEffectSettings).toHaveBeenCalledTimes(2))

    expect(midi.sendVoice).toHaveBeenCalledTimes(2)
    expect(compareButton().getAttribute('aria-pressed')).toBe('true')
  })

  it('compares on screen without a MIDI connection', async () => {
    const user = userEvent.setup()
    const { midi } = setup({ hasMidiOutput: false })
    fireEvent.change(screen.getByRole('slider', { name: 'Feedback' }), {
      target: { value: '6' },
    })

    await user.click(compareButton())

    expect(feedbackValue()).toBe('0')
    expect(midi.sendVoice).not.toHaveBeenCalled()
  })
})
