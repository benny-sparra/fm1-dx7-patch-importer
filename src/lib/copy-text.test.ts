import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextToClipboard } from './copy-text'

class FakeClipboardItem {
  readonly items: Record<string, Promise<Blob>>

  constructor(items: Record<string, Promise<Blob>>) {
    this.items = items
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyTextToClipboard', () => {
  it('hands the text to the clipboard as a promise where the browser takes one', async () => {
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      expect(await (await items[0].items['text/plain']).text()).toBe('link')
    })
    const writeText = vi.fn()
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    vi.stubGlobal('navigator', { clipboard: { write, writeText } })

    await copyTextToClipboard(Promise.resolve('link'))

    expect(write).toHaveBeenCalledOnce()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('writes the text once ready where there is no ClipboardItem', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyTextToClipboard(Promise.resolve('link'))

    expect(writeText).toHaveBeenCalledWith('link')
  })

  it('falls back to writing the text when the browser refuses a promised item', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    vi.stubGlobal('navigator', {
      clipboard: { write: vi.fn().mockRejectedValue(new TypeError('No promises')), writeText },
    })

    await copyTextToClipboard(Promise.resolve('link'))

    expect(writeText).toHaveBeenCalledWith('link')
  })

  it('rejects when the text cannot be made', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyTextToClipboard(Promise.reject(new Error('chunk')))).rejects.toThrow('chunk')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('rejects when the browser has no clipboard', async () => {
    vi.stubGlobal('navigator', {})

    await expect(copyTextToClipboard(Promise.resolve('link'))).rejects.toThrow(
      'The clipboard is unavailable.',
    )
  })
})
