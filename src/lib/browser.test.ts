import { describe, expect, it } from 'vitest'

import { isUnsupportedBrowser } from './browser'

const userAgents = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidTabletChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:156.0) Gecko/156.0 Firefox/156.0',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  desktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  desktopFirefox:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:156.0) Gecko/20100101 Firefox/156.0',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

function fakeNavigator(userAgent: string, { midi = true } = {}) {
  return {
    userAgent,
    ...(midi ? { requestMIDIAccess: () => undefined } : {}),
  } as unknown as Navigator
}

describe('isUnsupportedBrowser', () => {
  it('accepts a desktop Chromium browser that exposes Web MIDI', () => {
    expect(isUnsupportedBrowser(fakeNavigator(userAgents.desktopChrome), true)).toBe(false)
  })

  it('accepts desktop Firefox, which exposes Web MIDI', () => {
    expect(isUnsupportedBrowser(fakeNavigator(userAgents.desktopFirefox), true)).toBe(false)
  })

  it('accepts Chrome on an Android phone, which exposes Web MIDI', () => {
    expect(isUnsupportedBrowser(fakeNavigator(userAgents.androidChrome), true)).toBe(false)
  })

  it('accepts Chrome on an Android tablet, which exposes Web MIDI', () => {
    expect(isUnsupportedBrowser(fakeNavigator(userAgents.androidTabletChrome), true)).toBe(false)
  })

  it('reports Firefox on Android, which has no Web MIDI, as unsupported', () => {
    expect(
      isUnsupportedBrowser(fakeNavigator(userAgents.androidFirefox, { midi: false }), true),
    ).toBe(true)
  })

  it('reports Safari on iOS, which has no Web MIDI, as unsupported', () => {
    expect(isUnsupportedBrowser(fakeNavigator(userAgents.iosSafari, { midi: false }), true)).toBe(
      true,
    )
  })

  it('reports a desktop browser without Web MIDI on a secure page as unsupported', () => {
    expect(
      isUnsupportedBrowser(fakeNavigator(userAgents.desktopSafari, { midi: false }), true),
    ).toBe(true)
  })

  it('leaves an insecure page to the insecure-context message', () => {
    expect(
      isUnsupportedBrowser(fakeNavigator(userAgents.desktopChrome, { midi: false }), false),
    ).toBe(false)
  })
})
