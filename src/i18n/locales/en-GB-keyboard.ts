/**
 * British English for the on-screen keyboard dialog. Only that dialog shows it, so it loads with the
 * dialog rather than with the page: `@/i18n/keyboard` adds it to `en-GB`, beside the button's name
 * in the page's strings. Every other locale keeps these strings in its own file.
 */
export default {
  ui: {
    pianoKeyboard: 'Piano keyboard',
    dragKeyboard: 'Drag keyboard',
    closeKeyboard: 'Close keyboard',
    keyLevel: 'Level',
    phrase: 'Phrase',
    play: 'Play',
    stop: 'Stop',
    playPhrase: 'Play the phrase',
    stopPhrase: 'Stop the phrase',
    tempo: 'Tempo',
    tempoValue: '{{tempo}} BPM',
    phrases: {
      pad: 'Pad',
      electricPiano: 'Electric piano',
      bass: 'Bass',
      lead: 'Lead',
      arpeggio: 'Arpeggio',
      velocityRamp: 'Velocity ramp',
    },
    shiftOctave: 'Shift octave {{direction}}',
    playNote: 'Play {{note}}',
    directionDown: 'down',
    directionUp: 'up',
  },
}
