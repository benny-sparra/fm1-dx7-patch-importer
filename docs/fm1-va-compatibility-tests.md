# FM-1+VA compatibility tests

**Prepared:** 2026-09-28
**Execution status:** not yet run.
**Scope:** whether the editor's existing features, written for M-VAVE's stock firmware, are safe
and correct on an FM1 running the FM-1+VA replacement firmware (`docs/fm1-research.md`, Primary
sources). This plan sends only what the editor already sends to stock firmware: DX7 SysEx, Program
Change, effect CCs, and notes. It sends none of FM-1+VA's own `F0 43 00 7D` commands and no
`00 32` message.

The deciding question is test 1. On stock firmware the editor's single-patch sends go to the edit
buffer and are kept only after **SAVE**. The FM-1+VA manual says a single patch "is stored at once
over the selected preset", and tells its readers to select a preset they can lose first. If that
means a write to the FM1's memory, every audition in the editor overwrites a stored preset, and the
editor is unsafe on FM-1+VA until it changes.

## 0. Preparation

Do these in order. Nothing below is safe to start without both backups.

1. Install the current FM-1+VA release from its Install page, in Chrome or Edge. Record the version
   the page reports, such as `FM-1_089`, in the ledger (§9). An install keeps the stored presets.
2. On the FM-1+VA Presets page, press **Save a backup** and keep the `.syx` file. It holds all 128
   presets with their effects, and **Put a backup back** on the same page restores them. Close that
   tab afterwards, so it does not hold the FM1's MIDI port.
3. In the editor, choose **Download backup** from the patch-bank header menu.
4. Pick one preset you can lose for the destructive tests, called the **test preset** below. Use
   preset 097 (bank D, slot 1) unless you have installed the FM-1+VA preset pack, which occupies
   113 to 128. Write down its name as the FM1 shows it.
5. In the editor, open the MIDI log. After each step, copy the bytes the editor sent into the ledger
   (**View data**, then **Copy hex**), so every observation has its exact message.
6. Use USB, not Bluetooth, and keep the FM1's GLOBE settings at their defaults: MIDI Channel All, FX
   Channel 2. Match the editor's note and FX channels to them (1 and 2).

FM-1+VA marks a preset that has unsaved changes with a dot after its name on the HOME screen. That
dot is the main signal in test 1: it shows a change that has not been stored.

## 1. Single-patch send (deciding test)

The editor sends a DX7 single-voice dump, `F0 43 0n 00 01 1B <155 bytes> <sum> F7`, when you:

- click a patch in a bank after D (an added bank),
- click a result from **Saved banks** or **Other DX7 patch banks** in the search,
- click a patch in the list shown before **Replace bank contents** in an import,
- open a patch in the editor (after a Program Change, for banks A–D).

Steps:

1. On the FM1, select the test preset and return to HOME. Note its name and that no dot shows.
2. In the editor, search for a bundled DX7 patch with a distinctive name, and click it once.
3. Record what HOME now shows: the new name or the old one, and whether a dot follows it.
4. Turn PRESETS one step away and one step back, without pressing SAVE. Record the name and dot.
5. Switch the FM1 off and on. Select the test preset. Record the name.
6. Put the test preset back: on the FM-1+VA Presets page, **Put a backup back** with the §0 file.

| Outcome after step 4 and 5                        | Meaning                                | Editor consequence                                                                                          |
| ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Old name back at step 4                           | An edit buffer, as on stock firmware   | Single-patch sends are safe as they are.                                                                    |
| New name at step 4 with a dot, old name at step 5 | Replaces the preset in memory, unsaved | Safe to play; a SAVE on the FM1 would store it. The help text must say so.                                  |
| New name at step 5                                | Writes the stored preset               | **Unsafe.** On FM-1+VA every audition overwrites the selected preset. Block single-patch sends there first. |

Repeat steps 1 to 5 once more with a different patch before recording the result, as this
project's research discipline requires. If the result is **New name at step 5**, skip 1b, and run
the later tests only with the test preset selected on the FM1: opening a patch in test 2 sends a
single patch too, and would overwrite whichever preset is selected.

**1b. Rapid auditions.** Only if the result above is one of the first two: click five different
search results about half a second apart, holding a note. Record any crackle, pause, or freeze.
FM-1+VA's own tool waits 3 s between preset writes because closer writes crackled, so a crackle
here suggests each send writes memory even when the name test did not show it.

