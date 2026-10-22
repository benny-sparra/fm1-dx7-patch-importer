import type { Fm1Firmware } from '@/lib/fm1-firmware'

/**
 * What the editor may do with the firmware an FM1 runs, resolved in one place from `Fm1Firmware`.
 * A new firmware, a release that adds a capability, or a later device's firmware is one entry in
 * `familyProfiles` rather than a predicate in each module that needs it. A family lists only what
 * it can do, so a firmware still being identified, one not recognised, and Felucca, which ignores
 * DX7 voice data, get only the cautious parameter changes, Program Change, and the effect
 * controllers, and no vendor command. Official Open gets less still, and the one vendor command
 * that reads its tracks' engines.
 */
export type FirmwareProfile = {
  capabilities: Readonly<Record<FirmwareCapability, boolean>>
  family: Fm1Firmware['kind']
  /** How to pace preset writes: faster only on the releases it was tested on. */
  presetWriteTiming: PresetWriteTiming
}

/**
 * - `singleVoiceDumps`: a patch may go as a DX7 single-voice dump, which M-VAVE's firmware puts in
 *   its edit buffer and Official Open in the track on the dump's channel. FM-1+VA writes one
 *   straight over the selected stored preset, so every other firmware gets the patch as parameter
 *   changes, which it holds as an unsaved edit (docs/fm1-research.md, "The editor on FM-1+VA").
 * - `trackEngineRead`: Official Open's command 0, `F0 7D 'F' 'M' 02 00`, which reads each track's
 *   engine. Where it is offered, a dump goes to the track on the note channel, and only after
 *   command 0 shows that track running DX7, since a dump to another engine is dropped silently.
 * - `parameterChanges`: DX7 parameter changes reach the voice, so a live edit goes as the one
 *   parameter it changed. Official Open drops them, so there each edit goes as the whole voice.
 * - `presetRead`: FM-1+VA's preset read, `7D 10` (`readFm1VaPreset`). On any other firmware the
 *   message is an unknown vendor command.
 * - `presetWrite`: FM-1+VA's preset write, `7D 04`, with the read that confirms it.
 * - `soundControls`: FM-1+VA's sound-setting Control Changes (`makeFm1VaSoundControlMessage`).
 * - `bitcrush`: Bitcrush and the effect order, mapped on the release that added Bitcrush.
 * - `knobChoices`: what KNOB1–4 play on FM-1+VA's Preset knob bank.
 * - `programChanges`: a slot's Program Change, which selects its stored preset. M-VAVE's Official
 *   Open takes it on a DX7 track as replacing the track's voice with a built-in sound.
 * - `effectControllers`: the effect unit's controllers on the FX channel. Official Open has no such
 *   unit and takes them as the volume, pan, and modulation of the track on that channel, and
 *   M-VAVE's own firmware moved them in V16.
 */
type FirmwareCapability =
  | 'bitcrush'
  | 'effectControllers'
  | 'knobChoices'
  | 'parameterChanges'
  | 'presetRead'
  | 'presetWrite'
  | 'programChanges'
  | 'singleVoiceDumps'
  | 'soundControls'
  | 'trackEngineRead'

/** How a run of preset writes is paced. */
type PresetWriteTiming = {
  /** How long a write listens for a reply before it resolves and its read-back is sent. */
  listenMs: number
  /** The least time between sending one write and sending the next. */
  spacingMs: number
}

/**
 * Before FM-1_096: FM-1+VA's Presets page waited 3 s between writes, because writes sent closer
 * together were heard as crackling, and the editor listened 1.5 s after each for a reply. Every
 * firmware without a tested timing of its own is paced this way.
 */
const presetsPageTiming: PresetWriteTiming = { listenMs: 1500, spacingMs: 3000 }

/**
 * From FM-1_096, tested on hardware (docs/fm1-research.md, "FM-1_096"): no wait for a reply, which
 * never comes, so the read-back follows at once. The FM1 answers it about 200 ms after the write,
 * and 320 ms between writes leaves about 120 ms after that, as FM-1+VA's Device Manager waits.
 * Writes with no gap at all read back clean and without crackle, so this keeps a margin.
 */
