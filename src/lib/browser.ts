type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands: Array<{ brand: string; version: string }>
    mobile?: boolean
  }
}

const chromiumBrandPattern = /chromium|google chrome|microsoft edge|opera/i
// CriOS, EdgiOS and similar iOS tokens are deliberately absent: every iOS browser runs on WebKit
// and has no Web MIDI.
const chromiumUserAgentPattern = /(?:chrome|chromium|edg|opr)\//i
// Android tablets omit "Mobile", so Android is matched on its own.
const mobileUserAgentPattern = /android|iphone|ipad|ipod|mobile/i

export function isChromiumBrowser(navigatorObject: Navigator = navigator) {
  const brands = (navigatorObject as NavigatorWithUserAgentData).userAgentData?.brands

  if (brands?.length) {
    return brands.some(({ brand }) => chromiumBrandPattern.test(brand))
  }

  return chromiumUserAgentPattern.test(navigatorObject.userAgent)
}

export function isMobileDevice(navigatorObject: Navigator = navigator) {
  if ((navigatorObject as NavigatorWithUserAgentData).userAgentData?.mobile) {
    return true
  }

  return mobileUserAgentPattern.test(navigatorObject.userAgent)
}

// Phones and tablets are unsupported even where they expose Web MIDI, as Chrome on Android does.
// An insecure page hides Web MIDI even in a capable browser; that case has its own message, so only
// a secure page without Web MIDI counts against the browser.
export function isUnsupportedMidiBrowser(
  navigatorObject: Navigator = navigator,
  isSecureContext: boolean = window.isSecureContext,
) {
  if (isMobileDevice(navigatorObject) || !isChromiumBrowser(navigatorObject)) {
    return true
  }

  return isSecureContext && !('requestMIDIAccess' in navigatorObject)
}
