import { installAttractIdle } from './attract-idle'
import type { AttractI18n } from './attract-mode'
import { installRetroMotion } from './retro-motion'

// Importing this starts the page's idle decoration, so the entry's import of it needs no code to
// call it: every byte the entry spends there counts against its budget.
installRetroMotion()

/** Starts the watch for attract mode, with the page's i18next, which the entry hands over. */
export default function watchForAttract(i18n: AttractI18n) {
  installAttractIdle(i18n)
}
