// @vitest-environment jsdom
import { act, cleanup, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { V16EffectsPanel, type V16EffectsMidi } from '@/components/midi/v16-effects-panel'
import type { FxLibrary } from '@/hooks/use-fx-library'
import { useMidi } from '@/hooks/use-midi'
import { setLocale } from '@/i18n'
import { createFxLibraryPreset } from '@/lib/fx-library-preset'
import {
  getV16Effects,
  getV16EffectsLastSent,
  getV16EffectsPresetId,
  resetV16EffectsForTests,
  setV16Effects,
} from '@/lib/v16-effects'
import { fxTableOffset, makeSettingsBlockReadRequest } from '@/lib/v16-settings-block'
import { makeSettingsBlockReply } from '@/test/v16-settings-replies'
import { makeFakeFm1Ports, mvaveV16IdentityReply } from '@/test/fake-fm1-midi'
import { renderWithToasts } from '@/test/render-with-toasts'

const webMidi = vi.hoisted(() => ({
  addListener: vi.fn(() => ({ remove: vi.fn() })),
  disable: vi.fn(async () => undefined),
  enable: vi.fn(async () => undefined),
  inputs: [] as unknown[],
  outputs: [] as unknown[],
  sysexEnabled: true,
}))
vi.mock('webmidi', () => ({ WebMidi: webMidi }))

beforeEach(async () => {
  await setLocale('en-GB')
  localStorage.clear()
  resetV16EffectsForTests()
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('recalling an FX preset restores it after the voice editor changed the shared effect group', async () => {
  const user = userEvent.setup()
  const ports = makeFakeFm1Ports({ reply: mvaveV16IdentityReply })
  const hardware = new Uint8Array(24)
  ports.output.sendControlChange.mockImplementation((controller, value) => {
    hardware[controller - 70] = value
  })
  webMidi.inputs = [ports.input]
  webMidi.outputs = [ports.output]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.firmware).toMatchObject({ kind: 'mvave' }))

  const source = createFxLibraryPreset({
    effects: new Uint8Array(24).fill(1),
    id: 'stage',
    name: 'Stage room',
    now: '2026-11-02T12:00:00.000Z',
  })
  const library: FxLibrary = {
    damagedCount: 0,
    delete: vi.fn(),
    duplicate: vi.fn(),
    importPresets: vi.fn(),
    loadError: null,
    pending: false,
    presets: [source],
    reload: vi.fn(),
    rename: vi.fn(),
    restorePresets: vi.fn(),
    save: vi.fn(),
    status: 'ready',
    update: vi.fn(),
  }
  // Order readback is unrelated to this regression and stays unavailable in this fixture.
  const view = renderWithToasts(
    <V16EffectsPanel
      fxLibrary={library}
      midi={{ ...hook.result.current, sysexAvailable: false }}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Stage room' }))
  await waitFor(() => expect(hardware[23]).toBe(1))
  view.unmount()

  // The DX7 voice editor uses this public operation for edits to the same live FX group.
  act(() => {
    hook.result.current.sendEffectParameter(0, 0)
  })
  await waitFor(() => expect(hardware[0]).toBe(0))

  const sentBeforeRemount = ports.output.sendControlChange.mock.calls.length
  renderWithToasts(
    <V16EffectsPanel
      fxLibrary={library}
      midi={{ ...hook.result.current, sysexAvailable: false }}
    />,
  )
  expect(ports.output.sendControlChange).toHaveBeenCalledTimes(sentBeforeRemount)
  await user.click(screen.getByRole('button', { name: 'Stage room' }))
  await waitFor(() =>
    expect(ports.output.sendControlChange).toHaveBeenCalledTimes(sentBeforeRemount + 24),
  )
  expect(hardware[0]).toBe(1)
})

it('serialises an effect edit after an in-flight order read and write on the MIDI queue', async () => {
  const user = userEvent.setup()
  const ports = makeFakeFm1Ports({ reply: mvaveV16IdentityReply })
  const block = Array.from({ length: 176 }, () => 0)
  block[0] = 0x0e
  ;[2, 0, 1, 3, 5, 4, 6, 7, 8].forEach((effect, entry) => {
    block[fxTableOffset + entry * 3] = effect
    block[fxTableOffset + entry * 3 + 1] = 1
  })
  const readRequest = makeSettingsBlockReadRequest()
  let reads = 0
  let pendingReply: Uint8Array | undefined
  let hardwareFilter = 1
  const events: string[] = []
  ports.output.send.mockImplementation((message) => {
    if (
      message.length === readRequest.length &&
      message.every((byte, index) => byte === readRequest[index])
    ) {
      reads += 1
      if (reads === 1) ports.input.receive(makeSettingsBlockReply(block))
      else pendingReply = makeSettingsBlockReply(block)
    } else if (message[1] === 0 && message[2] === 0x32 && message.length > 20) {
      events.push('write')
      hardwareFilter = 1
    } else {
      ports.input.receive(mvaveV16IdentityReply)
    }
  })
  ports.output.sendControlChange.mockImplementation((controller, value) => {
    if (controller === 70) {
      events.push('cc')
      hardwareFilter = value
    }
  })
  webMidi.inputs = [ports.input]
  webMidi.outputs = [ports.output]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.firmware).toMatchObject({ kind: 'mvave' }))
  const source = createFxLibraryPreset({
    effects: new Uint8Array(24),
    id: 'stage',
    name: 'Stage',
    now: '2026-11-02T12:00:00.000Z',
  })
  const library: FxLibrary = {
    damagedCount: 0,
    delete: vi.fn(),
    duplicate: vi.fn(),
    importPresets: vi.fn(),
    loadError: null,
    pending: false,
    presets: [source],
    reload: vi.fn(),
    rename: vi.fn(),
    restorePresets: vi.fn(),
    save: vi.fn(),
    status: 'ready',
    update: vi.fn(),
  }
  const browserEffects = new Uint8Array(24)
  browserEffects[0] = 1
  setV16Effects(browserEffects)
  renderWithToasts(<V16EffectsPanel fxLibrary={library} midi={hook.result.current} />)
  await waitFor(() => expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(6))
  await user.click(screen.getByRole('button', { name: 'Actions for Filter' }))
  await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }))
  await waitFor(() => expect(pendingReply).toBeDefined())
  await user.click(screen.getByRole('switch', { name: 'Filter' }))
  expect(events).toEqual([])
  if (!pendingReply) throw new Error('Missing delayed reply')
  act(() => ports.input.receive(pendingReply!))
  await waitFor(() => expect(hardwareFilter).toBe(0))
  expect(events).toEqual(['write', 'cc'])
})

