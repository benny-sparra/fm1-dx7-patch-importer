# User guide

This guide covers the M-VAVE FM1 Editor & Librarian in detail. For requirements and a quick start,
see the [README](../README.md).

## Banks, transfers, and settings

The editor works in browsers with Web MIDI and SysEx, such as Chrome, Edge, Opera, and Firefox on the desktop, and Chrome on Android. Safari, and Firefox on mobile, do not expose Web MIDI. The first time you connect, the browser asks to allow MIDI and SysEx access for the site. Firefox asks you to install a small site permission add-on instead of showing a plain permission prompt; accept it to connect.

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

Clicking a slot in banks A–D selects that hardware slot and then sends the patch's saved FM1 effects, because a DX7 bank transfer does not carry effects. Clicking a slot in an added bank sends its voice and effects to the edit buffer.

To send one patch instead, open it in the editor. For a patch in banks A–D the app first selects the matching hardware slot; it then sends the voice and its FM1 effects to the edit buffer; hold **SAVE** on the FM1 to store it on the hardware.

The search box above the patch grid looks through every bank that has patches in it, not only the one shown. It matches part of a patch's name, or a whole slot code such as `B07` or `b7`, and lists the matches in bank order, each labelled with its slot. While results show, the grid is titled **Search results**, no bank is selected, **Send to FM1** is unavailable because a bank transfer needs one bank, and patches cannot be dragged to reorder them. Click a result to play it as you would in its bank; the results stay up so you can try the next one, and they are still there when you come back from editing one. Clearing the search returns to the bank of the last result you played, or to the bank you were in if you played none. Choosing a bank on the left clears the search and shows that bank.

The search also looks through your saved banks and the bundled DX7 patch banks that **Add new bank** offers. Matches in your own banks come first, under **Your patch banks**; the rest follow under **Saved banks** and **Other DX7 patch banks**, each labelled with its bank and slot, and a long list shows its first 60 matches per group until you type more. Click one of those to hear it through the FM1 edit buffer: a saved-bank patch plays with its saved FM1 effects, and a bundled DX7 patch with the default effects, since those banks hold no effects of their own. They are not in one of your banks, so they cannot be edited or reordered where they are. Use the copy button on one to put it in a slot of your own, through the same **Copy to…** dialog, overwrite confirmation, and Undo as copying between banks. Double-click one, or press Enter on the one you just played, to do the same and then open the copy in the editor. A saved-bank or bundled patch that is an exact copy of one listed above it, with the same voice data, name, and FM1 effects, is left out, and a line under its group says duplicates aren’t shown. Patches that share a name but differ in their data all show. The bundled banks' patch names load the first time you search.

To import another bank, open that workspace bank's menu, choose **Import DX7 bank**, and select a compatible `.syx` file. Replacing a populated bank requires confirmation. The same menu lets you edit the bank title and description, download the bank, or delete it when more than one workspace bank exists. Use the menu in the patch-bank header to back up your library (see [Backing up your library](#backing-up-your-library)), choose **Download SysEx banks (.zip)** to get every loaded bank as a `.syx` file for other DX7 tools, or choose **Reset to factory patches…** to put the FM-1 factory banks back into A–D, which also resets their titles and descriptions. Additional workspace banks are left intact. Deleting a bank, resetting to the factory patches, restoring a backup, importing over a bank, loading a saved bank, or copying a patch over a slot can be undone from its notification or with `Cmd`/`Ctrl` + `Z`.

To copy a patch into another slot, open the slot's **⋮** menu and choose **Copy to…**. Pick a bank from its tabs and a slot from the grid, where the arrow keys also move the choice; only banks that have patches are offered, and the patch's own slot is skipped. The dialog names the patch that will be replaced. The copy brings the patch's FM1 effects with it and changes only the browser library, so send the bank to the FM1 to put it on the hardware. You can also drag a patch by its grip onto another bank on the left: the bank lights up while the patch is over it, and dropping opens the same dialog with that bank chosen. Only banks that have patches take a drop, and dropping on the patch's own bank does nothing.

A slot's **⋮** menu also works with single patches as files. **Download patch** saves the patch as a standard 163-byte DX7 single-voice SysEx file, named after its slot and patch, such as `fm1-A05-PIANO-2.syx`. It holds the DX7 voice only, as a bank download does, so the FM1 effects are not included. **Import patch…** asks before it replaces the slot, then reads a DX7 single-voice file into it. A file that is not a single DX7 patch, or that looks damaged, is refused with an explanation and leaves the slot as it was. A whole 32-voice bank is recognised and pointed to **Import DX7 bank** in the bank's menu. The file carries no FM1 effects, so the slot's effects return to their defaults. The notification offers **Undo**.

