import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Input, MessageEvent, Output } from 'webmidi'

import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  dx7BankVoiceCount,
  makeDx7BankPayload,
  makeDx7SingleVoicePayload,
  type Dx7Voice,
} from '@/lib/dx7'
import { fm1EffectParameterCount, normalizeFm1Effects } from '@/lib/fm1-effects'
import { reportBankTransferFailure } from '@/lib/monitoring'
import {
  formatMidiBytes,
  makeFm1EffectDiagnosticControlMessage,
  getMidiSupport,
  isHighRateMidiMessage,
  makeFm1EffectControlMessage,
  makeFm1ParameterPayload,
  makeFm1ProgramChangeMessage,
  makeLogEntry,
  portsToDevices,
  resolveMidiPortSelection,
  sendFm1Parameter,
  sendFm1ProgramChange,
  sendFm1EffectControl,
  sendFm1EffectDiagnosticControl,
  sendNoteOff,
  sendNoteOn,
  sendDx7Bank,
  sendDx7Voice,
  type MidiDevice,
  type MidiLogEntry,
} from '@/lib/midi'
import { MidiTransferCancelledError, MidiTransferQueue } from '@/lib/midi-transfer-queue'
import { MidiLogStore } from '@/lib/midi-log-store'

type WebMidiApi = (typeof import('webmidi'))['WebMidi']

export type BankTransferResult =
  | { ok: true }
  | {
      ok: false
      reason: 'invalid_bank' | 'no_output' | 'sysex_unavailable' | 'transport'
    }

export const midiChannels = Array.from({ length: 16 }, (_, index) => index + 1)

type MidiConnectionErrorCode =
  | 'disconnect_failed'
  | 'enable_failed'
  | 'insecure_context'
  | 'permission_denied'
  | 'unsupported_browser'

const midiStorageKeys = {
  autoConnect: 'fm1-midi-auto-connect',
  channel: 'fm1-midi-channel',
  effectChannel: 'fm1-midi-effect-channel',
  inputId: 'fm1-midi-input-id',
  outputId: 'fm1-midi-output-id',
} as const

const outputChangedMessage = 'Queued MIDI messages were dropped because the MIDI output changed.'

function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function storeValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // MIDI still works when storage is unavailable (for example, in private browsing).
  }
}

function readStoredChannel() {
  const storedChannel = Number(readStoredValue(midiStorageKeys.channel))
  return midiChannels.includes(storedChannel) ? storedChannel : 1
}

function readStoredEffectChannel() {
  const storedChannel = Number(readStoredValue(midiStorageKeys.effectChannel))
  return midiChannels.includes(storedChannel) ? storedChannel : 2
}

function midiConnectionFailureReason(error: unknown) {
  return error instanceof Error &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
    ? ('permission_denied' as const)
    : ('enable_failed' as const)
}

