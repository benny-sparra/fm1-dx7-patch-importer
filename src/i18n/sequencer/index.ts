import { createLazyNamespace } from '../lazy-namespace'

/**
 * The sequencer's translations, loaded with the sequencer view. See `../lazy-namespace.ts` for why
 * this text is not in the eager namespace.
 */
const sequencer = createLazyNamespace('sequencer', {
  de: () => import('./de'),
  en: () => import('./en'),
  es: () => import('./es'),
  fr: () => import('./fr'),
  'pt-BR': () => import('./pt-BR'),
  'zh-Hans': () => import('./zh-Hans'),
})

export const sequencerNamespace = sequencer.namespace
export const loadSequencerNamespace = sequencer.load
export const resetSequencerNamespaceCache = sequencer.reset