Each bank's menu also offers **Save bank**, which keeps a named copy of its 32 patches and their FM1 effects in this browser, and **Load bank**, which lists your saved banks. From that list you can load one into the bank, edit its name and description, make a copy, download it as a `.syx` file, or delete it. Loading into a bank that already has patches asks first. If a bank is empty, you can load the built-in demo bank instead.

The interface follows the browser language on first use when it is supported. Change it later in **Settings**; the selection is remembered. Settings also provides separate channels for notes/program changes and effects because the FM1 defaults its effects controls to MIDI channel 2.

## The voice editor

The editor is laid out as a rack. The six operators stand side by side as columns: five show a compact readout, and the selected operator grows in place to carry its full controls. On narrower screens the open operator drops onto a row of its own. Each column has its own mute and solo buttons, so an operator can be silenced without opening it.

The open operator has a **⋮** menu beside its number with **Copy operator** and **Paste operator**. Copy takes all of that operator's settings: frequency, envelope, output level, keyboard scaling, and sensitivities. Open another operator and choose Paste from its menu to give it those settings. The copy lasts until you close or reload the tab, so you can also paste it into an operator in a different patch. Paste sends the changed settings to the FM1 and is a single undo step. The copy is kept only in memory and never saved to the library.

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

Above the keys is a small transport for auditioning a patch without playing it yourself. Choose one of six short phrases, press **Play**, and it loops until you press **Stop**, lighting the keys as it goes. The phrases are two bars each and are chosen for what they tell you about a sound rather than for the tune:

- **Pad** holds four-note chords, so you hear the slow attack, the release and anything the effects add to a held sound.
- **Electric piano** comps chords off the beat at changing velocities, which is the quickest way to hear how the patch responds to how hard it is played.
- **Bass** plays short, hard notes low down, for the attack and the low end.
- **Lead** plays a single line that ends on a long held note, giving vibrato and the LFO delay time to arrive.
- **Arpeggio** runs even sixteenths across two octaves, for the attack, the decay and the tuning.
- **Velocity ramp** plays one note eight times, from very soft to very hard.

Each phrase is written for its own tempo, which the **Tempo** slider takes up when you choose it. Moving the slider while a phrase is playing takes effect when the loop comes round, so the phrase neither jumps nor retriggers as you drag. Playing the keys yourself while a phrase loops works normally.

A phrase is sent live over MIDI and is never stored on the FM1: it has nothing to do with the unit's own sequencer. It stops when you close the keyboard, when the MIDI output disconnects, and when you change the note channel in **Settings**. Its notes are kept out of the MIDI log, which records only that a phrase started and stopped.

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

Open the menu in the patch-bank header and choose **Download backup**, under **Full backup** at the top, to save everything in one `.json` file: every workspace bank with its title and description, each patch's FM1 effects, and every saved bank. The menu shows when you last made one. If the browser cannot save your work, the warning at the top of the page offers the same download.

A backup file can only be read by this app. To use patches in Dexed, a DX7, or another editor, choose **Download SysEx banks (.zip)** under **For other DX7 tools** instead: a `.syx` file holds DX7 voice data only, without FM1 effects or saved banks.

To restore, choose **Restore from backup…** and pick the file. The dialog shows what it holds before anything changes. Restoring:

- replaces your workspace banks and their patches with the ones in the backup. **Undo** in the notification, or `Cmd`/`Ctrl` + `Z`, puts your previous workspace back.
- adds the backup's saved banks. A saved bank already in this browser is kept as it is and never overwritten. Undo does not remove saved banks that were added.

A backup made by a newer version of the app cannot be restored until the page is reloaded to update it.

## SysEx compatibility

The DX7 import feature intentionally validates bank files before loading them. A compatible file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain only 7-bit data bytes, as every MIDI data byte must be
- contain a valid Yamaha checksum

Single-voice dumps, larger archive files, and banks using another SysEx format are not accepted.

The browser library is the source of truth. The current FM1 firmware does not document transmission of stored voices or banks over MIDI, so the librarian cannot import a bank directly from the hardware. Download a backup regularly (see [Backing up your library](#backing-up-your-library)). If M-VAVE adds bulk-dump output in a future firmware release, device-to-browser bank import can be added without changing the saved library format.
