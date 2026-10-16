import { addBritishEnglish } from './add-british-english'
import officialOpen from './locales/en-GB-official-open'

// The Official Open track status imports this, so its British English arrives with its chunk
// rather than with the page.
addBritishEnglish(officialOpen)