const deviceManagerTiming: PresetWriteTiming = { listenMs: 0, spacingMs: 320 }

/**
 * The first release with a capability, or the releases from the first to the one before `before`,
 * for a capability a later release takes away.
 */
type ReleaseRange = number | { before: number; from: number }

type FamilyProfile = {
  /**
   * The releases with each capability. A capability not listed is never offered, and 0 is every
   * release, one not yet known included. A range with an end is offered only once the release is
   * known to be before it.
   */
  capabilities: Partial<Record<FirmwareCapability, ReleaseRange>>
  /** A faster preset write timing and the first release it was tested on. */
  presetWriteTiming?: { from: number; timing: PresetWriteTiming }
}

/** What every firmware but Official Open takes, as it always has. */
const channelMessages = { effectControllers: 0, parameterChanges: 0, programChanges: 0 } as const

const familyProfiles: Record<Fm1Firmware['kind'], FamilyProfile> = {
  checking: { capabilities: channelMessages },
  felucca: { capabilities: channelMessages },
  'fm1-va': {
    capabilities: {
      ...channelMessages,
      // FM-1_096 added Bitcrush and knob choices.
      bitcrush: 96,
      knobChoices: 96,
      // FM-1_079 added the preset read and the preset write.
      presetRead: 79,
      presetWrite: 79,
      // FM-1_086 added the sound-setting controllers.
      soundControls: 86,
    },
    presetWriteTiming: { from: 96, timing: deviceManagerTiming },
  },
  mvave: {
    capabilities: {
      ...channelMessages,
      // M-VAVE's notes for V16 (2026-10-21) move the effect unit to CC 70–93 and say CC 0–23 no
      // longer reach it, and V16 takes CC 1, 2, 4, 7, and 11 as modulation, volume, and
      // expression. Until a hardware run confirms the new controllers, V16 and later get none.
      effectControllers: { before: 16, from: 0 },
      singleVoiceDumps: 0,
    },
  },
  // M-VAVE's Official Open is an eight-track groovebox, not a bank of DX7 presets, and takes a
  // slot's Program Change and the effect controllers as changes to its tracks
  // (docs/fm1-research.md, "Official Open: released source"). It takes a single-voice dump into
  // a DX7 track, and command 0 says which tracks run DX7 (both approved 2026-10-16).
  'official-open': { capabilities: { singleVoiceDumps: 0, trackEngineRead: 0 } },
  unidentified: { capabilities: channelMessages },
}

/** The release an FM-1+VA, Felucca, or M-VAVE firmware reports, such as 89 for `FM-1_089`. */
function releaseNumber(firmware: Fm1Firmware) {
  if (firmware.kind === 'checking' || firmware.kind === 'unidentified') return null
  const match = /^FM-1_(\d{3})$/.exec(firmware.identity)
  return match ? Number(match[1]) : null
}

/** What the editor may do with `firmware`. */
export function resolveFirmwareProfile(firmware: Fm1Firmware): FirmwareProfile {
  const release = releaseNumber(firmware)
  const from = (range: ReleaseRange | undefined) => {
    if (range === undefined) return false
    if (typeof range === 'number') return range === 0 || (release !== null && release >= range)
    return release !== null && release >= range.from && release < range.before
  }
  const { capabilities, presetWriteTiming: fasterTiming } = familyProfiles[firmware.kind]
  return {
    capabilities: {
      bitcrush: from(capabilities.bitcrush),
      effectControllers: from(capabilities.effectControllers),
      knobChoices: from(capabilities.knobChoices),
      parameterChanges: from(capabilities.parameterChanges),
      presetRead: from(capabilities.presetRead),
      presetWrite: from(capabilities.presetWrite),
      programChanges: from(capabilities.programChanges),
      singleVoiceDumps: from(capabilities.singleVoiceDumps),
      soundControls: from(capabilities.soundControls),
      trackEngineRead: from(capabilities.trackEngineRead),
    },
    family: firmware.kind,
    presetWriteTiming:
      fasterTiming && from(fasterTiming.from) ? fasterTiming.timing : presetsPageTiming,
  }
}
