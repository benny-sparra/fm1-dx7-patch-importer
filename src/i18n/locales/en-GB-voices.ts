/**
 * British English for the V16 Voice strip. Only the strip shows it, so it loads with the strip
 * rather than with the page: `@/i18n/voices` adds it to `en-GB`, beside the switch, the slot tags,
 * and the menu item in the page's strings. Every other locale keeps these strings in its own file.
 */
export default {
  voices: {
    channelShort: 'Ch {{number}}',
    strip: 'Voices 1–8',
    aim: 'Voice {{number}}, Ch {{channel}}: {{patch}}, {{state}}',
    stateOn: 'on',
    stateOff: 'off',
    voiceSwitch: 'Voice {{number}} on',
    noPatch: 'No patch',
    recall: 'Recall Voices',
    recallHint: 'Selects each Voice’s preset again. Stores nothing.',
    menu: 'Voice actions',
    recallOffline: 'Switch MIDI online to recall the Voices.',
    recallEmpty: 'None of Voices 1–8 has a patch yet: click one, then a patch in banks A–D.',
    recallFailed:
      'Some patches did not reach the FM1. Check the MIDI output, then recall the Voices again.',
    recalled: 'Recalled {{voices}}',
    channels: 'Channels…',
    channelsTitle: 'Voice channels (as set on your FM1)',
    setupShort: 'Set up your FM1’s Voices first.',
    setupHelpLabel: 'setting up the FM1’s Voices',
    setupSteps:
      'Multitimbral mode needs the FM1 set up once: put Voices 1–8 on channels 1–8, switch each one On, leave none on All, then press SAVE and choose Globe. One that is Off ignores its patch and does not take it when switched back On, and one on All takes every patch sent. Switching the mode off later needs no change on the FM1.',
    channelsNote: 'Changing these doesn’t change the FM1: set the same channels there.',
    channelsClose: 'Close the Voice channels',
    channelOf: 'Voice {{number}} channel',
  },
}
