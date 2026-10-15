/**
 * British English for the welcome and the guide. Only the guide's lazy chunk shows it, so it loads
 * with that chunk rather than with the page: `@/i18n/help` adds it to `en-GB`, beside the help
 * button's name, which the page reads from the same section. Every other locale keeps this section
 * in its own file.
 */
export default {
  help: {
    title: 'Welcome to the FM1 editor & librarian',
    guideTitle: 'Guide',
    close: 'Close help',
    lead: 'Edit and organise patches for your M-VAVE FM1, in the browser.',
    quickSteps: {
      connect: 'Plug in the FM1 and switch MIDI online on.',
      play: 'Click a patch to hear it, double-click to edit.',
      send: 'Send to FM1 puts a whole bank on the synth.',
    },
    savedInBrowser: 'Your banks are saved in this browser. Back them up from Library actions.',
    unsupportedTitle: 'This browser can’t connect to the FM1.',
    unsupportedBody:
      'Open this page in Chrome, Edge or Firefox on a computer, or Chrome on Android.',
    stillWorks: 'You can still browse and edit patches here.',
    fullGuide: 'Full guide',
    start: 'Start editing',
    done: 'Close',
    stepsTitle: 'Getting started',
    sections: 'Guide sections',
    shortcutsTitle: 'Keyboard shortcuts',
    shortcuts: {
      banks: 'Patch banks',
      editor: 'Voice editor',
      search: 'Jump to search',
      clearSearch: 'Clear the search',
      openSlot: 'Open the lit slot',
    },
    steps: {
      connectTitle: 'Connect your FM1',
      connectBody:
        'Plug in the FM1 and switch MIDI online on. The browser asks to allow MIDI the first time.',
      playTitle: 'Hear and edit',
      playBody:
        'Click a patch to hear it on the FM1. Double-click it to open the voice editor, and save to keep your changes.',
      sendTitle: 'Send to FM1',
      sendBody: 'Send a whole bank from its header, then choose where it lands on the FM1.',
      backupTitle: 'Keep a backup',
      backupBody:
        'The FM1 can’t send its banks back, so the banks here are the only copy. Download a backup from Library actions.',
    },
    firmwareTitle: 'Baud Girl (FM-1+VA)',
    firmwareBody:
      'Read presets from the FM1 and write patches back from Library actions. Virtual Analog patches open their own editor.',
  },
}
