/**
 * British English for dialogs the patch banks open on demand. Only those dialogs show it, so it
 * loads with them rather than with the page: `@/i18n/librarian-dialogs` adds it to `en-GB`, beside
 * the menu items and load failures the page reads from the same sections. Every other locale keeps
 * these sections in its own file.
 */
export default {
  banks: {
    swapAction: 'Swap with {{slot}}',
    swapHint: 'To keep “{{name}}”, swap instead: it moves to {{slot}}.',
    swapFailed: 'The patches could not be swapped.',
  },
  replacePatch: {
    replacing: 'Replacing…',
    action: 'Replace patch',
    title: 'Replace {{slot}} “{{patch}}”?',
    warning:
      'The patch in this slot will be replaced by the one in the file, and its FM1 effects reset to their defaults.',
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
    help: 'Choose a standard 32-voice DX7 SysEx bank file.',
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
}
