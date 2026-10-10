/**
 * American English. i18next falls back from here to British English (`en-GB`), so this holds only
 * the strings whose spelling differs; every other string is shared. Add a string here whenever a
 * British English one uses a British spelling (`resources.test.ts` checks).
 */
export default {
  meta: {
    description:
      'Edit, organize, and transfer patches for the M-VAVE FM1 synthesizer, with DX7 SysEx bank import.',
  },
  root: {
    intro: 'Edit, organize and transfer FM1 patches, or <link>import DX7 SysEx banks</link>.',
    synthAlt: 'M-VAVE FM1 synthesizer front panel',
  },
  help: {
    steps: {
      editTitle: 'Edit and organize',
    },
  },
  colorway: {
    legend: 'FM1 color finish',
  },
  editor: {
    minimisePanel: 'Minimize {{panel}}',
    randomise: 'Randomize',
  },
  fm1VaSend: {
    favouritesShort: 'Favorites holds one patch, so the FM1 bank’s other presets stay as they are.',
    favouritesShort_other:
      'Favorites holds {{count, number}} patches, so the FM1 bank’s other presets stay as they are.',
    favouritesTooltip:
      'Choose an FM1 bank to write the first 32 favorites over; only the ones that differ are written',
  },
  favourites: {
    title: 'Favorites',
    tabTitle: 'Show your favorite patches',
    toggle: 'Favorite {{name}}',
    addTitle: 'Add to Favorites',
    removeTitle: 'Remove from Favorites',
    added: 'Added “{{patch}}” to Favorites.',
    removed: 'Removed “{{patch}}” from Favorites.',
    alreadyAdded: '“{{patch}}” is already in Favorites.',
    addFailed: 'The patch could not be added to Favorites.',
    empty: 'No favorites yet',
    emptyHelp:
      'Select the heart on any patch, or drag a patch onto Favorites, to keep it here. Favorites can be sent to the FM1 as a bank.',
    sendTitle: 'Send the first 32 favorites as a bank; choose the destination bank on the FM1',
    addFirst: 'Add a favorite before sending Favorites',
    initNote: 'A bank holds 32 patches, so sending Favorites fills the last slot with INIT VOICE.',
    initNote_other:
      'A bank holds 32 patches, so sending Favorites fills the last {{count, number}} slots with INIT VOICE.',
    leftOutNote:
      'A bank holds 32 patches, so only the first 32 favorites are sent. The last one stays here.',
    leftOutNote_other:
      'A bank holds 32 patches, so only the first 32 favorites are sent. The last {{count, number}} stay here.',
    sent: 'Favorites was sent. Choose its destination on the FM1.',
    sentWithInit:
      'Favorites was sent, with INIT VOICE in the last slot. Choose its destination on the FM1.',
    sentWithInit_other:
      'Favorites was sent, with INIT VOICE in the last {{count, number}} slots. Choose its destination on the FM1.',
    sentLeftOut:
      'The first 32 favorites were sent; the last one was left out. Choose their destination on the FM1.',
    sentLeftOut_other:
      'The first 32 favorites were sent; the last {{count, number}} were left out. Choose their destination on the FM1.',
    sendUnavailable: 'Favorites could not be prepared for sending. Reload the page and try again.',
    savedWithFavourites: 'Saved “{{patch}}” to the library, and to its copy in Favorites.',
    savedWithBanks: 'Saved “{{patch}}” to Favorites, and to the bank slots that held it.',
  },
  fm1VaWrite: {
    virtualAnalogKept:
      'One Virtual Analog preset is kept: only a Virtual Analog patch can replace it.',
    virtualAnalogKept_other:
      '{{count, number}} Virtual Analog presets are kept: only Virtual Analog patches can replace them.',
    inexact: 'One Virtual Analog or 8-Bit patch can’t be stored exactly, so its preset is kept.',
    inexact_other:
      '{{count, number}} Virtual Analog or 8-Bit patches can’t be stored exactly, so their presets are kept.',
  },
  changeToFm: {
    warning:
      'This replaces the Virtual Analog preset in this slot with INIT VOICE, an FM patch you can edit. Nothing of its sound carries over but its FM1 effects. Undo puts it back.',
    fm1Note:
      'If the FM1 holds this Virtual Analog preset, writing to the FM1 leaves it there: erase it on the FM1 to change its engine there too.',
  },
  toasts: {
    bankDownloadStartedWithInit:
      'Downloading “{{bank}}”, with INIT VOICE in place of its Virtual Analog or 8-Bit preset.',
    bankDownloadStartedWithInit_other:
      'Downloading “{{bank}}”, with INIT VOICE in place of its {{count, number}} Virtual Analog or 8-Bit presets.',
    banksDownloadStartedWithInit:
      'Downloading all banks, with INIT VOICE in place of one Virtual Analog or 8-Bit preset.',
    banksDownloadStartedWithInit_other:
      'Downloading all banks, with INIT VOICE in place of {{count, number}} Virtual Analog or 8-Bit presets.',
  },
  banks: {
    slotVirtualAnalogTitle:
      'Click to select {{name}} on the FM1, which plays the Virtual Analog preset stored there',
    slotVirtualAnalogAddedTitle:
      '{{name}} is a Virtual Analog preset, which plays only from the FM1’s banks A to D',
    virtualAnalogPatch: 'Virtual Analog preset',
    sentStatusWithInit:
      'Browser bank {{bank}} was sent, with INIT VOICE in place of its Virtual Analog or 8-Bit preset. Choose its destination on the FM1.',
    sentStatusWithInit_other:
      'Browser bank {{bank}} was sent, with INIT VOICE in place of its {{count, number}} Virtual Analog or 8-Bit presets. Choose its destination on the FM1.',
    virtualAnalogInitNote:
      'A DX7 bank has no place for a Virtual Analog or 8-Bit preset, so this bank’s one is sent as INIT VOICE.',
    virtualAnalogInitNote_other:
      'A DX7 bank has no place for a Virtual Analog or 8-Bit preset, so this bank’s {{count, number}} are sent as INIT VOICE.',
  },
  namedBanks: {
    downloadedWithInit:
      'Downloaded “{{name}}”, with INIT VOICE in place of its Virtual Analog or 8-Bit preset.',
    downloadedWithInit_other:
      'Downloaded “{{name}}”, with INIT VOICE in place of its {{count, number}} Virtual Analog or 8-Bit presets.',
  },
}
