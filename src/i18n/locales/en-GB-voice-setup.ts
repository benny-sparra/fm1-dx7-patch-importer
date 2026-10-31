/**
 * British English for the V16 Set up Voices wizard. Only the wizard shows it, so it loads with the
 * wizard rather than with the Voice strip: `@/i18n/voice-setup` adds it to `en-GB`. Every other
 * locale keeps these strings in its own file. Voice stays in English, as the FM1 prints it.
 */
export default {
  voiceSetup: {
    title: 'Set up Voices',
    close: 'Close Set up Voices',
    stepOf: 'Step {{current}} of {{total}}',
    steps: {
      channels: 'Channels',
      fx: 'Effect channel',
      save: 'Save',
      test: 'Sound test',
      done: 'Done',
    },
    channels: {
      step1: 'On the FM1, open PRESETS and select a Voice.',
      step2: 'Set its MIDI Ch to the channel below, and its On/Off to On.',
      step3: 'Do the same for each Voice. A new FM1 has Voice 1 on All: change it to Ch 1.',
      expected: 'Channels the editor expects',
      voiceOnChannel: '{{voice}}: {{channel}}',
    },
    fx: {
      step: 'On the FM1, set Effect Ch to {{channel}}.',
      why: 'The editor sends the Effects tab’s changes on its effect channel; the FM1 must listen there.',
    },
    save: {
      step: 'On the FM1, press SAVE and choose Globe.',
      why: 'Without this, turning the FM1 off puts every setting back.',
    },
    test: {
      heading: '{{voice}}, {{channel}}',
      instruction: 'Play the note, then say whether {{voice}} played it.',
      play: 'Play note',
      playAgain: 'Play again',
      playing: 'Playing…',
      heard: 'Heard it',
      notHeard: 'Didn’t hear it',
      heardTwo: 'Heard two sounds',
      skip: 'Skip',
      notHeardHint: '{{voice}}: not heard. Check it is On and on {{channel}} on the FM1.',
      heardTwoHint: '{{voice}}: another Voice played too. Make sure Voice 1 is not on All.',
      progress: 'Results',
      stateNone: 'not tested',
      stateHeard: 'heard',
      stateNotHeard: 'not heard',
      stateTwo: 'two sounds',
      stateSkipped: 'skipped',
      connect: 'Switch MIDI online to play the note.',
    },
    done: {
      allHeard: 'Every Voice played on its own channel.',
      issues: 'Some Voices need another look. Use Back to test them again.',
      notTested: '{{voice}}: not tested.',
      finish: 'Finish',
      toast: 'Voices set up: {{heard}} of 8 heard.',
    },
  },
}
