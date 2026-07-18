import {
  KeyboardMusic,
  MoreVertical,
  Radio,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemePicker } from '@/components/ui/theme-picker'
import { midiChannels, type MidiController } from '@/hooks/use-midi'
import { type ThemePreference } from '@/hooks/use-theme'

import { DeviceSelect } from './device-select'

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
  const handleClick = midi.midiAccess ? midi.disconnectMidi : midi.connectMidi

  return (
    <Button disabled={midi.isConnecting} onClick={handleClick}>
      {midi.isConnecting && <RefreshCw className="animate-spin" />}
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ring-1 ring-black/20 transition-all ${
          midi.midiAccess
            ? 'bg-green-400 shadow-[0_0_6px_rgb(74_222_128)]'
            : 'bg-red-500 shadow-[0_0_6px_rgb(239_68_68)]'
        }`}
      />
      {midi.isConnecting
        ? (midi.midiAccess ? 'Disconnecting MIDI' : 'Connecting MIDI')
        : (midi.midiAccess ? 'MIDI online · Disconnect' : 'MIDI idle · Connect')}
    </Button>
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
  return (
    <details className="group relative">
      <summary
        aria-label="Settings"
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        title="Settings"
      >
        <MoreVertical className="size-4" />
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-[min(18rem,calc(100vw-2.5rem))] gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
        <div className="px-1 pt-1">
          <p className="text-sm font-semibold">Settings</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose the colour mode, MIDI ports, and channel.
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
            MIDI channel
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
      </div>
    </details>
  )
}
