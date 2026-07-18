import { Monitor, Moon, Sun } from 'lucide-react'
import { type ThemePreference } from '@/hooks/use-theme'

type ThemePickerProps = {
  onChange: (theme: ThemePreference) => void
  value: ThemePreference
}

const options = [
  { icon: Monitor, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: Moon, label: 'Dark', value: 'dark' },
] as const

export function ThemePicker({ onChange, value }: ThemePickerProps) {
  return (
    <fieldset className="flex h-10 w-fit rounded-md border border-input bg-background p-1">
      <legend className="sr-only">Colour theme</legend>
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.value

        return (
          <label
            className={`relative isolate flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-semibold transition-colors has-focus-visible:outline-none has-focus-visible:ring-2 has-focus-visible:ring-ring ${
              selected
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            key={option.value}
          >
            {selected && (
              <span
                className="absolute inset-0 -z-10 rounded-sm bg-primary shadow-sm"
              />
            )}
            <input
              checked={selected}
              className="sr-only"
              name="theme"
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <Icon aria-hidden="true" className="size-3.5" />
            {option.label}
          </label>
        )
      })}
    </fieldset>
  )
}
