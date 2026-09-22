// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEditorHistoryEntry } from './use-editor-history-entry'

function renderEditorHistory(openPatchId: string) {
  const onBrowserForward = vi.fn()
  const onBrowserLeave = vi.fn()
  const view = renderHook(
    ({ patchId }) => useEditorHistoryEntry(patchId, onBrowserLeave, onBrowserForward),
    { initialProps: { patchId: openPatchId } },
  )
  return {
    onBrowserForward,
    onBrowserLeave,
    setOpenPatchId: (patchId: string) => view.rerender({ patchId }),
  }
}

function waitForPopState() {
  return new Promise<void>((resolve) =>
    window.addEventListener('popstate', () => resolve(), { once: true }),
  )
}

async function goBack() {
  const popped = waitForPopState()
  window.history.back()
  await popped
}

async function goForward() {
  const popped = waitForPopState()
  window.history.forward()
  await popped
}

beforeEach(() => {
  window.history.replaceState(null, '')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useEditorHistoryEntry', () => {
  it('adds a history entry when the editor opens', () => {
    const length = window.history.length
    const { setOpenPatchId } = renderEditorHistory('')

    setOpenPatchId('patch-1')

    expect(window.history.length).toBe(length + 1)
    expect(window.history.state).toEqual({ fm1Editor: 'patch-1' })
  })

  it('asks the editor to leave on browser Back and keeps its entry until it closes', async () => {
    const { onBrowserLeave, setOpenPatchId } = renderEditorHistory('')
    setOpenPatchId('patch-1')

    await act(goBack)

    expect(onBrowserLeave).toHaveBeenCalledTimes(1)
    expect(window.history.state).toEqual({ fm1Editor: 'patch-1' })
  })

  it('steps back off its entry when the app closes the editor, without asking to leave', async () => {
    const { onBrowserLeave, setOpenPatchId } = renderEditorHistory('')
    setOpenPatchId('patch-1')

    const popped = waitForPopState()
    setOpenPatchId('')
    await act(() => popped)

    expect(window.history.state).toBeNull()
    expect(onBrowserLeave).not.toHaveBeenCalled()
  })

  it('keeps the entry of an editor opened again before the step back arrived', async () => {
    const { onBrowserLeave, setOpenPatchId } = renderEditorHistory('')
    setOpenPatchId('patch-1')

    const popped = waitForPopState()
    setOpenPatchId('')
    setOpenPatchId('patch-1')
    await act(() => popped)

    expect(window.history.state).toEqual({ fm1Editor: 'patch-1' })
    expect(onBrowserLeave).not.toHaveBeenCalled()
  })

  it('opens the editor again on browser Forward, on the patch its entry names', async () => {
    const { onBrowserForward, setOpenPatchId } = renderEditorHistory('')
    setOpenPatchId('patch-1')
    await act(goBack)
    const popped = waitForPopState()
    setOpenPatchId('')
    await act(() => popped)

    await act(goForward)

    expect(onBrowserForward).toHaveBeenCalledWith('patch-1')
  })

  it('does nothing on browser Back while the editor is closed', async () => {
    window.history.pushState({ other: true }, '')
    const { onBrowserLeave } = renderEditorHistory('')

    await act(goBack)

    expect(onBrowserLeave).not.toHaveBeenCalled()
  })

  it('clears the entry left by a reload in the editor without leaving the page', () => {
    window.history.pushState({ fm1Editor: 'patch-1' }, '')
    const length = window.history.length
    const back = vi.spyOn(window.history, 'back')

    renderEditorHistory('')

    expect(window.history.state).toBeNull()
    expect(window.history.length).toBe(length)
    expect(back).not.toHaveBeenCalled()
  })
})
