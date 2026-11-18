import type { Input, MessageEvent, Output } from 'webmidi'

import { midiActivity } from '@/lib/midi-activity'
import type { OfficialOpenLink } from '@/lib/official-open-transfer'

/**
 * What the track send and the reads of M-VAVE's Official Open share: one token counter, so a read
 * and a send never use the same token, and the link over the ports in use. Only lazy code imports
 * it.
 */

// Official Open keeps the last request and answers the same bytes again with the reply it kept,
// so each request takes a token the last page load is unlikely to have used.
let nextToken = 1 + Math.floor(Math.random() * 0x3fff)

/** A token no request of this page load has used yet, 1 to 16383. */
export function takeOfficialOpenToken() {
  const token = nextToken
  nextToken = (nextToken % 0x3fff) + 1
  return token
}

/**
 * The link a request talks through: `output` for the request and `input` for its answer. Each
 * request lights the activity LED and is handed to `sent`, which logs what the caller wants
 * logged. Without an input it sends and hears nothing back.
 */
export function makeOfficialOpenLink(
  input: Input | undefined,
  output: Output,
  sent: (request: Uint8Array) => void,
): OfficialOpenLink {
  return {
    listen: (hear) => {
      const handle = (event: MessageEvent) => hear(event.data)
      input?.addListener('midimessage', handle)
      return () => input?.removeListener('midimessage', handle)
    },
    send: (request) => {
      output.send(request)
      midiActivity.signal('out')
      sent(request)
    },
  }
}
