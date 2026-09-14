// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import {
  dismissFm1BankSelectionDialogForSession,
  shouldShowFm1BankSelectionDialog,
} from '@/lib/session'

let restoreSessionStorage: (() => void) | null = null

function blockSessionStorage() {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })
  restoreSessionStorage = () => {
    if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
    else delete (window as { sessionStorage?: Storage }).sessionStorage
  }
}

afterEach(() => {
  restoreSessionStorage?.()
  restoreSessionStorage = null
  sessionStorage.clear()
})

describe('FM1 bank selection guide session preference', () => {
  it('stops showing the guide once it is dismissed for the session', () => {
    expect(shouldShowFm1BankSelectionDialog()).toBe(true)

    dismissFm1BankSelectionDialogForSession()

    expect(shouldShowFm1BankSelectionDialog()).toBe(false)
  })

  it('shows the guide when session storage is blocked', () => {
    blockSessionStorage()

    expect(shouldShowFm1BankSelectionDialog()).toBe(true)
  })

  it('accepts a dismissal without throwing when session storage is blocked', () => {
    blockSessionStorage()

    expect(() => dismissFm1BankSelectionDialogForSession()).not.toThrow()
  })
})
