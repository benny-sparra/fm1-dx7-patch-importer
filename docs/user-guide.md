# User guide

This guide covers the M-VAVE FM1 Editor & Librarian in detail. For requirements and a quick start,
see the [README](../README.md).

## Banks, transfers, and settings

The editor works in browsers with Web MIDI and SysEx. The help guide's **Getting started** tab shows the same table and marks the browser you are using.

| Browser | Drives the FM1 | Where                             |
| ------- | -------------- | --------------------------------- |
| Chrome  | Yes            | Desktop and Android               |
| Edge    | Yes            | Desktop                           |
| Firefox | Yes            | Desktop                           |
| Safari  | No             | Nor any browser on iPhone or iPad |

Every browser on iPhone and iPad is built on Safari's engine, so none of them has Web MIDI, whatever its name. Firefox on Android has none either.

The first time you connect, the browser asks to allow MIDI and SysEx access for the site. Firefox asks you to install a small site permission add-on instead of showing a plain permission prompt; accept it to connect.

After the first successful connection, the app remembers the selected MIDI ports and both channels and reconnects automatically on future visits. Switch **MIDI online** off to disable automatic connection. If the selected output disconnects, the app does not switch to another device: nothing is selected until the output is reconnected or you choose another in **Settings**, and messages still waiting to be sent are dropped.

On Linux the FM1 appears as **FM-1 MIDI 1**, and on macOS as **USB Composite Device**. When no port has been chosen yet, the app picks a port named for the FM-1 if there is one, and otherwise the first MIDI device it finds, skipping ports built into the operating system such as **Midi Through** on Linux and **Microsoft GS Wavetable Synth** on Windows. If notes do not reach the FM1, open **Settings** and check that the output is the FM1.

On Linux, sending a whole bank often fails while notes, effects, single patches, and individual
parameter edits work. Browsers send MIDI through the ALSA sequencer, which drops data when its
output buffer, usually about 4 KB, fills up rather than waiting for the device. A 32-voice bank is
4,104 bytes, so it only arrives when the buffer happens to drain in time. Chrome and Firefox are
both affected, and the page cannot work around it because Web MIDI sends a SysEx message whole.
`dmesg` reports `ALSA: seq_midi: MIDI output buffer overrun` when this happens.

Enlarging that buffer fixes bank sends in both browsers. Check the current size first, which is
usually 4096:

```bash
cat /sys/module/snd_seq_midi/parameters/output_buffer_size
```

Then set a larger size. 131072 (128 KB) leaves ample room for a bank:

```bash
sudo bash -c 'echo "options snd_seq_midi output_buffer_size=131072" > /etc/modprobe.d/snd-seq-midi-buffer-size.conf'
```

Reboot afterwards, because the module reads the option when it loads.

If you would rather not change a system setting, send the bank outside the browser instead: open
its menu and choose **Download this bank**, switch **MIDI online** off so the device is free, then
send the file with `amidi`, using the port that `amidi -l` lists for the FM1:

```bash
amidi -p hw:2,0,0 -s bank.syx
```

The **MIDI log** in the footer lists recent messages the app sent and received. **Download log** saves it as a text file, with the full data of each message and your browser version, to attach to a bug report. The file stays on your computer until you share it.

The selected bank in the browser does not determine the hardware destination—the final destination is chosen on the FM1 itself.

Clicking a slot in banks A–D selects that hardware slot, then sends the patch's voice and saved FM1 effects to the edit buffer, so you hear the patch as it is in your library even when you have not sent its bank to the FM1 yet. A DX7 bank transfer does not carry effects, which is why they are always sent. Clicking a slot in an added bank sends its voice and effects to the edit buffer. Clicking the same unchanged slot again sends nothing more. If the browser did not grant SysEx access, a click in banks A–D can only select the hardware slot, which plays what the FM1 has stored there, and send its effects.

A patch played from a click stays an unsaved edit on the FM1. To keep it there, hold **SAVE** on the FM1, or send its whole bank. Opening a patch in the editor sends it the same way before you start editing.

### M-VAVE firmware and FM-1+VA

Some FM1 owners replace M-VAVE's firmware with [FM-1+VA](https://baudgirl.com/work/FM-1+VA), a
replacement firmware that adds a Virtual Analog engine. When MIDI connects, and whenever the FM1
reconnects, the app asks the FM1 which firmware it runs; **Settings** shows the answer under
**FM1 firmware**, and when it is FM-1+VA a Baud Girl FM-1+VA badge appears in the header, on the FM1 picture or, on narrower screens, under the MIDI controls. The app needs the FM1 selected as the **Input monitor** to hear it.

