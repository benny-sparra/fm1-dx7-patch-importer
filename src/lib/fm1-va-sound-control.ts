import type { Fm1Firmware } from '@/lib/fm1-firmware'

/**
 * The Control Changes FM-1+VA reads on its MIDI Channel to set a Virtual Analog preset's settings,
 * as turning their knobs would: an unsaved edit, heard at once (docs/fm1-research.md, "Controllers
 * on the MIDI Channel", hardware run 2026-10-04 on FM-1_093). FM presets ignore all of them but
 * the shared ones from CC 70. Nothing here reaches CC 85–119, which FM-1+VA reads as its own knobs
 * and buttons and which stay excluded.
 *
 * A list setting splits the 128 values into equal bands, one per choice, in the order listed.
 */
export const fm1VaSoundSettings = [
  { controller: 24, setting: 'Waveform', choices: ['Sine', 'Saw', 'Tri', 'Square'] },
  { controller: 25, setting: 'Super' },
  { controller: 26, setting: 'Detune' },
  { controller: 27, setting: 'Drift' },
  { controller: 28, setting: 'Sub' },
  { controller: 29, setting: 'Noise' },
  { controller: 30, setting: 'PWM' },
  { controller: 31, setting: 'Filter Type', choices: ['LP12', 'LP24', 'BP', 'HP'] },
  { controller: 52, setting: 'Filter Envelope' },
  { controller: 53, setting: 'Filter Decay' },
  { controller: 54, setting: 'Filter Shape' },
  { controller: 55, setting: 'Filter Velocity' },
  { controller: 56, setting: 'Filter Key Tracking', choices: ['0', '33', '67', '100'] },
  { controller: 57, setting: 'LFO to Cutoff' },
  { controller: 70, setting: 'Sustain' },
  { controller: 71, setting: 'Resonance' },
  { controller: 72, setting: 'Release' },
  { controller: 73, setting: 'Attack' },
  { controller: 74, setting: 'Cutoff' },
  { controller: 75, setting: 'Decay' },
  { controller: 76, setting: 'LFO Speed' },
  { controller: 77, setting: 'LFO Pitch Mod Depth' },
  { controller: 78, setting: 'LFO Delay' },
] as const satisfies readonly {
  choices?: readonly string[]
  controller: number
  setting: string
}[]

/** FM-1_086, the FM-1+VA release that added these controllers. */
const firstSoundControlRelease = 86

/** Whether the FM1 runs FM-1+VA from the release that reads these controllers. */
export function sendsFm1VaSoundControls(firmware: Fm1Firmware) {
  // `classifyFm1Firmware` names firmware FM-1+VA only for an `FM-1_NNN` identity.
  if (firmware.kind !== 'fm1-va') return false
  return Number(firmware.identity.slice('FM-1_'.length)) >= firstSoundControlRelease
}

export function isFm1VaSoundController(controller: number) {
  return fm1VaSoundSettings.some((setting) => setting.controller === controller)
}

/** The value that picks choice `index` of a list setting: the first value of its band. */
export function fm1VaChoiceValue(index: number, choiceCount: number) {
  if (!Number.isInteger(index) || index < 0 || index >= choiceCount) {
    throw new RangeError(`A choice must be an integer from 0 to ${choiceCount - 1}.`)
  }
  return Math.ceil((index * 128) / choiceCount)
}

/**
 * One sound-setting Control Change for the MIDI Channel. Throws a `RangeError` for any controller
 * not in `fm1VaSoundSettings`, a value outside 0–127, or a channel outside 1–16.
 */
export function makeFm1VaSoundControlMessage(controller: number, value: number, channel: number) {
  if (!Number.isInteger(controller) || !isFm1VaSoundController(controller)) {
    throw new RangeError(`CC ${controller} is not an FM-1+VA sound setting.`)
  }
  if (!Number.isInteger(value) || value < 0 || value > 127) {
    throw new RangeError('An FM-1+VA sound setting value must be an integer from 0 to 127.')
  }
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) {
    throw new RangeError('MIDI channel must be an integer from 1 to 16.')
  }
  return Uint8Array.of(0xb0 | (channel - 1), controller, value)
}
