/**
 * British English for dialogs the patch banks open on demand. Only those dialogs show it, so it
 * loads with them rather than with the page: `@/i18n/librarian-dialogs` adds it to `en-GB`, beside
 * the menu items and load failures the page reads from the same sections. Every other locale keeps
 * these sections in its own file.
 */
export default {
  banks: {
    addBankNamedTitle: 'Add bank: “{{name}}”',
    addBankFileNoteFormat: 'A standard 32-voice DX7 bank in a .syx file',
    addBankFileNoteSeveral:
      'If the file joins several banks, you will choose which one to use next',
    addBankFileNotePrivacy: 'The file is read in your browser and goes nowhere else',
    addBankSourceHelp: 'Where should the new bank’s patches come from?',
    addBankCatalogHelp: 'Choose a collection, then the bank to start from.',
    addBankFileHelp: 'Choose a standard 32-voice DX7 SysEx bank file.',
    addBankFileBankHelp: 'Choose which of the banks in the file to use.',
    catalogSourceHint:
      'Yamaha factory banks, the FM1’s own presets, and collections by other authors.',
    uploadSourceHint: 'A standard 32-voice DX7 SysEx bank from your computer.',
    collections: 'Collections',
    banksInCollection: 'Banks in {{collection}}',
    collectionBanks: '{{count, number}} bank',
    collectionBanks_other: '{{count, number}} banks',
    wizardBack: 'Back',
    wizardNext: 'Next',
    swapAction: 'Swap with {{slot}}',
    swapHint: 'To keep “{{name}}”, swap instead: it moves to {{slot}}.',
    swapFailed: 'The patches could not be swapped.',
    addBankTitle: 'Add bank',
    addBankHelp: 'Give the bank a name and an optional description.',
    bankName: 'Bank name',
    soundSource: 'Choose a patch source',
    catalogSource: 'Existing DX7 patch banks',
    uploadSource: 'Upload your own bank',
    chooseSysexFile: 'Choose a DX7 SysEx file',
    createBank: 'Create bank',
    creatingBank: 'Creating…',
    addBankFailed: 'The bank could not be created.',
    fileErrors: {
      voiceFormat: 'This file isn’t a DX7 patch. Choose a .syx file that holds a single patch.',
      voiceGotBank:
        'This file is a 32-voice DX7 bank. To load it, choose “Import DX7 bank…” from the bank’s menu.',
    },
    copyDialogTitle: 'Copy {{name}}',
    copyTargetBank: 'Bank',
    copyTargetSlot: 'Slot',
    copyReplaces: 'This replaces “{{name}}” in {{slot}}. You can undo this action.',
    copyAction: 'Replace {{slot}}',
    copyAndEditAction: 'Replace {{slot}} and edit',
    copyToEditHint: 'To edit this patch, copy it into one of your banks.',
    copyFailed: 'The patch could not be copied.',
    everywhere: {
      savedBanks: 'Saved banks',
      catalog: 'Other DX7 patch banks',
      play: 'Play {{name}} from {{origin}}',
      playTitle:
        'Click to play {{name}} through the FM1 edit buffer; double-click to copy and edit',
      copy: 'Copy {{name}} to a bank',
      truncated:
        'Showing the first {{shown}} of {{total}} matches. Type more to narrow the search.',
      loading: 'Searching other DX7 patch banks…',
      playFailed: 'The patch could not be played.',
      copiesHidden: 'Duplicate patches aren’t shown.',
    },
  },
  toasts: {
    bankCreatedFromCatalog: 'Created “{{bank}}” from “{{source}}” in {{collection}}.',
    bankCreatedFromFile: 'Created “{{bank}}” from the file “{{file}}”.',
    bankCreatedFromFileBank: 'Created “{{bank}}” from bank {{number}} of the file “{{file}}”.',
  },
  replacePatch: {
    replacing: 'Replacing…',
    action: 'Replace patch',
    title: 'Replace {{slot}} “{{patch}}”?',
    warning:
      'The patch in this slot will be replaced by the one in the file, and its FM1 effects reset to their defaults.',
  },
  receiveWizard: {
    title: 'Receive patches',
    help: {
      source:
        'Choose what is sending. The editor only listens: it sends nothing to start a transfer.',
      listen: 'Keep this screen open until the patches arrive.',
      review:
        'Click a patch to hear it on the FM1. Your library stays as it is until you replace it.',
      destination: 'Choose where the patches go.',
    },
    sourceLegend: 'What is sending',
    sources: {
      fm1: 'An FM1 on M-VAVE’s V16',
      fm1Hint: 'A bank of 32 patches, sent with GLOBE → Export.',
      patch: 'One patch from another device',
      patchHint: 'From Dexed, a DX7, or another editor.',
    },
    stepsHeading: 'Steps',
    steps: {
      fm1Connect: 'Connect the FM1 to this computer with USB. Bank Export sends over USB only.',
      next: 'Choose Next, so the editor is listening before anything is sent.',
      fm1Export: 'On the FM1, open GLOBE, choose Export, and pick a bank.',
      patchConnect:
        'Connect the device, or open Dexed or the other editor, with its MIDI output reaching this computer.',
      patchSend: 'Send one patch from it as a DX7 single-voice dump.',
    },
    startFm1: 'Now open GLOBE on the FM1, choose Export, and pick a bank.',
    startPatch: 'Now send the patch as a DX7 single-voice dump.',
    listening: 'Listening on “{{input}}”. The editor sends nothing.',
    noMidi: 'MIDI is offline. Switch it online to listen.',
    noInput: 'Choose the device sending the patches as the input monitor.',
    noSysex:
      'Receiving patches needs SysEx. Reconnect MIDI and allow SysEx access when the browser asks.',
    received: 'Received “{{patch}}”. Choose Next, or send another to receive it instead.',
    receivedBank:
      'Received a bank of 32 patches, starting with “{{patch}}”. Choose Next to hear them, or send another to receive it instead.',
    timeout: 'If the FM1 says Receive Timeout, start Export again while this screen is open.',
    errors: {
      bankDamaged: 'That bank arrived damaged. Send it again.',
      bankDamagedFm1: 'That bank arrived damaged. Start Export on the FM1 again.',
      damaged: 'That patch arrived damaged. Send it again.',
      format:
        'That wasn’t a DX7 patch or bank. Send a single-voice dump of one patch, or a 32-voice bank.',
    },
    receivedTitle: 'Patches received',
    receivedPatchTitle: 'Patch received',
    play: 'Play {{name}}',
    bankLegend: 'Bank to replace',
    emptyBank: 'Empty',
    bankWarning:
      'Every patch in “{{bank}}” will be replaced by the 32 received, and their FM1 effects reset to their defaults.',
    patchBankLegend: 'Bank',
    slotLabel: 'Slot to replace',
    slotOption: '{{slot}} {{patch}}',
    patchWarning:
      '{{slot}} “{{patch}}” will be replaced by “{{received}}”, and its FM1 effects reset to their defaults.',
    noBanks: 'A patch can only replace one already in a bank. Add a bank with patches first.',
    replace: 'Replace',
  },
  bankFile: {
    legend: 'Banks in this file',
    help: 'This file holds one DX7 bank.',
    help_other: 'This file joins {{count, number}} DX7 banks. Choose the one to import.',
    damagedBanks: 'One of them is damaged and cannot be imported.',
    damagedBanks_other: '{{count, number}} of them are damaged and cannot be imported.',
    bank: 'Bank {{number}}',
    option: '{{bank}}: {{contents}}',
    damaged: 'Damaged',
  },
  overwriteImport: {
    titleEmpty: 'Import into “{{bank}}”',
    actionEmpty: 'Import bank',
    action: 'Replace bank contents',
    play: 'Play {{name}}, patch {{number}}',
    previewHelp:
      'Click a patch to hear it on the FM1. Your bank stays as it is until you replace it.',
    previewTitle: 'Patches in this file',
    title: 'Import over “{{bank}}”?',
    warning: 'The bank’s current contents will be wiped and replaced by the imported patches.',
  },
  fm1VaImport: {
    title: 'Import Baud Girl presets file',
    titleRead: 'Read presets from the FM1',
    help: 'Choose a presets file from Baud Girl’s Device Manager: a backup from “Back up everything”, or a preset saved with “Save as a file”.',
    warning:
      'Each bank you import replaces the bank you choose for it, or is added as a new bank. You can undo this.',
    partialFile:
      'This file holds one preset. Only its slot changes; every other slot keeps its patch.',
    partialFile_other:
      'This file holds {{count, number}} presets. Only their slots change; every other slot keeps its patch.',
    file: 'Baud Girl presets file',
    read: 'Read from FM1',
    readUnavailable:
      'To read the presets from the FM1, choose it as the MIDI output and input, with SysEx allowed. Reading needs Baud Girl firmware FM-1_079 or later.',
    reading: 'Reading preset {{number, number}} of {{total, number}}…',
    stopReading: 'Stop reading',
    chooseFile: 'Choose a Baud Girl presets file',
    previewTitle: 'Banks in this file',
    previewHelp: 'Open a bank to hear its patches on the FM1.',
    previewTitleFm1: 'Banks on the FM1',
    allMatch: 'Every patch here matches your library.',
    differs: 'A dot marks the one patch that differs from your library.',
    differs_other:
      'A dot marks each of the {{count, number}} patches that differ from your library.',
    differingPatch: 'Differs from your library',
    bankHeading: 'FM1 bank {{bank}}',
    newBank: 'A new bank',
    destination: 'Import into',
    bankSwitch: 'Import FM1 bank {{bank}}',
    damagedPreset: 'Damaged',
    damagedPresets: 'One preset is damaged. Its slot keeps its patch.',
    damagedPresets_other: '{{count, number}} presets are damaged. Their slots keep their patches.',
    absentPreset: 'Not in file',
    action: 'Import one bank',
    action_other: 'Import {{count, number}} banks',
    imported: 'Imported bank {{banks}} from the FM1.',
    imported_other: 'Imported banks {{banks}} from the FM1.',
    errors: {
      size: 'This file is {{bytes, number}} bytes. A Baud Girl presets file holds 1 to 128 presets of {{size, number}} bytes each.',
      format: 'This isn’t a Baud Girl presets file.',
      damaged:
        'No preset in this file could be read. Save the file again in Baud Girl’s Device Manager and try again.',
      unreadable: 'The file could not be read.',
      readBusy:
        'The FM1 can’t send its presets while its Sequencer is playing. Stop it and read again.',
      readNoReply: 'The FM1 stopped answering. Check its MIDI connection and read again.',
      readStopped: 'The read stopped because the MIDI ports changed. Read again.',
      readFailed:
        'The FM1 couldn’t send its presets. Read again, or choose a Baud Girl presets file.',
    },
  },
  fm1VaWrite: {
    title: 'Write patches to the FM1',
    help: 'Writes your library’s patches over the FM1’s presets. Only patches that differ are written.',
    source: 'Write from',
    bankSwitch: 'Write to FM1 bank {{bank}}',
    differs: 'One patch differs.',
    differs_other: '{{count, number}} patches differ.',
    same: 'Every patch matches.',
    nothing: 'Nothing to write.',
    virtualAnalogKept:
      'One Virtual Analogue preset is kept: only a Virtual Analogue patch can replace it.',
    virtualAnalogKept_other:
      '{{count, number}} Virtual Analogue presets are kept: only Virtual Analogue patches can replace them.',
    eightBitKept: 'One 8-Bit preset is kept: only an 8-Bit patch can replace it.',
    eightBitKept_other:
      '{{count, number}} 8-Bit presets are kept: only 8-Bit patches can replace them.',
    inexact: 'One Virtual Analogue or 8-Bit patch can’t be stored exactly, so its preset is kept.',
    inexact_other:
      '{{count, number}} Virtual Analogue or 8-Bit patches can’t be stored exactly, so their presets are kept.',
    eightBitPatch:
      'One patch was read from an 8-Bit preset and can’t be written, so its preset is kept.',
    eightBitPatch_other:
      '{{count, number}} patches were read from 8-Bit presets and can’t be written, so their presets are kept.',
    replaces: '{{number}} {{replaces}} → {{name}}',
    action: 'Write one patch…',
    action_other: 'Write {{count, number}} patches…',
    confirmTitle: 'Replace these presets on the FM1?',
    confirmWarning:
      'Each preset is replaced at once, and the FM1 can’t undo it. Save a backup with “Back up everything” in Baud Girl’s Device Manager first.',
    confirm: 'Write one patch',
    confirm_other: 'Write {{count, number}} patches',
    writing: 'Writing patch {{number, number}} of {{total, number}}…',
    stop: 'Stop after this patch',
    written: 'Wrote one patch to the FM1.',
    written_other: 'Wrote {{count, number}} patches to the FM1.',
    stopped:
      'Stopped after {{count, number}} of {{total, number}} patches. The rest are unchanged.',
    errors: {
      mismatch:
        'Preset {{number}} didn’t read back as written, so writing stopped after {{count, number}} of {{total, number}} patches.',
      failed:
        'Writing stopped after {{count, number}} of {{total, number}} patches. Check the FM1’s MIDI connection.',
    },
  },
  duplicates: {
    title: 'Duplicate patches',
    help: 'Patches whose voice settings match, even under another name. FM1 effects aren’t compared. Choose a patch to go to it and play it.',
    group: '{{name}} and one copy',
    group_other: '{{name}} and {{count, number}} copies',
    effectsDiffer: 'Their FM1 effects differ.',
    settingsDiffer: 'Their Baud Girl preset settings differ.',
    goTo: 'Go to {{name}}, patch {{number}} in {{bank}}',
    none: 'No duplicates: every patch in your banks has its own voice settings.',
  },
  shareLink: {
    title: 'Shared patch',
    intro:
      'Someone shared this patch with a link. It stays out of your library until you add it to a slot.',
    play: 'Play on FM1',
    playHelp:
      'Play sends it to the FM1’s edit buffer, leaving the presets the FM1 stores as they are.',
    connectToPlay: 'Connect the FM1 to play it.',
    presetPlaysOnFm1:
      'This preset plays only on Baud Girl’s firmware: add it to banks A–D, then write it to the FM1 to hear it.',
    add: 'Add to library…',
    origin: 'Share link',
    damaged: 'This share link is damaged or incomplete. Ask for it again, and copy all of it.',
    newerVersion:
      'This share link comes from a newer release of the editor. Reload the page to open it.',
  },
  changeToFm: {
    title: 'Change {{slot}} “{{patch}}” to FM?',
    warning:
      'This replaces the Virtual Analogue preset in this slot with INIT VOICE, an FM patch you can edit. Nothing of its sound carries over but its FM1 effects. Undo puts it back.',
    name: 'Name',
    fm1Note:
      'If the FM1 holds this Virtual Analogue preset, writing to the FM1 leaves it there: erase it on the FM1 to change its engine there too.',
    action: 'Change to FM',
  },
  fm1VaSend: {
    title: 'Send {{bank}} to the FM1',
    help: 'Writes {{bank}} over one of the FM1’s banks of presets. Only patches that differ are written.',
    destination: 'Write over',
    favouritesShort:
      'Favourites holds one patch, so the FM1 bank’s other presets stay as they are.',
    favouritesShort_other:
      'Favourites holds {{count, number}} patches, so the FM1 bank’s other presets stay as they are.',
  },
  favourites: {
    addFailed: 'The patch could not be added to Favourites.',
  },
  namedBanks: {
    saving: 'Saving…',
    title: 'My saved banks',
    intro: 'Choose a saved bank to load into “{{bank}}”.',
    saveCurrent: 'Save “{{bank}}”',
    snapshotHelp: 'This creates an independent snapshot of all 32 patches and their FM1 effects.',
    namePlaceholder: 'e.g. Gig – Saturday',
    save: 'Save bank',
    editDetails: 'Edit bank details',
    savedBanks: 'Saved banks',
    count: '{{count, number}} saved bank',
    count_other: '{{count, number}} saved banks',
    search: 'Search saved banks',
    loading: 'Loading saved banks…',
    empty: 'No saved banks yet. Save the selected bank to create one.',
    noMatches: 'No saved banks match this search.',
    load: 'Load',
    updatedAt: 'Updated {{date}}',
    rename: 'Edit {{name}}',
    download: 'Download {{name}} as SysEx',
    downloadAction: 'Download SysEx file',
    duplicate: 'Duplicate {{name}}',
    duplicateAction: 'Duplicate bank',
    delete: 'Delete {{name}}',
    deleteAction: 'Delete bank',
    deleteConfirm: 'Permanently delete “{{name}}” from this browser?',
    loadConfirm: 'Replace the 32 patches in “{{bank}}” with “{{name}}”?',
    replaceAction: 'Replace patches',
    operationFailed: 'The saved-bank operation failed.',
    loadFailed: 'Saved banks could not be loaded from browser storage.',
    damagedBanks:
      'Some saved banks could not be read, so they are hidden. They remain unchanged in browser storage.',
    updated: 'Updated “{{name}}”.',
    downloaded: 'Downloaded “{{name}}”.',
    copied: 'Created “{{name}}”.',
    deleted: 'Deleted “{{name}}”.',
    downloadedWithInit:
      'Downloaded “{{name}}”, with INIT VOICE in place of its Virtual Analogue or 8-Bit preset.',
    downloadedWithInit_other:
      'Downloaded “{{name}}”, with INIT VOICE in place of its {{count, number}} Virtual Analogue or 8-Bit presets.',
  },
}
