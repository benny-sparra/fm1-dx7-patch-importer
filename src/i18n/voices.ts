import { addBritishEnglish } from './add-british-english'
import voices from './locales/en-GB-voices'

// Every module that reads a string in `en-GB-voices` imports this, so the Voice strip's British
// English arrives with its chunk rather than with the page.
addBritishEnglish(voices)
