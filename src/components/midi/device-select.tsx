import { ChevronDown } from 'lucide-react'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { type MidiDevice, type MidiPort } from '@/lib/midi'

type DeviceSelectProps = {
  devices: Array<MidiDevice<MidiPort>>
  icon: ReactNode
  label: string
  onChange: (id: string) => void
  value: string
}

export function DeviceSelect({
  devices,
  icon,
  label,
  onChange,
  value,
}: DeviceSelectProps) {
  const { t } = useTranslation()
  return (
    <label className="settings-option flex min-h-16 flex-col justify-center gap-2 rounded-lg border px-4 py-3">
      <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </span>
      <span className="relative">
        <select
          className="settings-option-select h-8 w-full appearance-none rounded-md border py-0 pl-2 pr-8 text-sm"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {devices.length === 0 ? (
            <option value="">{t('settings.noDevice')}</option>
          ) : (
            devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  )
}
