import { createLazyNamespace } from '../lazy-namespace'

/**
 * The patch editor's help text, loaded with the editor. It is only ever read inside the editor, and
 * it is the largest block of text in the application; see `../lazy-namespace.ts`.
 *
 * Its keys keep the names they had in the eager namespace and are resolved through i18next's
 * `fallbackNS`, so the editor's components ask for them exactly as they did before.
 */
const editorHelp = createLazyNamespace('editorHelp', {
  de: () => import('./de'),
  en: () => import('./en'),
  es: () => import('./es'),
  fr: () => import('./fr'),
  'pt-BR': () => import('./pt-BR'),
  'zh-Hans': () => import('./zh-Hans'),
})

export const editorHelpNamespace = editorHelp.namespace
export const loadEditorHelpNamespace = editorHelp.load
export const resetEditorHelpNamespaceCache = editorHelp.reset