FM-1+VA stores a single patch sent as one SysEx message straight over the selected preset, with no
**SAVE**. So unless the FM1 has said it runs M-VAVE's firmware, the app sends a patch you play or
open as its 155 individual parameter changes instead. The FM1 holds those as an unsaved edit of the
selected preset, which it drops when you change preset. They arrive in well under a second. Press **SAVE** on the FM1 to keep the patch there.

FM-1+VA also chooses a bank's destination differently. When a bank arrives it asks **Write the
bank?** and starts on bank A, whichever bank you sent: turn **ALGORITHM** until the question names
the bank you want, then turn **SELECT** to **Write** and press **SEL**, or press **HOME** to
cancel. The destination instructions shown before sending follow the firmware the FM1 named.

Other replacement firmware, such as Hügelton Instruments' [Felucca](https://hugelton.github.io/Felucca/),
shows as **Not identified** under **FM1 firmware**. The app sends it patches as parameter changes,
but whether it plays DX7 patches at all has not been tested.

To move your FM1 between these firmwares, see [Switching FM1 firmware](switching-firmware.md).

To bring the FM1's own presets into the library, press **Save a backup** on FM-1+VA's Presets page,
then choose **Import FM-1+VA presets…** from the menu in the patch-bank header and select the
`.syx` file it saved. It holds the 128 presets in the FM1's banks A to D, each shown as a folded
panel: open one to see its patches, and click a patch to hear it on the FM1 with the default
effects. Switch a bank off to leave it as it is, then press **Replace** to put the banks switched
on into banks A to D here, adding any of them your library does not have. The file sends nothing to the FM1, so the import works with MIDI
switched off and whichever firmware the FM1 runs. Only the patches come in: the file holds each
preset's effects too, but the app cannot read them yet, so every imported patch starts with its
effects off. A Virtual Analog preset is marked **VA** and left out, since the app cannot hold one
yet, and a preset that is damaged in the file is marked too; either way that slot keeps the patch
it has now. The notification offers **Undo**.

The search box above the patch grid looks through every bank that has patches in it, not only the one shown. It matches part of a patch's name, or a whole slot code such as `B07` or `b7`, and lists the matches in bank order, each labelled with its slot. While results show, the grid is titled **Search results**, no bank is selected, **Send to FM1** is unavailable because a bank transfer needs one bank, and patches cannot be dragged to reorder them. Click a result to play it as you would in its bank; the results stay up so you can try the next one, and they are still there when you come back from editing one. Clearing the search returns to the bank of the last result you played, or to the bank you were in if you played none. Choosing a bank on the left clears the search and shows that bank.

The search also looks through your saved banks and the bundled DX7 patch banks that **Add new bank** offers. Matches in your own banks come first, under **Your patch banks**; the rest follow under **Saved banks** and **Other DX7 patch banks**, each labelled with its bank and slot, and a long list shows its first 60 matches per group until you type more. Click one of those to hear it through the FM1 edit buffer: a saved-bank patch plays with its saved FM1 effects, and a bundled DX7 patch with the default effects, since those banks hold no effects of their own. They are not in one of your banks, so they cannot be edited or reordered where they are. Use the copy button on one to put it in a slot of your own, through the same **Copy to…** dialog, overwrite confirmation, and Undo as copying between banks. Double-click one, or press Enter on the one you just played, to do the same and then open the copy in the editor. A saved-bank or bundled patch that is an exact copy of one listed above it, with the same voice data, name, and FM1 effects, is left out, and a line under its group says duplicates aren’t shown. Patches that share a name but differ in their data all show. The bundled banks' patch names load the first time you search.

