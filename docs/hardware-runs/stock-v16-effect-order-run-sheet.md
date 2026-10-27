# V16 effect order: run sheet

Question 12 of `docs/fm1-research.md`'s V16 section. The owner approved on 2026-10-27 that the
editor read the updater protocol's object 4 settings block (command `0x23`) and write exactly the
27 FX table bytes at offset `0x92` (command `0x22`), changing only the chain order (`AGENTS.md`,
"MIDI"). The Effects tab's drag-to-reorder is built and ships dark: the profile's `effectOrder`
capability stays off until this run shows that a read, a write of the table unchanged, and a write
of a changed order behave as the firmware reading says and touch nothing else.

Run it on the orange FM1 (stock V16, `FM-1_016`), in the development build (`npm run dev`, with
`npm run setup:https` done), through the **V16 settings probe (dev)** link in the page footer. The
probe sends nothing on its own: every message is a button. To try the Effects tab's drag as well,
temporarily list `effectOrder: 16` for the `mvave` family in `src/lib/firmware-profile.ts` (do not
commit it).

## Stop rules

- Use only the probe's buttons and the Effects tab. Never send anything else of the `00 32` family,
  never another object, command, or offset, and never replay a capture.
- If the FM1 shows an error, restarts, or any Voice's preset or channel changes without you
  touching it, stop, power-cycle the FM1 without SAVE, and note what the screen showed.
- Press SAVE only at step 8, where it says so.

## Before you start

1. On the FM1, write down Voices 1–8's preset, channel, and On/Off, which Voice is selected, the
   FX order page (the effects in order, and which end is first), each effect's On/Off, and the
   Filter's and Reverb's types.
2. Connect the FM1 over USB, switch MIDI online, and let the editor identify `FM-1_016`.
3. Open the probe.

## Run

Copy the probe's capture (**Copy capture**) after each step and paste it into
`stock-v16-effect-order-<date>.md` beside this file, with the step's number.

1. **Read the block.** Press **Read block**. If it says the reply was unusable, copy the capture,
   which holds the raw reply, and stop: that answers the reply's layout and the version byte's
   place. Otherwise note bytes 146–172 (the FX table, marked in the probe): are they nine entries
   as the notes say (byte 0 of entries 0–5 is 0–5 once each, entries 6–8 hold 6, 7, 8)?
2. **Read it again** without touching the FM1. How many bytes changed? (None expected.)
3. **Match the table to the FM1's FX page.** Move one effect on the FM1's FX order page (for
   example Reverb to the other end), read again, and note which bytes changed. Is the chain order
   byte 0 of entries 0–5? **Which end of the page is position 0?** Do it for two more moves, then
   put the order back.
4. **Write the table unchanged.** Press **Write back unchanged**. The probe reads, writes the 27
   bytes, waits, and reads again. Do the reads match byte for byte? Are Voices 1–8's presets,
   channels, On/Off, the selected Voice, the FX page, and every effect's On/Off as written down?
5. **Select another Voice on the FM1, then write the table unchanged again.** Does the second
   Voice keep its preset and channel? (The firmware says a 27-byte write cannot change them.)
6. **Write a changed order.** Type a chain order in the probe (for example `5 4 3 2 1 0`) and
   press **Write this order**. Does the FM1's FX order page show it, at the end you found in step
   3? Does it sound so (Delay before or after Distortion is easy to hear)? Did the outcome list a
   changed byte outside the six byte 0s?
7. **Power-cycle without SAVE.** Is the order back as it was before step 6?
8. **Save.** Repeat step 6, then SAVE on the FM1. Power-cycle. Is the order kept in that FX group?
   Put it back by hand and save again if it was kept.
9. **Switch an effect between reads.** In the editor's Effects tab (capability listed, step 6 of
   "Before you start"), switch Delay off, then drag the Chorus box. Does Delay stay off on the FM1
   and the next read? (The editor reads just before each write for this.)
10. **Drag in the Effects tab.** Drag each effect once, and use **Move earlier** and **Move later**
    from a box's menu. Does each move show on the FM1's FX page, once, at the end the editor
    shows? Close and reopen the tab: does it show the FM1's order?
11. After each write, check Voices 1–8's preset, channel, On/Off, and the selected Voice against
    step 1.

## What this decides

| Finding                                                      | Decides                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| The reply's layout, the version byte, the checksum           | Whether the parser reads a V16 reply at all                     |
| Steps 3, 6: the table's meaning, and which end position 0 is | Whether the tab's order is first-to-last or must be reversed    |
| Steps 4, 5, 9: nothing else changed                          | That the 27-byte write is safe, and the read-before-write works |
| Steps 7, 8: reverts without SAVE; kept after SAVE            | The tab's note that a move is unsaved on the FM1 until SAVE     |
| Step 10: the tab                                             | That `effectOrder` can be listed for the `mvave` family         |

Record the run as `stock-v16-effect-order-<date>.md`, answer question 12 in
`docs/fm1-research.md`, mark each fact in its "Object 4: the FX order" table Confirmed or not,
add the captured block as a fixture to `src/lib/v16-settings-block.test.ts`, and only then list
`effectOrder: 16` for the `mvave` family in `src/lib/firmware-profile.ts` and update the rule in
`AGENTS.md`.
