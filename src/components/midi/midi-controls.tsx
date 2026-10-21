import { Cpu, KeyboardMusic, Languages, MoreVertical, Radio, SlidersHorizontal } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { midiChannels, type MidiController } from '@/hooks/use-midi'
import { fm1FirmwareRelease, mayBeSloop } from '@/lib/fm1-firmware'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { localeNames, supportedLocales, type SupportedLocale } from '@/i18n/locale'
import { setLocale } from '@/i18n'
import { Switch } from '@/components/ui/switch'
import { ErrorNotice } from '@/components/ui/error-notice'

import { DeviceSelect, SettingsSelect } from './device-select'

type MidiConnectActionsProps = {
  midi: Pick<MidiController, 'connectMidi' | 'disconnectMidi' | 'isConnecting' | 'midiAccess'>
}

const states = ['offline', 'connecting', 'online'] as const
const stateLabels = {
  connecting: 'midi.connecting',
  offline: 'midi.offline',
  online: 'midi.online',
} as const satisfies Record<(typeof states)[number], string>

export function MidiConnectActions({ midi }: MidiConnectActionsProps) {
  const { t } = useTranslation()
  const isOnline = Boolean(midi.midiAccess)
  const currentState = midi.isConnecting ? 'connecting' : isOnline ? 'online' : 'offline'
  const handleChange = () => {
    if (midi.midiAccess) {
      void midi.disconnectMidi()
    } else {
      void midi.connectMidi()
    }
  }

  return (
    <Switch busy={midi.isConnecting} checked={isOnline} onChange={handleChange}>
      {/* The word carries the state, so the switch names what it currently is. The others are
          stacked behind it, unseen and unread, so the label keeps the width of the longest and
          nothing beside it moves when the state changes. */}
      <span className="inline-grid">
        {states.map((state) => {
          const current = state === currentState
          return (
            <span
              aria-hidden={current ? undefined : true}
              className={current ? '[grid-area:1/1]' : 'invisible [grid-area:1/1]'}
              key={state}
            >
              {t(stateLabels[state])}
            </span>
          )
        })}
      </span>
    </Switch>
  )
}

// What the badge shows for each firmware it names: its maker, its own name where the maker's is
// not enough, and the translated label and description. FM1 owners know Baud Girl's firmware by
// her name rather than FM-1+VA's, so her badge shows the name alone. SLOOP reports the name a
// Felucca development build does, so that name shows both firmwares and no maker.
const firmwareBadges = {
  felucca: {
    label: 'midi.feluccaBadgeLabel',
    maker: 'HÜGELTON',
    product: 'FELUCCA',
    title: 'midi.feluccaBadgeTitle',
  },
  feluccaOrSloop: {
    label: 'midi.feluccaOrSloopBadgeLabel',
    maker: 'FELUCCA/SLOOP',
    product: null,
    title: 'midi.feluccaOrSloopBadgeTitle',
  },
  'fm1-va': {
    label: 'midi.fm1VaBadgeLabel',
    maker: 'BAUD GIRL',
    product: null,
    title: 'midi.fm1VaBadgeTitle',
  },
  mvave: {
    label: 'midi.mvaveBadgeLabel',
    maker: 'M-VAVE',
    product: null,
    title: 'midi.mvaveBadgeTitle',
  },
  'official-open': {
    label: 'midi.officialOpenBadgeLabel',
    maker: 'M-VAVE',
    product: 'OPEN',
    title: 'midi.officialOpenBadgeTitle',
  },
} as const

/**
 * Names the firmware the FM1 runs, with the release it reported, once it has said so: M-VAVE's own,
 * whose edit buffer takes the patches the editor plays, Baud Girl's (FM-1+VA), which gets them as
 * unsaved edits, or Hügelton Instruments' Felucca or SLOOP, built on it, which play notes but ignore
 * DX7 patches. It is a status readout, not a control.
 */