To import another bank, open that workspace bank's menu, choose **Import DX7 bank**, and select a compatible `.syx` file. Replacing a populated bank requires confirmation. Once you choose the file, the confirmation lists its 32 patches, after you pick one bank if the file joins several (see [SysEx compatibility](#sysex-compatibility)): click one to hear it on the FM1, through the edit buffer with the default FM1 effects, before you decide. Nothing in your library changes until you press **Replace bank contents**, and a file that cannot be read is explained straight away. The same menu lets you edit the bank title and description, download the bank, or delete it when more than one workspace bank exists. Use the **Library actions** menu (⋮) in the patch-bank header to back up your library (see [Backing up your library](#backing-up-your-library)), choose **Download SysEx banks (.zip)** to get every loaded bank as a `.syx` file for other DX7 tools, or choose **Reset to factory patches…** to put the FM-1 factory banks back into A–D, which also resets their titles and descriptions. Additional workspace banks are left intact. Deleting a bank, resetting to the factory patches, restoring a backup, importing over a bank or from FM-1+VA's presets, loading a saved bank, or copying a patch over a slot can be undone from its notification or with `Cmd`/`Ctrl` + `Z`.

To copy a patch into another slot, open the slot's **⋮** menu and choose **Copy to…**. Pick a bank from its tabs and a slot from the grid, where the arrow keys also move the choice; only banks that have patches are offered, and the patch's own slot is skipped. The dialog names the patch that will be replaced. The copy brings the patch's FM1 effects with it and changes only the browser library, so send the bank to the FM1 to put it on the hardware. You can also drag a patch by its grip onto another bank on the left: the bank lights up while the patch is over it, and dropping opens the same dialog with that bank chosen. Only banks that have patches take a drop, and dropping on the patch's own bank does nothing.

A slot's **⋮** menu also works with single patches as files. **Download patch** saves the patch as a standard 163-byte DX7 single-voice SysEx file, named after its slot and patch, such as `fm1-A05-PIANO-2.syx`. It holds the DX7 voice only, as a bank download does, so the FM1 effects are not included. **Import patch…** asks before it replaces the slot, then reads a DX7 single-voice file into it. A file that is not a single DX7 patch, or that looks damaged, is refused with an explanation and leaves the slot as it was. A whole 32-voice bank is recognised and pointed to **Import DX7 bank** in the bank's menu. The file carries no FM1 effects, so the slot's effects return to their defaults. The notification offers **Undo**.

To tidy banks after importing archives, choose **Find duplicate patches…** from the menu in the patch-bank header. It lists the patches in your loaded banks whose voice settings match, grouped together, even when a copy has another name. FM1 effects are not compared, and a group says when its copies' effects differ. Choose a patch in the list to go to its bank and play it, as clicking its slot does. The list only reads your library: delete or replace a copy yourself, from its bank.

Each bank's menu also offers **Save bank**, which keeps a named copy of its 32 patches and their FM1 effects in this browser, and **Load bank**, which lists your saved banks. From that list you can load one into the bank, edit its name and description, make a copy, download it as a `.syx` file, or delete it. Loading into a bank that already has patches asks first. If a bank is empty, you can load the built-in demo bank instead.

### Favourites

Every patch has a heart beside its **⋮** menu. Select it to keep the patch in **Favourites**, the last entry in the bank list on the left; select it again to take the patch out, which the notification can undo. You can also drag a patch by its grip onto **Favourites**. Search results from saved banks and the bundled DX7 banks have hearts too.

A favourite is its own copy of the patch, with its FM1 effects, so it stays when the bank it came from is deleted or imported over. Each one shows the bank it came from under its name, and a number for its place in the list. Hearts go by what a patch plays, as the search does: every slot holding exactly the same voice data, name, and FM1 effects shows a lit heart, and Favourites keeps one copy of it.

Favourites and the patches they came from stay together when you edit either. Saving a patch in the editor also updates its copy in Favourites, and saving a favourite also updates every bank slot that held the same patch before the edit. The notification says when this happens, and one Undo reverses all of it.

Open **Favourites** to play, edit, reorder, copy, or download its patches as in any bank. Importing a file over a favourite is not offered. **Send to FM1** sends Favourites as a 32-patch bank, choosing its destination on the FM1 as for any bank. A list shorter than 32 is sent with **INIT VOICE**, Yamaha's plain starting voice, in the slots after it; from a longer list only the first 32 are sent. The instructions for choosing the destination bank say which before you send, and the message after sending repeats it. Favourites are part of your workspace, so backups and Undo include them.

### Language and channels

The interface follows the browser language on first use when it is supported. English comes in two spellings: **English (US)** for a browser set to American English, and **English (UK)** for other English. Change it later in **Settings**; the selection is remembered. Settings also provides separate channels for notes/program changes and effects because the FM1 defaults its effects controls to MIDI channel 2.

