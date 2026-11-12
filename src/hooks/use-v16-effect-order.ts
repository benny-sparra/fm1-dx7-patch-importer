import { useCallback, useEffect, useRef, useState } from 'react'
import type { Input, MessageEvent, Output } from 'webmidi'

import type { MidiController } from '@/hooks/use-midi'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { makeLogEntry } from '@/lib/midi'
import { midiActivity } from '@/lib/midi-activity'
import {
  effectOrderSize,
  isEffectOrder,
  makeEffectOrderWrite,
  readEffectOrder,
  readV16SettingsBlock,
  type V16SettingsLink,
} from '@/lib/v16-settings-block'

type EffectOrderMidi = Pick<
  MidiController,
  | 'firmware'
  | 'hasMidiOutput'
  | 'inputs'
  | 'logStore'
  | 'outputs'
  | 'queueEffectOrder'
  | 'selectedInputId'
  | 'selectedOutputId'
  | 'sysexAvailable'
>

export type V16EffectOrder = {
  /** Takes `order`, read from the FM1 some other way, as the order it holds now. */
  adopt: (order: readonly number[]) => void
  /** Moves the effect at place `from` to place `to`; one read and one write of the FM1's table. */
  move: (from: number, to: number) => void
  /**
   * Puts the whole chain in `order`, as an FX preset recalls it: one read and one write, or nothing
   * when the order is not `ready` or already `order`.
   */
  set: (order: readonly number[]) => void
  /** The effects by number, first place first: as read from the FM1, or the default meanwhile. */
  order: readonly number[]
  /**
   * `unavailable` while the profile does not offer the order, MIDI is offline, or SysEx or a port
   * is missing; `reading` until the FM1 answers the one read made as the tab opens; `failed` when
   * it does not; `ready` once the order is the FM1's own.
   */
  status: 'failed' | 'ready' | 'reading' | 'unavailable'
  /** Whether the last move did not reach the FM1, so the order shown is the one it still has. */
  writeFailed: boolean
}

const defaultOrder = Array.from({ length: effectOrderSize }, (_, effect) => effect)

type Read = { input: Input; order: number[] | null; output: Output }

/**
 * V16's effect order, kept with the Effects tab that mounts it: read once from the FM1 as the tab
 * opens, then changed one move at a time. A move shows at once, reads the FM1's table again just
 * before its one write (the table holds each effect's On/Off and Type too, which the tab's own
 * edits change), and puts the order back if either fails. The order is unsaved on the FM1 until
 * its SAVE. The read and the writes belong to the ports they started on: changing either, or
 * switching MIDI off, cancels what is waiting, and unmounting does the same. Offered only while
 * the profile's `effectOrder` allows (AGENTS.md, "MIDI").
 */
export function useV16EffectOrder(midi: EffectOrderMidi): V16EffectOrder {
  const { firmware, logStore, queueEffectOrder } = midi
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)?.port
  const output = midi.outputs.find((device) => device.id === midi.selectedOutputId)?.port
  const offered =
    resolveFirmwareProfile(firmware).capabilities.effectOrder &&
    midi.hasMidiOutput &&
    midi.sysexAvailable &&
    input !== undefined &&
    output !== undefined
  const [read, setRead] = useState<Read | null>(null)
  const [order, setShownOrder] = useState<number[] | null>(null)
  // The order last shown, for a call from an older render, such as a toast's Undo, to compare
  // against. Written beside the state, never during render.
  const latest = useRef<number[] | null>(null)
  const setOrder = useCallback((next: number[] | null) => {
    latest.current = next
    setShownOrder(next)
  }, [])
  const [writeFailed, setWriteFailed] = useState(false)
  const session = useRef<{ confirmed: number[]; signal: AbortSignal } | null>(null)

  const makeLink = useCallback(
    (from: Input, to: Output): V16SettingsLink => ({
      listen: (hear) => {
        const handle = (event: MessageEvent) => hear(event.data)
        from.addListener('midimessage', handle)
        return () => from.removeListener('midimessage', handle)
      },
      send: (message) => {
        to.send(message)
        midiActivity.signal('out')
        logStore.append(makeLogEntry('out', 'Asked the FM1 for its settings block.', message))
      },
    }),
    [logStore],
  )

  useEffect(() => {
    if (!offered || !input || !output) return
    const controller = new AbortController()
    session.current = {
      confirmed: defaultOrder,
      signal: controller.signal,
    }
    const load = async () => {
      try {
        const block = await readV16SettingsBlock(makeLink(input, output), {
          signal: controller.signal,
        })
        const found = readEffectOrder(block)
        if (found && session.current) session.current.confirmed = found
        setOrder(found)
        setRead({ input, order: found, output })
        setWriteFailed(false)
      } catch (error) {
        if (controller.signal.aborted) return
        logStore.append(
          makeLogEntry('system', error instanceof Error ? error.message : 'The read failed.'),
        )
        setRead({ input, order: null, output })
      }
    }
    void load()
    return () => {
      controller.abort()
      session.current = null
    }
  }, [input, logStore, makeLink, offered, output, setOrder])

  const current = offered && read?.input === input && read.output === output ? read : null
  const shown = current?.order ? (order ?? current.order) : defaultOrder

  /** Shows `next` at once and writes it to the FM1, putting the order back if that fails. */
  const write = useCallback(
    (next: number[]) => {
      const active = session.current
      if (!input || !output || !active) return
      setOrder(next)
      setWriteFailed(false)
      const fail = () => {
        if (active.signal.aborted) return
        setOrder(active.confirmed)
        setWriteFailed(true)
      }
      void queueEffectOrder(async () => {
        if (active.signal.aborted) return
        try {
          // Fresh, so a switch or type changed since the last read is written as it now is.
          const block = await readV16SettingsBlock(makeLink(input, output), {
            signal: active.signal,
          })
          if (active.signal.aborted) return
          const message = makeEffectOrderWrite(block, next)
          output.send(message)
          midiActivity.signal('out')
          logStore.append(makeLogEntry('out', 'Changed the effect order on the FM1.', message))
          active.confirmed = next
        } catch {
          fail()
        }
      }, active.signal).catch(fail)
    },
    [input, logStore, makeLink, output, queueEffectOrder, setOrder],
  )

  const move = useCallback(
    (from: number, to: number) => {
      const latestOrder = latest.current
      if (!session.current || !latestOrder || from === to) return
      if (
        ![from, to].every(
          (place) => Number.isInteger(place) && place >= 0 && place < latestOrder.length,
        )
      )
        return
      const next = latestOrder.slice()
      next.splice(to, 0, ...next.splice(from, 1))
      write(next)
    },
    [write],
  )

  const set = useCallback(
    (wanted: readonly number[]) => {
      const latestOrder = latest.current
      if (!session.current || !latestOrder || !isEffectOrder(wanted)) return
      if (wanted.every((effect, place) => effect === latestOrder[place])) return
      write(wanted.slice())
    },
    [write],
  )

  const adopt = useCallback(
    (found: readonly number[]) => {
      if (!offered || !input || !output) return
      const next = found.slice()
      if (session.current) session.current.confirmed = next
      setOrder(next)
      setRead({ input, order: next, output })
      setWriteFailed(false)
    },
    [input, offered, output, setOrder],
  )

  return {
    adopt,
    move,
    set,
    order: shown,
    status: !offered ? 'unavailable' : !current ? 'reading' : current.order ? 'ready' : 'failed',
    writeFailed,
  }
}
