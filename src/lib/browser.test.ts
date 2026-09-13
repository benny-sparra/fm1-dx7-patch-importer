import { describe, expect, it } from 'vitest'

import { isChromiumBrowser, isMobileDevice, isUnsupportedMidiBrowser } from './browser'

const userAgents = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidTabletChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  desktopEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  iosEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/140.0.0.0 Mobile/15E148 Safari/605.1.15',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

function fakeNavigator(userAgent: string, { midi = true } = {}) {
  return {
    userAgent,
    ...(midi ? { requestMIDIAccess: () => undefined } : {}),
  } as unknown as Navigator
}

describe('isChromiumBrowser', () => {
  it('recognises desktop Chromium browsers from the user agent', () => {
    expect(isChromiumBrowser(fakeNavigator(userAgents.desktopChrome))).toBe(true)
    expect(isChromiumBrowser(fakeNavigator(userAgents.desktopEdge))).toBe(true)
  })

  it('does not treat WebKit-based iOS browsers as Chromium', () => {
    expect(isChromiumBrowser(fakeNavigator(userAgents.iosChrome))).toBe(false)
    expect(isChromiumBrowser(fakeNavigator(userAgents.iosEdge))).toBe(false)
    expect(isChromiumBrowser(fakeNavigator(userAgents.iosSafari))).toBe(false)
  })
})

describe('isMobileDevice', () => {
  it('recognises Android phones and tablets from the user agent', () => {
    expect(isMobileDevice(fakeNavigator(userAgents.androidChrome))).toBe(true)
    expect(isMobileDevice(fakeNavigator(userAgents.androidTabletChrome))).toBe(true)
  })

  it('recognises iOS devices from the user agent', () => {
    expect(isMobileDevice(fakeNavigator(userAgents.iosSafari))).toBe(true)
  })

  it('trusts the mobile client hint when the user agent is reduced', () => {
    const navigatorObject = {
      userAgent: userAgents.desktopChrome,
      requestMIDIAccess: () => undefined,
      userAgentData: { brands: [{ brand: 'Google Chrome', version: '140' }], mobile: true },
    } as unknown as Navigator

    expect(isMobileDevice(navigatorObject)).toBe(true)
  })

  it('does not treat desktop browsers as mobile', () => {
    expect(isMobileDevice(fakeNavigator(userAgents.desktopChrome))).toBe(false)
    expect(isMobileDevice(fakeNavigator(userAgents.desktopEdge))).toBe(false)
  })
})

describe('isUnsupportedMidiBrowser', () => {
  it('flags Android Chrome as unsupported even though it exposes Web MIDI', () => {
    expect(isUnsupportedMidiBrowser(fakeNavigator(userAgents.androidChrome), true)).toBe(true)
  })

  it('accepts a Chromium browser that exposes Web MIDI', () => {
    expect(isUnsupportedMidiBrowser(fakeNavigator(userAgents.desktopChrome), true)).toBe(false)
  })

  it('flags iOS Chrome as unsupported', () => {
    expect(
      isUnsupportedMidiBrowser(fakeNavigator(userAgents.iosChrome, { midi: false }), true),
    ).toBe(true)
  })

  it('flags a Chromium-branded browser without Web MIDI on a secure page', () => {
    expect(
      isUnsupportedMidiBrowser(fakeNavigator(userAgents.desktopChrome, { midi: false }), true),
    ).toBe(true)
  })

  it('leaves an insecure Chromium page to the insecure-context message', () => {
    expect(
      isUnsupportedMidiBrowser(fakeNavigator(userAgents.desktopChrome, { midi: false }), false),
    ).toBe(false)
  })
})
