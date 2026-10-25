import type { TFunction } from 'i18next'
import { Cable, Music, Upload, Usb } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeviceSelect } from '@/components/midi/device-select'
import { MidiConnectionError } from '@/components/midi/midi-connection-error'
import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { BankPreview, useWizardScreens, WizardFooter } from '@/components/patches/bank-wizard'
import { PreviewPatchButton } from '@/components/patches/preview-patch-button'
import { undoToastOptions } from '@/components/patches/undo-toast'
import { BevelRadio, slotBadgeClassName } from '@/components/ui/bevel-radio'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { InfoNotice } from '@/components/ui/info-notice'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { WarningNotice } from '@/components/ui/warning-notice'
import { useDx7VoiceReceiver } from '@/hooks/use-dx7-voice-receiver'
import type { MidiController } from '@/hooks/use-midi'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import '@/i18n/librarian-dialogs'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { Dx7BankFileError, type Dx7Voice } from '@/lib/dx7'
import type { Dx7VoiceFileError } from '@/lib/dx7-voice-file'
import type { Dx7VoiceReceipt } from '@/lib/dx7-voice-receiver'
import { patchSlotCode } from '@/lib/patch-library'

/** What is sending: an FM1 on M-VAVE's V16 with Bank Export, or one patch from anything else. */
export type ReceiveSource = 'fm1' | 'patch'

type ReceiveMidi = Parameters<typeof useDx7VoiceReceiver>[0] &
  Pick<
    MidiController,
    'connectMidi' | 'error' | 'isConnecting' | 'midiAccess' | 'setSelectedInputId'
  >

type ReceiveFromFm1DialogProps = {
  /** The library's banks in order, each with the name it shows. */
  banks: { id: string; name: string }[]
  /** The bank it replaces unless another is chosen: the one whose menu opened it. */
  initialBank: string
  /** The slot a single patch replaces unless another is chosen, when a slot's menu opened it. */
  initialSlot?: number
  initialSource: ReceiveSource
  library: Pick<
    PatchLibrary,
    'importBank' | 'loadedBanks' | 'patches' | 'replaceVoice' | 'undoChange'
  >
  midi: ReceiveMidi
  onClose: () => void
  /** Plays a received patch through the FM1 edit buffer with the default effects. */
  onPlay: (voice: Dx7Voice) => void
}

// One screen for each decision: what is sending, waiting for it, hearing what arrived, and where
// it goes.
type Screen = 'destination' | 'listen' | 'review' | 'source'
const screens: Screen[] = ['source', 'listen', 'review', 'destination']

type Received = { kind: 'bank'; voices: Dx7Voice[] } | { kind: 'voice'; voice: Dx7Voice }

const screenHelpKeys = {
  destination: 'receiveWizard.help.destination',
  listen: 'receiveWizard.help.listen',
  review: 'receiveWizard.help.review',
  source: 'receiveWizard.help.source',
} as const

const sourceOptions = [
  {
    Icon: Usb,
    hint: 'receiveWizard.sources.fm1Hint',
    title: 'receiveWizard.sources.fm1',
    value: 'fm1',
  },
  {
    Icon: Music,
    hint: 'receiveWizard.sources.patchHint',
    title: 'receiveWizard.sources.patch',
    value: 'patch',
  },
] as const

const sourceSteps = {
  fm1: [
    'receiveWizard.steps.fm1Connect',
    'receiveWizard.steps.next',
    'receiveWizard.steps.fm1Export',
  ],
  patch: [
    'receiveWizard.steps.patchConnect',
    'receiveWizard.steps.next',
    'receiveWizard.steps.patchSend',
  ],
} as const

/** Explains a dump that arrived but is not a DX7 patch or bank, and how to send it again. */
function receivedErrorMessage(
  t: TFunction,
  error: Dx7BankFileError | Dx7VoiceFileError,
  source: ReceiveSource,
) {
  const isBank = error instanceof Dx7BankFileError
  switch (error.problem) {
    case 'checksum':
    case 'high-bit-data':
      if (!isBank) return t('receiveWizard.errors.damaged')
      return t(
        source === 'fm1'
          ? 'receiveWizard.errors.bankDamagedFm1'
          : 'receiveWizard.errors.bankDamaged',
      )
    case 'bank':
    case 'format':
    case 'size':
    case 'too-large':
      return t('receiveWizard.errors.format')
  }
}

