export default {
  title: 'Sequencer',
  back: 'Back to the library',
  intro:
    'Build a pattern here, then play it into the FM1 while the device is recording. The FM1 has no command for its sequencer, so arming, choosing the pattern and saving stay on the device.',
  pattern: {
    heading: 'Pattern',
    stepLength: 'Step length',
    stepLengthHint: 'Set this to the Step value shown on the FM1 sequencer page.',
    step: 'Step {{number}}',
    rest: 'Rest',
    note: 'Note',
    pitch: 'Pitch',
    velocity: 'Velocity',
    makeRest: 'Make step {{number}} a rest',
    makeNote: 'Make step {{number}} a note',
    clear: 'Clear the pattern',
    cleared: 'The pattern was cleared.',
  },
  listen: {
    heading: 'Listen to the FM1',
    start: 'Listen to the FM1',
    stop: 'Stop listening',
    hint: 'Start playback on the FM1. A pattern appears once two complete passes agree.',
    waiting: 'Listening. Nothing has been heard yet.',
    heard: 'Heard a loop of {{count}} steps over {{passes}} passes.',
    use: 'Put what was heard in the editor',
    used: 'The pattern that was heard is now in the editor.',
    rotation:
      'Playback cannot show which step the FM1 calls step 1, so what was heard may start at a different step than the pattern above.',
    match: 'What the FM1 played back matches the pattern that was sent.',
    mismatch:
      'What the FM1 played back is not the pattern that was sent. Check the pattern on the device and send it again.',
    problem: {
      tooFewNotes: 'Nothing has been heard yet. Start playback on the FM1.',
      noRepeat: 'No repeat has been heard yet. Let the pattern come round at least twice.',
      inconsistentPasses:
        'The passes do not agree. Stop playing the FM1 keys while it is being read.',
      loopLengthUnresolved:
        'Several step lengths fit what was heard. Set Step length to the value on the FM1.',
      offGrid: 'The notes do not fit that step length. Check the Step value shown on the FM1.',
    },
  },
  send: {
    button: 'Send to the FM1',
    heading: 'Send this pattern to the FM1',
    arm: 'Do this on the FM1 first, because the editor cannot:',
    armPattern: 'Choose the pattern you want to replace.',
    armStepLength: 'Set Step length to {{steps}}.',
    armTranspose: 'Set Transpose to 0.',
    armRecord: 'Press REC. The first step light flashes.',
    replaces:
      'Sending replaces everything in that pattern, from step 1 to the end of the loop. It cannot be undone from here.',
    keys: 'Do not play the FM1 keys until the pattern has been sent.',
    confirm: 'The FM1 is recording; send it',
    cancel: 'Cancel',
    sending: 'Sending step {{step}} of {{steps}}.',
    stop: 'Stop sending',
    sent: 'Sent {{steps}} of {{total}} steps. The FM1 confirms nothing, so listen to it to check the result.',
    unsaved: 'The pattern is only in the device memory. Use SAVE on the FM1 to keep it.',
    cancelled:
      'Stopped after {{steps}} of {{total}} steps. The pattern on the FM1 is part new and part old.',
    interrupted:
      'The MIDI connection failed after {{steps}} of {{total}} steps. The pattern on the FM1 is part new and part old.',
    noOutput: 'Choose a MIDI output before sending a pattern.',
    invalid: 'This pattern cannot be sent. Check the pitches, velocities and step length.',
  },
} as const