// Keep the toast provider mounted when the Effects view is left, as the application does.
async function setupRecallUndo() {
  const first = makeFakeFm1Ports({ reply: mvaveV16IdentityReply })
  const second = makeFakeFm1Ports({ reply: mvaveV16IdentityReply })
  // A hardware reply arrives after send returns, rather than reentering the identity query.
  first.output.send.mockImplementation(() => {
    queueMicrotask(() => first.input.receive(mvaveV16IdentityReply))
  })
  second.output.send.mockImplementation(() => {
    queueMicrotask(() => second.input.receive(mvaveV16IdentityReply))
  })
  second.input.id = 'second-in'
  second.output.id = 'second-out'
  second.input.name = 'Second FM-1'
  second.output.name = 'Second FM-1'
  webMidi.inputs = [first.input, second.input]
  webMidi.outputs = [first.output, second.output]
  const hook = renderHook(() => useMidi())
  await act(() => hook.result.current.connectMidi())
  await waitFor(() => expect(hook.result.current.firmware).toMatchObject({ kind: 'mvave' }))
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const preset = createFxLibraryPreset({
    effects: new Uint8Array(24).fill(1),
    id: 'stage',
    name: 'Stage room',
    now: '2026-11-07T12:00:00.000Z',
  })
  const library: FxLibrary = {
    damagedCount: 0,
    delete: vi.fn(),
    duplicate: vi.fn(),
    importPresets: vi.fn(),
    loadError: null,
    pending: false,
    presets: [preset],
    reload: vi.fn(),
    rename: vi.fn(),
    restorePresets: vi.fn(),
    save: vi.fn(),
    status: 'ready',
    update: vi.fn(),
  }
  const panel = (overrides: Partial<V16EffectsMidi> = {}) => (
    <V16EffectsPanel
      fxLibrary={library}
      midi={{ ...hook.result.current, sysexAvailable: false, ...overrides }}
    />
  )
  const view = renderWithToasts(panel())
  const refresh = (overrides: Partial<V16EffectsMidi> = {}) => view.rerender(panel(overrides))
  const before = getV16Effects().slice()
  await user.click(screen.getByRole('button', { name: 'Stage room' }))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(first.output.sendControlChange).toHaveBeenCalledTimes(24)
  expect(first.output.sendControlChange).toHaveBeenLastCalledWith(93, 1, { channels: 2 })
  return { before, first, second, hook, view, refresh, user }
}

type RecallUndoSetup = Awaited<ReturnType<typeof setupRecallUndo>>

