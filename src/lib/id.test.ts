import { afterEach, describe, expect, it, vi } from 'vitest'

import { createId } from '@/lib/id'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createId', () => {
  it('uses the browser UUID implementation when it is available', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn(),
      randomUUID: () => '76e779b7-6f11-4772-84b3-e5d8bc2cf326',
    })

    expect(createId()).toBe('76e779b7-6f11-4772-84b3-e5d8bc2cf326')
  })

  it('creates a version 4 UUID when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        return bytes
      },
    })

    expect(createId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  it('uses the fallback when an exposed randomUUID implementation rejects the call', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xff)
        return bytes
      },
      randomUUID: () => {
        throw new DOMException('A secure context is required.', 'SecurityError')
      },
    })

    expect(createId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('rejects an environment without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined)

    expect(() => createId()).toThrow('This browser does not expose a secure random generator.')
  })
})
