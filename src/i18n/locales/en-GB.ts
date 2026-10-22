export default {
  dialogs: {
    bankTitle: 'Choose the destination bank on your FM1',
    bankIntro: 'When the FM1 is ready, start the SysEx transfer and finish the import on the unit.',
    bankClose: 'Close bank selection instructions',
    bankStep1: 'Wait for the bank selection screen to appear on the FM1 display.',
    bankStep2: 'Turn Knob 1, 2, 3 or 4 to choose destination bank A, B, C or D.',
    bankStep3: 'The FM1 saves the 32 patches automatically after a brief delay.',
    bankFm1VaStep1: 'The FM1 asks “Replace Bank A?” and starts on bank A, whichever bank you send.',
    bankFm1VaStep2: 'Turn ALGORITHM until the question names the destination bank: A, B, C or D.',
    bankFm1VaStep3:
      'Turn SELECT to Replace and press SEL to store the 32 patches, or press HOME to cancel. They also replace that bank’s factory presets permanently.',
    bankFm1VaNote:
      'If your FM1 runs Baud Girl’s firmware, it asks “Replace Bank A?” instead, starting on bank A. Turn ALGORITHM to the destination bank, then turn SELECT to Replace and press SEL.',
    bankOfficialOpenNote:
      'M-VAVE’s Open firmware ignores DX7 banks, so sending this bank does not change its projects.',
    bankFeluccaNote: 'Felucca ignores DX7 banks, so sending this bank does not change its presets.',
    bankFeluccaOrSloopNote:
      'Felucca and SLOOP ignore DX7 banks, so sending this bank does not change the FM1’s presets.',
    bankFm1VaImage:
      'FM1 display running Baud Girl’s firmware, asking “Replace Bank A?” with Cancel and Replace',
    bankImage:
      'FM1 display running M-VAVE’s firmware, showing “32 Voice Save To …” above banks A, B, C and D',
    dontShow: 'Don’t show me again this session',
    midiTitle: 'Connect MIDI to send this bank',
    midiIntro: 'The FM1 must be connected as a MIDI output before a bank of patches can be sent.',
    midiClose: 'Close MIDI connection message',
    midiSteps: 'Switch MIDI online here, then allow MIDI access if the browser asks.',
    midiChooseOutput: 'MIDI is online. Choose the FM1 as the output.',
    midiReady: 'MIDI is online. Check the output is the FM1, then send.',
    midiConnect: 'Switch MIDI online',
    midiIdentifying: 'Waiting for the FM1 to say which firmware it runs',
    restoreTitle: 'Reset to the factory patches?',
    restoreIntro: 'This replaces all four banks. You can undo the reset immediately afterwards.',
    restoreClose: 'Close factory reset',
    restoreDetails:
      'Banks A, B, C, and D will be reset to FM-1 Banks 1, 2, 3, and 4, the patches the FM1 ships with.',
    restoreAction: 'Reset four banks',
    sourcesTitle: 'Find DX7 patch banks',
    sourcesIntro:
      'Download a 32-voice DX7 SysEx bank (.syx), then return here and choose “Import DX7 bank…”.',
    sourceDescriptions: {
      yamahaBlackBoxes: 'Factory DX7 cartridges and SysEx banks.',
      bobbyBlues: 'Long-running DX7 patch and bank collection.',
      soundarchive: 'Curated DX7, TX816 and TX802 SysEx banks.',
      fm1FactoryPresets:
        'The FM-1 stock presets, recovered from the M-VAVE restore tool. Also in the bank catalog.',
    },
    sourcesClose: 'Close patch bank sources',
    sourcesSubmit: 'Programmed a DX7 bank of your own?',
    sourcesSubmitLink: 'Offer it for the bank catalog',
  },
  ui: {
    drag: {
      cancelled: 'Dragging {{name}} was cancelled.',
      dropped: '{{name}} was dropped on {{target}}.',
      droppedInPlace: '{{name}} was dropped where it was.',
      instructions:
        'To move an item, focus its grip and press Space or Enter. Use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel.',
      over: '{{name}} is over {{target}}.',
      pickedUp: 'Picked up {{name}}.',
      roleDescription: 'sortable item',
      slotInstructions:
        'To move a patch, focus its grip and press Space or Enter. Use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel. Dragged onto a bank’s tab, the patch is copied to that bank instead; Copy to… in its menu does the same from the keyboard.',
    },
    left: 'Left',
    right: 'Right',
    keyboard: 'Keyboard',
    helpOpenFailed: 'The guide could not be opened. Reload the page and try again.',
    keyboardOpenFailed: 'The keyboard could not be opened. Reload the page and try again.',
    helpFor: 'Help: {{label}}',
  },
  fm1VaImport: {
    menuItem: 'Import Baud Girl presets…',
    menuRead: 'Read presets from the FM1…',
    menuHeading: 'Baud Girl (FM-1+VA)',
    openFailed: 'The Baud Girl preset import could not be opened. Reload the page and try again.',
  },
  fm1VaWrite: {
    menuItem: 'Write patches to the FM1…',
    openFailed: 'Writing to the FM1 could not be opened. Reload the page and try again.',
  },
  shareLink: {
    loadFailed: 'Share links could not be opened. Reload the page and try again.',
    menuItem: 'Copy share link',
    copied: 'Copied a share link for “{{patch}}”.',
    copyFailed: 'The browser did not allow the share link to be copied.',
  },
  changeToFm: {
    menuItem: 'Change to FM…',
    changed: 'Changed {{slot}} to FM as “{{patch}}”.',
    openFailed: 'Changing to FM could not be opened. Reload the page and try again.',
  },
  fm1VaSend: {
    bankTooltip:
      'Choose an FM1 bank to write these patches over; only the ones that differ are written',
    favouritesTooltip:
      'Choose an FM1 bank to write the first 32 favourites over; only the ones that differ are written',
  },
  duplicates: {
    menuItem: 'Find duplicate patches…',
    openFailed: 'Duplicate patches could not be shown. Reload the page and try again.',
  },
  persistence: {
    retryLoading: 'Retry',
    continueSessionOnly: 'Continue without saving',
    retrySaving: 'Retry saving',
    technicalDetails: 'Technical details',
    sessionOnlyTitle: 'Session-only library',
    sessionOnlyBody:
      'Existing browser data has not been changed. Changes made in this session will be lost when this page closes.',
    saveErrorTitle: 'Library changes are not safely stored',
    saveErrorBody:
      'Your latest changes are still available here, but the browser could not save them. Retry when browser storage is available.',
    loadErrors: {
      unavailable: {
        title: 'Browser storage is unavailable',
        body: 'The saved library could not be opened. Its browser data has not been changed.',
      },
      'read-failed': {
        title: 'The saved library could not be read',
        body: 'This may be a temporary browser storage problem. No replacement library has been created or saved.',
      },
      incompatible: {
        title: 'The saved library is incompatible or damaged',
        body: 'The existing browser record has been left untouched. This version cannot safely open it.',
      },
      'write-failed': {
        title: 'The saved library could not be read',
        body: 'No replacement library has been created or saved.',
      },
    },
  },
  favourites: {
    title: 'Favourites',
    tabTitle: 'Show your favourite patches',
    toggle: 'Favourite {{name}}',
    toggleSlot: 'Favourite {{slot}} {{name}}',
    addTitle: 'Add to Favourites',
    removeTitle: 'Remove from Favourites',
    added: 'Added “{{patch}}” to Favourites.',
    removed: 'Removed “{{patch}}” from Favourites.',
    alreadyAdded: '“{{patch}}” is already in Favourites.',
    empty: 'No favourites yet',
    emptyHelp:
      'Select the heart on any patch, or drag a patch onto Favourites, to keep it here. Favourites can be sent to the FM1 as a bank.',
    sendTitle: 'Send the first 32 favourites as a bank; choose the destination bank on the FM1',
    addFirst: 'Add a favourite before sending Favourites',
    initNote: 'A bank holds 32 patches, so sending Favourites fills the last slot with INIT VOICE.',
    initNote_other:
      'A bank holds 32 patches, so sending Favourites fills the last {{count, number}} slots with INIT VOICE.',
    leftOutNote:
      'A bank holds 32 patches, so only the first 32 favourites are sent. The last one stays here.',
    leftOutNote_other:
      'A bank holds 32 patches, so only the first 32 favourites are sent. The last {{count, number}} stay here.',
    sent: 'Favourites was sent. Choose its destination on the FM1.',
    sentWithInit:
      'Favourites was sent, with INIT VOICE in the last slot. Choose its destination on the FM1.',
    sentWithInit_other:
      'Favourites was sent, with INIT VOICE in the last {{count, number}} slots. Choose its destination on the FM1.',
    sentLeftOut:
      'The first 32 favourites were sent; the last one was left out. Choose their destination on the FM1.',
    sentLeftOut_other:
      'The first 32 favourites were sent; the last {{count, number}} were left out. Choose their destination on the FM1.',
    sendUnavailable: 'Favourites could not be prepared for sending. Reload the page and try again.',
    savedWithFavourites: 'Saved “{{patch}}” to the library, and to its copy in Favourites.',
    savedWithBanks: 'Saved “{{patch}}” to Favourites, and to the bank slots that held it.',
  },
  toasts: {
    midiPanicSent: 'MIDI panic sent. Every note on the note channel was released.',
    notifications: 'Completed actions',
    dismiss: 'Dismiss notification',
    undo: 'Undo',
    undone: 'Undid the last change.',
    redone: 'Redid the change.',
    bankImported: 'Imported patches into “{{bank}}”.',
    bankDeleted: 'Deleted “{{bank}}”.',
    banksRestored: 'Reset the four banks to the factory patches.',
    bankDownloadStarted: 'Downloading “{{bank}}”.',
    presetFileDownloadStarted: 'Downloading “{{name}}” as a Baud Girl presets file.',
    banksDownloadStarted: 'Downloading all banks.',
    bankUpdated: 'Updated “{{bank}}”.',
    demoLoaded: 'Loaded the demo patches into “{{bank}}”.',
    patchSaved: 'Saved “{{patch}}” to the library.',
    patchCopied: 'Copied “{{patch}}” to {{slot}} in “{{bank}}”.',
    patchesSwapped: 'Swapped “{{patch}}” and “{{target}}”.',
    patchReplaced: 'Replaced {{slot}} with “{{patch}}”.',
    operatorCopied: 'Copied operator {{number}}.',
    bankDownloadStartedWithInit:
      'Downloading “{{bank}}”, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset.',
    bankDownloadStartedWithInit_other:
      'Downloading “{{bank}}”, with INIT VOICE in place of its {{count, number}} Virtual Analogue or 8-Bit presets.',
    banksDownloadStartedWithInit:
      'Downloading all banks, with INIT VOICE in place of one Virtual Analogue or 8-Bit preset.',
    banksDownloadStartedWithInit_other:
      'Downloading all banks, with INIT VOICE in place of {{count, number}} Virtual Analogue or 8-Bit presets.',
  },
  meta: {
    title: 'M-VAVE FM1 Editor & Librarian',
    description:
      'Edit, organise, and transfer patches for the M-VAVE FM1 synthesiser, with DX7 SysEx bank import.',
  },
  language: 'Language',
  common: {
    close: 'Close',
    cancel: 'Cancel',
    settings: 'Settings',
    channel: 'Channel {{number}}',
    loading: 'Loading editor…',
    loadingLibrary: 'Loading library',
    editorLoadErrorTitle: 'The editor could not be loaded.',
    editorLoadErrorBody:
      'The app may have been updated or the connection was interrupted. Reload to use the latest version, or return to the library.',
    reloadApp: 'Reload app',
    backToLibrary: 'Back to library',
  },
  root: {
    skipToContent: 'Skip to main content',
    subtitle: 'editor & librarian',
    intro: 'Edit, organise and transfer FM1 patches, or <link>import DX7 SysEx banks</link>.',
    synthAlt: 'M-VAVE FM1 synthesiser front panel',
    unsupportedTitle: 'Unsupported browser.',
    unsupportedBody:
      'This librarian needs a browser that supports Web MIDI and SysEx, such as Chrome, Edge, Firefox, or Opera. Chrome on Android works too.',
    localOnly: 'Your patches stay in this browser',
    projectLinks: 'Project links',
    firmwareLink: 'FM1 firmware',
    reportIssue: 'Report an issue',
    version: 'Version {{version}}',
    disclaimer:
      'Independent, open-source project. Not affiliated with or endorsed by M-VAVE or Yamaha.',
  },
  settings: {
    description: 'Choose the interface language, MIDI ports, and channels.',
    output: 'Output',
    inputMonitor: 'Input monitor',
    firmware: 'FM1 firmware',
    firmwareChecking: 'Checking…',
    firmwareUnidentified: 'Not identified',
    firmwareMvave: 'M-VAVE {{identity}}',
    firmwareFm1Va: 'Baud Girl {{identity}}',
    firmwareOfficialOpen: 'M-VAVE Open {{identity}}',
    firmwareFelucca: 'Felucca {{identity}}',
    firmwareFeluccaOrSloop: 'Felucca or SLOOP {{identity}}',
    firmwareEditBuffer: 'Patches you play go to the FM1’s edit buffer.',
    firmwareEffectsNotSent:
      'The effect controls send nothing yet, as V16 moved them to other controllers.',
    firmwareParameterChanges:
      'Patches you play are sent as parameter changes, so the FM1 never stores them over the selected preset.',
    firmwareIgnoresPatches:
      'Felucca plays your notes but ignores DX7 patches, banks, and the effect controls.',
    firmwareFeluccaOrSloopIgnoresPatches:
      'Felucca and SLOOP both report this name. Either plays your notes but ignores DX7 patches, banks, and the effect controls.',
    firmwareOfficialOpenSends:
      'M-VAVE’s Open firmware plays your notes, and a patch you click or edit goes to the track on the note channel when that track runs DX7. It ignores DX7 banks, and the effect controls send nothing, since it would take them as changes to its tracks.',
    firmwareNeedsInput:
      'Choose the FM1 as the input monitor so the editor can ask which firmware it runs.',
    noteChannel: 'Note channel',
    fxChannel: 'FX channel',
    defaultChannel: 'FM1 default: channel 2',
    noDevice: 'No device found',
    noDeviceSelected: 'No device selected',
  },
  help: {
    open: 'Help: how to use the FM1 editor and librarian',
  },
  colorway: {
    legend: 'FM1 colour',
    option: '{{colour}} FM1 colour',
    black: 'Black',
    purple: 'Purple',
    orange: 'Orange',
    blackGreen: 'Black-Green',
    coolGray: 'Cool Gray',
    whiteBlue: 'White-Blue',
  },
  editor: {
    back: 'Back to patch banks',
    undo: 'Undo',
    redo: 'Redo',
    save: 'Save to library',
    stopComparing: 'Stop comparing and return to your edits',
    minimisePanel: 'Minimise {{panel}}',
    expandPanel: 'Expand {{panel}}',
  },
  midi: {
    activityTitle:
      'MIDI activity: IN lights as a message arrives from the MIDI input, OUT as the editor sends one.',
    feluccaBadgeLabel: 'Felucca firmware by Hügelton Instruments, {{release}}',
    feluccaBadgeTitle:
      'The FM1 runs Hügelton Instruments’ Felucca firmware, {{release}}. It plays your notes but ignores DX7 patches, banks, and the effect controls.',
    feluccaOrSloopBadgeLabel: 'Felucca or SLOOP firmware, {{release}}',
    feluccaOrSloopBadgeTitle:
      'The FM1 runs Hügelton Instruments’ Felucca or SLOOP, which is built on it; both report {{release}}. Either plays your notes but ignores DX7 patches, banks, and the effect controls.',
    fm1VaBadgeLabel: 'Baud Girl firmware, {{release}}',
    fm1VaBadgeTitle:
      'The FM1 runs Baud Girl’s firmware (FM-1+VA), {{release}}. Patches you play reach it as unsaved edits, so they never overwrite a preset.',
    mvaveBadgeLabel: 'M-VAVE firmware, {{release}}',
    mvaveBadgeTitle:
      'The FM1 runs M-VAVE’s own firmware, {{release}}. Patches you play go to its edit buffer.',
    officialOpenBadgeLabel: 'M-VAVE Open firmware, {{release}}',
    officialOpenBadgeTitle:
      'The FM1 runs M-VAVE’s Open firmware, {{release}}, an eight-track groovebox. A patch you click or edit goes to the track on the note channel when that track runs DX7. It ignores DX7 banks, and the effect controls send nothing, since it would take them as changes to its tracks.',
    panic: 'MIDI panic',
    panicHelp:
      'MIDI panic: send a note-off for every note on the note channel, to stop hanging notes',
    panicUnavailable: 'MIDI panic: {{reason}}',
    online: 'MIDI online',
    offline: 'MIDI offline',
    offlineHint: 'Switch on to reach the FM1',
    chooseOutput: 'Choose a MIDI output',
    switchOnFirst: 'Switch MIDI online first',
    closeSysexWarning: 'Close SysEx warning',
    connecting: 'Connecting…',
    errors: {
      insecureContext:
        'Web MIDI needs a secure connection. Open the editor over HTTPS or localhost.',
      unsupportedBrowser:
        'This browser does not support Web MIDI. Use a browser such as Chrome, Edge, or Firefox.',
      permissionDenied:
        'MIDI access was blocked. Allow MIDI and SysEx access for this site, then connect again. In Firefox, accept the site permission add-on when it is offered.',
      enableFailed: 'MIDI could not be started. Check the device connection, then try again.',
      disconnectFailed: 'MIDI could not be disconnected. Try again.',
    },
    reconnectForSysex: 'Reconnect MIDI with SysEx',
    sysexRecovery:
      'No bank data has been sent. Reconnect MIDI and approve SysEx access before trying again.',
    sysexWarningTitle: 'SysEx access unavailable.',
    sysexWarningBody:
      'Bank and patch transfers cannot be sent. Disconnect MIDI, reconnect it, and allow SysEx access when prompted.',
    log: 'MIDI log',
    closeLog: 'Close MIDI log',
    logOpenFailed: 'The MIDI log could not be opened. Reload the page and try again.',
    entries: 'Recent MIDI log entries',
    hideData: 'Hide data',
    viewData: 'View data',
    bytes: '{{count, number}} bytes',
    completeSysex: 'Complete SysEx message',
    copied: 'Copied',
    copyHex: 'Copy hex',
    copyUnavailable: 'Copy unavailable',
    downloadLog: 'Download log',
  },
  banks: {
    empty: 'Empty',
    importing: 'Importing…',
    restoring: 'Resetting…',
    catalogFactory: 'Factory',
    catalogFm1Factory: 'FM-1 factory presets',
    import: 'Import DX7 bank…',
    moreActions: 'Library actions',
    bankMenu: 'Actions for {{bank}}',
    patchMenu: 'Actions for {{slot}} {{name}}',
    bankInformation: 'Bank information',
    bankInformationMenu: 'Bank information…',
    bankInformationHelp: 'Edit the title and optional description for this bank.',
    download: 'Download this bank',
    downloadAll: 'Download SysEx banks (.zip)',
    restoreAll: 'Reset to factory patches…',
    sending: 'Sending…',
    send: 'Send to FM1',
    bank: 'Bank {{bank}}',
    addBank: 'Add new bank…',
    bankNameRequired: 'Enter a name for the new bank.',
    destination: 'Destination bank',
    importFile: 'Import DX7 bank file',
    downloadTitle: 'Download “{{bank}}” as SysEx',
    importFirst: 'Import bank {{bank}} first',
    deleteBank: 'Delete bank',
    deleteBankMenu: 'Delete bank…',
    deleteBankConfirm: 'Delete “{{name}}” and all of its patches? You can undo this action.',
    sendTitle: 'Send all 32 patches; choose the destination bank on the FM1',
    sentStatus: '“{{bank}}” was sent. Choose its destination on the FM1.',
    notSent: 'The bank was not sent. Open the MIDI log for details, then retry.',
    importFailed: 'Import failed.',
    restoreFailed: 'The banks could not be reset to the factory patches. Try again.',
    bankUnavailable: 'That bank is no longer available. Close this dialog and try again.',
    catalogUnavailable:
      'That patch bank could not be downloaded. Check your connection, then try again.',
    fileErrors: {
      size: 'This file is {{bytes, number}} bytes and holds no complete DX7 bank. A bank file is {{expected, number}} bytes, or a multiple of that when it joins several banks.',
      tooLarge: 'This file is too large. A bank file can join up to {{count, number}} DX7 banks.',
      format: 'This file is not a Yamaha DX7 32-voice bank.',
      damaged: 'This file looks damaged. Try downloading it again.',
    },
    exportFailed: 'Export failed.',
    bulkExportFailed: 'Bulk export failed.',
    gridTitle: 'Patch banks',
    gridDescription: 'Import, edit, and arrange each bank before transferring it to the FM1.',
    search: 'Search',
    noMatches: 'No patches match this search',
    searchResults: 'Search results: “{{search}}”',
    sendFromSearch: 'Choose a bank to send it to the FM1',
    bankEmpty: 'This bank is empty',
    emptyHelp:
      'Load the demo bank to explore the editor, or import a standard 32-voice DX7 SysEx bank of your own.',
    loadDemo: 'Load demo bank',
    editSelected: 'Edit',
    slotTitle: 'Click to play {{name}} on the FM1; double-click to edit',
    sendOffline:
      'MIDI is offline, so Send to FM1 asks to switch it online first. Until then, clicking a patch only selects it.',
    sendNoOutput:
      'No MIDI output is chosen, so Send to FM1 asks for one first. Until then, clicking a patch only selects it.',
    sendUnidentified:
      'Firmware not identified: the FM1 gets a plain DX7 bank, and patches as unsaved edits.',
    slotOfflineTitle: 'MIDI is offline, so a click only selects {{name}}; double-click to edit',
    slotEditBufferTitle: 'Click to play {{name}} through the FM1 edit buffer; double-click to edit',
    slotEditTitle: 'Double-click or press Enter to edit {{name}}',
    sendPatch: 'Send {{slot}} {{name}} to FM1',
    auditioning: 'Auditioning',
    reorderPatch: 'Reorder {{slot}} {{name}}',
    moveEarlier: 'Move earlier',
    menuOrder: 'Order',
    menuTransfer: 'Transfer',
    moveLater: 'Move later',
    reorderTitle:
      'Drag to reorder, or onto a bank to copy the patch there; use arrow keys to reorder when focused',
    copySelected: 'Copy to…',
    addBankOpenFailed: 'The new bank options could not be opened. Reload the page and try again.',
    copyOpenFailed: 'The copy options could not be opened. Reload the page and try again.',
    importPatchFile: 'Import patch…',
    receivePatch: 'Receive patch…',
    downloadPatchFile: 'Download patch',
    bankFileUnavailable: 'Bank files could not be read. Reload the page and try again.',
    patchFileUnavailable: 'Patch files could not be opened. Reload the page and try again.',
    receivePatchUnavailable: 'Patches could not be received. Reload the page and try again.',
    presetFileInexact:
      '“{{name}}” can’t be saved exactly as a Baud Girl presets file, so it wasn’t downloaded.',
    everywhere: {
      workspace: 'Your patch banks',
      loadFailed:
        'Saved banks and other DX7 patch banks could not be searched. Reload the page and try again.',
    },
    slotVirtualAnalogTitle:
      'Click to select {{name}} on the FM1, which plays the Virtual Analogue preset stored there',
    slotVirtualAnalogAddedTitle:
      '{{name}} is a Virtual Analogue preset, which plays only from the FM1’s banks A to D',
    slotEightBitTitle:
      'Click to select {{name}} on the FM1, which plays the 8-Bit preset stored there',
    slotEightBitAddedTitle:
      '{{name}} is an 8-Bit preset, which plays only from the FM1’s banks A to D',
    virtualAnalogPatch: 'Virtual Analogue preset',
    eightBitPatch: '8-Bit preset',
    sentStatusWithInit:
      'Browser bank {{bank}} was sent, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset. Choose its destination on the FM1.',
    sentStatusWithInit_other:
      'Browser bank {{bank}} was sent, with INIT VOICE in place of its {{count, number}} Virtual Analogue or 8-Bit presets. Choose its destination on the FM1.',
    virtualAnalogInitNote:
      'A DX7 bank has no place for a Virtual Analogue or 8-Bit preset, so this bank’s one is sent as INIT VOICE.',
    virtualAnalogInitNote_other:
      'A DX7 bank has no place for a Virtual Analogue or 8-Bit preset, so this bank’s {{count, number}} are sent as INIT VOICE.',
    fmPatch: 'FM patch',
    fmTag: 'FM',
    virtualAnalogTag: 'VA',
    eightBitTag: '8B',
    engineTitle: '{{engine}}\n{{action}}',
  },
  namedBanks: {
    name: 'Bank name',
    description: 'Description (optional)',
    descriptionPlaceholder: 'Notes about this bank',
    saveMenu: 'Save bank…',
    loadBank: 'Load bank…',
    update: 'Update details',
    openFailed: 'Saved banks could not be opened. Reload the page and try again.',
    saved: 'Saved “{{name}}”.',
    loaded: 'Loaded “{{name}}” into “{{bank}}”.',
  },
  backup: {
    menuOtherFiles: 'Other files',
    sysexContents: 'DX7 data only, no FM1 effects',
    menuHeading: 'Backup',
    download: 'Download backup',
    restore: 'Restore from backup…',
    lastBackup: 'Last backed up: {{date}}',
    downloaded: 'Downloading a backup of your banks and saved banks.',
    downloadedWithoutSavedBanks:
      'Downloading a backup of your banks. Saved banks could not be read, so they are not in it.',
    downloadedWithoutDamaged:
      'Downloading a backup. Some saved banks could not be read, so they are not in it.',
    unavailable: 'Backups could not be opened. Reload the page and try again.',
    unavailableUnsaved:
      'The backup could not be prepared. Keep this tab open, because your latest changes are not saved, and try again.',
    restoreTitle: 'Restore from backup',
    restoreIntro:
      'Choose a backup file made with Download backup. Nothing changes until you confirm.',
    chooseFile: 'Choose a backup file',
    reading: 'Reading the backup…',
    backedUpAt: 'Backed up',
    workspaceBanks: 'Banks',
    patches: 'Patches',
    savedBanks: 'Saved banks',
    toAdd: 'To add',
    alreadyHere: 'Already here, kept',
    unreadable: 'Could not be read',
    workspaceEffect:
      'Your banks and all their patches are replaced by the ones in the backup. Undo in the notification afterwards puts them back.',
    savedBanksEffect:
      'Saved banks are only added. One already in this browser is kept as it is, and Undo does not remove the ones added.',
    restoreAction: 'Restore backup',
    restoring: 'Restoring…',
    restored: 'Restored the backup from {{date}}.',
    errors: {
      format:
        'This file is not a backup from this app. Choose a .json file made with Download backup.',
      newer:
        'This backup was made by a newer version of this app. Reload the page to update it, then try again.',
      damaged: 'This backup is damaged and cannot be restored. Try another backup file.',
      size: 'This file is too large to be a backup from this app.',
      read: 'The file could not be read. Choose it again.',
      savedBanksFailed:
        'Browser storage could not keep the saved banks from this backup, so your library was not changed. Try again.',
    },
  },
} as const