export function MidiFirmwareBadge({
  className,
  midi,
}: {
  className?: string
  midi: Pick<MidiController, 'firmware' | 'isConnecting' | 'midiAccess'>
}) {
  const { t } = useTranslation()
  const { firmware } = midi
  // Offline, its place says what the switch beside it is for, so the next step is in view.
  if (!midi.midiAccess && !midi.isConnecting) {
    return (
      <span className={className ?? 'inline-flex min-h-8 items-center gap-2'}>
        <span className="text-xs text-[var(--crt-ink-2)]">{t('midi.offlineHint')}</span>
      </span>
    )
  }
  if (firmware.kind === 'checking' || firmware.kind === 'unidentified') {
    // The FM1's answer is on its way while MIDI connects and is asked, and on a phone the badge is
    // a row of its own, so its place stays, empty, rather than the page moving down when it fills.
    const expected = midi.isConnecting || (midi.midiAccess && firmware.kind === 'checking')
    return expected ? (
      <span className={className ?? 'inline-flex min-h-8 items-center gap-2'} />
    ) : null
  }
  const release = fm1FirmwareRelease(firmware)
  const badge = firmwareBadges[mayBeSloop(firmware) ? 'feluccaOrSloop' : firmware.kind]

  return (
    <span
      className={className ?? 'inline-flex min-h-8 items-center gap-2'}
      title={t(badge.title, { release })}
    >
      <span aria-hidden="true" className="text-xs font-bold tracking-[0.1em] text-[var(--crt-ink)]">
        {badge.maker}
      </span>
      {badge.product ? (
        <span aria-hidden="true" className="text-xs tracking-[0.1em] text-[var(--crt-ink-2)]">
          {badge.product}
        </span>
      ) : null}
      <span aria-hidden="true" className="text-xs tracking-[0.1em] text-[var(--crt-ink-3)]">
        {release}
      </span>
      <span className="sr-only">{t(badge.label, { release })}</span>
    </span>
  )
}

const midiConnectionErrorKeys = {
  disconnect_failed: 'midi.errors.disconnectFailed',
  enable_failed: 'midi.errors.enableFailed',
  insecure_context: 'midi.errors.insecureContext',
  permission_denied: 'midi.errors.permissionDenied',
  unsupported_browser: 'midi.errors.unsupportedBrowser',
} as const satisfies Record<NonNullable<MidiController['error']>, string>

export function MidiConnectionError({ midi }: { midi: Pick<MidiController, 'error'> }) {
  const { t } = useTranslation()
  if (!midi.error) return null

  return <ErrorNotice>{t(midiConnectionErrorKeys[midi.error])}</ErrorNotice>
}

type MidiSettingsMenuProps = {
  midi: Pick<
    MidiController,
    | 'channel'
    | 'effectChannel'
    | 'firmware'
    | 'inputs'
    | 'outputs'
    | 'selectedInputId'
    | 'selectedOutputId'
    | 'setChannel'
    | 'setEffectChannel'
    | 'setSelectedInputId'
    | 'setSelectedOutputId'
  >
}

function firmwareName(firmware: MidiController['firmware'], t: TFunction) {
  switch (firmware.kind) {
    case 'mvave':
      return t('settings.firmwareMvave', { identity: firmware.identity })
    case 'fm1-va':
      return t('settings.firmwareFm1Va', { identity: firmware.identity })
    case 'official-open':
      return t('settings.firmwareOfficialOpen', { identity: firmware.identity })
    case 'felucca':
      return mayBeSloop(firmware)
        ? t('settings.firmwareFeluccaOrSloop', { identity: firmware.identity })
        : t('settings.firmwareFelucca', { identity: firmware.identity })
    case 'checking':
      return t('settings.firmwareChecking')
    default:
      return t('settings.firmwareUnidentified')
  }
}

// What the firmware does with the patches the editor plays; any other gets parameter changes.
function firmwareSendingKey(firmware: MidiController['firmware']) {
  if (firmware.kind === 'mvave') return 'settings.firmwareEditBuffer'
  if (mayBeSloop(firmware)) return 'settings.firmwareFeluccaOrSloopIgnoresPatches'
  if (firmware.kind === 'felucca') return 'settings.firmwareIgnoresPatches'
  if (firmware.kind === 'official-open') return 'settings.firmwareOfficialOpenSends'
  return 'settings.firmwareParameterChanges'
}

