import type { TFunction } from 'i18next'
import { Download } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MidiConnectionError } from '@/components/midi/midi-connection-error'
import { BevelRadio, slotBadgeClassName } from '@/components/ui/bevel-radio'
import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import type { MidiController } from '@/hooks/use-midi'
import { useOfficialOpenReader } from '@/hooks/use-official-open-reader'
import '@/i18n/librarian-dialogs'
import { cn } from '@/lib/utils'
import type { Dx7Voice } from '@/lib/dx7'
import { OfficialOpenReadError, type OfficialOpenEngine } from '@/lib/official-open-transfer'

/** What is read: a bank of the device's DX7 library, or the voice of one of its DX7 tracks. */
export type OfficialOpenReadSource = 'library' | 'track'

export type OfficialOpenRead =
  { kind: 'bank'; voices: Dx7Voice[] } | { kind: 'voice'; voice: Dx7Voice }

type ReadScreenMidi = Parameters<typeof useOfficialOpenReader>[0] &
  Pick<MidiController, 'connectMidi' | 'error' | 'isConnecting' | 'midiAccess'>

type OfficialOpenReadScreenProps = {
  /** The device the firmware runs on, as the page names it: FM1 or SMK-37. */
  device: string
  midi: ReadScreenMidi
  onRead: (read: OfficialOpenRead) => void
  read: OfficialOpenRead | null
  source: OfficialOpenReadSource
}

const libraryBanks = [0, 1, 2, 3]
const tracks = [1, 2, 3, 4, 5, 6, 7, 8]

/** The first track running DX7, 1 to 8, or null when none does. */
function firstDx7Track(engines: OfficialOpenEngine[]) {
  const index = engines.indexOf('dx7')
  return index === -1 ? null : index + 1
}

/** Explains a read that failed, by its typed problem, never by its message. */
function readErrorMessage(t: TFunction, cause: unknown, device: string) {
  const problem = cause instanceof OfficialOpenReadError ? cause.problem : 'unexpected'
  switch (problem) {
    case 'no-reply':
      return t('receiveWizard.read.errors.noReply', { device })
    case 'refused':
      return t('receiveWizard.read.errors.refused', { device })
    case 'send-failed':
      return t('receiveWizard.read.errors.sendFailed', { device })
    default:
      return t('receiveWizard.read.errors.unexpected', { device })
  }
}

/**
 * Reads a bank of the DX7 library, or a DX7 track's voice, from a device on Official Open or
 * SMK37 OPEN, with the read commands approved on 2026-10-20, which change nothing on it. A track
 * list comes from command 0, so only DX7 tracks can be chosen. Each read waits for the Read
 * button, and is cancelled by a port change or by leaving the screen.
 */
