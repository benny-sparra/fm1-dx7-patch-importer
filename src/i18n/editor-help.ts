import { addBritishEnglish } from './add-british-english'
import editorHelp from './locales/en-GB-editor-help'

// Every module that reads `controlHelp`, `effectHelp`, `effectParameterHelp`, or an `editor` string
// the page leaves out imports this, so the editor's British English arrives with the editor's chunk
// rather than with the page.
addBritishEnglish(editorHelp)