it.each([
  {
    name: 'selecting another output',
    change: async ({ hook, refresh }: RecallUndoSetup) => {
      act(() => hook.result.current.setSelectedOutputId('second-out'))
      refresh()
    },
  },
  {
    name: 'changing the Effect channel',
    change: async ({ hook, refresh }: RecallUndoSetup) => {
      act(() => hook.result.current.setEffectChannel(3))
      refresh()
    },
  },
  {
    name: 'going offline',
    change: async ({ hook, refresh }: RecallUndoSetup) => {
      await act(() => hook.result.current.disconnectMidi())
      refresh()
    },
  },
  {
    name: 'losing the output while route metadata stays the same',
    change: async ({ refresh }: RecallUndoSetup) => {
      refresh({ hasMidiOutput: false })
    },
  },
  {
    name: 'changing firmware while still eligible',
    change: async ({ refresh }: RecallUndoSetup) => {
      refresh({ firmware: { kind: 'mvave', identity: 'FM-1_017' } })
    },
  },
  {
    name: 'losing shared FX eligibility',
    change: async ({ refresh }: RecallUndoSetup) => {
      refresh({ firmware: { kind: 'mvave', identity: 'FM-1_015' } })
    },
  },
  {
    name: 'leaving the Effects view',
    change: async ({ view }: RecallUndoSetup) => {
      view.rerender(<div>Patches</div>)
    },
  },
  {
    name: 'leaving and reopening the Effects view',
    change: async ({ view, refresh }: RecallUndoSetup) => {
      view.rerender(<div>Patches</div>)
      refresh()
    },
  },
  {
    name: 'switching away and back to the same output',
    change: async ({ hook, refresh }: RecallUndoSetup) => {
      act(() => hook.result.current.setSelectedOutputId('second-out'))
      refresh()
      act(() => hook.result.current.setSelectedOutputId('fm1-out'))
      refresh()
    },
  },
  {
    name: 'disconnecting and reconnecting the same ports',
    change: async ({ hook, refresh }: RecallUndoSetup) => {
      await act(() => hook.result.current.disconnectMidi())
      refresh()
      await act(() => hook.result.current.connectMidi())
      refresh()
    },
  },
])(
  'expires recall Undo after $name without changing the rack or sending bytes',
  async ({ change }) => {
    const context = await setupRecallUndo()
    await change(context)
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    vi.clearAllMocks()
    const lastSent = getV16EffectsLastSent()

    await context.user.click(screen.getByRole('button', { name: 'Undo' }))
    // Drain a complete fake transfer, so a delayed batch cannot escape the assertion.
    await act(() => vi.advanceTimersByTimeAsync(1_000))

    expect(context.first.output.sendControlChange).not.toHaveBeenCalled()
    expect(context.second.output.sendControlChange).not.toHaveBeenCalled()
    expect(context.first.output.send).not.toHaveBeenCalled()
    expect(context.second.output.send).not.toHaveBeenCalled()
    expect(context.first.output.sendSysex).not.toHaveBeenCalled()
    expect(context.second.output.sendSysex).not.toHaveBeenCalled()
    expect(context.first.output.sendProgramChange).not.toHaveBeenCalled()
    expect(context.second.output.sendProgramChange).not.toHaveBeenCalled()
    expect(getV16Effects()).toEqual(new Uint8Array(24).fill(1))
    expect(getV16EffectsPresetId()).toBe('stage')
    expect(getV16EffectsLastSent()).toEqual(lastSent)
  },
)

it('keeps recall Undo live across ordinary rerenders and note-channel changes', async () => {
  const { before, first, second, hook, refresh, user } = await setupRecallUndo()
  act(() => hook.result.current.setChannel(3))
  refresh({ firmware: { kind: 'mvave', identity: 'FM-1_016' } })
  vi.clearAllMocks()

  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await act(() => vi.advanceTimersByTimeAsync(1_000))

  expect(getV16Effects()).toEqual(before)
  expect(getV16EffectsPresetId()).toBe('')
  expect(first.output.sendControlChange).toHaveBeenCalledTimes(24)
  expect(first.output.sendControlChange).toHaveBeenNthCalledWith(1, 70, 0, { channels: 2 })
  expect(first.output.sendControlChange).toHaveBeenLastCalledWith(93, 0, { channels: 2 })
  expect(second.output.sendControlChange).not.toHaveBeenCalled()
  expect(getV16EffectsLastSent()?.effects).toEqual(before)
})

it('expires Revert Undo when the Effect channel changes', async () => {
  const { hook, first, second, refresh, user } = await setupRecallUndo()
  const edited = getV16Effects().slice()
  edited[1] = 2
  act(() => {
    setV16Effects(edited)
  })
  await user.click(screen.getByRole('button', { name: 'Revert' }))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  act(() => hook.result.current.setEffectChannel(3))
  refresh()
  vi.clearAllMocks()
  const revertedToast = screen.getByText('Reverted “Stage room”.').closest('[role="status"]')
  if (!(revertedToast instanceof HTMLElement)) throw new Error('Missing Revert notification')

  await user.click(within(revertedToast).getByRole('button', { name: 'Undo' }))
  await act(() => vi.advanceTimersByTimeAsync(1_000))

  expect(getV16Effects()).toEqual(new Uint8Array(24).fill(1))
  expect(first.output.sendControlChange).not.toHaveBeenCalled()
  expect(second.output.sendControlChange).not.toHaveBeenCalled()
})
