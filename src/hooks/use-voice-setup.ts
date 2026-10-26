import { useSyncExternalStore } from 'react'

import { getAimedVoice, getVoiceSetup, subscribeVoiceSetup } from '@/lib/voice-setup'

/** The stored V16 Voice setup and the Voice last aimed at, kept outside React in `voice-setup`. */
export function useVoiceSetup() {
  const setup = useSyncExternalStore(subscribeVoiceSetup, getVoiceSetup)
  const aimed = useSyncExternalStore(subscribeVoiceSetup, getAimedVoice)
  return { aimed, setup }
}
