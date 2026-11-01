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

import { FxPresetLibraryDialog } from '@/components/midi/fx-preset-library-dialog'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import { useFxLibrary, type FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { installFakeIndexedDb } from '@/test/fake-indexed-db'
import { listStoredFxLibraryPresets, updateStoredFxLibraryPreset } from '@/lib/fx-library-storage'
import { createFxLibraryPreset, renameFxLibraryPreset } from '@/lib/fx-library-preset'
import { getV16Effects, resetV16EffectsForTests, setV16Effects } from '@/lib/v16-effects'

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
    firmware: { identity: 'FM-1_015', kind: 'mvave' },
    hasMidiOutput: false,
    ...overrides,
  }
}

function setup(library = makeLibrary(), midi = makeMidi()) {
  render(
    <FxPresetLibraryDialog fxLibrary={library} midi={midi} onSendingChange={vi.fn()} search="" />,
  )
  return { library, midi }
}

describe('FX preset library dialog', () => {
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
    expect(screen.getByRole('dialog', { name: 'FX presets' }).textContent).toContain(
      'Saved “Retry me”.',
    )
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('uses the loaded preset as the rack heading and keeps Save current as in its menu', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Stage room' }))

    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe(
      'Stage room',
    )
    expect(screen.queryByText('Current effects')).toBeNull()
    expect(screen.queryByText(/Selected preset:/)).toBeNull()
    expect(screen.queryByText('Matches the current browser effects.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save current as…' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Save current as…' }))
    expect(screen.getByRole('dialog', { name: 'Save current effects' })).toBeTruthy()
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
      <FxPresetLibraryDialog
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
      <FxPresetLibraryDialog
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
    expect(screen.queryByRole('button', { name: 'Load into Effects' })).toBeNull()
    expect(screen.queryByText('Loaded into the browser’s V16 effects.')).toBeNull()
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
      expect(
        (screen.getByRole('button', { name: 'Stage room' }) as HTMLButtonElement).disabled,
      ).toBe(false),
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
    <FxPresetLibraryDialog
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
  const savedDialog = await screen.findByRole('dialog', { name: 'FX presets' })
  expect(within(savedDialog).getByText(`Saved “${name}”.`)).toBeTruthy()
  await user.click(within(savedDialog).getByRole('button', { name: 'Close' }))
}

describe('FX preset working rack and persisted management', () => {
  beforeEach(() => installFakeIndexedDb())

  it('updates the loaded preset and replaces the editing area when another preset is clicked', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'New FX preset…' }) as HTMLButtonElement).disabled,
      ).toBe(false),
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

    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe(
      'Wide chorus',
    )
    expect(screen.queryByRole('button', { name: 'Update “Wide chorus”' })).toBeNull()
    expect(screen.queryByText(/Modified/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Current effects actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Update “Wide chorus”' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const notification = within(screen.getByRole('region', { name: 'Completed actions' }))
    expect((await notification.findByRole('status')).textContent).toContain(
      'Updated “Wide chorus” from the current effects.',
    )

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
    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe(
      'Wide chorus',
    )
    await user.click(screen.getByRole('button', { name: 'Small room' }))
    expect(getV16Effects()[1]).toBe(0)
    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe(
      'Small room',
    )
  })

  it('renames the loaded preset from its header with Enter and preserves its effects', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'New FX preset…' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    await createPreset(user, 'Original')
    const before = (await listStoredFxLibraryPresets()).presets[0]
    const input = screen.getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, '  New name  {Enter}')

    await screen.findByRole('button', { name: 'New name' })
    const stored = (await listStoredFxLibraryPresets()).presets[0]
    expect(stored.id).toBe(before.id)
    expect(stored.name).toBe('New name')
    expect(stored.effects).toEqual(before.effects)
    expect((input as HTMLInputElement).value).toBe('New name')
  })

  it('discards a header name edit with Escape and rejects an empty name', async () => {
    const user = userEvent.setup()
    const library = makeLibrary()
    setup(library)
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    const input = screen.getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, 'Discard{Escape}')
    await user.tab()
    expect((input as HTMLInputElement).value).toBe('Stage room')
    expect(library.rename).not.toHaveBeenCalled()

    await user.clear(input)
    await user.tab()
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter a name from 1 to 80 characters.',
    )
    expect(library.rename).not.toHaveBeenCalled()
  })

  it('keeps a failed header rename available to retry on blur', async () => {
    const user = userEvent.setup()
    const rename = vi
      .fn<FxLibrary['rename']>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValueOnce({ ...preset, name: 'Retry name' })
    setup(makeLibrary({ rename }))
    await user.click(screen.getByRole('button', { name: 'Stage room' }))
    const input = screen.getByRole('textbox', { name: 'Preset name' })
    await user.clear(input)
    await user.type(input, 'Retry name{Enter}')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect((input as HTMLInputElement).value).toBe('Retry name')
    await user.click(input)
    await user.tab()
    await waitFor(() => expect(rename).toHaveBeenCalledTimes(2))
  })

  it('confirms a duplicated preset in a toast rather than the sidebar', async () => {
    const user = userEvent.setup()
    render(<LiveLibrary />)
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'New FX preset…' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    await createPreset(user, 'Original')
    await user.click(screen.getByRole('button', { name: 'Actions for Original' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    const notifications = within(screen.getByRole('region', { name: 'Completed actions' }))
    expect((await notifications.findByRole('status')).textContent).toContain(
      'Created “Copy of Original”.',
    )
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
        (screen.getByRole('button', { name: 'New FX preset…' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    await createPreset(user, 'Stage')
    const before = await listStoredFxLibraryPresets()
    const effects = getV16Effects().slice()
    await user.click(screen.getByRole('button', { name: 'Actions for Stage' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Delete preset' }))
    await screen.findByText('Deleted “Stage”.')

    expect(screen.queryByRole('button', { name: 'Stage' })).toBeNull()
    expect(screen.getByText('Custom settings')).toBeTruthy()
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
        (screen.getByRole('button', { name: 'New FX preset…' }) as HTMLButtonElement).disabled,
      ).toBe(false),
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
