import type { Dx7Voice } from '@/lib/dx7'

/**
 * The DX7 voice a saved-bank slot or a fetched patch holds, for tests of sounds known to be DX7.
 * Throws for a Virtual Analog preset, which holds none, or for no sound at all.
 */
export function slotVoice(sound: { voice: Dx7Voice } | object | null | undefined): Dx7Voice {
  if (!sound || !('voice' in sound)) throw new Error('Expected a DX7 voice.')
  return sound.voice
}
