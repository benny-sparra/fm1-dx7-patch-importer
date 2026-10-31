import { addBritishEnglish } from './add-british-english'
import voiceSetup from './locales/en-GB-voice-setup'

// Every module that reads a string in `en-GB-voice-setup` imports this, so the Set up Voices
// wizard's British English arrives with its chunk rather than with the Voice strip.
addBritishEnglish(voiceSetup)
