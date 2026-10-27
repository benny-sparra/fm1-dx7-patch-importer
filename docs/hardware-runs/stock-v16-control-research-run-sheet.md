# V16 FX table and CC 7: step-by-step checks

For the orange FM1 (stock V16), to check the firmware reading of 2026-10-27 in
`docs/fm1-research.md`, "Controlling Voices and effects more fully". Tick each step as you go, and
note anything that differs.

Tests 1 and 2 use only what was approved on 2026-10-27: reading object 4 (`0x23`) and writing its
FX order bytes (`0x22`). They need the development V16 settings probe from the v16-fx-order branch
(`src/components/midi/v16-settings-probe.tsx`), run on a dev server. Test 3 sends one ordinary
Control Change. Nothing here sends object 5, object 8, `0x30`, or `F0 22 24 36`. **Don't press
SAVE** until Test 2 asks you to; turning the FM1 off and on puts everything else back.

## Before you start

1. Connect the orange FM1 with USB, open the editor's dev server from the v16-fx-order branch,
   switch **MIDI online**, and check the badge says V16.
2. Open **MIDI log**.
3. On the FM1, note the FX group in use and the order its FX page shows.

## Test 1: what the 27 bytes hold

The firmware says entry `p`'s first byte is the effect at position `p` (0 Filter, 1 Reverb, 2 Delay,
3 Distortion, 4 Chorus, 5 Phaser), while each entry's second and third bytes are effect `p`'s own
On/Off and Type, whatever its position.

1. Read the block with the probe and copy the 27 bytes at `0x92` here: \_\_\_
   - [ ] The block's own first byte (offset `0x00`) is `0E`.
   - [ ] Bytes 0, 3, 6 … 24 of the 27 are 0–8, all different; bytes 1, 4 … are 0 or 1; bytes 2,
         5 … are 0–2.
2. On the FM1's FX page, move one effect to another place. Read again.
   - [ ] Only first bytes changed (positions 0–5), and they still hold 0–5 once each.
   - [ ] Write down whether position 0 is the effect the FX page shows first: \_\_\_
3. With the editor's effects panel, switch **Reverb** off, and set Filter Type to **High Pass**.
   Read again.
   - [ ] Byte 4 (Reverb's On/Off) is now 0, wherever Reverb sits in the order.
   - [ ] Byte 2 (Filter's Type) is now 2.

## Test 2: writing the order alone

1. With the probe, write back the 27 bytes read in Test 1 step 3, with only the first bytes of two
   entries among 0–5 swapped, at offset `0x92`, length 27.
   - [ ] The FX page shows the two effects swapped, and the sound changes accordingly.
   - [ ] Every effect keeps its On/Off and Type (Reverb still off, Filter still High Pass).
   - [ ] The FM1 shows nothing as saved.
2. Select another Voice on the FM1, then read the block.
   - [ ] Its preset and channel are its own, not the Voice selected before.
3. Turn the FM1 off and on without SAVE, and read again.
   - [ ] The order is back as it was.
4. Optional: repeat step 1, press SAVE on the FM1, then turn it off and on.
   - [ ] The new order is still there. Put it back afterwards if you want.

## Test 3: CC 7

The firmware says CC 7 is the FM1's master volume, not one Voice's level. Use any MIDI tool that
can send a Control Change.

1. Set Voices 1 and 2 to channels 1 and 2, both On, and hold a note on each.
2. Send CC 7 value 20 on channel 2.
   - [ ] Both Voices get quieter, and the FM1 shows a volume popup.
   - [ ] Voice 2's Level on its Voice page is unchanged.
3. Send CC 7 value 127 on channel 2 to put it back.

## Results

Write down what differed, and copy the probe's reads into a dated
`docs/hardware-runs/stock-v16-control-research-<date>.md`.
