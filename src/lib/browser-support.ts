import { isUnsupportedBrowser } from '@/lib/browser'

export type SupportedBrowserId = 'chrome' | 'edge' | 'firefox' | 'safari'

// The help guide's browser table, which tells someone before they connect whether their browser
// can drive the FM1. Whether this browser can is still decided by isUnsupportedBrowser, which tests
// for Web MIDI itself; the table only names the common browsers and where they work.
export const browserSupport = [
  { drivesFm1: true, id: 'chrome', name: 'Chrome', where: 'desktopAndAndroid' },
  { drivesFm1: true, id: 'edge', name: 'Edge', where: 'desktop' },
  { drivesFm1: true, id: 'firefox', name: 'Firefox', where: 'desktop' },
  { drivesFm1: false, id: 'safari', name: 'Safari' },
] as const satisfies ReadonlyArray<{
  drivesFm1: boolean
  id: SupportedBrowserId
  name: string
  where?: 'desktop' | 'desktopAndAndroid'
}>

type NavigatorWithBrands = Navigator & {
  userAgentData?: { brands?: ReadonlyArray<{ brand: string }> }
}

const brandIds: ReadonlyArray<[string, SupportedBrowserId]> = [
  ['Microsoft Edge', 'edge'],
  ['Google Chrome', 'chrome'],
]

// Every browser on iPhone and iPad is Safari's engine underneath, whatever its name, so it does
// what Safari does. Edge and Opera also say Chrome, and Chrome also says Safari, so the order
// matters. Opera is not in the table, so it names nothing rather than passing for Chrome.
const userAgentIds: ReadonlyArray<[RegExp, SupportedBrowserId | undefined]> = [
  [/iPhone|iPad|iPod/, 'safari'],
  [/Edg(?:A)?\//, 'edge'],
  [/OPR\//, undefined],
  [/Firefox\//, 'firefox'],
  [/Chrome\//, 'chrome'],
  [/Safari\//, 'safari'],
]

// Chromium browsers list their brands, and one that names none of the table's, such as Brave or
// Samsung Internet, is not taken for Chrome. The user agent string is read only without brands,
// as in Firefox, Safari, and an insecure page.
export function detectBrowser(
  navigatorObject: Navigator = navigator,
): SupportedBrowserId | undefined {
  const brands = (navigatorObject as NavigatorWithBrands).userAgentData?.brands
  if (brands?.length) {
    const names = new Set(brands.map(({ brand }) => brand))
    return brandIds.find(([brand]) => names.has(brand))?.[1]
  }
  return userAgentIds.find(([pattern]) => pattern.test(navigatorObject.userAgent))?.[1]
}

// The browser the table marks as this one. A name that disagrees with what the browser can
// actually do, such as Firefox on Android, which has no Web MIDI, marks nothing rather than
// promising that it works.
export function currentBrowserInTable(
  navigatorObject: Navigator = navigator,
  isSecureContext: boolean = window.isSecureContext,
): SupportedBrowserId | undefined {
  const id = detectBrowser(navigatorObject)
  const entry = browserSupport.find((browser) => browser.id === id)
  if (!entry) return undefined
  const drivesFm1 = !isUnsupportedBrowser(navigatorObject, isSecureContext)
  return entry.drivesFm1 === drivesFm1 ? entry.id : undefined
}
