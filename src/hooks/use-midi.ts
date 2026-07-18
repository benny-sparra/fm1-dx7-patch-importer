import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  WebMidi,
  type Input,
  type MessageEvent,
  type Output,
} from 'webmidi'

import { makeDx7BankPayload, type Dx7Voice } from '@/lib/dx7'
import {
  formatMidiBytes,
  getMidiSupport,
  makeLogEntry,
  portsToDevices,
  sendNoteOff,
  sendNoteOn,
  sendDx7Bank,
  type MidiDevice,
  type MidiLogEntry,
} from '@/lib/midi'
import { MidiTransferQueue } from '@/lib/midi-transfer-queue'

export const midiChannels = Array.from({ length: 16 }, (_, index) => index + 1)

export function useMidi() {
  const [midiAccess, setMidiAccess] = useState(false)
  const [outputs, setOutputs] = useState<MidiDevice<Output>[]>([])
  const [inputs, setInputs] = useState<MidiDevice<Input>[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState('')
  const [selectedInputId, setSelectedInputId] = useState('')
  const [channel, setChannel] = useState(1)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [log, setLog] = useState<MidiLogEntry[]>([
    makeLogEntry('system', 'Ready. Connect a Chromium browser to begin.'),
  ])
  const transferQueue = useRef(new MidiTransferQueue({ minimumIntervalMs: 35 }))

  const midiSupport = getMidiSupport()

  const selectedOutput = useMemo(
    () => outputs.find((device) => device.id === selectedOutputId)?.port,
    [outputs, selectedOutputId],
  )

  const selectedInput = useMemo(
    () => inputs.find((device) => device.id === selectedInputId)?.port,
    [inputs, selectedInputId],
  )

  const hasMidiOutput = Boolean(selectedOutput)

  const appendLog = useCallback((entry: MidiLogEntry) => {
    setLog((current) => [entry, ...current].slice(0, 8))
  }, [])

  const refreshDevices = useCallback(() => {
    const nextOutputs = portsToDevices(WebMidi.outputs)
    const nextInputs = portsToDevices(WebMidi.inputs)

    setOutputs(nextOutputs)
    setInputs(nextInputs)
    setSelectedOutputId((current) =>
      nextOutputs.some((device) => device.id === current)
        ? current
        : (nextOutputs[0]?.id ?? ''),
    )
    setSelectedInputId((current) =>
      nextInputs.some((device) => device.id === current)
        ? current
        : (nextInputs[0]?.id ?? ''),
    )
  }, [])

  const connectMidi = useCallback(async () => {
    if (midiSupport !== 'supported') {
      setError(
        midiSupport === 'insecure'
          ? 'Web MIDI needs HTTPS or localhost.'
          : 'This browser does not expose Web MIDI.',
      )
      return
    }

    setIsConnecting(true)
    setError('')

    try {
      await WebMidi.enable({ sysex: true })
      setMidiAccess(true)
      refreshDevices()
      appendLog(
        makeLogEntry(
          'system',
          `MIDI connected${WebMidi.sysexEnabled ? ' with SysEx enabled' : ''}.`,
        ),
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'MIDI permission was denied.',
      )
    } finally {
      setIsConnecting(false)
    }
  }, [appendLog, midiSupport, refreshDevices])

  const disconnectMidi = useCallback(async () => {
    setIsConnecting(true)
    setError('')

    try {
      await WebMidi.disable()
      setMidiAccess(false)
      setOutputs([])
      setInputs([])
      setSelectedOutputId('')
      setSelectedInputId('')
      appendLog(makeLogEntry('system', 'MIDI disconnected.'))
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'MIDI could not be disconnected.',
      )
    } finally {
      setIsConnecting(false)
    }
  }, [appendLog])

  useEffect(() => {
    if (!midiAccess) {
      return
    }

    const listener = WebMidi.addListener('portschanged', () => {
      refreshDevices()
      appendLog(makeLogEntry('system', 'MIDI device list changed.'))
    })

    return () => listener.remove()
  }, [appendLog, midiAccess, refreshDevices])

  const sendBank = useCallback(
    (bank: string, voices: Dx7Voice[]) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', `Could not send bank ${bank}; no MIDI output selected.`))
        return Promise.resolve(false)
      }

      if (!WebMidi.sysexEnabled) {
        appendLog(makeLogEntry('system', 'Enable SysEx before connecting MIDI to send a bank.'))
        return Promise.resolve(false)
      }

      if (voices.length !== 32) {
        appendLog(makeLogEntry('system', `Bank ${bank} is not loaded with 32 voices.`))
        return Promise.resolve(false)
      }

      const payload = makeDx7BankPayload(voices, channel)
      const message = Uint8Array.from([0xf0, 0x43, ...payload, 0xf7])

      appendLog(makeLogEntry('out', `Sending DX7 bank ${bank} (32 voices)…`, message))
      return transferQueue.current.enqueue(() => sendDx7Bank(selectedOutput, channel, voices))
        .then(() => {
          appendLog(makeLogEntry('out', `Sent bank ${bank}. Choose its destination on the FM1.`, message))
          return true
        })
        .catch((caughtError) => {
          appendLog(makeLogEntry('system', caughtError instanceof Error ? caughtError.message : 'Bank transfer failed.'))
          return false
        })
    },
    [appendLog, channel, selectedOutput],
  )

  const startNote = useCallback(
    (note: number, label: string) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', `Pressed ${label}; no output yet.`))
        return
      }

      sendNoteOn(selectedOutput, channel, note)
      appendLog(makeLogEntry('out', `Ch ${channel} Note On: ${label}`, [
        0x90 | ((channel - 1) & 0x0f), note, 96,
      ]))
    },
    [appendLog, channel, selectedOutput],
  )

  const stopNote = useCallback(
    (note: number) => {
      if (selectedOutput) {
        sendNoteOff(selectedOutput, channel, note)
      }
    },
    [channel, selectedOutput],
  )

  useEffect(() => {
    if (!selectedInput) {
      return
    }

    const handleMidiMessage = (event: MessageEvent) => {
      appendLog(makeLogEntry('in', formatMidiBytes(event.data), event.data))
    }

    selectedInput.addListener('midimessage', handleMidiMessage)

    return () => selectedInput.removeListener('midimessage', handleMidiMessage)
  }, [appendLog, selectedInput])

  return {
    channel,
    connectMidi,
    disconnectMidi,
    error,
    hasMidiOutput,
    inputs,
    isConnecting,
    log,
    midiAccess,
    outputs,
    sendBank,
    selectedInputId,
    selectedOutputId,
    setChannel,
    setSelectedInputId,
    setSelectedOutputId,
    startNote,
    stopNote,
  }
}

export type MidiController = ReturnType<typeof useMidi>
