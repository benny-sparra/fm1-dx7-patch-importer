// @vitest-environment jsdom
import {
  act,
  cleanup,
  render as renderTesting,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FxPresetLibrary } from '@/components/midi/fx-preset-library'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import { useFxLibrary, type FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { listStoredFxLibraryPresets, updateStoredFxLibraryPreset } from '@/lib/fx-library-storage'
import {
  createFxLibraryPreset,
  FxLibraryPresetNameError,
  renameFxLibraryPreset,
} from '@/lib/fx-library-preset'
import {
  getV16Effects,
  getV16EffectsLastSent,
  resetV16EffectsForTests,
  setV16Effects,
} from '@/lib/v16-effects'

function render(ui: ReactElement) {
  return renderTesting(ui, { wrapper: ToastProvider })
}

beforeAll(async () => {
  await setLocale('en-GB')
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  localStorage.clear()
  resetV16EffectsForTests()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const preset = createFxLibraryPreset({
  effects: new Uint8Array(24).fill(1),
  id: 'fx-1',
  name: 'Stage room',
  now: '2026-10-30T12:00:00.000Z',
})

function makeLibrary(overrides: Partial<FxLibrary> = {}) {
  return {
    damagedCount: 0,
    delete: vi.fn<FxLibrary['delete']>(() => Promise.resolve()),
    duplicate: vi.fn<FxLibrary['duplicate']>(() => Promise.resolve(preset)),
    importPresets: vi.fn<FxLibrary['importPresets']>(() => Promise.resolve([])),
    loadError: null,
    pending: false,
    presets: [preset],
    reload: vi.fn<FxLibrary['reload']>(() => Promise.resolve([preset])),
    rename: vi.fn<FxLibrary['rename']>(() => Promise.resolve(preset)),
    restorePresets: vi.fn<FxLibrary['restorePresets']>(() =>
      Promise.resolve({ added: 0, kept: 0 }),
    ),
    save: vi.fn<FxLibrary['save']>(() => Promise.resolve(preset)),
    status: 'ready' as const,
    update: vi.fn<FxLibrary['update']>(),
    ...overrides,
  } satisfies FxLibrary
}

function makeMidi(overrides: Partial<V16EffectsMidi> = {}): V16EffectsMidi {
  return {
    effectChannel: 1,
    firmware: { identity: 'FM-1_016', kind: 'mvave' },
    hasMidiOutput: false,
    selectedOutputId: '',
    sendSharedEffectParameter: vi.fn(),
    sendSharedEffectSettings: vi.fn(),
    ...overrides,
  }
}

function setup(library = makeLibrary(), midi = makeMidi()) {
  render(<FxPresetLibrary fxLibrary={library} midi={midi} onSendingChange={vi.fn()} search="" />)
  return { library, midi }
}

describe('FX preset library', () => {
  it('loads a preset on double-click while offline without sending MIDI', async () => {
    const user = userEvent.setup()
    const send = vi.fn()
    setup(makeLibrary(), makeMidi({ sendSharedEffectSettings: send }))

    await user.dblClick(screen.getByRole('button', { name: 'Stage room' }))

    expect(send).not.toHaveBeenCalled()
    expect(getV16Effects()).toEqual(preset.effects)
  })

  it('opens the naming form as a modal and returns focus to New FX preset when closed', async () => {
    const user = userEvent.setup()
    const { library } = setup()
    const trigger = screen.getByRole('button', { name: 'New FX preset…' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Save current effects' })
    const input = within(dialog).getByRole('textbox', { name: 'Preset name' })
    expect(document.activeElement).toBe(input)
    await user.type(input, 'Not saved')
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(library.save).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps a failed save and its name in the modal and supports retrying with Enter', async () => {
    const user = userEvent.setup()
    const save = vi
      .fn<FxLibrary['save']>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce(preset)
    setup(makeLibrary({ save }))
    await user.click(screen.getByRole('button', { name: 'New FX preset…' }))
    const dialog = screen.getByRole('dialog', { name: 'Save current effects' })
    const input = within(dialog).getByRole('textbox', { name: 'Preset name' })
    await user.type(input, 'Retry me{Enter}')
    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect((input as HTMLInputElement).value).toBe('Retry me')
    await user.type(input, '{Enter}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Save current effects' })).toBeNull(),
    )
    expect(
      within(screen.getByRole('region', { name: 'Completed actions' })).getByText(
        'Saved “Retry me”.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('names the loaded preset in the title strip and offers Update only once the rack differs', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByRole('heading', { name: 'Unsaved effects' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Current effects actions' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    expect(screen.getByRole('heading', { name: 'Stage room' })).toBeTruthy()
    expect(screen.queryByText('edited')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Current effects actions' })).toBeNull()
    const edited = getV16Effects().slice()
    edited[1] = 2
    act(() => {
      setV16Effects(edited)
    })
    expect(screen.getByRole('heading', { name: /^Stage room\s*edited$/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    expect(screen.getByRole('menuitem', { name: 'Update “Stage room”' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /Save current as/ })).toBeNull()
  })

  it('keeps Import and Download all in a menu of its own name, with no second save path', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'FX preset actions' }))

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Import…',
      'Download all',
    ])
    expect(screen.getAllByRole('button', { name: 'New FX preset…' })).toHaveLength(1)
  })

  it('lists Delete last in a preset’s menu', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Rename…',
      'Duplicate',
      'Download preset',
      'Delete…',
    ])
  })

  it('says the library is empty apart from a search that matches nothing', () => {
    const view = renderTesting(
      <FxPresetLibrary
        fxLibrary={makeLibrary({ presets: [] })}
        midi={makeMidi()}
        onSendingChange={() => undefined}
        search=""
      />,
      { wrapper: ToastProvider },
    )
    expect(screen.getByText('No FX presets yet.')).toBeTruthy()
    view.rerender(
      <FxPresetLibrary
        fxLibrary={makeLibrary()}
        midi={makeMidi()}
        onSendingChange={() => undefined}
        search="zzz"
      />,
    )
    expect(screen.getByText('No FX presets match this search.')).toBeTruthy()
    expect(screen.queryByText('No FX presets yet.')).toBeNull()
  })

  it('loads the library once and does not reload it again when it is ready', () => {
    const { library } = setup()
    expect(library.reload).not.toHaveBeenCalled()
  })

  it('sorts the preset list by name and keeps its loaded effects when filtering', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({
      presets: [
        { ...preset, id: 'z', name: 'Zebra' },
        { ...preset, id: 'a', name: 'Air' },
        { ...preset, id: 'm', name: 'Mellow' },
      ],
    })
    const view = render(
      <FxPresetLibrary
        fxLibrary={library}
        midi={makeMidi()}
        onSendingChange={() => undefined}
        search=""
      />,
    )
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Air', 'Mellow', 'Zebra'])
    await user.click(screen.getByRole('button', { name: 'Zebra' }))
    view.rerender(
      <FxPresetLibrary
        fxLibrary={library}
        midi={makeMidi()}
        onSendingChange={() => undefined}
        search="air"
      />,
    )
    expect(screen.queryByRole('button', { name: 'Zebra' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Air' })).toBeTruthy()
    expect(getV16Effects()).toEqual(preset.effects)
  })

  it('saves the immutable snapshot captured before the name is entered', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({ presets: [] })
    const first = new Uint8Array(24)
    first[1] = 2
    setV16Effects(first)
    setup(library)

    await user.click(screen.getByRole('button', { name: 'New FX preset…' }))
    const later = new Uint8Array(24)
    later[1] = 3
    setV16Effects(later)
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Captured')
    await user.click(screen.getByRole('button', { name: 'Save preset' }))

    await waitFor(() => expect(library.save).toHaveBeenCalledOnce())
    expect(vi.mocked(library.save).mock.calls[0][1][1]).toBe(2)
  })

  it('runs a rapidly confirmed mutation only once', async () => {
    const user = userEvent.setup()
    let finishSave: (() => void) | undefined
    const library = makeLibrary({
      presets: [],
      save: vi.fn(
        () =>
          new Promise<typeof preset>((resolve) => {
            finishSave = () => resolve(preset)
          }),
      ),
    })
    setup(library)
    await user.click(screen.getByRole('button', { name: 'New FX preset…' }))
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'One copy')

    await user.dblClick(screen.getByRole('button', { name: 'Save preset' }))

    expect(library.save).toHaveBeenCalledOnce()
    finishSave?.()
    await waitFor(() => expect(screen.getByText('Saved “One copy”.')).toBeTruthy())
  })

  it('loads locally while offline without scheduling MIDI', async () => {
    const user = userEvent.setup()
    const send = vi.fn()
    setup(makeLibrary(), makeMidi({ sendSharedEffectSettings: send }))
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    expect(getV16Effects()).toEqual(preset.effects)
    expect(send).not.toHaveBeenCalled()
    expect(
      screen.getByText('No MIDI output is selected. Loading changes only this browser.'),
    ).toBeTruthy()
  })

  it('applies a clicked preset once and offers an explicit repeat in the rack menu', async () => {
    const user = userEvent.setup()
    const send = vi.fn(() => Promise.resolve({ ok: true as const, sent: 24 as const }))
    setup(
      makeLibrary(),
      makeMidi({
        effectChannel: 2,
        firmware: { identity: 'FM-1_016', kind: 'mvave' },
        hasMidiOutput: true,
        selectedOutputId: 'fm1',
        sendSharedEffectSettings: send,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    await waitFor(() => expect(send).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    expect(send).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Send again' }))
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2))
  })

  it('says so when the firmware has no shared FX group, instead of staying silent', async () => {
    const user = userEvent.setup()
    setup(
      makeLibrary(),
      makeMidi({
        firmware: { identity: 'FM-1_015', kind: 'mvave' },
        hasMidiOutput: true,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    expect(
      screen.getByText(
        'This firmware has no shared V16 FX group. Loading changes only this browser.',
      ),
    ).toBeTruthy()
  })

  it('shows Sending… in a status region while a preset goes out, then clears it', async () => {
    const user = userEvent.setup()
    let finishSend: (() => void) | undefined
    const send = vi.fn(
      () =>
        new Promise<{ ok: true; sent: 24 }>((resolve) => {
          finishSend = () => resolve({ ok: true, sent: 24 })
        }),
    )
    setup(
      makeLibrary(),
      makeMidi({ hasMidiOutput: true, selectedOutputId: 'fm1', sendSharedEffectSettings: send }),
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    expect(screen.getByText('Sending…')).toBeTruthy()
    finishSend?.()
    await waitFor(() => expect(screen.queryByText('Sending…')).toBeNull())
  })

  it('offers Send again after a failed send, and a later success marks the preset sent', async () => {
    const user = userEvent.setup()
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'transport', sent: 3 })
      .mockResolvedValueOnce({ ok: true, sent: 24 })
    setup(
      makeLibrary(),
      makeMidi({ hasMidiOutput: true, selectedOutputId: 'fm1', sendSharedEffectSettings: send }),
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Not all effects were sent.')

    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Send again' }))

    await waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('records the snapshot that was sent, not effects edited while it went out', async () => {
    const user = userEvent.setup()
    let finishSend: (() => void) | undefined
    const send = vi.fn(
      () =>
        new Promise<{ ok: true; sent: 24 }>((resolve) => {
          finishSend = () => resolve({ ok: true, sent: 24 })
        }),
    )
    setup(
      makeLibrary(),
      makeMidi({ hasMidiOutput: true, selectedOutputId: 'fm1', sendSharedEffectSettings: send }),
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    const edited = getV16Effects().slice()
    edited[1] = 2
    act(() => {
      setV16Effects(edited)
    })
    await act(async () => {
      finishSend?.()
    })

    expect(getV16EffectsLastSent()?.effects).toEqual(preset.effects)
    expect(screen.queryByRole('menuitem', { name: 'Send again' })).toBeNull()
  })

  it('cancels its pending send when the view is left and records nothing', async () => {
    const user = userEvent.setup()
    let finishSend: (() => void) | undefined
    let signal: AbortSignal | undefined
    const send = vi.fn(
      (_settings: Uint8Array, abort?: AbortSignal) =>
        new Promise<{ ok: true; sent: 24 }>((resolve) => {
          signal = abort
          finishSend = () => resolve({ ok: true, sent: 24 })
        }),
    )
    const view = renderTesting(
      <FxPresetLibrary
        fxLibrary={makeLibrary()}
        midi={makeMidi({
          hasMidiOutput: true,
          selectedOutputId: 'fm1',
          sendSharedEffectSettings: send,
        })}
        onSendingChange={() => undefined}
        search=""
      />,
      { wrapper: ToastProvider },
    )
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    view.unmount()

    expect(signal?.aborted).toBe(true)
    await act(async () => {
      finishSend?.()
    })
    expect(getV16EffectsLastSent()).toBeNull()
  })

  it('starts a rapidly requested full send only once', async () => {
    const user = userEvent.setup()
    let finishSend: (() => void) | undefined
    const send = vi.fn(
      () =>
        new Promise<{ ok: true; sent: 24 }>((resolve) => {
          finishSend = () => resolve({ ok: true, sent: 24 })
        }),
    )
    setup(
      makeLibrary(),
      makeMidi({
        effectChannel: 2,
        firmware: { identity: 'FM-1_016', kind: 'mvave' },
        hasMidiOutput: true,
        selectedOutputId: 'fm1',
        sendSharedEffectSettings: send,
      }),
    )
    await user.dblClick(screen.getByRole('button', { name: 'Stage room' }))

    expect(send).toHaveBeenCalledOnce()
    finishSend?.()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Stage room' }).getAttribute('aria-disabled')).toBe(
        'false',
      ),
    )
  })

  it('keeps a failed deletion selected and reports the storage error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({
      delete: vi.fn(() => Promise.reject(new Error('quota'))),
    })
    setup(library)
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Delete preset' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect(screen.getByRole('button', { name: 'Stage room' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('retries a failed initial read without treating it as an empty library', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({ presets: [], status: 'error' })
    setup(library)

    expect(screen.queryByText(/No FX presets yet/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(library.reload).toHaveBeenCalledOnce()
  })
})

function LiveLibrary() {
  const library = useFxLibrary()
  return (
    <FxPresetLibrary
      fxLibrary={library}
      midi={makeMidi()}
      onSendingChange={() => undefined}
      search=""
    />
  )
}

async function createPreset(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: 'New FX preset…' }))
  await user.type(
    within(screen.getByRole('dialog', { name: 'Save current effects' })).getByRole('textbox', {
      name: 'Preset name',
    }),
    name,
  )
  await user.click(screen.getByRole('button', { name: 'Save preset' }))
  await within(screen.getByRole('region', { name: 'Completed actions' })).findByText(
    `Saved “${name}”.`,
  )
  expect(screen.queryByRole('dialog')).toBeNull()
}

describe('FX preset working rack and persisted management', () => {
  beforeEach(() => installFakeIndexedDb())

  it('updates the loaded preset and replaces the editing area when another preset is clicked', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'New FX preset…' }).getAttribute('aria-disabled'),
      ).toBe('false'),
    )
    await createPreset(user, 'Wide chorus')
    expect(screen.getByRole('button', { name: 'Wide chorus' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    await createPreset(user, 'Small room')
    await user.click(screen.getByRole('button', { name: 'Wide chorus' }))
    const edited = getV16Effects().slice()
    edited[1] = 2
    act(() => {
      setV16Effects(edited)
    })
    await user.click(screen.getByRole('button', { name: 'Actions for Small room' }))
    await user.keyboard('{Escape}')

    expect(screen.getByRole('heading', { name: /^Wide chorus\s*edited$/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Update “Wide chorus”' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Update “Wide chorus”' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const notification = within(screen.getByRole('region', { name: 'Completed actions' }))
    expect(
      await notification.findByText('Updated “Wide chorus” from the current effects.'),
    ).toBeTruthy()

    expect(
      within(screen.getByRole('region', { name: 'FX presets' })).queryByRole('button', {
        name: /Undo/,
      }),
    ).toBeNull()
    const stored = await listStoredFxLibraryPresets()
    expect(stored.presets.find(({ name }) => name === 'Wide chorus')?.effects[1]).toBe(2)
    expect(stored.presets.find(({ name }) => name === 'Small room')?.effects[1]).toBe(0)
    expect(screen.queryByText('Wide chorus · Modified')).toBeNull()
    await user.click(
      within(screen.getByRole('region', { name: 'Completed actions' })).getByRole('button', {
        name: 'Undo',
      }),
    )
    await screen.findByText('Restored “Wide chorus”.')
    const restored = await listStoredFxLibraryPresets()
    expect(restored.presets.find(({ name }) => name === 'Wide chorus')?.effects[1]).toBe(0)
    expect(getV16Effects()[1]).toBe(2)
    expect(screen.getByRole('heading', { name: /^Wide chorus\s*edited$/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Small room' }))
    expect(getV16Effects()[1]).toBe(0)
    expect(screen.getByRole('heading', { name: 'Small room' })).toBeTruthy()
  })

  it('renames a preset from its menu, keeping its effects and confirming in a toast', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'New FX preset…' }).getAttribute('aria-disabled'),
      ).toBe('false'),
    )
    await createPreset(user, 'Original')
    const before = (await listStoredFxLibraryPresets()).presets[0]
    await user.click(screen.getByRole('button', { name: 'Actions for Original' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename…' }))
    const dialog = screen.getByRole('dialog', { name: 'Rename “Original”' })
    const input = within(dialog).getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, '  New name  {Enter}')

    await screen.findByRole('button', { name: 'New name' })
    const stored = (await listStoredFxLibraryPresets()).presets[0]
    expect(stored.id).toBe(before.id)
    expect(stored.name).toBe('New name')
    expect(stored.effects).toEqual(before.effects)
    expect(
      within(screen.getByRole('region', { name: 'Completed actions' })).getByText(
        'Renamed the preset to “New name”.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Preset name' })).toBeNull()
  })

  it('refuses an empty or over-long name in the rename form without calling storage', async () => {
    const user = userEvent.setup()
    const library = makeLibrary()
    setup(library)
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename…' }))
    const dialog = screen.getByRole('dialog', { name: 'Rename “Stage room”' })
    const input = within(dialog).getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, 'x'.repeat(81))

    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'Enter a name from 1 to 80 characters.',
    )
    expect(
      within(dialog).getByRole('button', { name: 'Rename preset' }).getAttribute('aria-disabled'),
    ).toBe('true')
    await user.type(input, '{Enter}')
    expect(library.rename).not.toHaveBeenCalled()
  })

  it('shows the name-length error, not a storage error, when the library refuses a name', async () => {
    const user = userEvent.setup()
    const rename = vi
      .fn<FxLibrary['rename']>()
      .mockRejectedValue(new FxLibraryPresetNameError('too long'))
    setup(makeLibrary({ rename }))
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename…' }))
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), '2{Enter}')

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter a name from 1 to 80 characters.',
    )
    expect(screen.queryByText(/Browser storage could not save/)).toBeNull()
  })

  it('keeps a failed rename in its form to retry', async () => {
    const user = userEvent.setup()
    const rename = vi
      .fn<FxLibrary['rename']>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce({ ...preset, name: 'Retry name' })
    setup(makeLibrary({ rename }))
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename…' }))
    const input = screen.getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, 'Retry name{Enter}')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect((input as HTMLInputElement).value).toBe('Retry name')
    await user.type(input, '{Enter}')
    await waitFor(() => expect(rename).toHaveBeenCalledTimes(2))
  })

  it('confirms a duplicated preset in a toast rather than the sidebar', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'New FX preset…' }).getAttribute('aria-disabled'),
      ).toBe('false'),
    )
    await createPreset(user, 'Original')
    await user.click(screen.getByRole('button', { name: 'Actions for Original' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    const notifications = within(screen.getByRole('region', { name: 'Completed actions' }))
    expect(await notifications.findByText('Created “Copy of Original”.')).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'FX presets' })).queryByText(
        'Created “Copy of Original”.',
      ),
    ).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Copy of Original' })).toBeTruthy()
    expect((await listStoredFxLibraryPresets()).presets).toHaveLength(2)
  })

  it('deletes the loaded preset without changing the rack and restores its exact record with Undo', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'New FX preset…' }).getAttribute('aria-disabled'),
      ).toBe('false'),
    )
    await createPreset(user, 'Stage')
    const before = await listStoredFxLibraryPresets()
    const effects = getV16Effects().slice()
    await user.click(screen.getByRole('button', { name: 'Actions for Stage' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Delete preset' }))
    await screen.findByText('Deleted “Stage”.')

    expect(screen.queryByRole('button', { name: 'Stage' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Unsaved effects' })).toBeTruthy()
    expect(getV16Effects()).toEqual(effects)
    expect((await listStoredFxLibraryPresets()).presets).toEqual([])
    await user.click(
      within(screen.getByRole('region', { name: 'Completed actions' })).getByRole('button', {
        name: 'Undo',
      }),
    )
    await screen.findByText('Restored “Stage”.')
    expect((await listStoredFxLibraryPresets()).presets).toEqual(before.presets)
    expect(getV16Effects()).toEqual(effects)
  })

  it('shows no update success toast while storage is pending or after it fails', async () => {
    const user = userEvent.setup()
    let rejectUpdate: ((reason: Error) => void) | undefined
    const update = vi.fn<FxLibrary['update']>(
      () =>
        new Promise((_resolve, reject) => {
          rejectUpdate = reject
        }),
    )
    setup(makeLibrary({ update }))
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    const edited = getV16Effects().slice()
    edited[1] = 2
    act(() => {
      setV16Effects(edited)
    })
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Update “Stage room”' }))

    expect(update).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
    const notifications = within(screen.getByRole('region', { name: 'Completed actions' }))
    expect(notifications.queryByRole('status')).toBeNull()
    await act(async () => {
      rejectUpdate?.(new Error('quota'))
    })
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect(notifications.queryByRole('status')).toBeNull()
    expect(getV16Effects()[1]).toBe(2)
  })

  it('does not overwrite a preset changed in another tab before Update', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'New FX preset…' }).getAttribute('aria-disabled'),
      ).toBe('false'),
    )
    await createPreset(user, 'Original')
    const edited = getV16Effects().slice()
    edited[1] = 2
    act(() => {
      setV16Effects(edited)
    })
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    const stored = (await listStoredFxLibraryPresets()).presets[0]
    const changedElsewhere = renameFxLibraryPreset(stored, 'Other tab', '2026-10-31T12:00:00.000Z')
    await act(async () => {
      await updateStoredFxLibraryPreset(changedElsewhere, stored)
    })
    await user.click(screen.getByRole('menuitem', { name: 'Update “Original”' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'This preset changed in another tab.',
    )
    expect((await listStoredFxLibraryPresets()).presets).toEqual([changedElsewhere])
    expect(getV16Effects()[1]).toBe(2)
  })

  it('retains Undo after a failed restore so it can be retried', async () => {
    const user = userEvent.setup()
    const restore = vi
      .fn<FxLibrary['restorePresets']>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce({ added: 1, kept: 0 })
    setup(makeLibrary({ restorePresets: restore }))
    await user.click(screen.getByRole('button', { name: 'Actions for Stage room' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Delete preset' }))
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    await user.click(
      within(screen.getByRole('region', { name: 'Completed actions' })).getByRole('button', {
        name: 'Undo',
      }),
    )
    await screen.findByText('Restored “Stage room”.')
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })
})
