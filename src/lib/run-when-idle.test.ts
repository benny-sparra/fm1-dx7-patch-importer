// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { runWhenIdle } from './run-when-idle'

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => state })
}

describe('runWhenIdle', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'readyState')
  })

  it('waits for the load event before scheduling idle work', () => {
    setReadyState('loading')
    const requestIdleCallback = vi.fn((callback: () => void) => {
      callback()
      return 1
    })
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    const task = vi.fn()

    runWhenIdle(task)
    expect(task).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('load'))
    expect(requestIdleCallback).toHaveBeenCalledWith(task, { timeout: 5000 })
    expect(task).toHaveBeenCalledOnce()
  })

  it('schedules immediately when the page has already loaded', () => {
    setReadyState('complete')
    const requestIdleCallback = vi.fn(() => 1)
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)

    runWhenIdle(vi.fn(), { timeout: 2000 })

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
  })

  it('falls back to a timeout without requestIdleCallback', () => {
    vi.useFakeTimers()
    setReadyState('complete')
    vi.stubGlobal('requestIdleCallback', undefined)
    const task = vi.fn()

    runWhenIdle(task)
    expect(task).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(task).toHaveBeenCalledOnce()
  })
})
