// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FxPresetLibraryDialog } from '@/components/midi/fx-preset-library-dialog'
import type { V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { setLocale } from '@/i18n'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import { getV16Effects, resetV16EffectsForTests, setV16Effects } from '@/lib/v16-effects'

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
  const onClose = vi.fn()
  render(
    <FxPresetLibraryDialog
      fxLibrary={library}
      midi={midi}
      onClose={onClose}
      onSendingChange={vi.fn()}
    />,
  )
  return { library, midi, onClose }
}

describe('FX preset library dialog', () => {
  it('keeps selection and double-click MIDI-silent and leaves current effects alone', async () => {
    const user = userEvent.setup()
    const send = vi.fn()
    setup(makeLibrary(), makeMidi({ sendSharedEffectSettings: send }))
    const before = getV16Effects().slice()

    await user.dblClick(screen.getByRole('option', { name: 'Stage room' }))

    expect(send).not.toHaveBeenCalled()
    expect(getV16Effects()).toEqual(before)
  })

  it('saves the immutable snapshot captured before the name is entered', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({ presets: [] })
    const first = new Uint8Array(24)
    first[1] = 2
    setV16Effects(first)
    setup(library)

    await user.click(screen.getByRole('button', { name: 'Save current as…' }))
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
    await user.click(screen.getByRole('button', { name: 'Save current as…' }))
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
    await user.click(screen.getByRole('option', { name: 'Stage room' }))

    await user.click(screen.getByRole('button', { name: 'Load into Effects' }))

    expect(getV16Effects()).toEqual(preset.effects)
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByText('Loaded into the browser’s V16 effects.')).toBeTruthy()
  })

  it('applies one full eligible send, disables ordinary repeat, and offers Send again', async () => {
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
    await user.click(screen.getByRole('option', { name: 'Stage room' }))

    await user.click(screen.getByRole('button', { name: 'Load and apply' }))
    await waitFor(() => expect(send).toHaveBeenCalledOnce())
    expect(screen.getByText('Sent to FM1.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Load and apply' }) as HTMLButtonElement).disabled,
    ).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Send again' }))
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
    await user.click(screen.getByRole('option', { name: 'Stage room' }))

    await user.dblClick(screen.getByRole('button', { name: 'Load and apply' }))

    expect(send).toHaveBeenCalledOnce()
    finishSend?.()
    await waitFor(() => expect(screen.getByText('Sent to FM1.')).toBeTruthy())
  })

  it('keeps a failed deletion selected and reports the storage error', async () => {
    const user = userEvent.setup()
    const library = makeLibrary({
      delete: vi.fn(() => Promise.reject(new Error('quota'))),
    })
    setup(library)
    await user.click(screen.getByRole('option', { name: 'Stage room' }))
    await user.click(screen.getByRole('button', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Delete preset' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Browser storage could not save that change.',
    )
    expect(screen.getByRole('option', { name: 'Stage room' }).getAttribute('aria-selected')).toBe(
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
