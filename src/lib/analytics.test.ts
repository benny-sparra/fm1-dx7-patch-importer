// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { trackAnalyticsEvent } from './analytics'

afterEach(() => {
  delete window.umami
})

describe('trackAnalyticsEvent', () => {
  it('forwards a named event without user data', () => {
    const track = vi.fn()
    window.umami = { track }

    trackAnalyticsEvent({ name: 'editor_opened' })

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('editor_opened', undefined)
  })

  it('forwards only the fixed diagnostic properties supplied by the event contract', () => {
    const track = vi.fn()
    window.umami = { track }

    trackAnalyticsEvent({
      data: {
        method: 'manual',
        output: 'missing',
        sysex: 'enabled',
      },
      name: 'midi_connected',
    })

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('midi_connected', {
      method: 'manual',
      output: 'missing',
      sysex: 'enabled',
    })
  })

  it('does nothing when the tracker has not loaded', () => {
    expect(() => trackAnalyticsEvent({ name: 'patch_saved' })).not.toThrow()
  })

  it('does not let a tracker failure escape into the application', () => {
    window.umami = {
      track: vi.fn(() => {
        throw new Error('tracker unavailable')
      }),
    }

    expect(() => trackAnalyticsEvent({ name: 'patch_saved' })).not.toThrow()
  })
})

describe('Umami page views', () => {
  // A share link's fragment holds a patch, including its user-authored name, and the query is
  // never needed.
  it('leave the fragment and query out of the page address they record', () => {
    const html = readFileSync(resolve('index.html'), 'utf8')
    const script = html.match(/<script[^>]*cloud\.umami\.is[^>]*>/u)?.[0] ?? ''

    expect(script).toContain('data-exclude-hash="true"')
    expect(script).toContain('data-exclude-search="true"')
  })
})
