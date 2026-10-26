/**
 * MIDI channels 1–16. A leaf module, so a lazy chunk such as the Voice strip takes the list without
 * importing `use-midi`, which made the bundler split the entry's shared code.
 */
export const midiChannels = Array.from({ length: 16 }, (_, index) => index + 1)
