import { installRetroMotion } from './retro-motion'

// Importing this starts the page's idle decoration, so the entry's import of it needs no code to
// call it: every byte the entry spends there counts against its budget.
installRetroMotion()