If you also play the FM1 from a MIDI keyboard, keep the keyboard off the effects channel. The FM1 reads controllers 0 to 23 on that channel as effect controls, so a keyboard sending there changes effects instead: its mod wheel (CC 1) sets the Filter Type, its volume (CC 7) the Reverb Mix, and its expression pedal (CC 11) the Delay Mix.

## The voice editor

The editor is laid out as a rack. On a wide window (1280 pixels or more) the six operators are rows of a table under one set of column headings: ratio, detune, velocity, amp mod, rate scaling, the four envelope rates and levels, and output. Each value sits directly under the same value for the next operator, so you can compare them at a glance. Click a row to open that operator: its full controls grow in beneath its row, which keeps showing its readouts, while the row that was open folds away. On narrower windows the operators are columns instead: five show a compact readout, and the open operator takes a full-width row of its own. Every row or column has its own output slider and mute and solo buttons, so an operator can be trimmed or silenced without opening it.

The open operator's **Ratio** field takes the ratio you want typed in, such as 3.5, so you don't have to work out Coarse and Fine yourself. Press Enter, or leave the field, and Coarse and Fine move to the nearest ratio the FM1 can play; the field then shows that ratio, which may differ slightly from what you typed. In Fixed mode the field is **Frequency (Hz)** and takes hertz, such as 440 or 1.2k. A comma works as the decimal point, Escape puts the current value back, and one Undo reverses the change.

The algorithm diagram below the operators shows each operator's frequency under its number: a ratio such as 14.00, or a fixed frequency in Hz. Carriers are drawn in amber and modulators in the accent colour, so you can see which ratios you hear directly and which ones shape the tone.

The open operator has a **⋮** menu beside its number with **Copy operator**, **Copy envelope**, and **Paste**. Copy operator takes all of that operator's settings: frequency, envelope, output level, keyboard scaling, and sensitivities. Copy envelope takes only the four rates and levels of its amplitude envelope, so you can give another operator the same shape without changing its frequency or level. There is one clipboard, so each copy replaces the last, and Paste names what it will paste. Open another operator and choose Paste from its menu to give it those settings. The copy lasts until you close or reload the tab, so you can also paste it into an operator in a different patch. Paste sends the changed settings to the FM1 and is a single undo step. The copy is kept only in memory and never saved to the library.

The editor's back button returns to the patch banks, and so do the browser's Back button and a phone's back gesture, rather than leaving the app. If the patch has unsaved edits, each of them asks first whether to keep editing, discard the changes, or save them. The browser's Forward button opens that patch in the editor again, which also sends it to the FM1, as opening it yourself does.

Click anywhere on the title strip of the operators or effects panel to fold it away, and click again to bring it back. Each panel folds on its own and keeps its title visible, so a long editor can be trimmed to the sections you are working on.

The **Presets** menu lists **Init voice** first, then **Randomise**, then six presets to start from. **Init voice** replaces the voice with Yamaha's DX7 INIT VOICE, a plain sine wave to build a sound from: algorithm 1 with no feedback, operator 1 at full output and the others silent, every operator at ratio 1 with no detune, full-rate envelopes with levels 99, 99, 99 and 0, and a flat pitch envelope. Every FM1 effect is switched off so the sine is heard dry, but each effect keeps its settings for when you switch it back on. The patch name is kept, and the change is a single undo step.

**Randomise** generates a new DX7 voice with the DX Android "Android-1" approach rather than fully random values: carriers stay near the fundamental and loud, envelopes always peak, and keyboard scaling, velocity sensitivity and detune are left neutral. The patch name and FM1 effect settings are kept, and the new voice is a single undo step.

**Compare with saved**, the **Compare** button beside **Save to Library**, lets you hear your edits against the saved sound. It becomes available once the patch has unsaved edits. Press it to show the saved version and send it to the FM1. To return to your edits and send them, press it again, close the notice with its **[╳]**, or press `Esc`. The on-screen keyboard stays playable while you compare. While the saved version is showing, the controls, presets, undo, save, and going back are paused, so comparing never changes your edits or their undo history.

The pitch envelope has a presets menu of starting shapes: **Flat**, **Attack blip up**, **Attack drop**, **Scoop**, and **Release fall**. Each one is applied as a single undo step.

