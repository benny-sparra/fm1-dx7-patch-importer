# V16 effect order: run sheet

Question 12 of `docs/fm1-research.md`'s V16 section. The owner approved on 2026-10-27 that the
editor read the updater protocol's object 4 settings block (command `0x23`) and write it back
(`0x22`) with only the FX order bytes changed (`AGENTS.md`, "MIDI"). That approval ships only after
this run shows that a read, a write back unchanged, and a write with the order changed behave as
expected and touch nothing else. The Effects tab's reordering waits for it, and the profile's
`effectOrder` capability stays off until it passes.

Run it on the orange FM1 (stock V16, `FM-1_016`), in the editor's development build
(`npm run dev`, with `npm run setup:https` done), through the **V16 settings probe (dev)** link in
the page footer. The probe sends nothing on its own: every message is a button.

## Stop rules

- Use only the probe's three buttons. Never send anything else of the `00 32` family, never another
  object, command, or offset, and never replay a capture.
- If the FM1 shows an error, restarts, or any Voice's preset or channel changes without you
  touching it, stop, power-cycle the FM1 without SAVE, and note what the screen showed.
- Press SAVE only at step 8, where it says so.

## Before you start

1. On the FM1, write down Voices 1–8's preset, channel, and On/Off, which Voice is selected, the
   FX order page (the effects in order), and every other Globe setting you can see.
2. Connect the FM1 over USB, switch MIDI online, and let the editor identify `FM-1_016`.
3. Open the probe.

## Run

Copy the probe's capture (**Copy capture**) after each step and paste it into
`stock-v16-effect-order-<date>.md` beside this file, with the step's number.

1. **Read the block.** Press **Read block**. Does it read? If it says the reply was unusable, the
   message says why (checksum, layout, length, or version): copy the capture, which holds the
   raw reply, and stop. That answers the open questions about the reply's layout and where the
   version byte is.
2. **Read it again.** Press **Read block** a second time, without touching the FM1. How many bytes
   changed? (None expected; any that did are the block's live fields.)
3. **Move the FM1's selected Voice.** On the FM1, select another Voice, then read again. Which
   bytes changed? (Expected: the preset and channel bytes: byte 2 and byte 5, per the firmware
   notes.) Put the selection back.
4. **Write back unchanged.** Press **Write back unchanged**. The probe reads, writes, waits, and
   reads again. Does the outcome say the reads match byte for byte? On the FM1, are Voices 1–8's
   presets, channels, and On/Off, the selected Voice, the FX order page, and the Globe settings
   all as written down? Does anything sound or look different?
5. **Find the order's encoding.** On the FM1's FX order page, move one effect (for example Reverb
   to first), then press **Read block** and note which of bytes 146–172 (`0x92`–`0xAC`, marked in the
   probe) changed and how. Move it back and read again. Repeat for two or three other
   moves, and note the bytes each time: the six effects (Filter, Reverb, Delay, Distortion, Chorus,
   Phaser) against 27 bytes is the thing to decode. Put the order back as it was.
6. **Write a changed order.** Choose an order you decoded from step 5 and type its 27 bytes in the
   probe's field (the probe fills the field with the bytes it just read, so change those), then
   press **Write with these order bytes**. Does the FM1's FX order page show the new order? Does it
   sound as the order says (a Delay before or after Distortion is easy to hear)? Did the outcome
   list any changed byte outside bytes 146–172? Did any Voice's preset or channel change?
7. **Power-cycle without SAVE.** Power-cycle the FM1. Is the order back as it was before step 6?
   (Expected: yes, since the write marks the settings unsaved.)
8. **Save.** Repeat step 6, then press SAVE and GLOBE on the FM1. Power-cycle. Is the order kept?
   Put the order back by hand on the FM1 afterwards and save it again if it was kept.
9. **Refuse a bad value.** Type 27 bytes with one value you expect the FM1 to refuse (for example
   `FF` for every byte, if the order bytes are small numbers) and press **Write with these order
   bytes**. The FM1 should reject the whole block: does the FX order page stay as it was, and does
   the next read match the one before?
10. After each write, check Voices 1–8's preset, channel, and On/Off, and the selected Voice,
    against step 1 of "Before you start".

## What this decides

| Finding                                                     | Decides                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| The reply's layout, the version byte's place, the checksum  | Whether the parser reads a V16 reply at all             |
| Step 4: nothing changed                                     | That writing back is safe to build on                   |
| Step 5: how the 27 bytes encode an order                    | A decoder in the codec, and the tab                     |
| Steps 6–7: order on screen and by ear; reverts without SAVE | That a move is an unsaved edit, as the Effects tab says |
| Step 8: kept after SAVE                                     | Whether SAVE (Globe) keeps it, for the tab's note       |
| Step 9: a bad value refused whole                           | That a mistake in the encoding cannot half-apply        |

Record the run as `stock-v16-effect-order-<date>.md`, answer question 12 in
`docs/fm1-research.md`, mark each fact in its "Object 4: the FX order" table Confirmed or not, add
the captured block as a fixture to `src/lib/v16-settings-block.test.ts`, and only then add the
`effectOrder` capability to the `mvave` family and build the Effects tab's drag.
