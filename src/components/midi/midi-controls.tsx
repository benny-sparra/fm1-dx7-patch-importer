import {
  KeyboardMusic,
  Languages,
  MoreVertical,
  Radio,
  SlidersHorizontal,
} from 'lucide-react'
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
      midi.disconnectMidi()
    } else {
      midi.connectMidi()
    }
  }

  return (
    <label
      className="inline-flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15"
    >
      <input
        aria-label={t('midi.online')}
        checked={Boolean(midi.midiAccess)}
        className="peer sr-only"
        disabled={midi.isConnecting}
        onChange={handleChange}
        role="switch"
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full border border-white/40 bg-white/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
      />
      <span>{t('midi.online')}</span>
    </label>
  )
}

export function MidiConnectionError({ midi }: MidiControlsProps) {
  if (!midi.error) return null

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md bg-transparent text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        title={t('common.settings')}
      >
        <MoreVertical className="size-7" />
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-[min(30rem,calc(100vw-2.5rem))] gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg sm:grid-cols-2">
        <div className="px-1 pt-1 sm:col-span-2">
          <p className="text-sm font-semibold">{t('common.settings')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('settings.description')}
          </p>
        </div>
        <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3 sm:col-span-2">
          <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Languages className="size-3.5" />
            {t('language')}
          </span>
          <select
            className="settings-option-select h-8 rounded-md border px-2 text-sm"
            onChange={(event) => void setLocale(event.target.value as SupportedLocale)}
            value={i18n.resolvedLanguage}
          >
            {supportedLocales.map((locale) => <option key={locale} value={locale}>{localeNames[locale]}</option>)}
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
          <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
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
          <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
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
          <span className="text-[11px] text-muted-foreground">
            {t('settings.defaultChannel')}
          </span>
        </label>
      </div>
    </details>
  )
}
