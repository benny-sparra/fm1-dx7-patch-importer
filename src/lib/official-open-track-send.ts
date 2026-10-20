import type { Input, MessageEvent, Output } from 'webmidi'

import { makeDx7SingleVoicePayload, makeYamahaSysexMessage, type Dx7Voice } from '@/lib/dx7'
import type { MidiLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'
import type { MidiTransferQueue } from '@/lib/midi-transfer-queue'
import {
  makeOfficialOpenInfoRequest,
  officialOpenTrackForChannel,
  parseOfficialOpenInfoReply,
  type OfficialOpenEngine,
  type OfficialOpenInfo,
  type OfficialOpenLink,
} from '@/lib/official-open-transfer'

/**
 * Sending a patch to a track of M-VAVE's Official Open, which `useMidi` loads the first time it
 * sends one there, so the entry carries none of it. Official Open puts a DX7 single-voice dump in
 * the track on the dump's channel only when that track runs DX7, and ignores it silently
 * otherwise (docs/fm1-research.md, "Official Open: released source"), so command 0 reads the
 * engines before every dump, and the dump goes only to a DX7 track.
 */

/** What became of a patch sent to an Official Open track. */
export type OfficialOpenTrackDelivery =
  | { channel: number; name: string; track: number; type: 'sent' }
  /** The note channel reaches no track: 8, 9, or 11–16. */
  | { channel: number; type: 'no-track' }
  | { channel: number; engine: OfficialOpenEngine; track: number; type: 'not-dx7' }
  /** The FM1 did not say which engine the track runs, so nothing was sent. */
  | { channel: number; track: number; type: 'unread' }
  /** The ports changed or MIDI was switched off first. */
  | { type: 'cancelled' }
  /** The dump could not be built or sent. */
  | { type: 'failed' }

type InfoReadProblem = 'cancelled' | 'no-reply' | 'refused' | 'send-failed' | 'unexpected'

class OfficialOpenReadError extends Error {
  readonly problem: InfoReadProblem

  constructor(problem: InfoReadProblem, message: string) {
    super(message)
    this.name = 'OfficialOpenReadError'
    this.problem = problem
  }
}

type InfoReadOptions = {
  /** How many times to send the request before giving up. */
  attempts?: number
  signal?: AbortSignal
  /** How long to wait for an answer before asking again. */
  timeoutMs?: number
}

/**
 * Asks with command 0 and resolves with the info, asking again with the same token when no answer
 * comes within `timeoutMs`, up to `attempts` times. Official Open answers a repeated request with
 * the reply it stored, so a retry is safe, and a new read takes a new token to get a fresh one.
 */
export function readOfficialOpenInfo(
  link: OfficialOpenLink,
  token: number,
  { attempts = 2, signal, timeoutMs = 1000 }: InfoReadOptions = {},
) {
  const request = makeOfficialOpenInfoRequest(token)

  return new Promise<OfficialOpenInfo>((resolve, reject) => {
    let sent = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    let stopListening = () => {}

    const finish = (outcome: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stopListening()
      signal?.removeEventListener('abort', cancel)
      outcome()
    }
    const fail = (problem: InfoReadProblem, message: string) =>
      finish(() => reject(new OfficialOpenReadError(problem, message)))

    function cancel() {
      fail('cancelled', 'The read of the track engines was cancelled.')
    }

    const ask = () => {
      if (sent === attempts) {
        fail('no-reply', 'The FM1 did not say which engine each track runs.')
        return
      }
      sent += 1
      try {
        link.send(request)
      } catch {
        fail('send-failed', 'The read of the track engines could not be sent.')
        return
      }
      timer = setTimeout(ask, timeoutMs)
    }

    const hear = (message: Uint8Array | readonly number[]) => {
      const reply = parseOfficialOpenInfoReply(message, token)
      if (!reply) return
      if (reply.type === 'info') finish(() => resolve(reply.info))
      else if (reply.type === 'refused') {
        fail('refused', `The FM1 refused the read of the track engines (${reply.status}).`)
      } else fail('unexpected', 'The FM1 answered with track engines in an unknown layout.')
    }

    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel)
    stopListening = link.listen(hear)
    ask()
  })
}

