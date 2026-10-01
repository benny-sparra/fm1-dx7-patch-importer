import { describe, expect, it } from 'vitest'

import { browserSupport, currentBrowserInTable, detectBrowser } from './browser-support'

const userAgents = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

function fakeNavigator({
  brands,
  userAgent,
  webMidi = false,
}: {
  brands?: string[]
  userAgent: string
  webMidi?: boolean
}) {
  return {
    userAgent,
    ...(brands && { userAgentData: { brands: brands.map((brand) => ({ brand })) } }),
    ...(webMidi && { requestMIDIAccess: () => Promise.reject(new Error('unused')) }),
  } as unknown as Navigator
}

describe('browserSupport', () => {
  it('lists each browser once', () => {
    const ids = browserSupport.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('says Safari is the one listed browser without Web MIDI', () => {
    expect(browserSupport.filter(({ drivesFm1 }) => !drivesFm1).map(({ id }) => id)).toEqual([
      'safari',
    ])
  })
})

describe('detectBrowser', () => {
  it.each([
    ['chromeMac', 'chrome'],
    ['chromeAndroid', 'chrome'],
    ['edgeWindows', 'edge'],
    ['firefoxLinux', 'firefox'],
    ['firefoxAndroid', 'firefox'],
    ['safariMac', 'safari'],
  ] as const)('reads %s from its user agent as %s', (userAgent, id) => {
    expect(detectBrowser(fakeNavigator({ userAgent: userAgents[userAgent] }))).toBe(id)
  })

  it('reads Chrome on an iPhone as Safari, whose engine it runs on', () => {
    expect(detectBrowser(fakeNavigator({ userAgent: userAgents.chromeIphone }))).toBe('safari')
  })

  it('prefers the brands a Chromium browser lists to its user agent', () => {
    const edge = fakeNavigator({
      brands: ['Chromium', 'Microsoft Edge', 'Not=A?Brand'],
      userAgent: userAgents.chromeMac,
    })

    expect(detectBrowser(edge)).toBe('edge')
  })

  it('does not take a Chromium browser that names none of the table for Chrome', () => {
    const brave = fakeNavigator({
      brands: ['Chromium', 'Brave', 'Not=A?Brand'],
      userAgent: userAgents.chromeMac,
    })

    expect(detectBrowser(brave)).toBeUndefined()
  })

  it('does not take Opera, which the table leaves out, for Chrome', () => {
    expect(detectBrowser(fakeNavigator({ userAgent: userAgents.operaWindows }))).toBeUndefined()
  })

  it('names nothing for a user agent it does not recognise', () => {
    expect(detectBrowser(fakeNavigator({ userAgent: 'curl/8.7.1' }))).toBeUndefined()
  })
})

describe('currentBrowserInTable', () => {
  it('marks a browser that has the Web MIDI the table promises', () => {
    const chrome = fakeNavigator({ userAgent: userAgents.chromeMac, webMidi: true })

    expect(currentBrowserInTable(chrome, true)).toBe('chrome')
  })

  it('marks Safari when it has no Web MIDI', () => {
    expect(currentBrowserInTable(fakeNavigator({ userAgent: userAgents.safariMac }), true)).toBe(
      'safari',
    )
  })

  it('marks nothing when a browser the table says works has no Web MIDI', () => {
    const firefoxAndroid = fakeNavigator({ userAgent: userAgents.firefoxAndroid })

    expect(currentBrowserInTable(firefoxAndroid, true)).toBeUndefined()
  })

  it('trusts the table on an insecure page, which hides Web MIDI from every browser', () => {
    const chrome = fakeNavigator({ userAgent: userAgents.chromeMac })

    expect(currentBrowserInTable(chrome, false)).toBe('chrome')
  })
})
