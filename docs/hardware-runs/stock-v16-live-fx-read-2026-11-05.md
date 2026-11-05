# Stock V16 live FX read: hardware run, 2026-11-05

The run of `docs/v16-fx-readback-validation.md`, section 3, on the orange FM1 running stock
`FM-1_016`, through the development probe **V16 live FX read (dev)** on the dev server. Ben drove the
FM1; each read was one press of **Read live FX**, sending the approved request
`F0 00 32 0D 41 00 00 40 02 1C 01 00 00 60 06 00 00 28 00 F7` once. No read failed, timed out, or
was retried, and nothing on the FM1's screen changed because of a read.

## Steps 1–3: identity, first read, comparison

- Identity `FM-1_016`, both ports on the FM1.
- **The reply echoes the request.** It declares 62 bytes: the 8 request bytes (object 5, offset
  `0x9C`, length 54), then the 54 data bytes. Object 4's settings-block read echoes the same way
  (184 bytes: 8, then the 176-byte block). This closes the gap in section 1 of the validation doc.
- First read, controls idle: table in the default order, every effect Off, Type 0; values
  `50 03 00`, then `1E` (30) for all 24 others.
- The settings block's FX table at `0x92`, read by the Effects view, matched the live read's 27 table
  bytes exactly.

## Step 4: one change per read

Most changes were sent from the editor (its CC 70–93); the last Filter change was made on the FM1's
own controls and read back the same way. Each read differed from the one before only by the change
named.

| Control     | Location         | Reads (stored)         | FM1 screen                              |
| ----------- | ---------------- | ---------------------- | --------------------------------------- |
| Filter On   | table[1] `0xB8`  | 0 → 1                  | the Filter box turns from grey to white |
| Filter Type | table[2] `0xB9`  | 0, 1, 2                | Low Pass, Band Pass, High Pass          |
| Cutoff      | values[0] `0x9C` | 0, 53, 107             | 100 Hz, 1602 Hz, 20000 Hz               |
| Resonance   | values[1] `0x9D` | 0, 5, 10 (front panel) | Q: 0, Q: 50, Q: 100                     |

### The other five effects: three racks

To save some 40 reads, the other five effects were mapped with three racks rather than one change
per read: the presets in `stock-v16-live-fx-read-2026-11-05-presets.json`, each imported into the
Effects view, recalled, sent whole with **Send to FM1**, then read once. Read A gives every value a
number no other control has (11–24 in the editor's order), so each lands only where it is stored,
and a control writing two places would show as a duplicate; the switches alternate and Reverb's
Space is 2. Read B sets every value to 100 with the switches flipped and Space 1; read C sets
everything to 0. The Filter stays Band Pass, 53, 5 throughout.

**Read A** (23:13): the FM1's screen lit Filter, Reverb, Distortion, and Phaser, Delay and Chorus
dark, with Phaser Mix 24% last.

- values: `35 05 00 | 0B 0C 1E | 0D 0E 0F | 10 11 12 | 13 14 15 | 16 17 18 | 1E ×9`. Every value
  sits where section 2 of the validation doc put it: Reverb Decay and Mix at values[3–4], Delay's
  three at [6–8], Distortion's at [9–11], Chorus's at [12–14], Phaser's at [15–17], each as sent.
  Chorus's values are stored while it is off. The Filter's and Reverb's third values ([2] and [5])
  did not move, and [18–26] stay 30.
- table: `00 01 01 | 01 01 02 | 02 00 00 | 03 01 00 | 04 00 00 | 05 01 00 | …`: each effect's
  On/Off at `3e + 1` and the Reverb's Space at table[5] (2, Plate), as section 2 says.

**Read B** (23:14): every value 100 (`64`) at values[3–4] and [6–17], [5] and [18–26] still 30;
the table reads Reverb Off with Space 1 (Hall), Delay On, Distortion Off, Chorus On, Phaser Off, so
every switch has now read both 0 and 1 at `3e + 1`.

**Read C** (23:15): every value 0 at values[3–4] and [6–17], [5] and [18–26] still 30; every
switch but the Filter's Off, and Reverb's Space 0 (Room). Space has now read 0, 1, and 2.

**All 24 rows are proven:** each switch reads 0 and 1, both types read 0, 1, and 2, and each value
reads 0, its maximum, and a value no other control held, at the location section 2 gives, stored as
sent. The spare bytes (values[2], [5], [18–26]) never moved.

## Step 5: the FX group

- Switched to another FX group on the FM1 (23:16): the read gave that group's settings, the same
  bytes as the evening's first read (everything Off, Filter 80 and 3, the rest 30, default order),
  so a read follows the live group.
- Back to FX001 (23:17): Read run C's unsaved values came back, so unsaved live changes stay with
  their group while another is visited. The order read Filter, Reverb, Phaser, Delay, Distortion,
  Chorus (`00 01 05 02 03 04`): a turn of SELECT meant for something else had put the FM1's FX
  page in its move mode (**SELECT Move / SEL Done**) and moved Phaser to third, which the screen
  showed. So the live read follows a front-panel order change as it happens, before SEL confirms
  it.

- After a power cycle without SAVE (23:20), FX001 read exactly as at the start of the evening:
  everything Off, Filter 80 and 3, the rest 30, the default order. Nothing the run sent, nor the
  accidental move, outlived it.

## Other observations

- In the dev build the Effects view's settings-block read (object 4, `0x23`) went out twice, 2 ms
  apart, with one reply, as the view opened: React's StrictMode runs effects twice in development.
  Harmless, as the read changes nothing, and a production build runs the effect once.

Values are stored as the controller value, unscaled; the screen shows Resonance ten times larger.
The editor's rack showed Cutoff and Resonance at 0 while the FM1 held 80 and 3, which is the gap
this read is meant to close.