// Official Open keeps the last request and answers the same bytes again with the reply it kept,
// so each read takes a token the last page load is unlikely to have used.
let nextToken = 1 + Math.floor(Math.random() * 0x3fff)

function takeToken() {
  const token = nextToken
  nextToken = (nextToken % 0x3fff) + 1
  return token
}

/** Engine names as the FM1 shows them, for the MIDI log. */
const engineNames: Record<OfficialOpenEngine, string> = {
  '303': '303',
  '808': '808',
  dx7: 'DX7',
  pluck: 'PLUCK',
  psg: 'PSG',
  sampler: 'SAMPLER',
}

type TrackSend = {
  channel: number
  input: Input | undefined
  log: (direction: MidiLogEntry['direction'], message: string, data?: Uint8Array) => void
  output: Output
  /** The queue every MIDI write waits its turn in, so a read and its dump stay in order. */
  queue: MidiTransferQueue
  /** Sends the voice's dump on the channel, as `sendDx7Voice` does. */
  sendDump: () => void
  /** Aborted when the ports change or MIDI is switched off. */
  signal: AbortSignal
  voice: Dx7Voice
}

/**
 * Sends `voice` to the track on `channel` as a DX7 single-voice dump, after command 0 shows that
 * track running DX7. Sends nothing to a channel that reaches no track or a track on another
 * engine, and resolves with what happened rather than rejecting.
 */
export async function sendVoiceToOfficialOpenTrack({
  channel,
  input,
  log,
  output,
  queue,
  sendDump,
  signal,
  voice,
}: TrackSend): Promise<OfficialOpenTrackDelivery> {
  const track = officialOpenTrackForChannel(channel)
  if (track === null) {
    log(
      'system',
      `${voice.name} was not sent: channel ${channel} reaches no Official Open track, which play on channels 1–7 and 10.`,
    )
    return { channel, type: 'no-track' }
  }

  let message: Uint8Array
  try {
    message = makeYamahaSysexMessage(makeDx7SingleVoicePayload(voice, channel))
  } catch (caughtError) {
    log('system', caughtError instanceof Error ? caughtError.message : 'Patch transfer failed.')
    return { type: 'failed' }
  }

  const link: OfficialOpenLink = {
    listen: (hear) => {
      const handle = (event: MessageEvent) => hear(event.data)
      input?.addListener('midimessage', handle)
      return () => input?.removeListener('midimessage', handle)
    },
    send: (request) => {
      output.send(request)
      midiActivity.signal('out')
      log('out', 'Asked the FM1 which engine each track runs.', request)
    },
  }

  let delivery: OfficialOpenTrackDelivery = { type: 'cancelled' }
  try {
    await queue.enqueue(async () => {
      if (!input) {
        log('system', `${voice.name} was not sent: no MIDI input to read tracks.`)
        delivery = { channel, track, type: 'unread' }
        return
      }
      let info: OfficialOpenInfo
      try {
        info = await readOfficialOpenInfo(link, takeToken(), { signal })
      } catch (caughtError) {
        const cancelled =
          caughtError instanceof OfficialOpenReadError && caughtError.problem === 'cancelled'
        if (caughtError instanceof Error) log('system', caughtError.message)
        delivery = cancelled ? { type: 'cancelled' } : { channel, track, type: 'unread' }
        return
      }

      // The ports may have changed while the answer was on its way.
      if (signal.aborted) return
      const engine = info.engines[track - 1]
      if (engine !== 'dx7') {
        log(
          'system',
          `${voice.name} was not sent: track ${track} runs ${engineNames[engine]}, and only a DX7 track takes a patch.`,
        )
        delivery = { channel, engine, track, type: 'not-dx7' }
        return
      }

      sendDump()
      log(
        'out',
        `Sent ${voice.name} to track ${track} on channel ${channel}, an unsaved edit. Save the project on the FM1 to keep it.`,
        message,
      )
      delivery = { channel, name: voice.name, track, type: 'sent' }
    })
  } catch (caughtError) {
    // Switching MIDI off or changing output dropped it before its turn, or the port refused it.
    const failed = caughtError instanceof Error ? caughtError.message : 'Patch transfer failed.'
    log('system', `${voice.name} was not sent. ${failed}`)
    return { type: 'failed' }
  }
  return delivery
}
