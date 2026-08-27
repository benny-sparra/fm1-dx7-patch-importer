// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  beginDynamicImportRecovery,
  cancelDynamicImportRecovery,
  getDynamicImportRecoveryIntent,
  installDynamicImportRecovery,
} from '@/lib/dynamic-import-recovery'

afterEach(() => {
  cancelDynamicImportRecovery()
  sessionStorage.clear()
})

function dispatchPreloadError(message: string) {
  const event = new Event('vite:preloadError', { cancelable: true }) as VitePreloadErrorEvent
  event.payload = new Error(message)
  window.dispatchEvent(event)
  return event
}

describe('installDynamicImportRecovery', () => {
  it('reloads when a production dynamic import fails', () => {
    const reload = vi.fn()
    const dispose = installDynamicImportRecovery({ reload })
    beginDynamicImportRecovery('patch-1')

    const event = dispatchPreloadError(
      'Failed to fetch dynamically imported module: https://fm1-editor.com/assets/editor-old.js',
    )

    expect(reload).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
    dispose()
  })

  it('does not reload the same failed chunk again after recovery', () => {
    const reload = vi.fn()
    const firstDispose = installDynamicImportRecovery({ reload })
    const message =
      'Failed to fetch dynamically imported module: https://fm1-editor.com/assets/editor-old.js'

    beginDynamicImportRecovery('patch-1')
    dispatchPreloadError(message)
    firstDispose()
    beginDynamicImportRecovery(getDynamicImportRecoveryIntent())
    const secondDispose = installDynamicImportRecovery({ reload })
    const secondEvent = dispatchPreloadError(message)

    expect(reload).toHaveBeenCalledOnce()
    expect(secondEvent.defaultPrevented).toBe(false)
    secondDispose()
  })

  it('restores the requested patch after a recovery reload', () => {
    const dispose = installDynamicImportRecovery({ reload: vi.fn() })
    beginDynamicImportRecovery('patch-1')

    dispatchPreloadError('Failed to fetch dynamically imported module')

    expect(getDynamicImportRecoveryIntent()).toBe('patch-1')
    cancelDynamicImportRecovery()
    expect(getDynamicImportRecoveryIntent()).toBe('')
    dispose()
  })

  it('does not reload for an unrelated dynamic import failure', () => {
    const reload = vi.fn()
    const dispose = installDynamicImportRecovery({ reload })

    dispatchPreloadError('Unable to preload CSS for another feature')

    expect(reload).not.toHaveBeenCalled()
    dispose()
  })

  it('leaves the error available to the route boundary when recovery storage is unavailable', () => {
    const reload = vi.fn()
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('Storage is blocked')
      }),
      setItem: vi.fn(),
    }
    const dispose = installDynamicImportRecovery({ reload, storage })
    beginDynamicImportRecovery('patch-1')

    const event = dispatchPreloadError('Failed to fetch dynamically imported module')

    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    dispose()
  })
})
