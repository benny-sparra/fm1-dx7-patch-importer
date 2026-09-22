// Support follows Web MIDI itself rather than the browser's name or the kind of device, so any
// browser that exposes it is accepted, including Chrome on Android, which drives the FM1 over USB.
// An insecure page hides Web MIDI even in a capable browser; that case has its own message, so only
// a secure page without Web MIDI counts against the browser.
export function isUnsupportedBrowser(
  navigatorObject: Navigator = navigator,
  isSecureContext: boolean = window.isSecureContext,
) {
  return isSecureContext && !('requestMIDIAccess' in navigatorObject)
}
