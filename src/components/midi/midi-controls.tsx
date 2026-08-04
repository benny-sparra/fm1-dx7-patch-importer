import {
  KeyboardMusic,
  MoreVertical,
  Radio,
  SlidersHorizontal,
} from 'lucide-react'

import { ThemePicker } from '@/components/ui/theme-picker'
import { midiChannels, type MidiController } from '@/hooks/use-midi'
import { type ThemePreference } from '@/hooks/use-theme'
import { useDismissableDetails } from '@/hooks/use-dismissable-details'

import { DeviceSelect } from './device-select'
import { Fm1SysexTestDialog } from './fm1-sysex-test-dialog'

type MidiControlsProps = {
  midi: MidiController
}

type MidiSettingsMenuProps = MidiControlsProps & {
  theme: {
    theme: ThemePreference
    setTheme: (theme: ThemePreference) => void
  }
}

export function MidiConnectActions({ midi }: MidiControlsProps) {
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
        aria-label="MIDI online"
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
      <span>MIDI online</span>
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

export function MidiSettingsMenu({ midi, theme }: MidiSettingsMenuProps) {
  const menuRef = useDismissableDetails()

  return (
    <details className="group relative" ref={menuRef}>
      <summary
        aria-label="Settings"
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md bg-transparent text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        title="Settings"
      >
        <MoreVertical className="size-7" />
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-[min(18rem,calc(100vw-2.5rem))] gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
        <div className="px-1 pt-1">
          <p className="text-sm font-semibold">Settings</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose the colour mode, MIDI ports, and channels.
          </p>
        </div>
        <div className="grid gap-2 rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Colour mode
          </p>
          <ThemePicker onChange={theme.setTheme} value={theme.theme} />
        </div>
        <DeviceSelect
          devices={midi.outputs}
          icon={<Radio />}
          label="Output"
          onChange={midi.setSelectedOutputId}
          value={midi.selectedOutputId}
        />
        <DeviceSelect
          devices={midi.inputs}
          icon={<KeyboardMusic />}
          label="Input monitor"
          onChange={midi.setSelectedInputId}
          value={midi.selectedInputId}
        />
        <label className="flex min-h-16 flex-col justify-center gap-2 rounded-lg border bg-card px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            Note channel
          </span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            onChange={(event) => midi.setChannel(Number(event.target.value))}
            value={midi.channel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                Channel {midiChannel}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-16 flex-col justify-center gap-2 rounded-lg border bg-card px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            FX channel
          </span>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            onChange={(event) => midi.setEffectChannel(Number(event.target.value))}
            value={midi.effectChannel}
          >
            {midiChannels.map((midiChannel) => (
              <option key={midiChannel} value={midiChannel}>
                Channel {midiChannel}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted-foreground">
            FM1 default: channel 2
          </span>
        </label>
        <div className="grid gap-2 rounded-lg border bg-card px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Advanced diagnostics</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Inspect MIDI activity and test firmware capabilities.
            </p>
          </div>
          <Fm1SysexTestDialog midi={midi} />
        </div>
      </div>
    </details>
  )
}