## 2. Live parameter changes

The editor sends `F0 43 10 pp qq vv F7` for each voice edit.

1. Select the test preset on the FM1. In the editor, open any patch in bank D slot 1 (it sends
   Program Change 96, then the voice; see test 1 for what that does to the stored preset).
2. Wait for the editor's back button to become enabled, then change Algorithm, Feedback, and
   Operator 1 Output Level, one at a time, holding a note after each.
3. For each, record whether the change is heard, whether on the held note or only the next note,
   and whether the FM1's EDIT screen shows the new value.
4. Rename the patch in the editor (parameters 145 to 154) and record whether the FM1's name changes.

## 3. Effects over CC

1. With the test preset selected, switch Reverb on in the editor and set Mix to 80.
2. Press FX on the FM1. Record whether Reverb shows On and its Mix value, and whether the dot shows.
3. Turn PRESETS away and back without SAVE. Record whether Reverb is still On. This tests the
   stored-effects lead in `docs/fm1-research.md` §7.8 on this firmware.
4. Click the test preset's slot in the editor's bank D. The editor sends Program Change 96 and then
   the patch's saved effects. Record whether the FM1's FX screen now matches the editor.

## 4. Program Change

Click slots A1, B32, and D1 in the editor. Record the preset number the FM1 selects for each:
001, 064, and 097 are expected.

## 5. Sending a bank

The editor's destination dialog tells stock users to wait for the bank selection screen, turn one of
KNOB1 to KNOB4 to choose A to D, and let the FM1 save after a short delay. The FM-1+VA manual
describes a **Write the bank?** question that starts on Cancel, chooses the bank with ALGORITHM,
and writes only when confirmed. Record which happens.

1. Send bank D from the editor with **Send to FM1**, and follow the FM1's screen, not the dialog.
2. Record the question the FM1 shows, the control that chooses the bank, and what is written.
3. Check three names in bank D on the FM1 against the editor.
4. Send bank D again and cancel on the FM1 with HOME. Record that nothing changed.
5. Send **Favourites** with fewer than 32 favourites. Record that the slots after them hold
   INIT VOICE.
6. Only if the FM-1+VA preset pack is installed in 113 to 128: record whether sending bank D turns
   those presets back into FM presets, as the manual says from FM-1_087 on, and whether each keeps
   its effects.

Afterwards, restore bank D with **Put a backup back**.

## 6. Notes and MIDI panic

1. Open **Keyboard** in the editor and play notes at several velocities. Record any stuck note.
2. Start an audition phrase, then press **MIDI panic**. Record whether every note stops.

## 7. Port and reconnection

1. Record the port names the editor lists for the FM1 on this computer, and whether it chose the
   FM1 by itself.
2. Unplug the USB cable while nothing is sending, then plug it back in. Record whether the editor
   selects nothing while it is unplugged and the same port again afterwards.

## 8. Clean-up

Restore every preset with **Put a backup back** on the FM-1+VA Presets page, using the §0 file.
To return to M-VAVE's firmware, follow **Going Back to M-VAVE's Firmware** in the FM-1+VA manual.

## 9. Ledger

Record the date, FM-1+VA version, computer and browser, and USB for every run.

| Test | Run 1 result | Run 2 result | Bytes copied from the MIDI log | Notes |
| ---- | ------------ | ------------ | ------------------------------ | ----- |
| 1    |              |              |                                |       |
| 1b   |              |              |                                |       |
| 2    |              |              |                                |       |
| 3    |              |              |                                |       |
| 4    |              |              |                                |       |
| 5    |              |              |                                |       |
| 6    |              |              |                                |       |
| 7    |              |              |                                |       |

## 10. What follows from the results

- Nothing here changes the editor until the ledger is filled in. Record each result in
  `docs/fm1-research.md` beside the FM-1+VA entry, marked **Confirmed** only after two runs agree.
- Any difference from stock firmware can be acted on only once the editor knows which firmware is
  connected. That needs the identity query exception described in `docs/fm1-research.md`, Primary
  sources, which has not been approved.
- If test 1 shows writes to the stored preset, the first change is to stop single-patch sends on
  FM-1+VA, before any new FM-1+VA feature.