export function useMidi() {
  const [midiAccess, setMidiAccess] = useState(false)
  const [outputs, setOutputs] = useState<MidiDevice<Output>[]>([])
  const [inputs, setInputs] = useState<MidiDevice<Input>[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState('')
  const [selectedInputId, setSelectedInputId] = useState('')
  const [channel, setChannelState] = useState(readStoredChannel)
  const [effectChannel, setEffectChannelState] = useState(readStoredEffectChannel)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<MidiConnectionErrorCode | null>(null)
  const [logStore] = useState(
    () => new MidiLogStore([makeLogEntry('system', 'Ready. Connect MIDI to begin.')]),
  )
  const [transferQueue] = useState(() => new MidiTransferQueue({ minimumIntervalMs: 35 }))
  const webMidi = useRef<WebMidiApi | null>(null)
  const webMidiLoader = useRef<Promise<WebMidiApi> | null>(null)
  const preferredOutputId = useRef(readStoredValue(midiStorageKeys.outputId))
  const preferredInputId = useRef(readStoredValue(midiStorageKeys.inputId))
  const startupConnectionAttempted = useRef(false)

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
  const hasMidiInput = Boolean(selectedInput)
  const sysexAvailable = midiAccess && Boolean(webMidi.current?.sysexEnabled)

  const appendLog = useCallback(
    (entry: MidiLogEntry) => {
      logStore.append(entry)
    },
    [logStore],
  )

  const loadWebMidi = useCallback(() => {
    if (!webMidiLoader.current) {
      webMidiLoader.current = import('webmidi')
        .then((module) => {
          webMidi.current = module.WebMidi
          return module.WebMidi
        })
        .catch((loadError) => {
          webMidiLoader.current = null
          throw loadError
        })
    }
    return webMidiLoader.current
  }, [])

  const refreshDevices = useCallback(
    (reason: 'changed' | 'connected') => {
      const activeWebMidi = webMidi.current
      if (!activeWebMidi) return

      const nextOutputs = portsToDevices(activeWebMidi.outputs)
      const nextInputs = portsToDevices(activeWebMidi.inputs)
      const chosenOutputId = preferredOutputId.current
      const outputId = resolveMidiPortSelection(nextOutputs, chosenOutputId, reason)
      const inputId = resolveMidiPortSelection(nextInputs, preferredInputId.current, reason)
      // The port in use is the one to wait for if it disconnects. A port missing when MIDI connects
      // is forgotten for this session, so the device picked in its place is kept from then on.
      if (reason === 'connected' || outputId) preferredOutputId.current = outputId
      if (reason === 'connected' || inputId) preferredInputId.current = inputId

      setOutputs(nextOutputs)
      setInputs(nextInputs)
      setSelectedOutputId(outputId)
      setSelectedInputId(inputId)
      if (reason === 'changed' && chosenOutputId && !outputId) {
        appendLog(
          makeLogEntry(
            'system',
            'The selected MIDI output disconnected. Reconnect it or choose another output.',
          ),
        )
      }
    },
    [appendLog],
  )

  const enableMidi = useCallback(
    async (remember: boolean) => {
      const method = remember ? ('manual' as const) : ('automatic' as const)
      if (midiSupport !== 'supported') {
        const reason = midiSupport === 'insecure' ? 'insecure_context' : 'unsupported_browser'
        setError(reason)
        trackAnalyticsEvent({ data: { method, reason }, name: 'midi_connection_failed' })
        return
      }

      setIsConnecting(true)
      setError(null)

      try {
        const activeWebMidi = await loadWebMidi()
        await activeWebMidi.enable({ sysex: true })
        setMidiAccess(true)
        if (remember) storeValue(midiStorageKeys.autoConnect, 'true')
        refreshDevices('connected')
        appendLog(
          makeLogEntry(
            'system',
            `MIDI connected${activeWebMidi.sysexEnabled ? ' with SysEx enabled' : ''}.`,
          ),
        )
        trackAnalyticsEvent({
          data: {
            method,
            output: activeWebMidi.outputs.length > 0 ? 'available' : 'missing',
            sysex: activeWebMidi.sysexEnabled ? 'enabled' : 'disabled',
          },
          name: 'midi_connected',
        })
      } catch (caughtError) {
        const reason = midiConnectionFailureReason(caughtError)
        setError(reason)
        trackAnalyticsEvent({
          data: { method, reason },
          name: 'midi_connection_failed',
        })
      } finally {
        setIsConnecting(false)
      }
    },
    [appendLog, loadWebMidi, midiSupport, refreshDevices],
  )

  const connectMidi = useCallback(() => enableMidi(true), [enableMidi])

  const disconnectMidi = useCallback(async () => {
    transferQueue.clear('Queued MIDI messages were dropped because MIDI was switched off.')
    setIsConnecting(true)
    setError(null)

    try {
      await webMidi.current?.disable()
      storeValue(midiStorageKeys.autoConnect, 'false')
      setMidiAccess(false)
      setOutputs([])
      setInputs([])
      setSelectedOutputId('')
      setSelectedInputId('')
      appendLog(makeLogEntry('system', 'MIDI disconnected.'))
    } catch {
      setError('disconnect_failed')
    } finally {
      setIsConnecting(false)
    }
  }, [appendLog, transferQueue])

  useEffect(() => {
    if (
      startupConnectionAttempted.current ||
      readStoredValue(midiStorageKeys.autoConnect) !== 'true'
    ) {
      return
    }

    startupConnectionAttempted.current = true
    void enableMidi(false)
  }, [enableMidi])

  useEffect(() => {
    // Each queued message was meant for the output selected when it was queued. Drop the rest when
    // that output changes or disconnects, or on teardown, so they never reach another device or a
    // closed port. `clear` rather than `cancel` keeps the queue usable, so a Strict Mode remount
    // does not leave the hook holding a permanently cancelled queue.
    return () => transferQueue.clear(outputChangedMessage)
  }, [selectedOutput, transferQueue])

  const selectOutput = useCallback((id: string) => {
    preferredOutputId.current = id
    storeValue(midiStorageKeys.outputId, id)
    setSelectedOutputId(id)
  }, [])

  const selectInput = useCallback((id: string) => {
    preferredInputId.current = id
    storeValue(midiStorageKeys.inputId, id)
    setSelectedInputId(id)
  }, [])

  const setChannel = useCallback((nextChannel: number) => {
    if (!midiChannels.includes(nextChannel)) return
    setChannelState(nextChannel)
    storeValue(midiStorageKeys.channel, String(nextChannel))
  }, [])

  const setEffectChannel = useCallback((nextChannel: number) => {
    if (!midiChannels.includes(nextChannel)) return
    setEffectChannelState(nextChannel)
    storeValue(midiStorageKeys.effectChannel, String(nextChannel))
  }, [])

  useEffect(() => {
    if (!midiAccess) {
      return
    }

    const listener = webMidi.current?.addListener('portschanged', () => {
      refreshDevices('changed')
      appendLog(makeLogEntry('system', 'MIDI device list changed.'))
    })

    return () => listener?.remove()
  }, [appendLog, midiAccess, refreshDevices])

  const sendBank = useCallback(
    (bank: string, voices: Dx7Voice[]) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', `Could not send bank ${bank}; no MIDI output selected.`))
        return Promise.resolve<BankTransferResult>({ ok: false, reason: 'no_output' })
      }

      if (!webMidi.current?.sysexEnabled) {
        appendLog(makeLogEntry('system', 'Enable SysEx before connecting MIDI to send a bank.'))
        return Promise.resolve<BankTransferResult>({ ok: false, reason: 'sysex_unavailable' })
      }

      if (voices.length !== dx7BankVoiceCount) {
        appendLog(
          makeLogEntry('system', `Bank ${bank} is not loaded with ${dx7BankVoiceCount} voices.`),
        )
        return Promise.resolve<BankTransferResult>({ ok: false, reason: 'invalid_bank' })
      }

      const payload = makeDx7BankPayload(voices, channel)
      const message = Uint8Array.from([0xf0, 0x43, ...payload, 0xf7])

      appendLog(
        makeLogEntry('out', `Sending DX7 bank ${bank} (${dx7BankVoiceCount} voices)…`, message),
      )
      return transferQueue
        .enqueue(() => sendDx7Bank(selectedOutput, channel, voices))
        .then(() => {
          // The "Sending" entry already holds the full message, so this one does not repeat it.
          appendLog(makeLogEntry('out', `Sent bank ${bank}. Choose its destination on the FM1.`))
          return { ok: true } as const
        })
        .catch((caughtError) => {
          if (caughtError instanceof MidiTransferCancelledError) {
            // Switching MIDI off or changing output dropped the bank before it was sent. That is
            // not a transport failure, so it stays out of monitoring.
            appendLog(makeLogEntry('system', `Bank ${bank} was not sent. ${caughtError.message}`))
            return { ok: false, reason: 'no_output' } as const
          }
          reportBankTransferFailure({
            channel,
            stage: 'controller',
            sysexAvailable: Boolean(webMidi.current?.sysexEnabled),
            voiceCount: voices.length,
          })
          appendLog(
            makeLogEntry(
              'system',
              caughtError instanceof Error ? caughtError.message : 'Bank transfer failed.',
            ),
          )
          return { ok: false, reason: 'transport' } as const
        })
    },
    [appendLog, channel, selectedOutput, transferQueue],
  )

  const sendVoice = useCallback(
    (voice: Dx7Voice) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', `Could not send ${voice.name}; no MIDI output selected.`))
        return Promise.resolve(false)
      }
      if (!webMidi.current?.sysexEnabled) {
        appendLog(makeLogEntry('system', 'Enable SysEx before sending a browser patch.'))
        return Promise.resolve(false)
      }

      const payload = makeDx7SingleVoicePayload(voice, channel)
      const message = Uint8Array.from([0xf0, 0x43, ...payload, 0xf7])
      appendLog(makeLogEntry('out', `Sending ${voice.name} to the FM1 edit buffer…`, message))

      return transferQueue
        .enqueue(() => sendDx7Voice(selectedOutput, channel, voice))
        .then(() => {
          appendLog(
            makeLogEntry('out', `Sent ${voice.name}. Hold SAVE on the FM1 to store it.`, message),
          )
          return true
        })
        .catch((caughtError) => {
          appendLog(
            makeLogEntry(
              'system',
              caughtError instanceof Error ? caughtError.message : 'Patch transfer failed.',
            ),
          )
          return false
        })
    },
    [appendLog, channel, selectedOutput, transferQueue],
  )

  const sendProgramChange = useCallback(
    (program: number) => {
      if (!selectedOutput) {
        appendLog(
          makeLogEntry('system', 'Could not select an FM1 program; no MIDI output selected.'),
        )
        return false
      }

      try {
        const message = makeFm1ProgramChangeMessage(program, channel)
        sendFm1ProgramChange(selectedOutput, channel, program)
        appendLog(
          makeLogEntry('out', `Selected FM1 program ${program} on channel ${channel}.`, message),
        )
        return true
      } catch (caughtError) {
        appendLog(
          makeLogEntry(
            'system',
            caughtError instanceof Error ? caughtError.message : 'FM1 program selection failed.',
          ),
        )
        return false
      }
    },
    [appendLog, channel, selectedOutput],
  )

  const sendParameter = useCallback(
    (parameter: number, value: number) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', 'Could not send FM1 parameter; no MIDI output selected.'))
        return false
      }
      if (!webMidi.current?.sysexEnabled) {
        appendLog(makeLogEntry('system', 'Enable SysEx before testing parameter editing.'))
        return false
      }

      try {
        const payload = makeFm1ParameterPayload(parameter, value)
        const message = Uint8Array.from([0xf0, 0x43, ...payload, 0xf7])
        void transferQueue
          .enqueue(() => {
            sendFm1Parameter(selectedOutput, parameter, value)
            appendLog(makeLogEntry('out', `Sent FM1 parameter ${parameter} = ${value}.`, message))
          }, `parameter-${parameter}`)
          .catch((caughtError) => {
            appendLog(
              makeLogEntry(
                'system',
                caughtError instanceof Error ? caughtError.message : 'FM1 parameter write failed.',
              ),
            )
          })
        return true
      } catch (caughtError) {
        appendLog(
          makeLogEntry(
            'system',
            caughtError instanceof Error ? caughtError.message : 'FM1 parameter test failed.',
          ),
        )
        return false
      }
    },
    [appendLog, selectedOutput, transferQueue],
  )

  const sendEffectParameter = useCallback(
    (controller: number, value: number) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', 'Could not send FM1 effect; no MIDI output selected.'))
        return false
      }

      try {
        const message = makeFm1EffectControlMessage(controller, value, effectChannel)
        void transferQueue
          .enqueue(() => {
            sendFm1EffectControl(selectedOutput, effectChannel, controller, value)
            appendLog(
              makeLogEntry(
                'out',
                `Sent FM1 effect CC ${controller} = ${value} on channel ${effectChannel}.`,
                message,
              ),
            )
          }, `effect-${controller}`)
          .catch((caughtError) => {
            appendLog(
              makeLogEntry(
                'system',
                caughtError instanceof Error ? caughtError.message : 'FM1 effect write failed.',
              ),
            )
          })
        return true
      } catch (caughtError) {
        appendLog(
          makeLogEntry(
            'system',
            caughtError instanceof Error ? caughtError.message : 'FM1 effect write failed.',
          ),
        )
        return false
      }
    },
    [appendLog, effectChannel, selectedOutput, transferQueue],
  )

  const sendEffectDiagnosticControl = useCallback(
    (controller: number, value: number) => {
      if (!import.meta.env.DEV) return false

      if (!selectedOutput) {
        appendLog(
          makeLogEntry('system', 'Could not send development FX probe; no MIDI output selected.'),
        )
        return false
      }

      try {
        const message = makeFm1EffectDiagnosticControlMessage(controller, value, effectChannel)
        void transferQueue
          .enqueue(() => {
            sendFm1EffectDiagnosticControl(selectedOutput, effectChannel, controller, value)
            appendLog(
              makeLogEntry(
                'out',
                `Sent development FX probe CC ${controller} = ${value} on channel ${effectChannel}.`,
                message,
              ),
            )
          }, `effect-diagnostic-${controller}`)
          .catch((caughtError) => {
            appendLog(
              makeLogEntry(
                'system',
                caughtError instanceof Error ? caughtError.message : 'Development FX probe failed.',
              ),
            )
          })
        return true
      } catch (caughtError) {
        appendLog(
          makeLogEntry(
            'system',
            caughtError instanceof Error ? caughtError.message : 'Development FX probe failed.',
          ),
        )
        return false
      }
    },
    [appendLog, effectChannel, selectedOutput, transferQueue],
  )

  const sendEffectSettings = useCallback(
    (settings: Uint8Array) => {
      const normalized = normalizeFm1Effects(settings)
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', 'Could not send FM1 effects; no MIDI output selected.'))
        return Promise.resolve(false)
      }

      const transfers = Array.from({ length: fm1EffectParameterCount }, (_, controller) =>
        transferQueue.enqueue(
          () =>
            sendFm1EffectControl(selectedOutput, effectChannel, controller, normalized[controller]),
          `effect-${controller}`,
        ),
      )

      appendLog(makeLogEntry('out', `Sending FM1 effect unit on channel ${effectChannel}…`))
      return Promise.all(transfers)
        .then(() => true)
        .catch((caughtError) => {
          appendLog(
            makeLogEntry(
              'system',
              caughtError instanceof Error ? caughtError.message : 'FM1 effect transfer failed.',
            ),
          )
          return false
        })
    },
    [appendLog, effectChannel, selectedOutput, transferQueue],
  )

  const startNote = useCallback(
    (note: number, label: string) => {
      if (!selectedOutput) {
        appendLog(makeLogEntry('system', `Pressed ${label}; no output yet.`))
        return
      }

      try {
        sendNoteOn(selectedOutput, channel, note)
        appendLog(
          makeLogEntry('out', `Ch ${channel} Note On: ${label}`, [
            0x90 | ((channel - 1) & 0x0f),
            note,
            96,
          ]),
        )
      } catch (caughtError) {
        appendLog(
          makeLogEntry(
            'system',
            caughtError instanceof Error ? caughtError.message : 'MIDI note-on failed.',
          ),
        )
      }
    },
    [appendLog, channel, selectedOutput],
  )

  const stopNote = useCallback(
    (note: number) => {
      if (selectedOutput) {
        try {
          sendNoteOff(selectedOutput, channel, note)
        } catch (caughtError) {
          appendLog(
            makeLogEntry(
              'system',
              caughtError instanceof Error ? caughtError.message : 'MIDI note-off failed.',
            ),
          )
        }
      }
    },
    [appendLog, channel, selectedOutput],
  )

  useEffect(() => {
    if (!selectedInput) {
      return
    }

    const handleMidiMessage = (event: MessageEvent) => {
      if (isHighRateMidiMessage(event.data)) return
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
    effectChannel,
    hasMidiOutput,
    hasMidiInput,
    inputs,
    isConnecting,
    logStore,
    midiAccess,
    outputs,
    sendBank,
    sendEffectDiagnosticControl,
    sendEffectParameter,
    sendEffectSettings,
    sendParameter,
    sendProgramChange,
    sendVoice,
    selectedInputId,
    selectedOutputId,
    setChannel,
    setEffectChannel,
    setSelectedInputId: selectInput,
    setSelectedOutputId: selectOutput,
    startNote,
    stopNote,
    sysexAvailable,
  }
}

export type MidiController = ReturnType<typeof useMidi>
