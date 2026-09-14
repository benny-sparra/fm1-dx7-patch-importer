// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadFile } from '@/lib/download-file'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadFile', () => {
  it('downloads the file under its name and then releases the object URL', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn(() => 'blob:bank')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })

    downloadFile(new Blob(['bank']), 'fm1-bank-a.syx')

    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('fm1-bank-a.syx')
    expect(clicked[0].href).toBe('blob:bank')
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1_000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:bank')
  })
})
