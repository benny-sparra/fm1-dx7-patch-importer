type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean
  }
}

// Android tablets omit "Mobile", so Android is matched on its own.
const mobileUserAgentPattern = /android|iphone|ipad|ipod|mobile/i

export function isMobileDevice(navigatorObject: Navigator = navigator) {
  if ((navigatorObject as NavigatorWithUserAgentData).userAgentData?.mobile) {
    return true
  }

  return mobileUserAgentPattern.test(navigatorObject.userAgent)
}

export type UnsupportedBrowserReason = 'mobile' | 'browser'

// Support follows Web MIDI itself rather than the browser's name, so any desktop browser that
// exposes it, such as Chrome, Edge, Opera, or Firefox, is accepted.
// Phones and tablets are unsupported even where they expose Web MIDI, as Chrome on Android does.
// An insecure page hides Web MIDI even in a capable browser; that case has its own message, so only
// a secure page without Web MIDI counts against the browser.
export function getUnsupportedBrowserReason(
  navigatorObject: Navigator = navigator,
  isSecureContext: boolean = window.isSecureContext,
): UnsupportedBrowserReason | undefined {
  if (isMobileDevice(navigatorObject)) {
    return 'mobile'
  }

  return isSecureContext && !('requestMIDIAccess' in navigatorObject) ? 'browser' : undefined
}