Every effect box on the effects panel has a **Preset** menu: **Warm**, **Muffled**, **Telephone**, **Thin**, and **Resonant** for the filter, **Small room**, **Large room**, **Small hall**, **Large hall**, and **Plate** for reverb, **Slapback**, **Quick delay**, **Quick repeats**, and **Echo** for delay, **Subtle chorus**, **Ensemble**, **Chorus wash**, and **Shimmer** for chorus, **Light drive**, **Warm drive**, **Crunch**, and **Fuzz** for distortion, and **Gentle phase**, **Slow sweep**, **Deep phase**, and **Fast swirl** for phaser. Switch the effect on to choose a preset; it sets that effect's controls and leaves the other effects as they are. It sends that effect to the FM1 and is a single undo step.

The LFO and every FM1 effect open with a small animated scope drawn from their current settings. The LFO scrolls its selected wave at a rate set by LFO Speed. The filter shows its response curve, delay its echo taps, chorus its drifting copies, reverb its tail, distortion its clipped wave, and phaser its sweeping notches. A scope dims when its effect is bypassed or when the LFO has no modulation depth. With reduced motion enabled, each scope shows a still frame instead.

## Playing along while you edit

The **Keyboard** button opens the on-screen piano. It floats above the librarian and the editor, and you can drag it by its header, so you can go on editing while it is open.

**Level**, beside the keyboard's title, sets how hard the keys strike: softest at the left, hardest at the right. It starts about three-quarters of the way up. Lower it and raise it while you play to hear how much an operator's **Velocity** sensitivity changes the sound. The setting lasts until you close or reload the tab. It also sets how hard the phrases below play, from their next note: they keep their own accents, played softer or harder in proportion.

The keyboard's header carries a small transport for auditioning a patch without playing it yourself. Choose one of six short phrases, or keep **Arpeggio**, which is chosen when the keyboard opens, then press **Play**. It loops until you press **Stop**, lighting the keys as it goes. The phrases are two bars each and are chosen for what they tell you about a sound rather than for the tune:

- **Pad** holds four-note chords, so you hear the slow attack, the release and anything the effects add to a held sound.
- **Electric piano** comps chords off the beat at changing velocities, which is the quickest way to hear how the patch responds to how hard it is played.
- **Bass** plays short, hard notes low down, for the attack and the low end.
- **Lead** plays a single line that ends on a long held note, giving vibrato and the LFO delay time to arrive.
- **Arpeggio** runs even sixteenths across two octaves, for the attack, the decay and the tuning.
- **Velocity ramp** plays one note eight times, from very soft to very hard.

Each phrase is written for its own tempo, which the **Tempo** slider takes up when you choose it. Moving the slider while a phrase is playing takes effect straight away, carrying on from where the phrase has got to, so it neither restarts nor retriggers notes as you drag. Playing the keys yourself while a phrase loops works normally.

A phrase is sent live over MIDI and is never stored on the FM1: it has nothing to do with the unit's own sequencer. It stops when you close the keyboard, when the MIDI output disconnects or you choose another, and when you change the note channel in **Settings**. Browsers slow down a hidden tab, so a phrase left playing in one skips the notes it would play late rather than sending them all at once. Its notes are kept out of the MIDI log, which records only that a phrase started and stopped.

If a note keeps sounding on the FM1 after you let go of it, press the **MIDI panic** button, the octagon with an exclamation mark next to **Keyboard**. It sends a note-off for every note on the note channel set in **Settings**, and stops a phrase that is playing. A notification confirms it was sent.

## Keyboard shortcuts

The **?** guide lists these on its own tab. Each view binds the actions that also appear in its
toolbar. `Ctrl` stands in for `Cmd` on Windows and Linux, and the matching button or field shows the
shortcut in its tooltip for the current platform.

In the patch banks:

| Shortcut                     | Action                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| `/`                          | Jump to the search field                                    |
| `Cmd`/`Ctrl` + `F`           | Jump to the search field, selecting whatever it holds       |
| `Esc`                        | Clear the search                                            |
| `Enter`                      | Play the focused slot, then open the lit slot in the editor |
| `Cmd`/`Ctrl` + `Z`           | Undo the last change to the patch banks                     |
| `Cmd`/`Ctrl` + `Shift` + `Z` | Redo the undone change                                      |

In the voice editor:

| Shortcut                     | Action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `Cmd`/`Ctrl` + `Z`           | Undo the last edit                                                      |
| `Cmd`/`Ctrl` + `Shift` + `Z` | Redo the undone edit                                                    |
| `Cmd`/`Ctrl` + `S`           | Save to Library                                                         |
| `Esc`                        | Return to the patch banks, prompting first if there are unsaved changes |
| `Esc`                        | Stop comparing with the saved patch and return to your edits            |

