# M-VAVE V16: follow-up run sheet

The checks the 2026-10-23 run left open (`stock-v16-2026-10-23.md`, "Not checked"), for the orange
FM1, which still runs V16. No flashing: it stays on V16 afterwards. Fill each `______` with what
the FM1 did, keep the firmware's prediction beside it, and record the results in a dated
`stock-v16-<date>.md` and in `docs/fm1-research.md`, "M-VAVE's V16 stock firmware".

Nothing here sends a message the editor does not already send: Program Changes, single-voice
dumps, parameter changes, a 32-voice bank, and notes. Bank Export is started on the FM1.

## Setting up

1. Quit anything else using the FM1's MIDI. Check the last GLOBE page still shows **016**.
2. Start the dev server from `main` (`npm run dev`) and open the editor in Chrome. Switch **MIDI
   online**, and choose the FM1 as both **Output** and **Input monitor** in **Settings**. The badge
   should name M-VAVE's V16.
3. Keep the editor's **FX channel** on the FM1's Effect Ch (**2** last time) and its **Note
   channel** on 1.
4. Open the **MIDI log** and leave it open; download it at the end of each section.

## 1. Back up bank B through Receive patch…

Already run: on 2026-10-23 the orange FM1's Export of bank A arrived through **Receive patch…**
and imported through the DX7 bank import (`docs/feature-backlog.md`, the V16 item's step 4).
Undo after the import, and the MIDI log while the dialog listened, were not checked.

This section backs up the FM1 bank that section 3 replaces, and checks those two.

1. In the editor, **Add new bank…** from any built-in bank, named `V16 bank B`; the import
   replaces its patches. Open a slot's ⋮ and choose **Receive patch…**.
2. On the FM1, GLOBE → Export bank **B**, then choose **Import bank into “V16 bank B”…** and
   import it.
3. Did the MIDI log record anything sent while the dialog was open? Expected: nothing. ______
4. Undo the import from its notification. Do the built-in patches come back? ______ Then import
   it again, since section 3 restores bank B from it.

## 2. Bank Export without USB

Firmware: Export checks for a USB host first and shows **Connect USB** without one, sending
nothing.

1. Take the USB cable out, run the FM1 on its battery, and start GLOBE → Export for any bank. What
   does the FM1 show, word for word? ______
2. Plug the cable back in and reselect the FM1's ports in the editor if they went away.

## 3. Sending a bank

Firmware: after a 32-voice bank arrives, the FM1 waits for a destination bank and writes nothing
until one is chosen; a failure allows another choice. The editor's instructions still describe
V15's prompt: Knob 1–4 choose bank A–D, then it saves after a brief delay.

1. Fill an editor bank with 32 patches you can tell apart from bank B's, by name at least (a
   catalog bank will do), and press **Send to FM1**.
2. What does the FM1 show when the bank arrives, word for word, and how is a destination chosen
   (knobs, ALGORITHM, SELECT, SEL)? Take a photo. ______
3. Do the editor's destination instructions match what the FM1 asks? Note each step that
   differs. ______
4. Choose bank **B** and confirm. Does preset B01 now carry the library's name and sound? Turn to
   another preset and back, then power cycle: is it still there? ______
5. Press **Send to FM1** again and cancel on the FM1, however it offers that. Is anything written
   to bank B? Check B01's name. ______
6. If no cancel is offered, or the prompt times out, say what happens. ______
7. Put bank B back: select `V16 bank B` in the editor, **Send to FM1**, and choose B. Check B01.

## 4. Where a patch lands with two Voices

Firmware: a Program Change loads its program into every Voice that is On on its channel or on
All. A dump and the parameter changes edit the preset on the Voice selected on the FM1's screen,
whatever channel they arrive on, and every Voice playing that preset hears the edit.

Set up, and note it before starting:

| Voice | MIDI Ch | On/Off | Preset |
| ----- | ------- | ------ | ------ |
| 1     | 1       | On     |        |
| 2     | 3       | On     |        |
| 3–8   |         | Off    |        |

Give Voices 1 and 2 presets you can tell apart by ear, neither in the bank the slot clicks select
(use bank A in the editor; the presets are best in C or D).

1. Select **Voice 1** on the FM1's screen. Editor **Note channel** 3: click a slot in bank A. Which
   Voice changes preset? Which plays the library's sound? Firmware: Voice 2 changes preset, but the
   dump edits Voice 1's preset, the one on screen. ______
2. Open that patch in the editor, wait for its back button to be enabled, and move one operator's
   output level. Which Voice hears it? Firmware: Voice 1. ______
3. Select **Voice 2** on the FM1's screen and repeat 1 and 2, still on Note channel 3. Does the dump
   now reach Voice 2? ______
4. Put Voice 2 on channel 1 too, so both layer, both On. Note channel 1: repeat 1 and 2. One Voice
   or both? Firmware: the Program Change gives both the same preset, so both hear the dump and the
   edit. ______
5. Put Voice 2 back on channel 3. Play the editor's on-screen **Keyboard** with Note channel 1,
   then 3. Which Voice sounds each time? ______
6. On a voice editing page (footer OSC), press SAVE briefly rather than holding it. Is Knob3
   **Preset** offered, as it is for a hold? Cancel without saving. ______

Put the Voices back as you found them.

## What the results decide

- Section 1 completes the record of **Receive patch…** on the FM1 with Undo and the MIDI log, so
  `docs/user-guide.md` and the help guide can say a stock V16 FM1 can be read back.
- Section 2 moves Bank Export without USB from **Likely** to **Confirmed**, or replaces it.
- Section 3 rewords the bank destination instructions for V16 (`dialogs.bank*`), in every locale.
- Section 4 decides whether the editor must say which Voice it edits, and whether a slot click
  should still send a Program Change when the note channel is not the selected Voice's. Its last
  step settles the SAVE wording in `useMidi`.
