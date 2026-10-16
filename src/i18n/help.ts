import { addBritishEnglish } from './add-british-english'
import help from './locales/en-GB-help'

// The guide imports this, so its British English arrives with the guide's chunk rather than with
// the page.
addBritishEnglish(help)