/** Which firmware the FM1 runs, and what that means for the patches the editor plays on it. */
function FirmwareStatus({ midi }: { midi: Pick<MidiController, 'firmware' | 'selectedInputId'> }) {
  const { t } = useTranslation()
  const needsInput = midi.firmware.kind === 'unidentified' && !midi.selectedInputId

  return (
    <div className="settings-option flex flex-col gap-2 rounded-lg border px-4 py-3 sm:col-span-2">
      <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        <Cpu className="size-3.5" />
        <span>{t('settings.firmware')}</span>
      </span>
      <span className="text-sm">{firmwareName(midi.firmware, t)}</span>
      <span className="text-[11px] text-muted-foreground">
        {t(firmwareSendingKey(midi.firmware))}
      </span>
      {needsInput ? (
        <span className="text-[11px] text-muted-foreground">
          {t('settings.firmwareNeedsInput')}
        </span>
      ) : null}
    </div>
  )
}

export function MidiSettingsMenu({ midi }: MidiSettingsMenuProps) {
  const menuRef = useDismissableDetails()
  const { i18n, t } = useTranslation()

  return (
    <details className="group relative" ref={menuRef}>
      <summary
        aria-label={t('common.settings')}
        className="group/settings cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
        title={t('common.settings')}
      >
        <span className="hero-captioned">
          <span className="hero-action flex size-[26px] items-center justify-center transition group-hover/settings:bg-[var(--crt-sel-bg)] group-hover/settings:text-[var(--crt-acc-lt)]">
            <MoreVertical aria-hidden="true" className="size-4" />
          </span>
          <span className="hero-caption">{t('common.settings')}</span>
        </span>
      </summary>
      <div className="menu-surface absolute top-[calc(100%+0.5rem)] right-0 z-30 grid w-[min(30rem,calc(100vw-2.5rem))] gap-3 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-3 text-[var(--crt-ink)] sm:grid-cols-2">
        <div className="px-1 pt-1 sm:col-span-2">
          <p className="font-dot-matrix text-base font-semibold">{t('common.settings')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('settings.description')}</p>
        </div>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3 sm:col-span-2">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <Languages className="size-3.5" />
            {t('language')}
          </span>
          <SettingsSelect
            onChange={(event) => void setLocale(event.target.value as SupportedLocale)}
            value={i18n.resolvedLanguage}
          >
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]}
              </option>
            ))}
          </SettingsSelect>
        </label>
        <DeviceSelect
          devices={midi.outputs}
          icon={<Radio />}
          label={t('settings.output')}
          onChange={midi.setSelectedOutputId}
          value={midi.selectedOutputId}
        />
        <DeviceSelect
          devices={midi.inputs}
          icon={<KeyboardMusic />}
          label={t('settings.inputMonitor')}
          onChange={midi.setSelectedInputId}
          value={midi.selectedInputId}
        />
        <FirmwareStatus midi={midi} />
        <label className="settings-option flex min-h-16 flex-col justify-start gap-2 rounded-lg border px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-3.5" />
            {t('settings.noteChannel')}
          </span>
          <SettingsSelect
            onChange={(event) => midi.setChannel(Number(event.target.value))}
            value={midi.channel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                {t('common.channel', { number: midiChannel })}
              </option>
            ))}
          </SettingsSelect>
        </label>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-3.5" />
            {t('settings.fxChannel')}
          </span>
          <SettingsSelect
            onChange={(event) => midi.setEffectChannel(Number(event.target.value))}
            value={midi.effectChannel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                {t('common.channel', { number: midiChannel })}
              </option>
            ))}
          </SettingsSelect>
          <span className="text-[11px] text-muted-foreground">{t('settings.defaultChannel')}</span>
        </label>
      </div>
    </details>
  )
}
