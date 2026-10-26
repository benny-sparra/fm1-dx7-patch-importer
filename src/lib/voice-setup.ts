/**
 * The Voice setup of M-VAVE's V16, kept between visits. The `fm1-voice-setup` key is stored data
 * under the legacy rules in AGENTS.md. Version 1 is
 * `{ "version": 1, "enabled": boolean, "voices": [{ "preset": number | null, "channel": number }
 * × 8] }`: `preset` is the FM1 preset number 0–127 (A01 is 0, D32 is 127) or null for none,
 * `channel` is 1–16, and `enabled` is the "Play several Voices" switch.
 */
const storageKey = 'fm1-voice-setup'
const storedVersion = 1

const voiceCount = 8
const lastPreset = 127
const lastChannel = 16

export type VoiceSetupEntry = {
  channel: number
  preset: number | null
}

export type VoiceSetup = {
  enabled: boolean
  voices: readonly VoiceSetupEntry[]
}

const listeners = new Set<() => void>()
// Kept in memory as well, so a setup made while storage is blocked still works this session. It is
// loaded on first use and replaced as a whole, so the snapshot stays the same until it changes.
let current: VoiceSetup | null = null

function makeDefaultSetup(): VoiceSetup {
  return {
    enabled: false,
    voices: Array.from({ length: voiceCount }, (_, index) => ({
      channel: index + 1,
      preset: null,
    })),
  }
}

function isPreset(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= lastPreset
}

function isChannel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= lastChannel
}

function normaliseSetup(record: unknown): VoiceSetup {
  const fallback = makeDefaultSetup()
  if (typeof record !== 'object' || record === null) return fallback
  const { enabled, version, voices } = record as Record<string, unknown>
  if (version !== storedVersion) return fallback
  const stored = Array.isArray(voices) ? (voices as unknown[]) : []
  return {
    enabled: enabled === true,
    voices: fallback.voices.map((voice, index) => {
      const entry = stored[index]
      const { channel, preset } =
        typeof entry === 'object' && entry !== null
          ? (entry as Record<string, unknown>)
          : { channel: undefined, preset: undefined }
      return {
        channel: isChannel(channel) ? channel : voice.channel,
        preset: isPreset(preset) ? preset : null,
      }
    }),
  }
}

function readStoredSetup() {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored === null ? makeDefaultSetup() : normaliseSetup(JSON.parse(stored))
  } catch {
    return makeDefaultSetup()
  }
}

/** The setup, the same object until an update replaces it. */
export function getVoiceSetup() {
  current ??= readStoredSetup()
  return current
}

function updateVoiceSetup(next: VoiceSetup) {
  current = next
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ enabled: next.enabled, version: storedVersion, voices: next.voices }),
    )
  } catch {
    // The setup works for this session; only keeping it for the next visit is lost.
  }
  listeners.forEach((listener) => listener())
}

function updateVoice(voice: number, change: Partial<VoiceSetupEntry>) {
  const setup = getVoiceSetup()
  const existing = setup.voices[voice]
  if (!existing) return
  const entry = { ...existing, ...change }
  if (entry.channel === existing.channel && entry.preset === existing.preset) return
  updateVoiceSetup({
    ...setup,
    voices: setup.voices.map((item, index) => (index === voice ? entry : item)),
  })
}

export function setVoiceSetupEnabled(enabled: boolean) {
  const setup = getVoiceSetup()
  if (setup.enabled !== enabled) updateVoiceSetup({ ...setup, enabled })
}

/** Gives Voice `voice` (0–7, Voice 1 is 0) the preset 0–127, or none for null; others are refused. */
export function assignVoicePreset(voice: number, preset: number | null) {
  if (preset === null || isPreset(preset)) updateVoice(voice, { preset })
}

/** Puts Voice `voice` (0–7, Voice 1 is 0) on MIDI channel 1–16; any other channel is refused. */
export function setVoiceChannel(voice: number, channel: number) {
  if (isChannel(channel)) updateVoice(voice, { channel })
}

export function subscribeVoiceSetup(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Forgets the setup held in memory, so each test starts from storage. */
export function resetVoiceSetupForTests() {
  current = null
}
