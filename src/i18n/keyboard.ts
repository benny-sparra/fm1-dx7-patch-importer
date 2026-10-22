import { addBritishEnglish } from './add-british-english'
import keyboard from './locales/en-GB-keyboard'

// Every module that reads a string in `en-GB-keyboard` imports this, so the keyboard dialog's
// British English arrives with its chunk rather than with the page.
addBritishEnglish(keyboard)