type ListeningScreenProps = {
  error: Dx7BankFileError | Dx7VoiceFileError | null
  midi: ReceiveMidi
  onReceipt: (receipt: Dx7VoiceReceipt) => void
  received: Received | null
  source: ReceiveSource
}

/**
 * Listens on the input monitor while it is showing, and only then, and fixes what stops it there:
 * MIDI switched off or no input chosen. It sends nothing.
 */
function ListeningScreen({ error, midi, onReceipt, received, source }: ListeningScreenProps) {
  const { t } = useTranslation()
  const state = useDx7VoiceReceiver(midi, onReceipt)
  const input = midi.inputs.find((device) => device.id === midi.selectedInputId)

  return (
    <>
      {midi.midiAccess ? (
        <DeviceSelect
          devices={midi.inputs}
          icon={<Cable />}
          label={t('settings.inputMonitor')}
          onChange={midi.setSelectedInputId}
          value={midi.selectedInputId}
        />
      ) : (
        <Button
          aria-disabled={midi.isConnecting || undefined}
          className="justify-self-start"
          onClick={midi.isConnecting ? undefined : () => void midi.connectMidi()}
          type="button"
        >
          {/* Keyed by state: a page translator's replaced text would otherwise stay behind. */}
          <span key={midi.isConnecting ? 'connecting' : 'connect'}>
            {midi.isConnecting ? t('midi.connecting') : t('dialogs.midiConnect')}
          </span>
        </Button>
      )}
      <MidiConnectionError midi={midi} />
      {/* Stays mounted, so a screen reader hears each change. */}
      <div className="text-sm" role="status">
        {received?.kind === 'bank' ? (
          <p>{t('receiveWizard.receivedBank', { patch: received.voices[0].name.trim() })}</p>
        ) : received?.kind === 'voice' ? (
          <p>{t('receiveWizard.received', { patch: received.voice.name.trim() })}</p>
        ) : state === 'listening' ? (
          // What to do on the sending device shows only now, so nothing is sent before the
          // editor listens: an FM1 left without a listener says Receive Timeout.
          <div className="grid gap-2">
            <p>{t('receiveWizard.listening', { input: input?.name ?? '' })}</p>
            <p>{t(source === 'fm1' ? 'receiveWizard.startFm1' : 'receiveWizard.startPatch')}</p>
          </div>
        ) : (
          <InfoNotice>
            <p>
              {t(
                !midi.midiAccess
                  ? 'receiveWizard.noMidi'
                  : state === 'no-input'
                    ? 'receiveWizard.noInput'
                    : 'receiveWizard.noSysex',
              )}
            </p>
          </InfoNotice>
        )}
      </div>
      {error ? <ErrorNotice>{receivedErrorMessage(t, error, source)}</ErrorNotice> : null}
      {source === 'fm1' ? (
        <p className="text-xs text-[var(--crt-ink-3)]">{t('receiveWizard.timeout')}</p>
      ) : null}
    </>
  )
}

/**
 * Receives a DX7 32-voice bank, as a stock FM1 on V16 sends with Bank Export, or one DX7 patch from
 * Dexed, a DX7, or another editor, and puts it in a bank or slot of the library. It sends nothing:
 * the FM1 or the other device starts the transfer, and the input monitor is listened to only while
 * the listening screen shows. It opens as soon as it is rendered and reports closing, so the page
 * can drop it.
 */