export function OfficialOpenReadScreen({
  device,
  midi,
  onRead,
  read,
  source,
}: OfficialOpenReadScreenProps) {
  const { t } = useTranslation()
  const id = useId()
  const reader = useOfficialOpenReader(midi)
  const { canReadBanks, canReadTracks, readLibraryBank, readTrackEngines, readTrackVoice } = reader
  const canRead = source === 'library' ? canReadBanks : canReadTracks
  const [bank, setBank] = useState(0)
  const [track, setTrack] = useState<number | null>(null)
  const [engines, setEngines] = useState<OfficialOpenEngine[] | null>(null)
  const [enginesFailed, setEnginesFailed] = useState(false)
  const [enginesAttempt, setEnginesAttempt] = useState(0)
  const [reading, setReading] = useState<AbortController | null>(null)
  const [error, setError] = useState('')

  // The track list is read as the screen opens, and again on Try again.
  useEffect(() => {
    if (source !== 'track' || !canReadTracks) return
    const request = new AbortController()
    readTrackEngines(request.signal)
      .then((found) => {
        if (request.signal.aborted) return
        setEngines(found)
        setEnginesFailed(false)
        setTrack((current) => current ?? firstDx7Track(found))
      })
      .catch(() => {
        if (!request.signal.aborted) setEnginesFailed(true)
      })
    return () => request.abort()
  }, [canReadTracks, enginesAttempt, readTrackEngines, source])

  // Leaving the screen cancels a read still under way.
  useEffect(() => () => reading?.abort(), [reading])

  const startRead = async () => {
    if (reading || !canRead) return
    if (source === 'track' && track === null) return
    const request = new AbortController()
    setReading(request)
    setError('')
    try {
      if (source === 'library') {
        const voices = await readLibraryBank(bank, request.signal)
        if (!request.signal.aborted) onRead({ kind: 'bank', voices })
      } else if (track !== null) {
        const voice = await readTrackVoice(track, request.signal)
        if (!request.signal.aborted) onRead({ kind: 'voice', voice })
      }
    } catch (cause) {
      if (request.signal.aborted) return
      if (cause instanceof OfficialOpenReadError && cause.problem === 'cancelled') return
      setError(readErrorMessage(t, cause, device))
    } finally {
      if (!request.signal.aborted) setReading(null)
    }
  }

  const readLabel =
    source === 'library'
      ? t('receiveWizard.read.readBank', { number: bank + 1 })
      : t('receiveWizard.read.readTrack', { track: track ?? 1 })

  return (
    <>
      {midi.midiAccess ? null : (
        <Button
          aria-disabled={midi.isConnecting || undefined}
          className="justify-self-start"
          onClick={midi.isConnecting ? undefined : () => void midi.connectMidi()}
          type="button"
        >
          <span key={midi.isConnecting ? 'connecting' : 'connect'}>
            {midi.isConnecting ? t('midi.connecting') : t('dialogs.midiConnect')}
          </span>
        </Button>
      )}
      <MidiConnectionError midi={midi} />
      {midi.midiAccess && !canRead ? (
        <InfoNotice>
          <p>{t('receiveWizard.read.noPorts', { device })}</p>
        </InfoNotice>
      ) : null}

      {canRead && source === 'library' ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">
            {t('receiveWizard.read.bankLegend', { device })}
          </legend>
          <div className="grid gap-1 sm:grid-cols-4">
            {libraryBanks.map((number) => (
              <BevelRadio
                checked={bank === number}
                key={number}
                name={`${id}bank`}
                onChange={() => setBank(number)}
              >
                <span aria-hidden="true" className={slotBadgeClassName(bank === number)}>
                  {number + 1}
                </span>
                <span className="text-sm">
                  {t('receiveWizard.read.bank', { number: number + 1 })}
                </span>
              </BevelRadio>
            ))}
          </div>
        </fieldset>
      ) : null}

      {canRead && source === 'track' && engines ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">
            {t('receiveWizard.read.trackLegend', { device })}
          </legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {tracks.map((number) => {
              const engine = engines[number - 1]
              const dx7 = engine === 'dx7'
              return (
                <BevelRadio
                  checked={track === number}
                  disabled={!dx7}
                  key={number}
                  name={`${id}track`}
                  onChange={() => setTrack(number)}
                >
                  <span aria-hidden="true" className={slotBadgeClassName(track === number)}>
                    {number}
                  </span>
                  <span className="text-sm">
                    {t('receiveWizard.read.track', { track: number })}
                  </span>{' '}
                  {/* The engine names are printed on the device and stay in English. */}
                  <span
                    className={cn(
                      'font-vt323 ml-auto text-sm',
                      dx7 ? 'text-[var(--crt-acc-lt)]' : 'text-[var(--crt-ink-3)]',
                    )}
                  >
                    {engine ? engine.toUpperCase() : ''}
                  </span>
                </BevelRadio>
              )
            })}
          </div>
          {engines.includes('dx7') ? null : (
            <InfoNotice>
              <p>{t('receiveWizard.read.noDx7Tracks', { device })}</p>
            </InfoNotice>
          )}
        </fieldset>
      ) : null}

      {canRead && source === 'track' && enginesFailed ? (
        <ErrorNotice>
          <div className="grid justify-items-start gap-2">
            <p>{t('receiveWizard.read.errors.tracks', { device })}</p>
            <Button
              onClick={() => {
                setEnginesFailed(false)
                setEnginesAttempt((attempt) => attempt + 1)
              }}
              type="button"
              variant="outline"
            >
              {t('receiveWizard.read.tryAgain')}
            </Button>
          </div>
        </ErrorNotice>
      ) : null}

      {canRead && (source === 'library' || engines?.includes('dx7')) ? (
        <Button
          aria-disabled={reading ? true : undefined}
          className={cn('justify-self-start', reading ? 'barber-pole' : undefined)}
          onClick={() => void startRead()}
          type="button"
        >
          <Download aria-hidden="true" />
          {/* Its own span, so a page translator's replaced text cannot stay behind. */}
          <span key={reading ? 'reading' : 'read'}>
            {reading ? t('receiveWizard.read.reading') : readLabel}
          </span>
        </Button>
      ) : null}

      {/* Stays mounted, so a screen reader hears each change. */}
      <div className="text-sm" role="status">
        {reading ? (
          <p>{t('receiveWizard.read.reading')}</p>
        ) : read?.kind === 'bank' ? (
          <p>{t('receiveWizard.read.readBankDone', { patch: read.voices[0].name.trim() })}</p>
        ) : read?.kind === 'voice' ? (
          <p>{t('receiveWizard.read.readVoiceDone', { patch: read.voice.name.trim() })}</p>
        ) : null}
      </div>
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    </>
  )
}
