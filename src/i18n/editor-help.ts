import i18n from 'i18next'

import editorHelp from './locales/en-GB-editor-help'

// Every module that reads `controlHelp`, `effectHelp`, or `effectParameterHelp` imports this, so the
// editor's British English help arrives with the editor's chunk rather than with the page. Every
// locale falls back to British English, so it covers American English too.
//
// It reaches i18next directly rather than through `@/i18n`: importing that module from the editor's
// chunk made the bundler split Button and the Lucide icon code out of the entry, costing 800 B.
// The app renders only once i18next is ready, but a test can import an editor module first.
function addEditorHelp() {
  i18n.addResourceBundle('en-GB', 'translation', editorHelp, true, false)
}

if (i18n.isInitialized) addEditorHelp()
else i18n.on('initialized', addEditorHelp)