export function ReceiveFromFm1Dialog({
  banks,
  initialBank,
  initialSlot,
  initialSource,
  library,
  midi,
  onClose,
  onPlay,
}: ReceiveFromFm1DialogProps) {
  const { t } = useTranslation()
  // The actions sit in the pinned footer, outside the form, and submit it by its id.
  const formId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const toast = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [source, setSource] = useState(initialSource)
  // What arrived last, each voice keeping one object so playing it twice sends it once, and the
  // error of a dump that arrived after it, which leaves nothing to take on.
  const [received, setReceived] = useState<Received | null>(null)
  const [receiveError, setReceiveError] = useState<Dx7BankFileError | Dx7VoiceFileError | null>(
    null,
  )
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [chosenBank, setChosenBank] = useState(
    banks.some((bank) => bank.id === initialBank) ? initialBank : (banks[0]?.id ?? ''),
  )
  const [chosenSlot, setChosenSlot] = useState(initialSlot ?? 1)
  const [error, setError] = useState('')

  const { focusFirstControl, formRef, goToScreen, isLastScreen, screen, screenIndex } =
    useWizardScreens(screens, { onMove: () => setError('') })

  // A patch replaces one already in a bank, so it goes only to a bank that holds patches.
  const patchBanks = banks.filter((bank) => library.loadedBanks.includes(bank.id))
  const destinationBank =
    received?.kind === 'voice' && !library.loadedBanks.includes(chosenBank)
      ? (patchBanks[0]?.id ?? '')
      : chosenBank
  const destinationName = banks.find((bank) => bank.id === destinationBank)?.name ?? ''
  const slots = library.patches
    .filter((patch) => patch.bank === destinationBank)
    .sort((first, second) => first.number - second.number)
  const destinationSlot = slots.find((patch) => patch.number === chosenSlot) ?? slots[0]
  const replacing = library.loadedBanks.includes(destinationBank)

  const screenReady =
    screen === 'source' || screen === 'review'
      ? true
      : screen === 'listen'
        ? received !== null && receiveError === null
        : received?.kind === 'bank'
          ? destinationBank !== ''
          : destinationSlot !== undefined

  // The librarian mounts this dialog only while it is wanted, so it opens itself as it appears and
  // its state is discarded with it rather than being reset by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  const receive = (receipt: Dx7VoiceReceipt) => {
    setPlayingIndex(null)
    if (receipt.kind === 'error') {
      setReceived(null)
      setReceiveError(receipt.error)
      return
    }
    setReceiveError(null)
    setReceived(receipt)
  }

  const play = (index: number) => {
    const voice = received?.kind === 'bank' ? received.voices[index] : received?.voice
    if (!voice) return
    onPlay(voice)
    setPlayingIndex(index)
  }

  const finish = () => {
    if (!received) return
    setError('')
    try {
      if (received.kind === 'bank') {
        const changed = library.importBank(destinationBank, received.voices)
        trackAnalyticsEvent({ data: { source: 'midi' }, name: 'bank_imported' })
        toast.success(
          t('toasts.bankImported', { bank: destinationName }),
          undoToastOptions(t, library, changed),
        )
      } else if (destinationSlot) {
        const changed = library.replaceVoice(
          destinationBank,
          destinationSlot.number,
          received.voice,
        )
        toast.success(
          t('toasts.patchReplaced', {
            patch: received.voice.name,
            slot: patchSlotCode(destinationSlot),
          }),
          undoToastOptions(t, library, changed),
        )
      }
      dialogRef.current?.close()
    } catch (cause) {
      setError(bankErrorMessage(t, cause, t('banks.importFailed')))
    }
  }

  // Enter in a field, like the footer's button, moves on, and puts the patches in place on the
  // last screen.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!screenReady) return
    if (isLastScreen) finish()
    else goToScreen(screenIndex + 1)
  }

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={onClose}
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        window.requestAnimationFrame(focusFirstControl)
      }}
      ref={dialogRef}
      size="2xl"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('receiveWizard.title')}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]" id={descriptionId}>
          {t(screenHelpKeys[screen])}
        </p>

        <form className="grid gap-5 p-5" id={formId} noValidate onSubmit={submit} ref={formRef}>
          {screen === 'source' ? (
            <>
              <fieldset>
                <legend className="sr-only">{t('receiveWizard.sourceLegend')}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sourceOptions.map(({ Icon, hint, title, value }) => (
                    <BevelRadio
                      aria-describedby={`${formId}${value}`}
                      aria-label={t(title)}
                      checked={source === value}
                      className="grid h-full content-start justify-items-start gap-2 p-5"
                      key={value}
                      name="receive-source"
                      onChange={() => setSource(value)}
                    >
                      <Icon aria-hidden="true" className="size-7 text-[var(--crt-acc-lt)]" />
                      <span aria-hidden="true" className="text-base font-semibold">
                        {t(title)}
                      </span>
                      <span className="text-sm text-[var(--crt-ink-3)]" id={`${formId}${value}`}>
                        {t(hint)}
                      </span>
                    </BevelRadio>
                  ))}
                </div>
              </fieldset>
              <section aria-labelledby={`${formId}steps`} className="grid gap-2">
                <h3 className="text-sm font-semibold" id={`${formId}steps`}>
                  {t('receiveWizard.stepsHeading')}
                </h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm" key={source}>
                  {sourceSteps[source].map((step) => (
                    <li key={step}>{t(step)}</li>
                  ))}
                </ol>
              </section>
            </>
          ) : null}

          {screen === 'listen' ? (
            <ListeningScreen
              error={receiveError}
              midi={midi}
              onReceipt={receive}
              received={received}
              source={source}
            />
          ) : null}

          {screen === 'review' && received?.kind === 'bank' ? (
            <BankPreview
              heading={t('receiveWizard.receivedTitle')}
              onPlay={play}
              playingIndex={playingIndex}
              voices={received.voices}
            />
          ) : null}
          {screen === 'review' && received?.kind === 'voice' ? (
            <section aria-labelledby={`${formId}patch`} className="grid gap-2">
              <h3 className="text-sm font-semibold" id={`${formId}patch`}>
                {t('receiveWizard.receivedPatchTitle')}
              </h3>
              <div className="dither-well max-w-60 border border-[var(--crt-line-dk)] p-2">
                <PreviewPatchButton
                  isPlaying={playingIndex !== null}
                  label={t('receiveWizard.play', { name: received.voice.name.trim() })}
                  name={received.voice.name}
                  number={1}
                  onClick={() => play(0)}
                  playingLabel={t('banks.auditioning')}
                />
              </div>
            </section>
          ) : null}

          {screen === 'destination' && received?.kind === 'bank' ? (
            <>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-semibold">
                  {t('receiveWizard.bankLegend')}
                </legend>
                <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
                  {banks.map((bank) => (
                    <BevelRadio
                      checked={bank.id === destinationBank}
                      key={bank.id}
                      name="receive-bank"
                      onChange={() => setChosenBank(bank.id)}
                    >
                      <span
                        aria-hidden="true"
                        className={slotBadgeClassName(bank.id === destinationBank)}
                      >
                        {bank.id}
                      </span>
                      <span className="min-w-0 truncate text-sm">{bank.name}</span>
                      {library.loadedBanks.includes(bank.id) ? null : (
                        <span className="ml-auto text-xs text-[var(--crt-ink-3)]">
                          {t('receiveWizard.emptyBank')}
                        </span>
                      )}
                    </BevelRadio>
                  ))}
                </div>
              </fieldset>
              {replacing ? (
                <WarningNotice>
                  <p>{t('receiveWizard.bankWarning', { bank: destinationName })}</p>
                </WarningNotice>
              ) : null}
            </>
          ) : null}

          {screen === 'destination' && received?.kind === 'voice' ? (
            patchBanks.length === 0 ? (
              <InfoNotice>
                <p>{t('receiveWizard.noBanks')}</p>
              </InfoNotice>
            ) : (
              <>
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-semibold">
                    {t('receiveWizard.patchBankLegend')}
                  </legend>
                  <div className="grid max-h-60 gap-1 overflow-y-auto sm:grid-cols-2">
                    {patchBanks.map((bank) => (
                      <BevelRadio
                        checked={bank.id === destinationBank}
                        key={bank.id}
                        name="receive-patch-bank"
                        onChange={() => setChosenBank(bank.id)}
                      >
                        <span
                          aria-hidden="true"
                          className={slotBadgeClassName(bank.id === destinationBank)}
                        >
                          {bank.id}
                        </span>
                        <span className="min-w-0 truncate text-sm">{bank.name}</span>
                      </BevelRadio>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold" htmlFor={`${formId}slot`}>
                    {t('receiveWizard.slotLabel')}
                  </label>
                  <Select
                    id={`${formId}slot`}
                    onChange={(event) => setChosenSlot(Number(event.target.value))}
                    value={destinationSlot?.number ?? ''}
                  >
                    {slots.map((patch) => (
                      <option key={patch.id} value={patch.number}>
                        {t('receiveWizard.slotOption', {
                          patch: patch.name.trim(),
                          slot: patchSlotCode(patch),
                        })}
                      </option>
                    ))}
                  </Select>
                </div>
                {destinationSlot ? (
                  <WarningNotice>
                    <p>
                      {t('receiveWizard.patchWarning', {
                        patch: destinationSlot.name.trim(),
                        received: received.voice.name.trim(),
                        slot: patchSlotCode(destinationSlot),
                      })}
                    </p>
                  </WarningNotice>
                ) : null}
              </>
            )
          ) : null}

          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        </form>
      </DialogBody>
      <WizardFooter
        action={
          isLastScreen
            ? {
                icon: <Upload />,
                label: replacing ? t('receiveWizard.replace') : t('overwriteImport.actionEmpty'),
                variant: replacing ? 'destructive' : 'default',
              }
            : null
        }
        disabled={!screenReady}
        formId={formId}
        onBack={() => goToScreen(screenIndex - 1)}
        screenIndex={screenIndex}
        working={false}
      />
    </Dialog>
  )
}
