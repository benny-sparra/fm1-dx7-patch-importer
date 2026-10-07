import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { liveFirmwarePageFailure } from './check-live-firmware-page.mjs'

const firmwarePage = await readFile('firmware/index.html', 'utf8')
const appPage = await readFile('index.html', 'utf8')

describe('liveFirmwarePageFailure', () => {
  it('accepts the firmware list', () => {
    expect(liveFirmwarePageFailure(200, firmwarePage)).toBeUndefined()
  })

  it('rejects the app served in its place', () => {
    expect(liveFirmwarePageFailure(200, appPage)).toContain('rather than "M-VAVE FM1 firmware"')
  })

  it('rejects a page that lists no firmware', () => {
    const emptyPage = firmwarePage.replaceAll('class="firmware-entry', 'class="other')
    expect(liveFirmwarePageFailure(200, emptyPage)).toContain('lists no firmware')
  })

  it('rejects an error response', () => {
    expect(liveFirmwarePageFailure(404, firmwarePage)).toContain('HTTP 404')
  })
})
