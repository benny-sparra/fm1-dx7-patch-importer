import type { Fm1Firmware } from '@/lib/fm1-firmware'

/**
 * What the editor may do with the firmware an FM1 runs, resolved in one place from `Fm1Firmware`.
 * A new firmware, a release that adds a capability, or a later device's firmware is one entry in
 * `familyProfiles` rather than a predicate in each module that needs it. A family lists only what
 * it can do, so a firmware still being identified, one not recognised, and Felucca, which ignores
 * DX7 voice data, get nothing: the cautious parameter changes and no vendor command.
 */
export type FirmwareProfile = {
  capabilities: Readonly<Record<FirmwareCapability, boolean>>
  family: Fm1Firmware['kind']
  /** How to pace preset writes: faster only on the releases it was tested on. */
  presetWriteTiming: PresetWriteTiming
}

/**
 * - `singleVoiceDumps`: a patch may go as a DX7 single-voice dump, which M-VAVE's firmware puts in
 *   its edit buffer. FM-1+VA writes one straight over the selected stored preset, so every other
 *   firmware gets the patch as parameter changes, which it holds as an unsaved edit
 *   (docs/fm1-research.md, "The editor on FM-1+VA").
 * - `presetRead`: FM-1+VA's preset read, `7D 10` (`readFm1VaPreset`). On any other firmware the
 *   message is an unknown vendor command.
 * - `presetWrite`: FM-1+VA's preset write, `7D 04`, with the read that confirms it.
 * - `soundControls`: FM-1+VA's sound-setting Control Changes (`makeFm1VaSoundControlMessage`).
 * - `bitcrush`: Bitcrush and the effect order, mapped on the release that added Bitcrush.
 * - `knobChoices`: what KNOB1–4 play on FM-1+VA's Preset knob bank.
 */
type FirmwareCapability =
  'bitcrush' | 'knobChoices' | 'presetRead' | 'presetWrite' | 'singleVoiceDumps' | 'soundControls'

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

type FamilyProfile = {
  /** The first release with each capability. A capability not listed is never offered. */
  capabilities: Partial<Record<FirmwareCapability, number>>
  /** A faster preset write timing and the first release it was tested on. */
  presetWriteTiming?: { from: number; timing: PresetWriteTiming }
}

const familyProfiles: Record<Fm1Firmware['kind'], FamilyProfile> = {
  checking: { capabilities: {} },
  felucca: { capabilities: {} },
  'fm1-va': {
    capabilities: {
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
  mvave: { capabilities: { singleVoiceDumps: 0 } },
  unidentified: { capabilities: {} },
}

/** The release an identified firmware reports, such as 89 for `FM-1_089`. */
function releaseNumber(firmware: Fm1Firmware) {
  if (firmware.kind === 'checking' || firmware.kind === 'unidentified') return null
  // `classifyFm1Firmware` names a family only for an `FM-1_NNN` identity.
  return Number(firmware.identity.slice('FM-1_'.length))
}

/** What the editor may do with `firmware`. */
export function resolveFirmwareProfile(firmware: Fm1Firmware): FirmwareProfile {
  const release = releaseNumber(firmware)
  const from = (firstRelease: number | undefined) =>
    release !== null && firstRelease !== undefined && release >= firstRelease
  const { capabilities, presetWriteTiming: fasterTiming } = familyProfiles[firmware.kind]
  return {
    capabilities: {
      bitcrush: from(capabilities.bitcrush),
      knobChoices: from(capabilities.knobChoices),
      presetRead: from(capabilities.presetRead),
      presetWrite: from(capabilities.presetWrite),
      singleVoiceDumps: from(capabilities.singleVoiceDumps),
      soundControls: from(capabilities.soundControls),
    },
    family: firmware.kind,
    presetWriteTiming:
      fasterTiming && from(fasterTiming.from) ? fasterTiming.timing : presetsPageTiming,
  }
}