These act on the view as a whole and stay out of the way of everything else: they are ignored while
a dialog is open (shortcuts that take a modifier still work while only the floating piano keyboard
is open), `Esc` closes an open menu before the view reacts to it, and a shortcut that takes
a modifier still works while a text field has focus, so `Cmd`/`Ctrl` + `S` saves without leaving the
patch-name field. Undo and redo in the patch banks are the exception: in a text field they undo your
typing instead. Bare keys are left to whatever is being typed into, so `/` and `Esc` behave
normally inside the search field, where `Esc` clears it.

`Enter` gives the keyboard the route the mouse already had through double-click: it plays an unlit
slot as a click would, and opens the slot that is already lit. Each slot's **⋮** menu also
offers **Edit**, **Copy to…**, **Import patch…**, and **Download patch**; it opens with `Enter` and moves between its items with the arrow keys.

Individual controls keep their own keyboard behaviour. Rotary controls and envelope points respond
to the arrow keys, `Home`, `End`, `Page Up`, and `Page Down`, and the bank tabs move with the arrow
keys.

The patch grid is a single tab stop. The arrow keys move between slots, following the rows as the
grid reflows, and `Home` and `End` jump to the first and last slot. Moving only changes which slot
has focus: because selecting one plays it on the FM1, that waits for
`Enter`. Each slot's grip handle stays separately reachable for keyboard reordering.

The on-screen piano plays from the computer keyboard while it is open, using the usual two-row
layout: on a QWERTY keyboard `A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K` from the
root note upwards, with `Z` and `X` shifting the octave down and up. The keys keep those positions
on other layouts, such as AZERTY or QWERTZ, and the on-screen keys show the letters your keyboard
types. `Esc` closes it. Keys pressed with `Cmd`/`Ctrl`
or `Alt` are left to the browser and the view, so undo and save still work while it is open, and
pressing one releases any note held from the computer keyboard.

## Backing up your library

Your patches, their FM1 effects, and your saved banks exist only in this browser. Clearing site data, or a browser that removes storage, loses them. The FM1 cannot send its banks back, so nothing else holds a copy.

Open the menu in the patch-bank header and choose **Download backup**, under **Backup** at the top, to save everything in one `.json` file: every workspace bank with its title and description, each patch's FM1 effects, your Favourites, and every saved bank. The menu shows when you last made one. If the browser cannot save your work, the warning at the top of the page offers the same download.

A backup file can only be read by this app. To use patches in Dexed, a DX7, or another editor, choose **Download SysEx banks (.zip)** under **Other files** instead: a `.syx` file holds DX7 voice data only, without FM1 effects or saved banks.

To restore, choose **Restore from backup…** and pick the file. The dialog shows what it holds before anything changes. Restoring:

- replaces your workspace banks and their patches, and your Favourites, with the ones in the backup. A backup made before Favourites existed restores an empty Favourites. **Undo** in the notification, or `Cmd`/`Ctrl` + `Z`, puts your previous workspace back.
- adds the backup's saved banks. A saved bank already in this browser is kept as it is and never overwritten. Undo does not remove saved banks that were added.

A backup made by a newer version of the app cannot be restored until the page is reloaded to update it.

## SysEx compatibility

The DX7 import feature intentionally validates bank files before loading them. Each bank in a file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain only 7-bit data bytes, as every MIDI data byte must be
- contain a valid Yamaha checksum

Archive collections often join several banks in one `.syx` file. **Import DX7 bank** and **Add new
bank** read up to 256 banks from such a file and list each by its first few patch names, so you
choose the one to import; other SysEx messages between them are passed over. A bank that fails
these checks is marked damaged and cannot be chosen, while the rest of the file stays usable. A
file holding one bank is refused when that bank fails, with the reason. Importing into an empty
bank takes a single-bank file at once, and asks which bank only when the file holds several.

Single-voice dumps, which **Import patch…** reads, and banks using another SysEx format are not
accepted.

The browser library is the source of truth. The current FM1 firmware does not document transmission of stored voices or banks over MIDI, so the librarian cannot import a bank directly from the hardware. Download a backup regularly (see [Backing up your library](#backing-up-your-library)). If M-VAVE adds bulk-dump output in a future firmware release, device-to-browser bank import can be added without changing the saved library format.
