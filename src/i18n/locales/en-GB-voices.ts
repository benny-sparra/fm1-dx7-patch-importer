/**
 * British English for the V16 Voice strip. Only the strip shows it, so it loads with the strip
 * rather than with the page: `@/i18n/voices` adds it to `en-GB`, beside the switch, the slot tags,
 * and the menu item in the page's strings. Every other locale keeps these strings in its own file.
 */
export default {
  voices: {
    strip: 'Voices 1–8',
    aim: 'Voice {{number}}, Ch {{channel}}: {{patch}}',
    noPatch: 'No patch',
    sendSetup: 'Send setup',
    sendSetupOffline: 'Switch MIDI online to send the setup.',
    sendSetupEmpty: 'None of Voices 1–8 has a patch yet: click one, then a patch in banks A–D.',
    sendSetupFailed:
      'Some patches did not reach the FM1. Check the MIDI output, then send the setup again.',
    setupSent: 'Sent the setup to {{voices}}',
    channels: 'Channels',
    channelOf: 'Voice {{number}} channel',
    setupNote:
      'Set up Voices 1–8 once on the FM1: put them on channels 1–8, switch each one On, leave none on All, then press SAVE and choose Globe. One that is Off ignores its patch and does not take it when switched back On, and one on All takes every patch sent.',
    howToAssign:
      'Click one of Voices 1–8 to play it from the keyboard, then click a patch in banks A–D to give it that patch. Send setup sends each one its patch again.',
  },
}
