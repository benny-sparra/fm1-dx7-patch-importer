import { KeyboardMusic, Languages, MoreVertical, Radio, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { midiChannels, type MidiController } from '@/hooks/use-midi'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'
import { localeNames, supportedLocales, type SupportedLocale } from '@/i18n/locale'
import { setLocale } from '@/i18n'

import { DeviceSelect } from './device-select'

type MidiControlsProps = {
  midi: MidiController
}

export function MidiConnectActions({ midi }: MidiControlsProps) {
  const { t } = useTranslation()
  const handleChange = () => {
    if (midi.midiAccess) {
      void midi.disconnectMidi()
    } else {
      void midi.connectMidi()
    }
  }

  return (
    <label className="crt-inset inline-flex min-h-8 cursor-pointer items-center gap-2 bg-[var(--crt-bg-2)] px-2.5 text-xs tracking-[0.1em] text-[var(--crt-acc-lt)] uppercase transition-colors hover:bg-[var(--crt-bg-head)]">
      <input
        aria-label={t('midi.online')}
        aria-checked={Boolean(midi.midiAccess)}
        checked={Boolean(midi.midiAccess)}
        className="peer sr-only"
        disabled={midi.isConnecting}
        onChange={handleChange}
        role="switch"
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative h-4 w-7 shrink-0 border border-[var(--crt-shadow)] bg-[var(--crt-bg-well)] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--crt-led)] after:absolute after:top-[2px] after:left-[2px] after:size-2.5 after:bg-[var(--crt-line-dk)] after:transition-[transform,background-color,box-shadow] peer-checked:after:translate-x-3 peer-checked:after:bg-[var(--crt-acc)] peer-checked:after:shadow-[0_0_7px_var(--crt-acc)]"
      />
      <span>{t('midi.online')}</span>
    </label>
  )
}

export function MidiConnectionError({ midi }: MidiControlsProps) {
  if (!midi.error) return null

  return (
    <div className="crt-inset bg-[var(--crt-bg-2)] px-4 py-3 text-sm text-[var(--crt-ink-2)]">
      {midi.error}
    </div>
  )
}

export function MidiSettingsMenu({ midi }: MidiControlsProps) {
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
          <p className="font-vt323 mt-0.5 text-xs text-muted-foreground">
            {t('settings.description')}
          </p>
        </div>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3 sm:col-span-2">
          <span className="font-vt323 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
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
        <label className="settings-option flex min-h-16 flex-col justify-start gap-2 rounded-lg border px-4 py-3">
          <span className="font-vt323 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
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
          <span className="font-vt323 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
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
          <span className="font-vt323 text-[11px] text-muted-foreground">
            {t('settings.defaultChannel')}
          </span>
        </label>
      </div>
    </details>
  )
}
