import { addBritishEnglish } from './add-british-english'
import librarianDialogs from './locales/en-GB-librarian-dialogs'

// Every module that reads a string in `en-GB-librarian-dialogs` imports this, so those strings
// arrive with the dialog that shows them rather than with the page.
addBritishEnglish(librarianDialogs)
