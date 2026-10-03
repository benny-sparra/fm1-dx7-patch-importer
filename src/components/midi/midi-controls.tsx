import { Cpu, KeyboardMusic, Languages, MoreVertical, Radio, SlidersHorizontal } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { midiChannels, type MidiController } from '@/hooks/use-midi'
import { fm1FirmwareRelease } from '@/lib/fm1-firmware'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { localeNames, supportedLocales, type SupportedLocale } from '@/i18n/locale'
import { setLocale } from '@/i18n'
import { Switch } from '@/components/ui/switch'

import { DeviceSelect } from './device-select'

type MidiConnectActionsProps = {
  midi: Pick<MidiController, 'connectMidi' | 'disconnectMidi' | 'isConnecting' | 'midiAccess'>
}

export function MidiConnectActions({ midi }: MidiConnectActionsProps) {
  const { t } = useTranslation()
  const isOnline = Boolean(midi.midiAccess)
  const handleChange = () => {
    if (midi.midiAccess) {
      void midi.disconnectMidi()
    } else {
      void midi.connectMidi()
    }
  }

  return (
    <Switch checked={isOnline} disabled={midi.isConnecting} onChange={handleChange}>
      {/* The word carries the state, so the switch names what it currently is. */}
      <span>
        {midi.isConnecting ? t('midi.connecting') : isOnline ? t('midi.online') : t('midi.offline')}
      </span>
    </Switch>
  )
}

// What the badge shows for each firmware it names: its maker, its own name where the maker's is
// not enough, and the translated label and description.
const firmwareBadges = {
  felucca: {
    label: 'midi.feluccaBadgeLabel',
    maker: 'HÜGELTON',
    product: 'FELUCCA',
    title: 'midi.feluccaBadgeTitle',
  },
  'fm1-va': {
    label: 'midi.fm1VaBadgeLabel',
    maker: 'BAUD GIRL',
    product: 'FM-1+VA',
    title: 'midi.fm1VaBadgeTitle',
  },
  mvave: {
    label: 'midi.mvaveBadgeLabel',
    maker: 'M-VAVE',
    product: null,
    title: 'midi.mvaveBadgeTitle',
  },
} as const

/**
 * Names the firmware the FM1 runs, with the release it reported, once it has said so: M-VAVE's own,
 * whose edit buffer takes the patches the editor plays, Baud Girl's FM-1+VA, which gets them as
 * unsaved edits, or Hügelton Instruments' Felucca, which plays notes but ignores DX7 patches. It is
 * a status readout, not a control.
 */
export function MidiFirmwareBadge({
  className,
  midi,
}: {
  className?: string
  midi: Pick<MidiController, 'firmware'>
}) {
  const { t } = useTranslation()
  const { firmware } = midi
  if (firmware.kind === 'checking' || firmware.kind === 'unidentified') return null
  const release = fm1FirmwareRelease(firmware)
  const badge = firmwareBadges[firmware.kind]

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

  return (
    <div className="crt-inset bg-[var(--crt-bg-2)] px-4 py-3 text-sm text-[var(--crt-ink-2)]">
      {t(midiConnectionErrorKeys[midi.error])}
    </div>
  )
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
    case 'felucca':
      return t('settings.firmwareFelucca', { identity: firmware.identity })
    case 'checking':
      return t('settings.firmwareChecking')
    default:
      return t('settings.firmwareUnidentified')
  }
}

// What the firmware does with the patches the editor plays; any other gets parameter changes.
function firmwareSendingKey({ kind }: MidiController['firmware']) {
  if (kind === 'mvave') return 'settings.firmwareEditBuffer'
  if (kind === 'felucca') return 'settings.firmwareIgnoresPatches'
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
        className="hero-action flex size-[26px] cursor-pointer list-none items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
        title={t('common.settings')}
      >
        <MoreVertical className="size-4" />
      </summary>
      <div className="menu-surface absolute top-9 right-0 z-30 grid w-[min(30rem,calc(100vw-2.5rem))] gap-3 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-3 text-[var(--crt-ink)] sm:grid-cols-2">
        <div className="px-1 pt-1 sm:col-span-2">
          <p className="font-dot-matrix text-base font-semibold">{t('common.settings')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('settings.description')}</p>
        </div>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3 sm:col-span-2">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <Languages className="size-3.5" />
            {t('language')}
          </span>
          <select
            className="settings-option-select h-8 rounded-md border px-2 text-sm"
            onChange={(event) => void setLocale(event.target.value as SupportedLocale)}
            value={i18n.resolvedLanguage}
          >
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]}
              </option>
            ))}
          </select>
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
          <select
            className="settings-option-select h-8 rounded-md border px-2 text-sm"
            onChange={(event) => midi.setChannel(Number(event.target.value))}
            value={midi.channel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                {t('common.channel', { number: midiChannel })}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-3.5" />
            {t('settings.fxChannel')}
          </span>
          <select
            className="settings-option-select h-8 rounded-md border px-2 text-sm"
            onChange={(event) => midi.setEffectChannel(Number(event.target.value))}
            value={midi.effectChannel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                {t('common.channel', { number: midiChannel })}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground">{t('settings.defaultChannel')}</span>
        </label>
      </div>
    </details>
  )
}
