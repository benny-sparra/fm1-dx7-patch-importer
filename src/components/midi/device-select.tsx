import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { MidiDevice, MidiPort } from '@/lib/midi'

type DeviceSelectProps = {
  devices: Array<MidiDevice<MidiPort>>
  icon: ReactNode
  label: string
  onChange: (id: string) => void
  value: string
}

export function DeviceSelect({ devices, icon, label, onChange, value }: DeviceSelectProps) {
  const { t } = useTranslation()
  return (
    <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3">
      <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </span>
      <span className="relative">
        <select
          className="settings-option-select h-8 w-full appearance-none rounded-md border py-0 pr-8 pl-2 text-sm"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {devices.length === 0 ? (
            <option value="">{t('settings.noDevice')}</option>
          ) : (
            <>
              {/* A selected port that disconnected is not replaced by another device, so say that
                  nothing is selected rather than let the first device look chosen. */}
              {devices.some((device) => device.id === value) ? null : (
                <option value="">{t('settings.noDeviceSelected')}</option>
              )}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  )
}
