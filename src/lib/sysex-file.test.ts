import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadFile } from '@/lib/download-file'

import { downloadSysexFile, sysexFilenameStem } from './sysex-file'

vi.mock('@/lib/download-file', () => ({ downloadFile: vi.fn() }))

afterEach(() => {
  vi.clearAllMocks()
})

describe('sysexFilenameStem', () => {
  it('joins the words of a name with dashes', () => {
    expect(sysexFilenameStem('Gig  Friday')).toBe('Gig-Friday')
  })

  it('replaces characters a filename cannot hold', () => {
    expect(sysexFilenameStem('A/B:C*D')).toBe('A-B-C-D')
  })

  it('drops dashes and dots from either end', () => {
    expect(sysexFilenameStem('..hidden-')).toBe('hidden')
  })
})

describe('downloadSysexFile', () => {
  it('offers the bytes as a binary file under the given name', async () => {
    downloadSysexFile(Uint8Array.from([0xf0, 0xf7]), 'fm1-bank-a.syx')

    const [blob, filename] = vi.mocked(downloadFile).mock.calls[0]
    expect(filename).toBe('fm1-bank-a.syx')
    expect(blob.type).toBe('application/octet-stream')
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([0xf0, 0xf7])
  })
})
