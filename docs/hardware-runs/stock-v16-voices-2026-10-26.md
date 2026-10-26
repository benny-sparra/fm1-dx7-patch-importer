# M-VAVE V16: eight Voices and the receive wizard, 2026-10-26

Results of `stock-v16-voices-run-sheet.md` and `receive-wizard-run-sheet.md` on the orange FM1, on
V16 (`FM-1_016`) since 2026-10-22, with the editor from production (`main`). The first sheet
checks all eight Voices before the Voice strip is built (`docs/feature-backlog.md`, "Use V16's
eight Voices", step 2); the second is the **Receive patches** wizard's run, which had not been
done on hardware. Each step keeps the sheet's expectation beside what the FM1 did. Ben did
everything on the FM1 and in the browser; the editor sent only what it normally sends. Nothing was
saved on the FM1, and a power cycle at the end put every setting back.

The MIDI logs are `stock-v16-voices-2026-10-26-midi-log-tests-1-2.txt` (08:18 to 08:54, the
Program Changes of tests 1 and 2) and `stock-v16-voices-2026-10-26-midi-log.txt` (from 08:59,
the last download: the log keeps only the latest entries). Preset numbers below are the FM1's
`001`–`128`, so editor slot A0*n* is program _n_ − 1 and preset `00n`.

## Summary

Confirmed on this FM1:

- **All eight Voices take their own Program Change.** With Voices 1–8 On on channels 1–8, a slot
  click on note channel _n_ moved only the Voice on channel _n_, for every _n_ from 1 to 8.
- **A Voice switched Off ignores a Program Change on its channel**, and does not apply it when it
  is switched back On.
- **A single-voice dump still reached the Voice selected on the FM1's screen while that Voice was
  Off.** The dump is not stopped by Off, only the Program Change is.
- **The FM1's own keys send on channel 1**, with Voice 3 and with Voice 6 selected. Nothing in a
  key press tells the editor which Voice is selected.
- **Receive patches took a bank** from GLOBE → Export on the orange FM1, sent nothing while it
  listened, played the clicked patches, and offered Undo after Replace.
- **Bank Export includes edits not saved on the FM1.** A dump the editor had sent to a Voice's
  preset, never saved, was in the next export.

Found on the way:

- With a Voice on All, as the stock FM1 starts, that Voice takes every Program Change.
- The wizard's replace warning is red, not yellow as the sheet says.
- Starting Export before the editor was listening did not show **Receive Timeout** this time.
- Four identity answers arrived with no query from the editor to explain them.

Not run: sheet 1's Test 4 (CC 7), since no tool to hand sends a Control Change, and sheet 2's
Test 3 (one patch from Dexed).

## Setting up

Before the run each Voice read as follows (the FM1's own settings, written down by Ben):

| Voice | Preset        | Channel | On/Off |
| ----- | ------------- | ------- | ------ |
| 1     | 001 SYN-LEAD1 | All     | On     |
| 2     | 002 ORCHESTRA | All     | Off    |
| 3     | 003 BRASS 3   | 3       | Off    |
| 4     | 004 STRINGS 1 | 4       | Off    |
| 5     | 005 STRINGS2  | 5       | Off    |
| 6     | 006 BRASS 3   | 6       | Off    |
| 7     | 007 BRASSBEN  | 7       | Off    |
| 8     | 008 PIANO 1   | 8       | Off    |

The editor's badge read V16, MIDI was online, and the identity query was answered `FM-1_016`
(08:18:33).

**A first Test 1 attempt did not count.** The Voices were not yet on channels 1–8: the FM1's
screen still showed Voice 1 On on All and Voice 2 Off on All
(Ben's photos were not kept). A slot click then put the preset on
Voice 1, whose header read `006 STRINGS 2`, because a Voice on All takes every Program Change.
That agrees with the 2026-10-23 run; it is not a result for the test. Ben then set every Voice
On on its own channel (1–8, none on All), and the test was run from there with Voice 1 selected.

Voice 6 read 007 BRASSBEN after the first click, where it had read 006 BRASS 3 before it. The
editor sent no Program Change on channel 6 (the log shows one program message so far, on channel
2), and Ben thinks he changed it on the FM1 by mistake. The table starts from the readings taken
after that click.

## Test 1: eight Voices, one Program Change each

Voice 1 selected on the FM1's screen throughout. Presets after each click, read on both pages of
the Voice screen:

| Click (note channel, slot) | Message in the log | Voices 1–8 afterwards (preset numbers)                           |
| -------------------------- | ------------------ | ---------------------------------------------------------------- |
| Before the first click     |                    | 005, 002, 003, 004, 005, 006, 007, 008 (Voice 6 as in the setup) |
| Ch 2, A05                  | `C1 04`            | 005, **005**, 003, 004, 005, 007, 007, 008 (Voice 6 as above)    |
| Ch 3, A06                  | `C2 05`            | 005, 005, **006**, 004, 005, 007, 007, 008                       |
| Ch 4, A07                  | `C3 06`            | 005, 005, 006, **007**, 005, 007, 007, 008                       |
| Ch 5, A08                  | `C4 07`            | 005, 005, 006, 007, **008**, 007, 007, 008                       |
| Ch 6, A09                  | `C5 08`            | only Voice 6 changed, to **009**                                 |
| Ch 7, A10                  | `C6 09`            | only Voice 7 changed, to **010**                                 |
| Ch 8, A11                  | `C7 0A`            | only Voice 8 changed, to **011**                                 |
| Ch 1, A12                  | `C0 0B`            | **012**, 005, 006, 007, 008, 009, 010, 011                       |

**Result: as expected.** Every Voice took the preset for its own channel, and no other Voice
moved. The sheet's tick-boxes: Voice 2 now plays A05 (checked by number; a note was played on
channel 3 at 08:21:30, `92 3C 60`), no other Voice changed (the Voice 6 change above was not the
editor's), and Voices 2–8 kept theirs when channel 1 was clicked.

- Each click sent a Program Change on the note channel and then the library's patch as a 163-byte
  dump whose header named the same device (`F0 43 02 …` for channel 3), as in the run of
  2026-10-25. The dumps went to the Voice selected on the screen, Voice 1.
- **Names did not match**, numbers did. The FM1 names a Voice's preset from the preset stored on
  it, so the click on A06 (STRINGS 3 in the editor) left Voice 3 on `006 STRINGS 2`, and the
  editor's A07 (ORCHESTRA) left Voice 4 on `007 STRINGS 3`. The library and the FM1's stored
  presets are different banks until a bank is sent and saved, which the backlog already says.
- Two extra clicks on channel 3 at 08:30 (A07 then A06 again, `C2 06` then `C2 05`) are in the
  log. Voice 3 ended on 006.

## Test 2: a Voice switched Off

Voice 4 (channel 4) was switched Off on the FM1; it played 007.

1. **First attempt, with Voice 4 still selected on the screen** (to switch it Off), editor note
   channel 4, click A01: `C3 00`, then a dump of BRASS 1. Voice 4's number stayed **007**, and
   its name changed to **BRASS 1**. The photo (not kept) showed Voice 4's own page: preset list
   `005 STRINGS 2`, `006 ORCHESTRA`, `007 BRASS 1`, MIDI Ch 4, On/Off **Off**.
2. **Repeat with Voice 1 selected again**, Voice 4 still Off, click A02: `C3 01`, then a dump
   of BRASS 2. Voice 4 stayed on **007 BRASS 1**. Voice 1 (selected) read `012 BRASS 2`: the
   dump renamed its preset without changing the number. Voices 1–8 otherwise kept their
   numbers.
3. **Voice 4 switched back On:** still **007 BRASS 1**.

**Result.** A Voice that is Off ignores a Program Change on its channel and does not take it
when it comes back On. A dump still reaches the selected Voice when that Voice is Off (the first
attempt). The editor cannot read On/Off, so it cannot tell it sent a Program Change to nothing.

## Test 3: which channel the FM1's keys send on

Ben selected Voice 3 (channel 3) and pressed keys, then selected Voice 6 (channel 6) and did the
same. The log has three bursts of keys, at 08:58:38 (E4, G4, A4, B4, A4, G4, E4), 08:59:29 (A4,
G4, F4), and 08:59:41 (G5 down to C5). Which burst was which Voice is Ben's account, not the
timestamps. Every note was:

```text
08:58:38.170  IN  Ch 1 Note On: E4 (velocity 90)     90 40 5A
08:58:38.329  IN  Ch 1 Note Off: E4 (velocity 100)   80 40 64
```

**Result.** The notes arrived on **channel 1** with Voice 3 selected and with Voice 6 selected,
at velocity 90 and 100, as on 2026-10-23 (Voice 1 alone, on All). They do not follow the Voice
selected on the screen. The editor cannot learn that Voice's channel from a key press.

## Test 4: CC 7 on one Voice's channel

**Not run.** The editor has no control that sends a Control Change on a Voice's channel, and no
other MIDI tool was to hand. Whether CC 7 sets one Voice's level is still open.

## Receive patches (sheet 2)

Opened from a bank's ⋮ menu. MIDI was online for the Voices run, so the sheet's "leave MIDI
offline" was done first (the log shows `MIDI disconnected` at 09:00:34).

### Test 1: receive a bank from the FM1

1. **Receive from the FM1…** in the bank's ⋮ menu opened **Receive patches**, with **An FM1 on
   M-VAVE's V16** already chosen. ✔
2. **Next** showed **Switch MIDI online**, with "MIDI is offline. Switch it online to listen."
   ✔
3. After switching: **Listening on "FM-1". The editor sends nothing.** and "Now open GLOBE on the
   FM1, choose Export, and pick a bank." ✔
4. GLOBE → Export: **Received a bank of 32 patches, starting with “BRASS 1”.** ✔
5. **Next**: 32 patches in a grid; two clicked, each played on the FM1. ✔
6. **Next**: Bank 1 (A) chosen, with a warning: "Every patch in “Bank 1” will be replaced by the
   32 received, and their FM1 effects reset to their defaults." The panel is **red**, not yellow
   as the sheet says.
7. **Replace**: the window closed and the message offered **Undo**. ✔
8. **Undo**: Ben reported the bank went back, effects included. Afterwards he noted that the bank
   replaced may have matched the received one. The log suggests not (the received bank had
   ORCHESTRA at 06 and BRASS 1 at 07 where the library's A06 is STRINGS 3 and A07 ORCHESTRA), but
   no slot was compared, so treat Undo as **reported working, not independently checked**.
9. **MIDI log.** One identity query went out when MIDI came online (09:08:46), and the only
   sends after it were the two patches clicked (below). The bank arrived at 09:11:24, a single
   4104-byte message `F0 43 00 09 20 00 …`. **Nothing was sent while listening, receiving, or
   replacing.**

```text
09:08:46.360  OUT  Asked the FM1 which firmware it runs.   F0 00 32 45 00 00 00 40 7F F7
09:11:24.762  IN   F0 43 00 09 20 00 31 63 1C 44 …        4104 bytes
09:12:11.401  OUT  Sending PIANO   3 to the FM1 edit buffer…   F0 43 03 00 01 1B …
09:12:14.184  OUT  Sending BASS    1 to the FM1 edit buffer…   F0 43 03 00 01 1B …
```

The audition of a received patch is one dump to the selected Voice, with no Program Change.

**Unexpected: four identity answers.** At 09:14:12, 09:14:13, 09:14:19, and 09:14:19 (twice), the
FM1's identity reply (`F0 00 32 45 58 01 …`) arrived with no query from the editor in the log.
Nothing was sent at those times, so something else asked: a second tab or another program, if
any. Ben could not say what. Unexplained.

**Bank Export includes unsaved edits.** The bank received at 09:11:24 and the three later ones
(09:15:38, 09:16:59, 09:20:24) are byte for byte the same except slot 12, which reads `BRASS 2`
in the first and `BASS 1` in the others. The editor had dumped BASS 1 at 09:12:14 to the selected
Voice 1, whose preset was 012, and nothing was saved. The first bank also held the names of
patches the editor had dumped earlier (`07 BRASS 1`, `12 BRASS 2`). So an export shows the
edited presets, not only the stored ones. **Confirmed**, seen in this log.

### Test 2: start Export too early

1. With the dialog open on its first screen (**Next** not clicked), Ben started Export on the FM1.
   It did **not** show **Receive Timeout**: it returned to the GLOBE screen with Bank Export.
   MIDI was online, so the dump probably reached the editor's input anyway; the log has bank
   dumps at 09:15:38, 09:16:59, and 09:20:24, but which was which was not tied down. What the FM1
   showed in between was not noted. **Differs from the sheet.**
2. **Next**, then Export again: the bank arrived ("Received a bank of 32 patches, starting with
   “BRASS 1”"), without a power cycle. ✔

### Test 3: one patch

**Not run**, since there is no Dexed.

### Test 4: the other menu item

**Receive from the FM1…** is in Bank 1's ⋮ menu, between **Import DX7 bank…** and **Download this
bank**. After closing the window with its **X**, pressing Space opened Bank 1's menu again, so
focus returned to that bank's ⋮. ✔ (The focus ring is not visible after a mouse click.)

### Test 5: phone size

At about 375 px every step fits, and **Back** and **Next** stay at the bottom. On the first
screen the second option (**One patch from another device**) is cut off and needs a scroll; Ben
suggested dropping the descriptions under the options on small viewports. ✔ with that note.

### Notes from Ben, for the backlog (low priority)

- The listening screen, once MIDI is online, carries a lot of text.
- The layout of the screen with the **Switch MIDI online** button needs work.
- The first screen's option descriptions crowd a phone.

## What the results decide

- **The Voice strip can send one Program Change per Voice on channels 1–8.** The one-patch-per-
  Voice model works for all eight Voices on the orange FM1: nothing moved but the addressed
  Voice. Step 2's **Send setup** needs no new message.
- **A Voice switched Off takes no Program Change.** A setup cannot switch Voices on, and
  **Send setup** to an Off Voice silently does nothing, with no way for the editor to see it. The
  strip's note about setting the Voices up once on the FM1 (channels 1–8, all On, none on All)
  needs to say Off as well.
- **The editor cannot learn the selected Voice from a key press.** Keys arrive on channel 1
  whichever Voice is selected, so the backlog's idea of switching the header picker to the
  selected Voice's channel from a key press does not work. Nothing else tells the editor which
  Voice is selected, so the strip's "Edit from a Voice" step still has to ask the user to select
  it.
- **Names will not match.** A Voice shows the FM1's stored preset name, which is the library's
  only after the bank has been sent and saved.
- **Bank Export is not a snapshot of what was saved.** The receive wizard's steps could say that
  an export includes unsaved edits; the backlog item records it.
- **Receive patches** worked as built on hardware. Undo after a received bank still wants a check
  that compares the slots.
- **Open:** whether CC 7 sets a Voice's level, whether a dump changes a preset for every Voice
  playing it, and whether one dump per gesture is usable; none was run. Also not run, from the
  V16 item: the double-clicked slot sending one Program Change and one dump (#363), and the V16
  lines in the badge, the firmware setting, and the editor.
