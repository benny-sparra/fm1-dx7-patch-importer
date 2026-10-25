# FM1 Editor Research Notes

> Status: working engineering reference
> Last reviewed: 2026-09-28
> Scope: M-VAVE FM1 editor/librarian, stock FM1 firmware behaviour, and possible editor enhancements.

## Purpose

This document is the project's source of truth for FM1-specific reverse-engineering findings that may affect the browser editor.

It deliberately separates:

- **Confirmed** — directly supported by current reverse-engineering evidence or existing editor behaviour.
- **Likely** — strongly suggested by firmware analysis but not yet verified against a physical FM1 through the browser editor.
- **Needs hardware test** — implementation should not assume the behaviour until tested safely.
- **Dangerous / excluded** — firmware-update, loader, flash or recovery behaviour that must not be exercised by normal editor code.

When implementing features, prefer the most conservative interpretation. Do not invent protocol details to fill gaps.

---

## Primary sources

### FM1 firmware reverse engineering

Repository:

- https://github.com/AL-255/FM-1-RE

Important references:

- MIDI, SysEx, arpeggiator and sequencer:
  - https://github.com/AL-255/FM-1-RE/blob/main/docs/io/05-midi.md
- Synth engine:
  - https://github.com/AL-255/FM-1-RE/blob/main/docs/io/04-synth-engine.md
- Storage:
  - https://github.com/AL-255/FM-1-RE/blob/main/docs/io/09-storage.md
- Architecture:
  - https://github.com/AL-255/FM-1-RE/blob/main/docs/architecture.md
- OTA/update protocol:
  - https://github.com/AL-255/FM-1-RE/blob/main/docs/io/11-ota-protocol.md
- Safety/open questions:
  - https://github.com/AL-255/FM-1-RE/blob/main/TODO_aug2.md

### Open firmware feasibility research

Repository:

- https://github.com/ip2k/mvave-fm1-open-firmware

This is a from-scratch open-firmware feasibility project for the FM1's JieLi AC791N SoC, not an
editor codebase. It sits entirely in the OTA/update/loader/recovery space that this project treats
as **Dangerous / excluded**; nothing from it should be implemented in production editor code. It is
cited here only where it corroborates or sharpens existing findings:

- Update protocol summary, with a hardware-verified (2026-09-06, device `FM-1_015`) byte-exact
  decode of the `F0 00 32 45 …` identity query/reply already captured in §6.3:
  https://github.com/ip2k/mvave-fm1-open-firmware/blob/main/docs/03-update-protocol.md
- Stock firmware analysis, independently confirming the msfa/Dexed engine identity from §1.3
  (byte-for-byte FM algorithm table match at a specific firmware offset):
  https://github.com/ip2k/mvave-fm1-open-firmware/blob/main/docs/02-stock-firmware.md

### FM-1+VA replacement firmware

Site and manual:

- https://baudgirl.com/work/FM-1+VA
- https://baudgirl.com/work/FM-1+VA/manual

FM-1+VA is Madeline Hoyle's (Baud Girl) replacement firmware for the FM1, installed through the
updater, reviewed here on 2026-09-28 at release `FM-1_089`. It keeps M-VAVE's Dexed engine and
effects, fixes four engine bugs (§1.3), and adds a Virtual Analog engine, a 64-step sequencer, and
MIDI commands of its own. Its source, decompilation, and emulator are announced under
GPL-3.0-or-later but were not published at the time of review; the browser modules its Install and
Presets pages load were read for this note.

How this project uses it:

- Its manual describes its own firmware. Where it describes behaviour it says it kept from M-VAVE's,
  such as the effect controllers, it is corroborating evidence about stock firmware, at most
  **Likely**, never **Confirmed**, because it is a derivative that has changed other behaviour.
- Its own commands (below) do not exist on stock firmware. On stock firmware they are unknown
  vendor messages and stay **Dangerous / excluded**. Production code sends only the preset read
  (approved 2026-10-02, below), and only to FM-1+VA from `FM-1_079`. The preset write is approved
  too (2026-10-03, below), but so far only the development probe sends it.
- This project is MIT-licensed. Reimplement any fact recorded here from this document; do not copy
  its code.

Commands of its own, all under the Yamaha ID with a sub-ID it assigns (`F0 43 00 7D …`, checksum
`ysum` = the low seven bits of the sum of each byte's complement), from `FM-1_079` on:

| Message                         | Purpose                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7D 10 <slot> <sum>`            | Reads stored preset `slot` (0–127). The reply carries the 128-byte packed DX7 voice and a 59-byte settings record holding that preset's effects, effect order, and engine choice.                                                              |
| `7D 04 <slot> <155> <68> <sum>` | Writes a preset exactly: the voice as a 155-byte edit buffer, then the 59-byte record in 8-into-7 groups. 231 bytes. Its Presets page reads each back to check it and waits 3 s between writes, because closer writes were heard as crackling. |
| `7D 20 <pattern> <part> …`      | Writes eight steps of a sequencer pattern and its settings (177 bytes); a separate memory-read request reads patterns back. Layout under "Writing a sequencer pattern".                                                                        |

**Its backup file. Confirmed** (two files from **Save a backup** on `FM-1_089`, 2026-09-29, 256
messages). The `.syx` file is 29,568 bytes: 128 preset writes of 231 bytes each, in slot order,
`F0 43 00 7D 04 <slot> <155-byte voice> <68-byte record> <sum> F7`. The voice is a DX7 edit buffer
that converts to the library's packed voice like any other. `<sum>` covers only the 223 payload
bytes after the slot, not the command or the slot: the low seven bits of the sum of each byte's
seven-bit complement. Every byte between `F0` and `F7` is seven-bit. The editor reads this file in
**Import Baud Girl presets…** (`src/lib/fm1-va-preset-file.ts`), voices only.

**The engine marker. Confirmed** (three backups, 2026-09-29 and 2026-10-01, 384 presets). The
record travels in 8-into-7 groups, each starting with the byte that carries the high bits of the
seven after it. Record byte 18, the fifth byte of the third group, is `5A` in every Virtual Analog
preset and `03` in every FM preset. The 2026-10-01 backup held 17 Virtual Analog presets: 097, made
with **Erase Preset** and stored with SAVE, and the 16 of FM-1+VA's preset pack in 113–128. No
preset showed the `A5` that FM-1+VA's web modules were read as giving an FM preset. That group's
high-bit byte is `00` in all 384 presets. The editor compares the whole decoded byte: `5A` is
Virtual Analog, `C3` is 8-Bit from `FM-1_096` (below, "FM-1_096"), and any other value is FM. In each group, bit _k_ of the first byte is the
high bit of the group's byte _k_ (Confirmed, below, "Reading a stored preset").

**The rest of the record is mostly not mapped. Needs hardware test.** Only three Virtual Analog
records, 097, 113, and 114, set any high bit. In FM presets, bytes 0–17 are `50` then seventeen
`03`, and bytes 27–53 are nine groups of three, each a count from 0 to 8 then `00 00`. FM-1+VA's
modules read bytes 27–44 as six effect slots of effect, switch, and type, and the first switch has
been seen (below, "Reading a stored preset"); what bytes 45–53 hold is not known. The firmware
release behind the 2026-10-01 backup was not recorded.

**A Virtual Analog preset's voice bytes are not a DX7 voice. Confirmed** for the 2026-10-01 backup
(one file, read 2026-10-02). Five of the 16 preset-pack voices hold 127 where a DX7 voice allows at
most 99: edit-buffer byte 137, LFO Speed, in SQR LEAD and GLASS, and byte 103, OP2's Frequency
Fine, in SINE SUB, SOFT KEYS, and AIR. The other pack voices are within DX7 ranges but far from an
init voice, and record bytes 19–26 differ between 097, 113, and 114. The Virtual Analog settings
therefore probably live partly in the voice bytes and partly in the record; which byte holds which
setting **needs hardware test**. Normalising these bytes as a DX7 voice would clamp the 127s to 99
and change the preset. The name stays in the voice name bytes, 145–154, as in an FM preset: the
pack presets carry their own names there.

**Erase Preset to VA, then SAVE. Seen once** (097 in the same backup). The voice is a DX7 init voice
except that OP6's output level is 99 as well as OP1's, and it is named `VOICE 97`, which suggests
the erase names a preset by its number. The record's effect bytes, 0–17, are `50` then seventeen
`03`, as in the FM presets in that backup. Erasing a second slot and diffing it against 097 would show what varies with the slot.

Its pages identify the firmware before sending any of these, with the updater's `F0 00 32 45 …`
identity query (§6.3), which stock firmware also answers. §6.3 bars production code from sending
any `00 32` message, so supporting FM-1+VA as an optional target would first need an explicit,
approved exception for that one query. Until then, stock firmware remains the only target and the
browser library the only source of truth (§8).

Whether the editor's existing features are safe on FM-1+VA is tested in
[`docs/fm1-va-compatibility-tests.md`](fm1-va-compatibility-tests.md). The editor supports stock
firmware only until the changes below are made.

#### The editor on FM-1+VA (tested 2026-09-29)

One FM1 on FM-1_089 over USB, with Chrome 154 on macOS; results and bytes are in the test plan's ledger.

- **A DX7 single-voice dump writes the selected preset's stored copy at once. Confirmed** (two
  runs). The name shows the unsaved-changes dot until the preset is left, then survives a preset
  change and a power cycle. Every single-patch send in the editor therefore overwrites a stored
  preset: an audition from an added bank, a saved bank, the bundled banks, or an import preview,
  and opening the voice editor, which for banks A–D writes the library's voice over that slot.
  The editor's message after a send, "Hold SAVE on the FM1 to store it", is wrong on FM-1+VA.
- **A 32-voice bank dump asks _Write the bank?_ starting on Cancel and on bank A**, whatever bank
  the editor sent; the question names the bank, and ALGORITHM changes it. Write replaces the
  voices and the bank's stored copy (the one **Reset Patches** returns to) and keeps each preset's
  settings record: after two bank writes the FM-1+VA backup still matched every preset. HOME
  cancels without writing. The editor's destination instructions (turn KNOB1–4, saved after a
  delay) are the stock procedure and do not apply; following them writes bank A.
  **By 2026-10-03 the prompt had been renamed. Confirmed** on the user's FM1 and in the FM-1+VA
  manual: it asks **Replace Bank A?** with **Cancel** (selected first) and **Replace**, and says
  the 32 patches replace presets 1–32 and the bank's factory presets permanently. ALGORITHM still
  picks the bank and HOME still cancels.
- **DX7 parameter changes are unsaved edits.** They show the dot and the FM1's EDIT screen, are
  heard from the next note only, and a preset change discards them.
- **Effect CCs are unsaved edits, and selecting a preset loads its stored effects.** The editor's
  Program Change followed by the slot's saved effects arrives in order: the effects land after the
  preset change and show the dot.
- Program Change, the on-screen keyboard, **MIDI panic**, and port reconnection behave as on stock
  firmware. The port is listed as `USB Composite Device` on macOS.

These were each seen once, apart from the first.

#### What the editor does about it

Since 2026-09-29 the editor asks for the firmware with the identity query whenever the ports in
use change, and treats it as unknown until the answer for those ports arrives (`useMidi`,
`src/lib/fm1-firmware.ts`). A name numbered `FM-1_019` or below is M-VAVE's firmware; any other
FM1 number, past or future, is FM-1+VA. If M-VAVE ever numbers a release 20 or above, the editor
treats it as FM-1+VA, which is safe but slower.

- Only M-VAVE's firmware gets a single-voice dump. Every other firmware, including one not yet
  identified or not answering (for example with no MIDI input selected), gets the patch as its
  155 DX7 parameter changes, sent back to back rather than 35 ms apart like live edits, so the
  patch arrives in well under a second. Test 7c stored one sent that way with SAVE and found it
  identical to the bundled voice, byte for byte (2026-09-29, FM-1_089, seen once).
- The bank destination dialog shows the **Replace Bank A?** steps for FM-1+VA, M-VAVE's knob steps
  for M-VAVE's firmware, and M-VAVE's steps with a note on FM-1+VA while the firmware is unknown.
  From FM-1_079, FM-1+VA gets no DX7 bank: **Send to FM1** writes the bank's presets with `7D 04`
  through the write dialog, so the prompt is never reached.
- Settings shows the firmware and what it means for the patches the editor plays.
- From FM-1_079 the effects panel sets Distortion's type, record byte 38, in a patch that has a
  record: Soft Clip `00`, Hard Clip `01`, and Foldback `02`, each read from the FM1. The edit
  buffer keeps the selected preset's type, so the editor's choice is heard only once a preset
  write stores it.

**Seen once on FM-1_089 (2026-09-29, test 7b):** a patch sent as its 155 parameter changes plays
as the whole patch, name included, about five seconds after the click, shows the unsaved-changes
dot from the first change, and is discarded by a preset change, which restores the stored preset.
Rechecked on FM-1_092 (2026-09-29): identification and a patch sent as parameter changes behave
as on FM-1_089. FM-1_092 also saves Envelope On or Off with each preset, gives FM presets the
Virtual Analog filter (off until switched on), and changes the Sequencer's pattern format (held
notes and per-note Tie & Slide; older patterns are converted when first shown). None of those
change what the editor sends today; they change the preset record and pattern format that the
planned FM-1+VA features would read and write (`docs/feature-backlog.md`). Repeat test 7b on each FM-1+VA release whose notes mention MIDI or SysEx handling.

#### Reading a stored preset

**Approved 2026-10-02** as the one FM-1+VA command the editor may send, gated on FM-1+VA from
`FM-1_079` (the firmware profile's `presetRead`). The layout below was first read from the modules
FM-1+VA's Presets page loads (`fm1sound.js`, `fm1seq.js`, and `install/bank.js` under
`https://baudgirl.com/fm1/app/835478add641fd2b/`, read 2026-10-02). **Status: Confirmed, seen once**
(FM-1_093, 2026-10-02): the FM1 answered the request for preset 001 (ORGAN 3) with a reply that
decodes as below, and its voice and record match the same preset in the 2026-09-29 backup byte for
byte. The editor's codec is `src/lib/fm1-va-sysex.ts` and `src/lib/fm1-va-preset-read.ts`, and
`useFm1VaPresetReader` sends it through the selected ports. The capture is the fixture
`capturedOrgan3Reply` in `src/test/fm1-va-captures.ts`; replies built from this layout cover the
statuses and damage no capture shows yet.

- **Request:** `F0 43 00 7D 10 <slot> <sum> F7`, with `slot` 0–127 (the FM1 shows 001–128). Unlike
  the preset write, whose checksum covers only its payload, this checksum covers the command and
  the slot: slot 0 is `F0 43 00 7D 10 00 6E F7`.
- **Reply:** `F0`, an 8-bit buffer packed seven bits at a time, least significant bit first (the
  packing the identity reply uses), and `F7`. Because the buffer starts with `7D`, every reply
  starts `F0 7D` on the wire. The buffer is `7D`, a kind (`50` preset, `51` memory, `52` pattern),
  a status (`0` done, `1` value out of range, `2` damaged in transit, `3` Sequencer playing), a
  32-bit argument and a 16-bit data length, both little-endian, the data, and the complement of
  the low byte of the sum of everything before it.
- **A preset reply** has kind `50`, the slot as its argument, and 187 bytes of data: the 128-byte
  packed DX7 voice (the bank layout, name in bytes 118–127), then the 59-byte settings record,
  eight bits a byte rather than in the 8-into-7 groups the preset write and the backup file use.
- FM-1+VA's own page waits 1.5 s for an answer and asks three times; the editor does the same.
  The editor sends the request again when the reply's status says it arrived damaged, and treats
  a reply of any other size as a layout it does not know rather than asking again.
- **Reading every preset** (**Read presets from the FM1…**, built 2026-10-03)
  sends the 128 requests one at a time, each after the previous reply, and stops at the first
  read that fails. The import takes each FM preset's library effects from the record's effect
  bytes, as "What the record holds" maps them. **Confirmed on hardware** (FM-1_093, 2026-10-03,
  through the editor over USB): the 128 reads take one to two seconds, and none failed across
  several runs. Importing the four banks and reading again showed every patch matching the
  library, so the voice, effects, and record survive the round trip. Changing one setting on
  preset 001 and pressing SAVE marked that patch alone.
- **The read is not refused while the Sequencer plays. Confirmed, seen once** (the same session):
  with the FM1's own Sequencer playing, every read answered with status `0`. Status `3` belongs
  to the writes, then, at least on FM-1_093; the editor still explains it if a read ever returns
  it.
- **Record byte 18 of an FM preset is `03`. Confirmed, seen once** (the capture above). FM-1+VA's
  modules give `A5` for an FM preset, but the read of ORGAN 3 holds `03`, as the backups did, so the
  backups were read in the right place and the editor's `5A` test stands. Its modules write `A5`
  only in the record they make for a sound that arrives without one, such as from a DX7 file; a
  stored preset need not carry it.
- **In the backup's 8-into-7 groups, bit _k_ of a group's first byte is the high bit of its byte
  _k_. Confirmed, seen once** (097 read on FM-1_093, 2026-10-02, fixture
  `capturedVirtualAnalogFilterOnReply`). 097's record has 13 bytes above `7F`; decoded this way,
  the 2026-10-01 backup matches the read in every byte but byte 28, below, and the reverse order
  leaves 15 differences. The voice matches byte for byte.

**What the record holds, one setting at a time.** Each row is a preset read before and after one
change on the FM1, stored with SAVE.

| Change                                                                                                                                                                        | Preset            | Bytes that changed                                                                                | Seen                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Filter switched on (was off since its backup)                                                                                                                                 | 097 (VA)          | 28: `00` → `01`                                                                                   | Once, FM-1_093, 2026-10-02, against the 2026-10-01 backup |
| Filter moved below Reverb (Filter On, Reverb Off before and after)                                                                                                            | 097 (VA)          | 27: `00` → `01`, 30: `01` → `00`                                                                  | Once, FM-1_093, 2026-10-03                                |
| Filter switched on                                                                                                                                                            | 001 (FM, ORGAN 3) | 28: `00` → `01`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| Filter Cutoff turned from 6065 Hz to 1686 Hz                                                                                                                                  | 097 (VA)          | 0: `50` (80) → `36` (54)                                                                          | Once, FM-1_093, 2026-10-03                                |
| CC 2 (Filter Cutoff) sent with 40 from the FX probe; the FX screen showed 812 Hz                                                                                              | 097 (VA)          | 0: `36` (54) → `28` (40)                                                                          | Once, FM-1_093, 2026-10-03                                |
| CC 3 (Filter Resonance) sent with 5 from the FX probe; the FX screen showed 50                                                                                                | 097 (VA)          | 1: `03` → `05`                                                                                    | Once, FM-1_093, 2026-10-03                                |
| CC 1 (Filter Type) sent with 2 from the FX probe; the FX screen showed high pass                                                                                              | 097 (VA)          | 29: `00` → `02`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| CC 7 (Reverb Mix) sent with 77 from the FX probe; the FX screen showed 77                                                                                                     | 097 (VA)          | 4: `03` → `4D` (77)                                                                               | Once, FM-1_093, 2026-10-03                                |
| CC 23 (Phaser Mix) sent with 66 from the FX probe; the FX screen showed 66                                                                                                    | 097 (VA)          | 17: `03` → `42` (66)                                                                              | Once, FM-1_093, 2026-10-03                                |
| CC 10 (Delay Rate) sent with 33 from the FX probe; the FX screen showed 33                                                                                                    | 097 (VA)          | 7: `03` → `21` (33)                                                                               | Once, FM-1_093, 2026-10-03                                |
| CC 14 (Distortion Tone) sent with 44 from the FX probe; the FX screen showed 44                                                                                               | 097 (VA)          | 10: `03` → `2C` (44)                                                                              | Once, FM-1_093, 2026-10-03                                |
| CC 18 (Chorus Depth) sent with 55 from the FX probe                                                                                                                           | 097 (VA)          | 13: `03` → `37` (55)                                                                              | Once, FM-1_093, 2026-10-03                                |
| CC 20 (Phaser on or off) sent with 127 from the FX probe; the FX screen showed Phaser On                                                                                      | 097 (VA)          | 43: `00` → `01`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| CC 5 (Reverb Type) sent with 2 from the FX probe; the FX screen showed Plate                                                                                                  | 097 (VA)          | 32: `00` → `02`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| Distortion Type turned from Soft Clip to Hard Clip on the FX screen                                                                                                           | 097 (VA)          | 38: `00` → `01`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| Distortion Type turned from Hard Clip to Foldback on the FX screen                                                                                                            | 097 (VA)          | 38: `01` → `02`                                                                                   | Once, FM-1_093, 2026-10-04                                |
| Thirteen FX controllers sent together, each a different value: CC 4 = 1, 6 = 11, 8 = 1, 9 = 12, 11 = 13, 12 = 1, 13 = 14, 15 = 15, 16 = 1, 17 = 16, 19 = 17, 21 = 18, 22 = 19 | 097 (VA)          | 3, 6, 8, 11, 12, 14, 15, 16, 31, 34, and 40 to the values sent; 9 and 37 (CC 13 and 12) unchanged | Once, FM-1_093, 2026-10-03                                |
| CC 12 (Distortion on or off) sent with 1 and CC 13 (Distortion Gain) with 14                                                                                                  | 097 (VA)          | 37: `00` → `01`; 9: `03` → `0E` (14)                                                              | Once, FM-1_093, 2026-10-03                                |
| Envelope switched on by holding ENV                                                                                                                                           | 001 (FM, ORGAN 3) | 53: `00` → `40`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| Envelope Attack set to 25 in the Envelope group                                                                                                                               | 001 (FM, ORGAN 3) | 54: `00` → `19` (25)                                                                              | Once, FM-1_093, 2026-10-03                                |
| The Filter section's Filter row in EDIT (FM-1_092's filter for FM presets) turned from Off to On                                                                              | 001 (FM, ORGAN 3) | 26: `03` → `90`                                                                                   | Once, FM-1_093, 2026-10-03                                |
| That Filter's Cutoff turned from 20 kHz, its maximum, to 5 kHz                                                                                                                | 001 (FM, ORGAN 3) | 23: `03` → `D0` (208)                                                                             | Once, FM-1_093, 2026-10-03                                |
| That Filter turned back Off                                                                                                                                                   | 001 (FM, ORGAN 3) | 26: `90` → `80`                                                                                   | Once, FM-1_093, 2026-10-03                                |

**Bytes 27–44 interleave two lists. Confirmed for every position and every effect number on
`FM-1_096` (below, "FM-1_096"), and for the first two positions and the Filter's switch on
`FM-1_093`.** Byte 27 + 3*k* names the effect in position _k_ of the chain, top of the FX screen first,
where `00` is Filter and `01` is Reverb; the other four presumably follow the FX screen's own order
(Delay, Distortion, Chorus, Phaser). Byte 28 + 3*e* is the switch of effect _e_, wherever the effect
sits: moving the Filter below Reverb swapped bytes 27 and 30 and left byte 28 on, and the FX screen
still showed Filter On and Reverb Off. Byte 29 + 3*e* is the type of effect _e_, stored as its CC
value: CC 1 sent with 2 set byte 29 to `02` and the Filter to high pass, as FM-1+VA's modules give
it. Switching the Filter on left bytes 0–17 as
they were, in an FM preset as in a Virtual Analog one: both engines keep the effects in the same
bytes.

**Byte 0 is the Filter's Cutoff, stored as the CC 2 value. Seen once** (097, above). A Cutoff
sent from the editor as CC 2 with 40 and stored with SAVE reads back as 40, so for this setting the
record holds the same value as the library's FM1 effects. Every preset seen holds `50` (80) there
before it is changed. The FX screen showed 40 as 812 Hz, 54 as 1686 Hz, and 80 as 6065 Hz, 12–16%
above the curve the manual's range implies (CC 2 from 100 Hz at 0 to 20 kHz at 107), so the FM1
probably converts through a table; the editor needs only the value.

**Byte 1 is the Filter's Resonance, stored as the CC 3 value. Seen once** (097, above). CC 3 sent
with 5 reads back as 5, and the FX screen showed it as 50, as the manual's 0–10 shown as 0–100
predicts. The `03` that bytes 1–17 hold in every preset seen is therefore a real setting, not a
marker: a Resonance of 3, shown as 30.

**Bytes 0–17 are three settings for each effect, in effect order. Confirmed** for every effect
controller (the table below).
The FX channel's 24 controllers are six switches, two types (the Filter's and Reverb's), and 16
settings, and the record keeps the switches and types in bytes 28–44. That leaves the settings for
bytes 0–17: if each effect has three, in the order of its controllers, the Filter's Cutoff and
Resonance are bytes 0 and 1 (as seen) with byte 2 spare, Reverb's Decay and Mix are 3 and 4,
Delay's are 6–8, Distortion's 9–11, Chorus's 12–14, and Phaser's 15–17. Reverb's Mix, CC 7, sent
with 77 landed in byte 4, and Phaser's Mix, CC 23, sent with 66 in byte 17, as this predicts.

So far each value the record holds is the value its controller sends, and the place of every
controller follows from these rules:

| CC                  | Record byte                                  |
| ------------------- | -------------------------------------------- |
| 0, 4, 8, 12, 16, 20 | 28, 31, 34, 37, 40, 43: each effect's switch |
| 1, 5                | 29, 32: the Filter's and Reverb's types      |
| 2, 3                | 0, 1: Filter Cutoff and Resonance            |
| 6, 7                | 3, 4: Reverb Decay and Mix                   |
| 9, 10, 11           | 6, 7, 8: Delay Decay, Rate, and Mix          |
| 13, 14, 15          | 9, 10, 11: Distortion Gain, Tone, and Level  |
| 17, 18, 19          | 12, 13, 14: Chorus Frequency, Depth, and Mix |
| 21, 22, 23          | 15, 16, 17: Phaser Frequency, Depth, and Mix |

**Confirmed, each controller seen once** (FM-1_093, 2026-10-03): every one of the 24 has been sent and read back in the byte this table gives. CC 12 and 13 did not change in the combined read and did in a read of their own, so they had not been sent the first time. The rest follow the pattern and need one read each before code
depends on them. FM-1+VA's manual says a switch takes any value but 0 as on, and a value above a
setting's maximum acts as the maximum (the effect controller table below). The record holds the
value used, not the value sent: CC 20 sent with 127 stored the Phaser's switch as `01`. Whether a
setting sent above its maximum is stored as the maximum has not been read, but the switch suggests
it is. Bytes 2 and 5 have no controller. Distortion's type, which FM-1+VA's manual lists and no
controller sets, is byte 38 (29 + 3 × 3): Soft Clip is `00`, Hard Clip `01`, and Foldback `02`,
each seen once on 097.

**Byte 53 holds Envelope On or Off in bit 6 (`40`). Seen once** (001, above). The change set one
bit rather than a value, so byte 53 presumably holds other on or off settings in its other bits; it
is `00` in every other preset seen. Byte 54 is the Envelope's Attack, stored as the value
the screen shows (25 read as `19`, seen once), and FM-1+VA's modules give Decay, Sustain, and
Release as bytes 55–57, which are `00` while the Envelope has never been edited.

**Bit 4 of byte 26 (`10`) switches an FM preset's own Filter on. Seen once each way** (001, above).
FM-1+VA's modules give bytes 23–26 to the Virtual Analog filter and name `03` there as unset, which
every FM preset seen holds. Switching the Filter on turned byte 26 from `03` to `90`, and switching
it off turned it to `80`, keeping the Cutoff in byte 23 as the manual says. So byte 26 packs several
settings into its bits: bit 4 is the switch, and bit 7 (`80`), set when the unset `03` was first
replaced, is not known.

**Byte 23 is that Filter's Cutoff. Seen once** (001, above). Turning it from 20 kHz to 5 kHz set byte
23 from `03` to `D0`, so unlike the effects it uses all eight bits, and the `03` that FM-1+VA's
modules call unset showed as the 20 kHz maximum. One reading gives no scale. Bytes 24 and 25
presumably hold others of the section's settings.

**A Virtual Analog preset's oscillator and filter settings. Seen once each** (`FM-1_093`,
2026-10-04, preset 097 erased to VA and saved; map in
[`docs/hardware-runs/fm1-va-byte-map-2026-10-04.json`](hardware-runs/fm1-va-byte-map-2026-10-04.json)).
Each setting was sent as its Control Change, saved, and read back; no voice byte changed for any of
them, so these settings live in the record alone.

| Record byte | Setting                                   | Stored as                                                          |
| ----------: | ----------------------------------------- | ------------------------------------------------------------------ |
|          19 | Waveform                                  | Sine `01`, Saw `02`, Tri `03`, Square `04`: the choice plus one    |
|          20 | Super                                     | The value the screen shows: 50 as `32`, 100 as `64`                |
|          21 | Detune                                    | The value the screen shows: 50 as `32` (a new preset's), 100 `64`  |
|          26 | Filter Type in bits 0–1, Key Tracking 2–3 | The choice: LP12 0 to HP 3, and Key Tracking 0, 33, 67, 100 as 0–3 |

Byte 26 of the new preset was `80`, so LP12 with Key Tracking 0. LP24 made it `81`, Key Tracking 33
then `85`, HP `87`, and Key Tracking 100 `8F`. Bit 7 stays set, as it does in an FM preset whose
Filter has been switched (above); what it means is still not known. Sending Saw, or Detune 50,
changed nothing, because a new preset already holds them.

**Every row of a Virtual Analog preset. Confirmed** (Baud Girl's Device Manager, app build
`8405c164d16df69a`, `app/editmodel.js` and `fm1preset.js`, read 2026-10-06). Its edit model
says it reads each row from the firmware's own row tables (`ui_screens.cpp` `k_vat`, `k_vaosc`,
`k_vafilt`, `k_lfo`) and checks them in its own tests. It agrees with every byte mapped above,
and explains the FM Filter's Cutoff: `D0` is `80` | 80, which the firmware's table shows as
5.0k, the 5 kHz it was set to. Bit 7 of byte 26 and of the filter's other bytes marks the
setting as set: without it, the row reads its default. Voice bytes are the packed voice's, with
the operator FM-1+VA calls 6 stored first.

| Where         | Row                  | Stored as                                                                                                | Default without the mark |
| ------------- | -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------ |
| Record 19     | Waveform             | Sine `01`, Saw `02`, Triangle `03`, Square `04`                                                          | Saw                      |
| Record 20     | Super                | 0–100                                                                                                    | 0 above 100              |
| Record 21     | Detune               | 0–100                                                                                                    | 50 above 100             |
| Record 22     | Drift                | 0–100                                                                                                    | 0 above 100              |
| Record 45     | Sub                  | `80` \| 0–100                                                                                            | 0                        |
| Record 46     | Noise                | `80` \| 0–100                                                                                            | 0                        |
| Record 48     | PWM                  | `80` \| 0–100                                                                                            | 0                        |
| Record 26     | Filter Type, Key Tr. | `80` \| Type in bits 0–1, Key Tracking in bits 2–3                                                       | LP12, 0                  |
| Record 23     | Cutoff               | `80` \| 0–100, shown from the firmware's table, 20 Hz to 20k                                             | 100 (20k)                |
| Record 24     | Resonance            | `80` \| 0–100                                                                                            | 0                        |
| Record 25     | Filter Envelope      | `80` \| 0–100                                                                                            | 0                        |
| Record 51     | Filter Decay         | `80` \| 0–100                                                                                            | 0                        |
| Record 49     | Filter Shape         | `80` \| 0–100                                                                                            | 0                        |
| Record 47     | Filter Velocity      | `80` \| 0–100                                                                                            | 0                        |
| Record 50     | LFO to Cutoff        | `80` \| 0–100                                                                                            | 0                        |
| Voice 14      | Level                | 0–99, operator 6's Output Level                                                                          |                          |
| Voice 13      | Velocity to Level    | 0–7 in bits 2–4, operator 6's Key Velocity                                                               |                          |
| Record 58     | Mono                 | `00` Off, `01` On                                                                                        |                          |
| Voice 116     | LFO Wave, Sync, PMS  | Sync bit 0, Wave bits 1–3 (Triangle, Saw Down, Saw Up, Square, Sine, S&Hold), Pitch Sensitivity bits 4–6 |                          |
| Voice 112–115 | LFO                  | Speed, Delay, Pitch Mod Depth, Amp Mod Depth, 0–99                                                       |                          |
| Record 53     | Envelope On          | Bit 6                                                                                                    | Off                      |
| Record 54–57  | Attack to Release    | 0–100                                                                                                    |                          |

The Device Manager also gives operator 6's four rates and levels as the amplitude envelope of
every note, rows the FM1 itself does not show. The editor leaves them, and the other operators'
bytes, as read. **Confirmed on hardware, seen once** (`FM-1_096`, 2026-10-07, preset 032, a new
Virtual Analog preset; [`docs/fm1-va-editor-tests.md`](fm1-va-editor-tests.md) V1–V26, map
[`fm1-va-editor-map-2026-10-07.json`](hardware-runs/fm1-va-editor-map-2026-10-07.json)): each
of the 18 controllers and 8 rows changed by hand changed exactly the byte, or bits, the table
gives and nothing else. CC value 127 stored 100 (`64`, or `E4` with the mark) in a record row and
99 (`63`) in a voice row, and CC 74 at 0 stored `80`. The three LFO rows in voice 116 each moved
only their own bits.

**How the FM1 draws Filter Shape. Seen once** (`FM-1_096`, 2026-10-07, V27, preset 032 with
Filter Envelope 100 and Filter Decay 50, Shape sent as CC 54 and photographed, not saved). The
Shape row shows a small picture rather than a number:

| Shape | CC 54 | Picture                                       |
| ----: | ----: | --------------------------------------------- |
|     0 |     0 | Straight up, flat top, straight down: a block |
|    50 |    64 | Slope up, flat top, straight down             |
|   100 |   127 | Straight up, flat top, slope down             |

Values between these were not photographed, so how the picture moves from one to the next, and
what it does to the sound, is not known yet. The editor does not draw it.

**Mapping the record.** A development build (`npm run dev`) has an **FM-1+VA preset probe (dev)**
in the footer. It reads one preset and shows its record and voice byte by byte, marking each byte
that changed since that preset's last read, and **Copy capture** puts the reply, both parts, and
the changed bytes on the clipboard as JSON for a fixture. Change one setting on the FM1, press
SAVE, read the same preset again, and record each byte here. Its **Map a setting** does this for a
Virtual Analog preset: it sends one setting as its Control Change, or notes one changed by hand,
and logs the bytes the read after SAVE finds changed, with **Copy map** for the JSON.

#### Writing a stored preset

**Approved 2026-10-03**, gated on FM-1+VA from `FM-1_079` (the firmware profile's `presetWrite`),
one preset per message, at least 3 s apart, each read back to confirm it (`AGENTS.md`). The message
is the one a backup file holds for each preset, `F0 43 00 7D 04 <slot> <155-byte voice> <68-byte
record> <sum> F7` ("Its backup file", above). **Confirmed offline:** `makeFm1VaPresetWrite` in
`src/lib/fm1-va-preset-message.ts` rebuilds the captured backup messages for 001 (ORGAN 3) and 097
(a Virtual Analog preset whose record sets high bits) byte for byte, and building one from the read
of ORGAN 3 gives the backup's message for it, so reading a preset and writing it back sends
FM-1+VA's own bytes. `fm1VaRecordWithEffects` puts the library's effects into a record in the bytes
"What the record holds" maps, and leaves the rest as read.

**Confirmed on hardware, seen once each** (FM-1_093, 2026-10-03, through the editor's preset probe
over USB, presets 001 and 002, starting from a fresh **Save a backup**):

- **A write stores the preset exactly.** Writing ORGAN 3 back with its own bytes, renamed
  `WRITE TEST`, and then as first read, each read back byte for byte as written.
- **The FM1 sends no reply to a write.** Nothing under `F0 7D` arrived in the 1.5 s after any of
  the three writes, so the read that follows is the only confirmation, as on FM-1+VA's own page.
- **A read straight after the write sees it.** Each check read followed its write's 1.5 s
  listening window and returned the new contents.
- **The selected preset shows the change at once.** With 001 selected on the FM1, its screen
  showed `WRITE TEST` as soon as the renamed write arrived. It still sounded the same, as only
  the name had changed.
- **Writing another preset leaves the selected one alone.** With 001 selected, writing 002 as
  `WRITE TEST` left the screen on ORGAN 3, which still played; 002 showed `WRITE TEST` when
  stepped to, and restoring it read back as first read.

The development build's **FM-1+VA preset probe (dev)** runs this test: it writes the preset just
read back to its slot, unchanged or renamed `WRITE TEST`, reads it again and says whether it
matches, and **Restore the first read** puts back the preset as the session first read it.

**A Virtual Analog preset written back. Confirmed, seen once** (FM-1_093, 2026-10-04, preset
097 through the editor's preset probe over USB, after a fresh **Save a backup**). The write carries
any preset's voice as the edit buffer its 128 read bytes unpack to, so a Virtual Analog preset goes
as FM-1+VA's own backup restores it: building the write from 097's read gives the backup's message
for 097 byte for byte (`src/lib/fm1-va-preset-message.test.ts`). **Write back unchanged** on 097
read back exactly as written, voice and record. A Virtual Analog
voice that sets bits the packed layout does not keep would lose them, so the editor does not write
one (`fm1VaStoredVoice`).

**Needs hardware test:** whether a write to the selected preset changes what plays when the edit
differs in sound, not only in name.

#### Controllers on the MIDI Channel

**Status: Confirmed** for CC 24, 25, 31, and 74, which two runs agreed on; **seen once** for the
other sound-setting CCs, every one as the manual says (FM-1+VA manual, read 2026-10-01 at release
`FM-1_093`; hardware run on `FM-1_093`, 2026-10-04, ledger
[`docs/hardware-runs/fm1-va-controller-2026-10-04-2131.md`](hardware-runs/fm1-va-controller-2026-10-04-2131.md)).
The Envelope switch side effect is still the manual's alone. Hardware tests:
[`docs/fm1-va-controller-tests.md`](fm1-va-controller-tests.md).

From `FM-1_086`, FM-1+VA reads two sets of Control Changes on its **MIDI Channel**, the channel for
notes, not on the FX Channel. Neither exists on stock firmware, where these numbers are untested
and stay out of production traffic. The editor today sends CCs only on the FX channel (CC 0–23,
`sendFm1EffectControl`), so none of these is sent yet.

**Sound settings.** One fixed CC sets one setting of the preset that is playing, as turning its
knob would: the screen shows the new value and the unsaved-changes dot, and SAVE keeps it. The
manual says the change is heard at once on held notes as well as new ones, except that a new FM
Algorithm is heard from the next note.

|  CC | FM preset                            | Virtual Analog preset               |
| --: | ------------------------------------ | ----------------------------------- |
|  24 | ignored                              | Waveform: Sine, Saw, Tri, Square    |
|  25 | ignored                              | Super                               |
|  26 | ignored                              | Detune                              |
|  27 | ignored                              | Drift                               |
|  28 | ignored                              | Sub                                 |
|  29 | ignored                              | Noise                               |
|  30 | ignored                              | PWM                                 |
|  31 | ignored                              | Filter Type: LP12, LP24, BP, HP     |
|  52 | ignored                              | Filter Envelope                     |
|  53 | ignored                              | Filter Decay                        |
|  54 | ignored                              | Filter Shape                        |
|  55 | ignored                              | Filter Velocity                     |
|  56 | ignored                              | Filter Key Tracking: 0, 33, 67, 100 |
|  57 | ignored                              | LFO to Cutoff                       |
|  58 | Algorithm                            | ignored                             |
|  70 | Sustain (Envelope group)             | Sustain (Envelope group)            |
|  71 | Feedback                             | Resonance                           |
|  72 | Release (Envelope group)             | Release (Envelope group)            |
|  73 | Attack (Envelope group)              | Attack (Envelope group)             |
|  74 | Brightness (every modulator's level) | Cutoff                              |
|  75 | Decay (Envelope group)               | Decay (Envelope group)              |
|  76 | LFO Speed                            | LFO Speed                           |
|  77 | LFO Pitch Mod Depth                  | LFO Pitch Mod Depth                 |
|  78 | LFO Delay                            | LFO Delay                           |

- **Scaling. Confirmed for CC 24, 31, and 74; seen once for the rest.** 0 sets a setting's
  lowest value and 127 its highest.
  - A list setting divides the 128 values into four equal bands, 0–31, 32–63, 64–95, and 96–127:
    Waveform Sine, Saw, Tri, Square (CC 24; 31 was not read), Filter Type LP12, LP24, BP, HP
    (CC 31), and Filter Key Tracking 0, 33, 67, 100 (CC 56).
  - A continuous setting shows `round(value × top ÷ 127)`, rounding to nearest: for Super and
    Filter Decay (top 100), 1 → 1, 2 → 2, 32 → 25, 63 and 64 → 50, 65 → 51, 96 → 76, 126 → 99,
    127 → 100. The LFO's Speed, Pitch Mod Depth, and Delay top out at 99 (64 → 50, 127 → 99).
    Sustain's value at 127 was not read; Attack, Decay, and Release reach 100.
  - Cutoff takes the same 0–100 step and shows it as `20 × 1000^(step ÷ 100)` Hz: 0 → 20,
    1 → 21, 2 → 23, 32 → 112, 63 and 64 → 632, 65 → 678, 96 → 3.8k, 126 → 18k, 127 → 20k.
  - Every CC reached the row the table names, showed it on screen, and put the unsaved-changes dot
    after the preset's name on HOME. Where the change can be heard on a held note (Waveform,
    Super, Detune, Sub, Noise, Filter Type, Cutoff, Pitch Mod Depth, and the Envelope group), it
    was heard at once; the filter envelope and modulation settings were not judged by ear.
  - A sweep of 256 values, 0 to 127 and back, on Cutoff and then on Super caused no crackle, stuck
    note, or freeze, and left the screen on the last value sent. Seen once.
- **Channels. Seen once.** The CCs on the FX Channel (2) changed nothing. With GLOBE's MIDI
  Channel set to 1, they changed nothing on channel 3 and worked on channel 1.
- **FM presets. Seen once.** On an FM preset, CC 24, 31, and 57 changed nothing and left no dot;
  CC 74 set Brightness, as the table says.
- **A new Virtual Analog preset. Seen once, rechecked for the Envelope.** Erase Preset to VA
  gives Waveform Saw, Super 0, Detune 50, Drift, Sub, Noise, and PWM 0, Level 99, Mono Off; Filter
  Type LP12, Cutoff 20k, Resonance, Filter Envelope, Filter Decay, Velocity, Key Tracking, and LFO
  to Cutoff 0; LFO Wave Triangle, Speed 35, Pitch Mod Depth, Amp Mod Depth, and Delay 0, Pitch
  Sensitivity 3, Sync Off; and Envelope Off with Attack, Decay, Sustain, and Release 0. Filter
  Shape was not read clearly.
- **Side effect. Confirmed, seen once** (`FM-1_096`, 2026-10-07, V15). The manual says CC 70,
  72, 73, or 75 received while the preset's Envelope is Off switches it On, as holding ENV does.
  CC 73 sent with the Envelope Off switched it On on the screen, and after SAVE record 53 gained
  bit 6 (`40`) beside the Attack in byte 54. The 2026-10-04 run sent CC 73 with the Envelope
  already On, so it did not show this; stepping PRESETS away and back did return the
  switch to the stored preset's setting. Envelope is saved per preset from `FM-1_092` and starts Off, so an
  editor that sends these changes the preset's Envelope switch too.
- **CC 7** is volume, as MASTER sets it, only while the MIDI and FX channels differ; on a shared
  channel it stays Reverb Mix. **Ext Ctrl CC7 Vol** in GLOBE can switch it off. It is not a preset
  setting.
- **Not reachable by CC:** a Virtual Analog preset's Level (0–99) and Mono rows, the LFO's Wave,
  Amp Mod Depth, Pitch Sensitivity, and Sync, the Envelope switch itself, and the FM preset
  Filter group added in `FM-1_092`.

**The FM1's own controls: Dangerous / excluded.** CC 85–88 set KNOB1–4, CC 89–90 turn
ALGORITHM, CC 116–119 step PRESETS and SELECT, and CC 102–115 press the panel buttons (value 64
or more presses, below 64 releases). They act on whatever screen is open: REC and PLAY start the
Sequencer, Erase Preset and Reset Bank are reachable through EDIT and GLO, and holding HOME for
0.8 s switches Bluetooth. Their effect depends on device state the editor cannot read, so
production code must never send CC 85–119 on the note channel. SAVE has no CC (109 is left
unassigned), so no CC writes the FM1's memory.

**Patches sent over a Virtual Analog preset.** From `FM-1_087`, a DX7 patch always arrives as an FM
preset: a single patch sent over a Virtual Analog preset turns it into an FM preset, and a bank
write does that to every Virtual Analog preset in the bank. The manual describes single-voice
dumps, which FM-1+VA stores at once. **The editor's 155 parameter changes are an unsaved edit.
Seen once** (test V7, `FM-1_093`, 2026-10-04): sent over a stored Virtual Analog preset, they
played the DX7 patch, EDIT showed an FM preset with the unsaved-changes dot, and stepping PRESETS
away and back without SAVE brought the stored Virtual Analog preset back.

What these CCs cannot give an editor: the current value of any setting, because the FM1 sends no
controllers back, and a way to store a Virtual Analog preset in the library or on the FM1. Both
need the preset read and write commands above (`docs/feature-backlog.md`, FM-1+VA items 2 and 4).
From 2026-10-04 the library keeps Virtual Analog presets read with `7D 10` or from a backup file,
as the 128 voice bytes the read returns and the record; preset 097's voice bytes from the
2026-10-01 backup pack into exactly the bytes the read returned.

#### Writing a sequencer pattern (from FM-1 Pulses, reviewed 2026-10-07)

FM-1 Pulses (https://github.com/mene311/fm1-pulses, live at https://mene311.github.io/fm1-pulses/)
is mene311's browser sequence generator for FM-1+VA. It writes generated phrases into the FM1's
16 sequencer patterns with `7D 20`, and checks its writes with the raw memory read `7D 11`. Its
repository carries no licence, so all rights stay with its author: record facts from it here, and
never copy its code. Everything below is **Likely**: its author reports it working on their FM1,
and its encoder is said to match `jbschooley/Virtual-FM-1` (`sync/Fm1Seq.cpp`) and a Python
encoder (`fm1pat.py`) byte for byte, but the editor has not sent any of it. The editor may send
neither `7D 20` nor `7D 11` until each has its own approval recorded in AGENTS.md.

**The pattern write.** One message carries eight steps, 177 bytes in all:

```
F0 43 00 7D 20 <pattern> <part> <save> <length> <rate> <tempo lo> <tempo hi> <gate> <swing> <voice>
              8 × ( <step rate> <note count> <note 1–9> <velocity 1–9> )
              <sum> F7
```

| Field                  | Values                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| `pattern`              | 0–15, the FM1's 16 sequencer patterns                                           |
| `part`                 | 0–7, which eight steps the message carries (steps 8·part to 8·part + 7)         |
| `save`                 | 1 stores the pattern; set only on a pattern's last message, 0 on the others     |
| `length`               | 1–64 steps                                                                      |
| `rate`, step rate      | 0–9: 1/1, 1/2, 1/4, 1/4T, 1/8, 1/8T, 1/16, 1/16T, 1/32, 1/32T                   |
| `tempo lo`, `tempo hi` | 30–300 BPM as two seven-bit bytes, low first                                    |
| `gate`                 | 5–100 (%)                                                                       |
| `swing`                | 50–75 (%)                                                                       |
| `voice`                | sent as 0; a pattern has not stored its own voice since `FM-1_060`              |
| note count             | 0–9 notes on the step                                                           |
| notes, velocities      | nine note bytes (0–127), then nine velocity bytes (1–127); unused entries are 0 |

The checksum is `ysum`, but unlike the backup file's preset writes it covers every byte after
`7D`, the command byte `20` included. A pattern takes max(2, ⌈length / 8⌉) messages, so even a pattern of eight steps or fewer
sends two. FM-1 Pulses sends them 60 ms apart and waits up to 2.5 s for a reply to each, which
arrives as the other commands' replies do (`F0 7D <packed> F7`).

**It is refused while the sequencer plays.** The FM1 answers a pattern write with status 3 while
its sequencer is playing; the other statuses read as the preset commands' do (1 a value out of
range, 2 damaged in transit). FM-1 Pulses tells the user to switch SEQ off, not only to press
STOP, and retries a status 3 once after 400 ms, because the FM1 can still be busy with the previous
write. Whether STOP alone is enough was not recorded as tested.

**The raw memory read.** `7D 11 <address: five seven-bit bytes, low first> <length: two seven-bit
bytes, low first> <sum>` reads a block of the FM1's memory, and FM-1 Pulses uses it to read back a
pattern it wrote. It is the read AGENTS.md names as needing its own approval. FM-1 Pulses does not
record the addresses of the patterns.

**The reply's length field.** FM-1 Pulses decodes a reply's data length as unpacked bytes 7 and 8
joined as `byte 7 | (byte 8 << 8)`; its own Bluetooth probe notes that both are seven-bit groups,
so the field is `byte 7 | (byte 8 << 7)` and the first form cannot give a length of 128 or more.
Neither tool uses the value. The editor's preset read checks the reply's status and the preset's
size rather than this field, so a parser that does read it should take the seven-bit form.

**Bluetooth carries notes but not FM-1+VA's commands. Seen once** by mene311 (`FM-1_093` over
Bluetooth from Android Chrome, 2026-10-04, Web Bluetooth to the standard BLE-MIDI service
`03B80E5A-EDE8-4B33-A751-6CE34EC4C700`, characteristic `7772E5DB-3868-4112-A1A9-F2669D106BF3`).
Note On and Off reached the FM1 and its sequencer's notes came back. Three `7D 11` reads with the
sequencer stopped got no reply within 4 s, and a `7D 20` write saved to pattern 15 did not land.
So any Bluetooth connection the editor offers carries notes and controllers only, and preset reads
and writes, and firmware identification until it is tested, stay on USB. Two Bluetooth drops in
the first minute were seen in the same session.

#### FM-1_096 (reviewed 2026-10-06)

`FM-1_096`, released 2026-10-06, adds an 8-Bit engine, a seventh effect (Bitcrush), knob banks with
four knob choices saved in each preset, and a Preset Level on the Mixer knob bank. Baud Girl's
Presets page was replaced by a Device Manager (`/work/FM-1+VA/device-manager`; the old address
redirects there), whose **Back up everything** saves the presets file and a separate patterns file.
Sources: the manual, the modules the Device Manager loads (app build `8405c164d16df69a`), and the
two preset packs it installs. **Likely** throughout, since none of it has been checked on hardware
yet; the 8-Bit marker and record size are also seen in the pack files. The hardware checks are planned in
[`docs/fm1-va-096-tests.md`](fm1-va-096-tests.md).

- **Unchanged.** The preset read and write keep their layout and sizes: a 59-byte record, a
  187-byte read reply, a 231-byte write, no version byte, and no new preset command. The presets
  file is still 128 preset writes, 29,568 bytes, named `fm1-presets-<date>.syx`. **Save as a file**
  saves one preset as one such write, naming its own slot, or slot 0 for a preset kept in the
  browser; the two preset packs are 16 writes each, for presets 097–112 (8-Bit) and 113–128 (VA).
  The editor's presets file import takes any file of 1 to 128 such writes and places each by the
  slot it names. The identity query is the one the editor sends. Effect switches and types stay
  indexed by effect, not by chain position, as the editor reads them.
- **The engine marker.** Record byte 18 is `C3` in every preset of the 8-Bit pack (slots 096–111),
  and the Device Manager reads `C3` as 8-Bit, `5A` as Virtual Analog, and anything else as FM. An
  8-Bit preset keeps its drums, parts, and arpeggios partly in the voice bytes, which are not a DX7
  voice, and partly in record bytes 19–26 and 45–51. Its name stays in the name bytes. The editor
  treats `C3` as 8-Bit (`src/lib/fm1-va-engine.ts`). Since 2026-10-10 the library keeps 8-Bit
  presets exactly as read and writes them back the same way (below, "Hardware run on FM-1_097");
  only an 8-Bit patch replaces an 8-Bit preset on the FM1, and a DX7 voice whose record carries
  `C3`, which a read on `FM-1_096` gave the library before the editor knew the engine, is never
  written.
- **Bitcrush and the order of seven effects. Confirmed, seen once** (FM-1_096, 2026-10-06, preset
  032;
  [`docs/hardware-runs/fm1-va-bitcrush-order-2026-10-06.md`](hardware-runs/fm1-va-bitcrush-order-2026-10-06.md)).
  Byte 5 is Bitcrush's: `80` marks it set, `08` is its switch, and bits 0–2 are its place among the
  seven rows of the Effects list, top first. Its Bits are byte 35 (1–16), Sample Rate byte 41 (0
  for 300 Hz to 100 for 44.1 kHz, Hz = 300 × (44118 / 300)^(v / 100); 73 showed as 11.5k), and Mix
  byte 44 (0–100): the unused type bytes of Delay, Chorus, and Phaser. Without the `80` marker, as
  in an erased preset's `03`, a preset has Bitcrush Off after the Distortion, at Bits 8, Sample
  Rate 72 (about 10.9 kHz), and Mix 100, and the first edit writes the marker and all three. The
  six chain bytes, 27 + 3*k*, list the other six effects top to bottom without Bitcrush: moving
  Bitcrush changed only byte 5, and moving another effect only the chain. The effects are numbered
  0 Filter, 1 Reverb, 2 Delay, 3 Distortion, 4 Chorus, 5 Phaser, and each switch follows its
  effect wherever it sits. Bitcrush has no effect controller on the FX Channel; CC 85–88 reach it
  only through its knob bank, and the editor never sends them. From FM-1_096 the editor's effects
  panel sets Bitcrush in a patch with a record, written into these bytes by
  `fm1VaRecordWithBitcrush`, and the order of all seven, written by `fm1VaRecordWithEffectOrder`;
  both are heard once the patch is written to the FM1.
- **Knob choices** are bits 0–5 of bytes 53 (knobs 1 and 2) and 52 (knobs 3 and 4), with bit 7
  marking them set; Envelope On stays bit 6 of byte 53. The 8-Bit Drums Level is byte 2, stored as
  `80` | (99 − level), and so is an FM or Virtual Analog preset's Preset Level. **Confirmed on
  `FM-1_097`** (below, "Hardware run on FM-1_097"), with the choice names. No MIDI message sets a
  knob choice, and CC 85–88, which turn the knobs, stay excluded. From FM-1_096 the voice editor,
  for a patch with a record, and the Virtual Analog editor offer the four choices, written by
  `fm1VaRecordWithKnobChoices` (`src/lib/fm1-va-knob-choices.ts`), which rewrites only a byte whose
  choices changed and keeps its bit 6; they are heard once the patch is written to the FM1. Which
  editor control each choice turns is **Likely**, from the names: every Virtual Analog choice is
  one of the editor's rows, with Shape taken as the filter envelope's shape, since Filter Env,
  Filter Decay, and Shape follow each other as CC 52–54 do; on FM, Feedback and LFO speed are the
  DX7 parameters of those names, and the other FM choices turn FM-1+VA's own Envelope, Filter, and
  Brightness, which the voice editor does not show. The editor keeps byte 2 as read and does not
  offer the Preset Level yet.
- **Writes can follow each other closely. Confirmed** (FM-1_096, 2026-10-06, nine runs, 161
  writes; [`docs/hardware-runs/fm1-va-write-timing-2026-10-06.md`](hardware-runs/fm1-va-write-timing-2026-10-06.md)).
  The Device Manager reads each write back at once and sends the next 120 ms after that read,
  where the editor listened 1.5 s for a reply the FM1 never sends and spaced writes 3 s apart.
  Written back unchanged through the preset probe, every preset read back byte for byte at every
  gap down to none, across 16 presets and a whole bank of 32, and no crackle was heard. Read
  straight after a write, the FM1 answers in about 200 ms, against about 35 ms once the 1.5 s has
  passed, so it seems to finish storing the write before it answers. From `FM-1_096` the editor
  writes 320 ms apart with no reply wait (the firmware profile's `presetWriteTiming`), about 120 ms
  after the read-back; earlier releases keep the old timing, since none was tested.
- Two new pattern writes, `7D 21` (a pattern's locks) and `7D 22` (whole steps), are writes the
  editor may not send.

**Every field of an 8-Bit preset. Likely** (Baud Girl's Device Manager, `app/editmodel.js`,
`app/chipnames.js`, and `fm1preset.js`, unchanged from app build `8405c164d16df69a` to
`5a1d425123f1fc0a`, read 2026-10-07; and the 8-Bit pack's 16 presets). Its edit model says it reads
each field from the firmware's own row tables (`ui_screens.cpp`), the writes its editor makes, and
where the sound code reads them (`chip.h`, `chip.c`), and takes the names from the firmware's
`chip_names.h`. Tests P1–P7 in [`docs/fm1-va-096-tests.md`](fm1-va-096-tests.md) checked one
field of each kind on `FM-1_098` on 2026-10-16, and every one landed where the table says
([ledger](hardware-runs/fm1-va-8bit-fields-2026-10-16.md)). **Confirmed, seen once**: the Bass
Wave (record 19 bits 0–3); the Key (record 26: the mark, Key Off, and Key C; Accidentals was not
changed); a drum's Pitch (E 0); Drum Decay (E 15, E 36, and E 14); the Lead's User Arpeggio step 1
(record 47 bits 0–4) and Arpeggio 32 for User (record 22); the Lead's Octave (E 76) and Mono
(E 101 bit 0); the Bass Level (E 61); and the Note Engine (below), which the run found. **Confirmed, seen once**
(`FM-1_098`, 2026-10-16, a second run, [ledger](hardware-runs/fm1-va-8bit-pattern-2026-10-16.md)): the
Pattern, with E 78 (the lead's E 120) holding its low three bits and E 77 (E 119) its high two;
bass 1, 8, and 17 and the lead's 8 were set, and the baseline's Gallop is 14. The Lead
Level (E 124) was confirmed on `FM-1_097` (L4). Every other field stays **Likely**, and D2, whether
a DX7 parameter change reaches an 8-Bit preset live, has not been run.

An 8-Bit preset keeps its fields in two places. **E** below is a byte of the 155-byte edit buffer
that the preset write carries and the 128 voice bytes pack: the DX7's own order, operator 6 first,
21 bytes an operator, then the globals from E 126. **Record** is a byte of the 59-byte record. Every
field sits inside the bits the DX7 layout keeps for that byte, so the packed voice holds it, but
none means what the DX7 parameter there means.

| Where                                                        | Field                                     | Stored as                                                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Record 18                                                    | Engine                                    | `C3`                                                                                                                                                         |
| Record 26                                                    | Key, Accidentals                          | Key in bits 0–3 (0 Off, 1 C to 12 B), Accidentals in bit 5 (Borrowed, Leading), and bit 6 set with bits 7 and 4 clear as the mark; without the mark, Key Off |
| E 56 and E 98, bits 0–1                                      | Scale                                     | Low two bits in E 56 and high two in E 98: 0–8, Major, Minor, H. Minor Pract, H. Minor Strict, Dorian, Mixolydian, Phrygian, Lydian, Melodic Minor           |
| E 59, E 80, E 122, bit 0                                     | Voicing, Lead Follows, Arp Sync           | From Key or Close; Off or Bass; Key or Beat                                                                                                                  |
| E 55, E 34, bit 0                                            | Tone, Tuning                              | Raw or Smooth; Exact or Chip                                                                                                                                 |
| E 15, E 36, E 14                                             | Drum Decay                                | Shown 0–99 with 50 the middle; (shown − 50) in seven bits, two's complement: bits 0–2 in E 15, bits 3–5 in E 36, bit 6 in E 14                               |
| E _b_ to _b_ + 4                                             | A drum's Pitch, Sweep, Decay, Level, Snap | Drum _d_ (0–11, keys F0 to E1) at _b_ = 0, 5, 21, 26, 42, 47, 63, 68, 84, 89, 105, 110: two drums an operator. Sweep 1–99 with 50 the middle, the rest 0–99  |
| E 20, 18, 41, 39, 62, 60, 83, 81, 104, 102, 125, 123         | A drum's Wave                             | 0–14, the 15 waves below, drum 0 first                                                                                                                       |
| E 11, 12, 32, 33, 53, 54, 74, 75, 95, 96, 116, 117, bits 0–1 | A drum's Choke                            | Off, A, B, C, drum 0 first                                                                                                                                   |
| Record 2                                                     | Drums Level                               | `80` \| (99 − level); without bit 7, 99                                                                                                                      |
| E 137–143, E 144, E 145–154                                  | LFO, Transpose, name                      | As on an FM preset                                                                                                                                           |

The bass and the lead each have the same fields, bass first:

| Field                           | Bass                         | Lead                           | Stored as                                                                                                                 |
| ------------------------------- | ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Wave                            | Record 19, bits 0–3          | Record 21, bits 0–3            | 0–14: Pulse 12.5, Pulse 25, Pulse 50, Pulse 75, Triangle, Noise, Metal, then eight GB waves                               |
| Duty Sequence                   | Record 19, bits 4–7          | Record 21, bits 4–7            | 0–14, 0 Off; heard only while Wave is a Pulse, though the FM1 does not dim it                                             |
| Arpeggio                        | Record 20                    | Record 22                      | 0 Off, 1–31 built in, 32 User; shown only while Key is Off, and kept while it is set                                      |
| Chord                           | E 57                         | E 99                           | 0–6 (Triad to Power); shown only while a Key is set                                                                       |
| Pattern                         | E 78 bits 0–2, E 77 bits 0–1 | E 120 bits 0–2, E 119 bits 0–1 | 0–17 (Off to User); the E 78 / E 120 part holds the low bits, so Pattern = E 78 + 8 × E 77; shown only while a Key is set |
| User Arpeggio                   | Record 23, 24, 25, 45, 46    | Record 47–51                   | Eight steps of five bits, least significant first across the five bytes; −12 to +18 stored + 12, and 31 is End            |
| Arp Speed                       | E 10                         | E 73                           | 0–6: 1/8, 1/8T, 1/16, 1/16T, 1/32, 1/32T, 1/64T                                                                           |
| Attack, Decay, Sustain, Release | E 16, 19, 31, 37             | E 79, 82, 94, 100              | 0–99                                                                                                                      |
| Vibrato, Glide                  | E 40, 52                     | E 103, 115                     | 0–99                                                                                                                      |
| Sweep                           | E 58                         | E 121                          | 1–99, 50 the middle                                                                                                       |
| Octave                          | E 13, bits 0–2               | E 76, bits 0–2                 | −3 to +4, stored + 3                                                                                                      |
| Level                           | E 61                         | E 124                          | 0–99                                                                                                                      |
| Mono                            | E 38, bit 0                  | E 101, bit 0                   | Off or On                                                                                                                 |
| Note Engine                     | E 35, bit 0                  | E 35, bit 1                    | Auto-Arp or Auto-Chord; in Auto-Chord the FM1 dims the part's Arp Speed, Pattern, and User Arpeggio and keeps them        |

Record bytes 19–26 and 45–51 therefore mean one thing on a Virtual Analog preset (its oscillator
and filter, above) and another on an 8-Bit one, so code that reads them checks the engine first.
The Envelope, the seven effects, Bitcrush, and the knobs keep the record bytes they have on the
other engines. E 35 holds the Note Engine in bits 0–1, from Version 98, and the preset reads no
other bit of it; it reads none of E 17, 97, 118, 126–133, 134, 135, or 136 (operators' oscillator
mode, the pitch envelope, algorithm, feedback, and oscillator sync). Every pack preset holds the
same values there, E 35 `00` among them. The first SAVE of a pack preset on the FM1 also sets
record 30 from `00` to `01`, putting Reverb at chain position 1, on `FM-1_097` and `FM-1_098`
alike.

The Device Manager marks some names as provisional in the firmware, not yet agreed: the Arp Speed
names, the list of built-in Arpeggios, the Duty Sequence names, and the twelve sound effects. A
later release may rename them without moving a byte.

An 8-Bit preset plays four parts on fixed notes: drums on MIDI notes 17–28, sound effects on 29–40,
the bass on 41–76, and the lead on 77–112, with keys above the lead folded down by octaves. Each
range moves with Transpose (E 144) less 24.

**Checked offline** (2026-10-07). The 16 presets of the 8-Bit pack (`fm1-8bit-presets.syx`,
NES ROCK to BELLTONE) pack to 128 voice bytes and unpack to the same edit buffer,
`fm1VaStoredVoice` leaves them as they are, and `makeFm1VaPresetWrite` rebuilds each pack message
byte for byte from its voice and record, so the library can hold and write an 8-Bit preset the way
it holds a Virtual Analog one. Every byte is seven-bit and inside its DX7 parameter's range.
Decoded through the table, the presets agree with their names: GB POP and LOFI GB use the GB waves,
USER ARP's lead plays the User Arpeggio with steps of its own, PLUCKS's lead runs Duty Sequence 7
(Pluck 50>25), WOBBLE's runs 6 (Slow Wobble), and BELLTONE's lead is GB Bell.

**What can be heard before a write.** The manual's controller table gives an 8-Bit preset only the
Envelope (CC 70, 72, 73, 75) and the LFO (CC 76–78); CC 24–31, 52–57, 58, 71, and 74 do nothing on
it. The Device Manager plays its 8-Bit edits through its copy of the sound engine on the computer,
not on the FM1. So every other field is heard only once the preset is written. Whether a single DX7
parameter change reaches an 8-Bit preset live, since every field lies inside a DX7 parameter's
range, is not known: 155 of them turned a Virtual Analog preset into an unsaved FM edit (V7, above),
and test D2 checks one.

**A new 8-Bit preset.** The Device Manager's (`fm1preset.js` `newPreset`) was read off the
firmware running on an emulator, not an FM1: its edit buffer is the firmware's kit, bass, and lead,
record bytes 19–22 are `04 00 01 00` (the bass a Triangle, the lead Pulse 25), and both User
Arpeggios are all End (`FF` in 23–25 and 45–51). It says Erase Preset leaves record byte 26 as it
was apart from the Key. **Erase patch…** takes its blanks only from an FM1, so 8-Bit waits for M3.

#### FM-1_097 beta (manual read 2026-10-07)

Version 97, a beta announced on 2026-10-07, adds Bluetooth clock sync between two FM-1s, MIDI
Clock Out (`F8`, with Start, Stop, and Continue, over USB and Bluetooth when set to Always or
Playing), and the Flow grid sequencer again. Its manual documents no new SysEx message. Two of its
statements matter to the editor:

- **No way to load a Virtual Analog preset without storing it. Likely.** The Device Manager's
  Studio plays edits through a copy of the firmware's sound engine running on the computer, and the
  FM1 plays nothing until **Send** stores the preset with `7D 04`. The firmware's own editor works
  around the gap rather than using a hidden message, so a Virtual Analog patch the FM1 has not
  stored is heard only through the sound-setting controllers, and only over a stored Virtual Analog
  preset. Level, Mono, the LFO's Wave, Amp Mod Depth, Pitch Sensitivity, and Sync, and the Envelope
  switch have no controller. This is why the editor cannot play an erased or copied Virtual Analog
  patch as shown, and why **Erase patch…** waits.
- **A single DX7 patch may now be an unsaved edit. Needs hardware test.** The manual says a
  single patch "replaces the preset you have selected at once, and nothing is written to memory
  until you press SAVE". On `FM-1_089` a single-voice dump stored the preset at once (above, "The
  editor on FM-1+VA"), which is why only M-VAVE's firmware gets one (the firmware profile's
  `singleVoiceDumps`). If `FM-1_096` or later holds it as an unsaved edit, the editor could send an
  FM patch to FM-1+VA as one dump rather than 155 parameter changes. Test D1 in
  [`docs/fm1-va-096-tests.md`](fm1-va-096-tests.md) checks it; until then the editor keeps the
  parameter changes.

Compared section by section with the Version 96 manual (2026-10-07), nothing else changes for the
editor: the 8-Bit engine, Erase Preset, the controller table, the preset read and write, and the
packs read as they did. The Device Manager build of the same day, `5a1d425123f1fc0a`, changes only
wording, such as "Version 96" for `FM-1_096`. `FM-1_097` is FM-1+VA to `classifyFm1Firmware`, and
every capability the editor gates by release starts at a release and runs on, so 97 gets what 96
gets. **Erase patch…** (backlog item FM-1+VA 6) is built the same way, so on 97 it would put in the
blank presets captured on `FM-1_096`. 97's manual describes Erase Preset as 96's does; M3 run on 97
would confirm the blanks match. With Clock Out on, the FM1 sends the editor
`F8` 24 times a beat, which `isHighRateMidiMessage` already keeps out of the MIDI log and the
activity light; Start and Stop are logged.

#### Hardware run on FM-1_097 (2026-10-10)

`FM-1_097` was released after the beta. The FM-1_096 test plan ([`fm1-va-096-tests.md`](fm1-va-096-tests.md))
was run on it on 2026-10-10 over USB, through the development build's preset probe, with preset
032 (`SYN PAD 8`) as the FM test preset. Ledger and captures:
[`hardware-runs/fm1-va-097-tests-2026-10-10.md`](hardware-runs/fm1-va-097-tests-2026-10-10.md).
Run: F1, F2, F4, F5, M1, M3, M4, K1–K3, L1–L4, E1, E2. Not run: F3 and M2 (no backup was taken
after placing the 8-Bit pack), §4b, §5, D1, D2, and the clean-up. Everything below is
**Confirmed, seen once**, on `FM-1_097`.

- **The editor on FM-1_097.** It is identified as Baud Girl's firmware (F1); reading all 128
  presets marks Baud Girl's 8-Bit pack, in 097–112, and the VA pack, in 113–128 (F2); a write from a
  bank of DX7 patches over FM1 bank D writes nothing and keeps all 32 (F4); and clicking a slot over
  an 8-Bit preset leaves an unsaved FM edit that changing preset throws away (F5).
- **Reads.** Each read gives a 59-byte record and 128 voice bytes; byte 18 was `C3` for NES ROCK,
  `5A` for SUPERSAW, and `03` for SYN PAD 8 (M1).
- **Erase Preset.** Each engine's blank is named `INIT`, not `VOICE nn`, on any slot (M3; preset
  031's VA blank matched 032's byte for byte):
  - **FM:** byte 18 `A5`, the value FM-1+VA's web code expects, where the backups' FM presets hold
    `03`. The voice is a DX7 init voice with only OP1 at 99. Bytes 0–17 become the effect settings'
    defaults (`6B 03 03 1E 1E 03 1E 1E 19 1E 37 46 1E 19 28 1E 32 14`: Cutoff 107, Resonance 3,
    Reverb 30/30, Delay 30/25/30, Distortion 55/70/30, Chorus 25/40/30, Phaser 50/20/20), every
    effect is Off and the chain in order. Bytes 19–26 and 45–51, which FM does not read, keep
    whatever the preset held, so an FM erase is not one fixed set of bytes.
  - **8-Bit:** byte 18 `C3`, 19–22 `04 00 01 00`, 23–25 and 45–51 `FF`, byte 26 as it was, and the
    firmware's kit, bass, and lead: the Device Manager's emulator blank in every byte the notes
    give.
  - **VA:** byte 18 `5A`, 19–26 `02 00 32 00 E4 80 80 80`, 45–51 `80`, and a DX7 init voice with
    OP6's Output Level (the VA Level) at 78 as well as OP1 at 99. The 2026-10-01 erase on an earlier
    release named it `VOICE 97` with OP6 at 99.
- **8-Bit presets survive the preset write** (M4): NES ROCK written back renamed read back with
  every other byte the same, and restored from its first read it read back byte for byte, and
  played as before. FM-1+VA sent no reply to either write.
- **Baud Girl's 8-Bit pack names Filter twice in its effect chain** (bytes 27 and 30 both `00`, no
  Reverb). SAVE on the FM1 corrects byte 30 to `01`. A write of the pack's bytes stores them as they
  are.
- **Knob choices** (K1–K3): setting one knob writes both fields of its byte and sets bit 7, the same
  on every engine. An unset byte, bit 7 clear, holds the defaults, which the written fields put at
  Knob 2 = 1 and Knob 4 = 4. FM-1+VA's manual lists the four a new preset starts with: Brightness,
  Feedback, Attack, and Release (0, 1, 2, 4) on FM, and choices 0–3 on Virtual Analog and 8-Bit,
  which agrees with every field written. The choices, codes 0–7:
  - FM: Brightness, Feedback, Attack, Decay, Release, Vibrato, LFO speed, Cutoff
  - Virtual Analog: Cutoff, Resonance, Filter Env, Filter Decay, Shape, Super, Detune, LFO to Cutoff
  - 8-Bit: Drum Decay, Bass Arpeggio, Lead Arpeggio, Lead Decay, Lead Arp Speed, Lead Vibrato, Lead
    Release, Bass Decay
- **Levels** (L1–L4): the Mixer knob bank's Preset Level, on FM and Virtual Analog presets, is
  record byte 2 as `80` | (99 − level), so 50 is `B1` and 0 is `E3`; an unmarked `03` or `00` reads
  as 99. The 8-Bit Drums Level is the same byte in the same form. The VA Level is packed voice byte
  14, OP6's Output Level. The 8-Bit Bass and Lead Levels are packed voice bytes 50 and 101
  (edit-buffer bytes 61 and 124), stored as the level shown. The library keeps byte 2 as read, so a
  patch carries its Preset Level through every write.
- **Envelope and Mono** (E1, E2): Envelope On is bit 6 of byte 53, and Decay, Sustain, and Release
  are bytes 55, 56, and 57; Mono is byte 58, `00` to `01`. The Virtual Analog editor already maps
  them this way.

### FM-1_098 (Version 98 beta)

Baud Girl's release notes, 2026-10-10. **Likely** (from the notes alone; not yet run on an FM1):

- **Sustain 0.** A held note at Sustain 0 now fades to silence on FM and Virtual Analog presets.
  Before 98 the FM1 held it at a tenth of its level with the Envelope On. The Virtual Analog
  editor's Envelope help says "at 0 a held note is short", which is true on 98 and not on earlier
  releases, where it is quiet but held. Worth rewording in every locale if it is ever edited for
  another reason.
- **No new SysEx message** is named, so the editor sends nothing new. The Note Engine's settings
  belong to the FM1, not to a preset, and no approved command reaches them, except the 8-Bit bass
  and lead's own Note Engine row, which the preset keeps in E 35 (below).
- Still to do on hardware: the identity, read-all, and write-back tests on `FM-1_098`. The 8-Bit
  Note Engine row was mapped on `FM-1_098` on 2026-10-16: E 35, bit 0 for the bass and bit 1 for
  the lead (see "Every field of an 8-Bit preset").

### FM-1_101 (manual read 2026-10-13)

Version 101, released 2026-10-12. Read from the manual's release notes and sections (the manual
lists 97 and then 101, so 99 and 100 have no notes of their own). **Likely**, not yet run on an
FM1:

- **No new SysEx message, controller, or record change.** The manual's only SysEx section is DX7
  patch and bank loading, no `F0 43 00 7D` command appears in what was read, and CC 85–88 still set
  the knob bank's four knobs, which the editor never sends. `FM-1_101` is FM-1+VA to
  `classifyFm1Firmware`, so it gets what 97 gets.
- **Key latency.** Key events outrank screen drawing, and the key scan runs every 2 ms, not 20 ms,
  registering a press on first detection. Key-to-note-on is under 2 ms; with HOME showing it
  averaged 28 ms on the FM-1 and 42 ms on the SMK-37. Notes sent over MIDI are not affected by the
  scan, and the preset write's pacing was measured on 96 and 97 (the firmware profile's
  `presetWriteTiming`); a rerun on 101 would show whether it moves.
- **Effects CPU.** Reverb is about 35% lighter and Distortion about 20%, with the same audio.
- **Display.** The HOME oscilloscope redraws only when the waveform changes, at most 10 Hz, and the
  Preset knob bank labels its four knobs with text.
- **Sustain 0** (manual 4.5.4). With the Envelope On, Sustain 0 fades a held note to silence; any
  other value holds it while the key is down. This agrees with 98's note above.
- **Note Engine** (manual 8). ARP switches it; the modes are Arp, Auto-Arp, and Auto-Chord. Its
  settings belong to the whole FM1, saved with its other settings by SAVE, and are not in a
  preset. On an 8-Bit preset, drum and sound-effect keys stay out of Auto-Arp and Auto-Chord, and
  bass and lead keys take its chord only when their part plays none of its own. The manual does not
  say whether MIDI reaches its settings. With MIDI In on (the default) the arpeggiator takes
  notes from a MIDI keyboard as it takes the FM1's own keys.
- **A preset for each pattern** (manual 9.15.2). Each pattern's Preset reads Off until set, and
  every pattern reads Off after installing 98. Part of the pattern format backlog item 7 has yet
  to map.
- **Factory presets** (manual 12.4.2). The Device Manager's **Factory** lists the 128 presets of
  M-VAVE's original firmware at their original numbers (backlog item 11).
- **Preset loading during a fast turn** (manual 3.1.2). Turning PRESETS slowly loads each preset at
  once; turned quickly, the number and name follow the knob and the FM1 loads the preset once the
  knob has been still for 150 ms. This describes the front panel. The manual does not say that a
  Program Change over MIDI waits, so the editor's slot click (Program Change, then the voice and
  effects) is unchanged; a hardware run would show whether a quick run of Program Changes loads
  each preset.
- **Device Manager limits** (manual 12.14). It has no control for a step's Ratchet, Accent, or
  Tie & Slide, which are set on the FM1.
- **Whole manual read.** Every part of the page was read on 2026-10-13. Nothing else in it, the
  troubleshooting list and glossary included, names a SysEx command, a record byte, or a
  Program Change or Bank Select change.
- Still to do on hardware: the identity, read-all, and write-back tests (F1, M4) and the preset
  write timing on `FM-1_101`.

### Felucca replacement firmware

Site, source, installer, editor, and recovery tool:

- https://hugelton.github.io/Felucca/ (repository https://github.com/hugelton/Felucca, releases
  https://github.com/hugelton/Felucca/releases)
- Installer https://hugelton.github.io/Felucca/webapp/installer/ and web editor
  https://hugelton.github.io/Felucca/webapp/editor/
- https://github.com/kurogedelic/FM-1-transporter
- https://synthanatomy.com/2026/10/hugelton-instruments-felucca-custom-m-vave-fm-1-firmware-turns-it-into-a-multi-engine-synth.html

Felucca is Leo Kuroshita's (Hügelton Instruments) replacement firmware for the FM1, under
GPL-3.0-only. 0.4-beta (2026-10-02) shipped only a built package; 0.8-beta (2026-10-03) was the
first source release, and 0.9-beta (2026-10-03) the last beta. 1.0 followed on 2026-10-05, and the
latest tag is v1.5.1 (2026-10-10). The README describes thirteen engines, a per-track SLICER insert,
four synth tracks, a sequencer per track, 32 user preset slots, project slots, MIDI Program Change
since 1.5.1, and MIDI LEARN since 1.5, edited by its own web editor (`README.md`). The editor's
development has moved to https://github.com/hugelton/Felucca-WebApp. Users moving to it from
FM-1+VA are told to go back to stock firmware first (`docs/switching-firmware.md`).

The notes below were checked on 2026-10-12 against the v1.5.1 tag, commit
`a4d7ca2e5d52a4c35e2468401f00d883cadbda03` (2026-10-10), and `main`, commit
`ef1f561b6b105f20350f6b1eac0dc0789a357f00` (2026-10-11, "Remove sponsorship links", the one commit
after the tag), mainly `firmware/src/felucca.c`, `usb.c`, `seq.c`, `midi_control.c`, `midi_uart.c`,
`ota.c`, `console.c`, `tools/build.py`, `README.md`, and `web/EDITOR_PROTOCOL.md`. The previous
check read 0.9-beta, commit `e5a908d0383848cd85149de6dc35150c792231fc` (2026-10-03), and `main`
at `1e838e17e170b20ff09b9660c9a7171aadfc5dca`. They were first written from 0.8-beta (commit
`334477d`). Where marked, they also rest on a static reading of the 0.4-beta package. Reading
source counts as analysis, so nothing here is **Confirmed**: no Felucca FM1 has been run with this
editor. The GitHub releases API could not be read in this check, so release dates are the tags'.

**Identity. Likely.** Felucca answers the identity query (§6.3) outside an update with its package
identity (`ota_reply_identity`, `ota.c`). Release builds name it `FM-1_9XY` for release X.Y
(`build.py --release`, one digit each), so 0.8-beta is `FM-1_908`, 0.9-beta `FM-1_909`, 1.0
`FM-1_910`, and 1.4 `FM-1_914`; a development build is `FM-1_900`. `build.py` now accepts `X.Y`,
`X.Y.Z`, `X.Y.Z.W`, or `X.Y-suffix` and keeps only the first two digits, so 1.1.5 is `FM-1_911` and
v1.5.1 is `FM-1_915`, the same as 1.5. The editor shows both as 1.5. The whole 900s range is
therefore Felucca's while its major version stays below 10; a 10.0 would be refused by `build.py`
(one digit each). The editor counted Felucca as FM-1+VA until 2026-10-02 and left it unidentified
until 2026-10-03; it now names the 900s as Felucca (`classifyFm1Firmware`) and shows release X.Y.

**USB identity and port. Likely.** A composite device, vendor `1209` (pid.codes), product
`0001`, manufacturer "Hügelton Instruments", product "Felucca", with Audio Control, MIDI
Streaming, and a CDC serial port. Its protocol notes say the MIDI port is named "Felucca", so
`resolveMidiPortSelection` picks it only as the first port without an instrument name, not by
preference. Which name each operating system shows has not been seen.

**What it does with the editor's MIDI. Likely: notes and a fixed set of controllers; no SysEx.**
This changed after 0.9: 0.8 and 0.9 acted only on Note On and Note Off. v1.5.1 acts on more
(`seq.c` hands each queued channel message to `midi_event`, in `midi_control.c`).

- **Notes.** Note On and Note Off. With the default input routing (`ROUT`, `CH1-4`) channels 1–4
  play tracks 1–4 and channels 5–16 are ignored; `SEL` plays the selected track from every channel,
  and further settings map channels 5–8, 9–12, or 13–16 to the four tracks (`seq.c`). The editor's
  audition notes sound on whichever track its note channel reaches, if any.
- **Pitch bend, channel aftertouch, and Program Change.** Pitch bend (range from RPN 0, default 2
  semitones), channel pressure, and Program Change are acted on (`midi_control.c`). Program Change
  loads a sound on the track the channel plays; it is new in 1.5.1 (README, `mpc_io`). It is
  Felucca's own program numbering, not the FM1's A–D bank slots, so the editor's slot click sends
  a Program Change that now loads whichever Felucca sound has that number.
- **Control Change.** CC 1 (mod wheel), 6 and 38 (RPN data), 11, 64 (sustain), 98–101 (RPN/NRPN
  selection), 120, 121, and 123 are handled as channel controls. A standard map sets parameters of
  the track the channel plays: CC 5 glide, 7 level, 10 pan, 71 and 74 the engine's resonance and
  cutoff, 72 release, 73 attack, 75 decay, 91 reverb, 93 chorus, and 94 delay (`MIDI_CC_MAP`). MIDI
  LEARN (1.5) can assign up to 16 other CCs to parameters, and a learned CC replaces the map's
  meaning. None of these are the stock FM1's effect controllers, so the editor's effect Control
  Changes can move Felucca parameters if they use a number in the map and their channel is routed.
  The Control Change numbers and channel the editor uses for FM1 effects are not compared here.
- **MIDI clock.** Clock, Start, Continue, and Stop are followed when the clock source is set to
  MIDI (`seq.c`, `midi_clock.c`). The editor sends none.
- **TRS MIDI in.** `FELUCCA_UART` now defaults to 1 (`felucca.c`; `BUILDING.md` lists it as 1), so
  released builds read the TRS jack as well as USB. `midi_uart.c` drops SysEx there. This reverses
  the earlier reading, when it defaulted to 0.
- **DX7 SysEx.** Unchanged. The USB SysEx assembler keeps one frame of at most 640 bytes
  (`usb.c`, `sx_frame`). A frame goes to the web-editor parser, which takes only `F0 7D 46 4C …`,
  or to the updater parser, which takes only pack7-encoded `00 59 …` frames with a valid checksum;
  anything else is discarded. No Yamaha (`43`) handling exists in the firmware: a search of
  `firmware/src/` finds no DX7 dump header. A single-voice dump (163 bytes) and each of the 155
  parameter changes are discarded; a 32-voice dump (4104 bytes) is too long and dropped while it
  arrives. So Felucca still ignores every patch or bank the editor sends, and none of it can
  overwrite a Felucca preset. Its FM6 engine does import `.syx` voices, but only through its web
  editor's `F0 7D 46 4C` protocol (`fm6_vbank.c`, `eng_fm6.c`, `EDITOR_PROTOCOL.md`), not as DX7
  SysEx.
- **MIDI out.** It sends from its own playing, queued from the audio interrupt, which the
  editor's MIDI log would show.

**Felucca's own editor protocol. Likely; not used by this editor.** `F0 7D 46 4C <cmd> … F7` (`7D`
is the non-commercial ID, `46 4C` is "FL"), documented in `web/EDITOR_PROTOCOL.md`: one request at a
time, one reply each, values as 14-bit offset pairs. Commands 1–15 read and set parameters, describe
them, read and write sequencer steps, apply presets, load and save projects, list preset names, and
upload samples; 16–26 (v2) read and write the 32 user presets and push live changes while watched;
27–30 (v3) address the four tracks; 31–32 (v4, asked for with bit 1 of `WATCH`) get and set a
parameter of any track and push mixer changes of unselected tracks. Later versions add the drum
grid (v5), song chain (v6), chance, motion, MIDI clock, and a full backup, commands 65–67 (v7),
FM6 patches and a voice bank (68–77), MENU settings (72–73), and MIDI LEARN (78–79, 1.5); the
document now runs to command 79. `PROJECT` save, the sample
commands, and `UP_PUT`, `UP_STORE`, and `UP_ERASE` write Felucca's own storage in flash. Its
parameters are Felucca's engines, not DX7 voices, so a DX7 library has nothing to send there.
Supporting Felucca would be a separate feature with its own approval, like FM-1+VA's preset read;
until then the editor sends none of it.

**Update and boot-loader messages. Dangerous / excluded.**

- `F0 22 24 35 7F F7` starts an M-UPGRADE-style update; the installer then answers the device's
  `00 59 30` read requests until the loader has written the image. That is the update path section
  9 excludes, now published in `web/fm1ota.js` and `tools/fm1_install.py`.
- `F0 22 24 35 7D F7`, which 0.4's package held with no known purpose, is Felucca's "soft key":
  on receipt it detaches USB and enters the chip's own UBOOT boot loader (`usb.c`, `main.c`).
- The CDC serial console offers `status`, `dbg`, `inp`, `crash`, `params`, `memr`, `flr`, and
  `uboot yes`, which enters the same boot loader (`console.c`; `inp` is new since 0.9). The editor
  uses Web MIDI only.
- v1.5.1 keeps the same two `F0 22 24 35` keys (`7D` and `7F`, `usb.c`) and the `00 59` frames;
  `midi_uart.c` states that SysEx from the DIN jack cannot reach the boot loader. The installer
  (`web/fm1ota.js`, `web/index_pkg.html`) now also has a **Return to official V15** flow that reads
  the user's own unmodified `FM-1.fwsc` and saves a complete backup first, using the `BACKUP_*`
  editor commands. No new key was found.

The editor must never send either `F0 22 24 35` message, answer a `00 59` read request, or use the
serial console. Going back to stock needs M-VAVE's M-UPGRADE and V15; a failed install needs
FM-1-transporter, an RP2040 wired to the FM1's USB lines that reads and writes the whole 1 MiB
flash.

**From the 0.4-beta package. Likely** (static reading of `felucca-0.4-beta.fwsc`, SHA-256
`2b8496bdb76837389ead770a015ba86cf64378f944f7266441b47e148df2ecee`, 2026-10-02: strings,
descriptors, and byte patterns only). It held `FM-1_904`, `ota-FM-1_015` and `FELUCCA-LOADER-1`
(the loader identities), no DX7 dump header (`43 0n 00 01 1B`, `43 0n 09 20 00`), no FM-1+VA
`43 00 7D` command, and presets named for its own engines, such as SAW LEAD, E.PIANO, and GLASS.

What this changes: the editor names Felucca but sends to it as before. It gets the cautious
parameter changes an unidentified firmware gets, which it ignores harmlessly. A Felucca FM1 can
still use the editor's keyboard and audition notes, but sending a patch or bank, selecting a slot's
preset, and the effect controls do nothing there, so the firmware badge, the firmware setting, and
the bank destination instructions say so rather than appearing to reach it.

Open questions:

1. What does the "Felucca" MIDI port appear as on macOS, Windows, and Linux?
2. Does a Felucca FM1 confirm on hardware that DX7 SysEx, Control Change, and Program Change have
   no effect?
3. Will a release from 10.0 on keep an identity in the 900s? `build.py` allows one digit for the
   major version, so it would have to change scheme first.
4. Does Felucca's Program Change numbering line up with anything the editor means by a slot, and do
   the editor's effect Control Change numbers collide with Felucca's CC map? Both need a hardware
   run before the editor's "ignores Program Change and the effect controllers" wording is changed.
5. What does the web installer's start page show today? https://hugelton.github.io/Felucca/ is
   the README's installer link; the `webapp/installer/` address could not be fetched in this check.

### M-VAVE's Official Open firmware

M-VAVE published the preview below on 2026-10-14 and released the firmware, as V12, with its
source on 2026-10-16. The preview notes come first, as read; [the released source](#official-open-released-source-read-2026-10-16)
answers their open questions. V13 followed on 2026-10-17; what it changed is in
[Official Open V13](#official-open-v13-read-2026-10-18).

#### The withdrawn preview (read 2026-10-14)

Source, the only one:

- https://web.archive.org/web/20261014153742/https://open.m-vave.com/fm1-workbench, an archived
  copy of a page M-VAVE published at `open.m-vave.com` and took down again soon after. Its source
  link, https://github.com/m-vave/official_fm1_open, did not resolve on 2026-10-14.

Everything below comes from that page's text, read in the archive on 2026-10-14. Nothing has been
released, run, or checked on an FM1, so every claim here is at most **Likely**, and any of it may
change before release. The page's scripts partly failed in the archive (`atob` errors), so the
simulator and its factory projects could not be inspected.

**What it is.** "FM1 Workbench" is M-VAVE's web tool for a firmware the page calls **Official
Open**: an editor, a WebAssembly simulator of the device, a project and sample librarian, and a
firmware installer in one page, in English and Simplified Chinese, for desktop Chrome or Edge. The
page header shows **V10**. It is not the community project of the same name
(https://github.com/thegiantsnail/fm1-workbench-public, a web app, Android app, plugin, and MCP
server), which the awesome-fm-1 list carries.

**The firmware is a groovebox, not a DX7.** Eight tracks of 16, 32, 48, or 64 steps, each playing
one of six engines: DX7 (FM), 303, 808, PSG, PLUCK, and SAMPLER. It holds 16 read-only factory
projects and 16 USER project slots, and one 8-slot sample bank of 456 KiB (about 20.45 s) that
every project shares. Each track has its own arpeggiator, LFO, and reverb and delay sends. The
application is GPL-3.0-only. Its board code (GPIO, input, LCD) and firmware packager come from
Felucca, the 303 and 808 from Charles Vestal's FM1 X0X, the PSG from emu2149, and PLUCK from
Soundpipe; the device SDK is a binary archive whose GPL compatibility the page says is "under
review".

**Files.** The page names four:

| Extension | Holds                                                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| `.fm1`    | A whole eight-track project: engines, parameters, levels, loop lengths, steps. No audio. |
| `.fm1t`   | One track's engine, sound parameters, and level, without steps.                          |
| `.fm1s`   | The whole 8-slot sample bank.                                                            |
| `.syx`    | A DX7 single voice or 32-voice bank, imported into a track set to DX7.                   |

No layout is given for `.fm1`, `.fm1t`, or `.fm1s`.

**MIDI.** Tracks 1–7 receive on channels 1–7 and track 8 on channel 10; channels 8, 9, and 11–16
are ignored. Every engine takes Note On and Off, CC 7 (volume), 10 (pan), 11 (expression), 91
(reverb send), and 120, 121, and 123. FM, 303, PSG, and Pluck take pitch bend (±2 semitones) and
CC 64; FM also takes channel pressure and CC 2 and 4. CC 1 is FM vibrato, 303 EnvMod, and track
LFO depth elsewhere. 303 takes CC 5, 71, 74, and 75; PSG CC 74 and 72; Pluck CC 74, 75, and 72.
Program Change picks FM sounds 0–15, 303 saw or square (0, 1), and PSG modes (0–3); other engines
ignore it. It follows MIDI clock, Start, Continue, Stop, Song Position, and a subset of MMC. The
page lists RPN, NRPN, Bank Select, and unlisted controllers as ignored, and says nothing about
DX7 parameter-change or voice-dump SysEx over MIDI: a `.syx` reaches a track through the
Workbench.

**Transfers.** "Save to device" writes a project to a chosen USER slot and reads it back to verify
it; "Read device project" brings the device's workspace into the browser. A sample-bank write
replaces all eight slots and is verified by read-back. Nothing is read or synced on connect. The
commands are not documented on the page.

**Firmware install.** The Workbench carries its firmware and the original M-VAVE V15 as a recovery
image, and "External firmware files are not supported". It installs over what the page calls the "USB-MIDI
update protocol", after a device handshake and an identity reply; that is presumably M-VAVE's
`00 32` family, which §6.3 keeps **Dangerous / excluded** for this editor. Three paths:

- **Update** within Official Open keeps project slots and the sample bank when the storage layout
  is unchanged.
- **Restore original V15** installs V15 and "replaces all four banks with 128 factory voices"; an
  FM1 already on V15 only has its voices restored. Official Open's projects and samples do not work
  there.
- **Force flash** migrates from another firmware, its example being `FM-1_015`, and "may erase
  projects and samples". Firmware without the USB-MIDI update protocol needs its own recovery tool.

The page also mentions an "Open build-hash read-back" that V15 lacks.

The preview's own open questions were what Official Open answers to the identity query, whether it
acts on DX7 SysEx sent over MIDI, whether `.fm1t` and `.fm1` would be documented, and whether the
source would reappear. The released source answers all four.

#### Official Open: released source (read 2026-10-16)

Source: https://github.com/m-vave/fm1_open, commit `5d3eac2573dbd054254fabda6fde099adc594348`
(2026-10-16), and the Workbench at https://open.m-vave.com/fm1-workbench. The application under
`app/` and `web/` is GPL-3.0-only with a linking exception; the device SDK under `sdk/` is a binary
archive with its JavaScript tools in source. Paths and lines below are in that commit. Everything is
read from source, not run on an FM1, so every claim is **Likely** until a hardware run confirms it;
the identity reply below is the first that has been.

**Identity.** `app/version.h:5–6` names the release `V12` and its update product `FM-1_8000012`.
The Workbench's updater accepts an Open identity with
`/^(FM1_OFFICIAL_OPEN|FM1_COMMUNITY_\d+|FM-1_8\d{6})$/` (`sdk/WebUpdate.js:58`): the release
builds, a community build, and a development build's fixed name. It asks with `query(17)`
(`sdk/WebUpdate.js:252`), whose frame is byte for byte the editor's `fm1IdentityQuery`
(`F0 00 32 45 00 00 00 40 7F F7`). The reply comes from the binary SDK, not the GPL application.
**Confirmed** on hardware on 2026-10-16: an FM1 running V12 answered the editor's query with the
41-byte reply `parseFm1IdentityReply` reads, the 34-byte block `00 59 11`, a declared length of 27,
and the name `FM-1_8000012`, with a checksum of its own (`54`, `15` on the wire) rather than V15's.
The capture is `officialOpenIdentityReply` in `src/test/fake-fm1-midi.ts`. On macOS its one MIDI
port is named `FM1 Community`, which `resolveMidiPortSelection` picks as an FM1 port. Before this change `classifyFm1Firmware` read all three forms as
unidentified, since none is `FM-1_` and three digits; the editor now names them the
`official-open` family (below).

**What it is.** The preview's description holds: eight tracks, each running one of six engines
(DX7, 303, 808, PSG, Pluck, Sampler), 16 USER project slots (`out[1]` of command 0 below), tracks
1–7 on MIDI channels 1–7 and track 8 on channel 10 (`groove_channel`, `app/instrument.h:60`).
There are no 4 × 32 DX7 banks, no FX Channel effect unit, and no edit buffer in the stock
firmware's sense: a DX7 track holds one 156-byte voice in the working project.

**SysEx it takes.** `fm1_app_sysex` (`app/transfer.c:32–45`) queues only three shapes and drops
every other SysEx message:

1. `F0 7D 'F' 'M' 02 …`, the project transfer protocol below.
2. A 6-byte MMC command, `F0 7F <00 or 7F> 06 <command> F7`, passed to the screen
   (`app/transfer.c:226–229`).
3. A DX7 single-voice dump of exactly 163 bytes, `F0 43 0n 00 01 1B <155 bytes> <checksum> F7`
   with `n` below 16. `groove_transfer_poll` (`app/transfer.c:230–251`) checks the checksum, routes
   it to the track whose channel is `n` (channel 10, `n = 9`, is track 8), sets the operator-enable
   byte to 63, and calls `groove_fm_import` (`web/engine/sound.c:1369–1395`). That refuses the voice
   unless the track runs DX7 and every byte is within the DX7 limit, then adds a device undo
   checkpoint, marks the project changed, stops the track's notes, and writes the voice into the
   working project in RAM. It is not saved to a project slot until the user saves.

DX7 parameter changes (`F0 43 1n …`) and 32-voice bulk dumps (`F0 43 0n 09 …`) fail the shape
check and are ignored. So the editor's parameter changes, which carry a patch to every firmware
without `singleVoiceDumps`, do nothing on Official Open, and a bank sent from **Send to FM1** does
nothing either.

**Channel messages.** `message()` (`web/engine/sound.c:581–692`) handles, per track:

- **Program Change** on a DX7 track (`sound.c:593–609`) stops its notes and replaces the track's
  voice with built-in program `n % 16` (`groove_fm_program`, `app/presets.c:126`; 16 programs,
  `app/fm_patch.h:5`), with no device undo checkpoint. A custom voice imported into that track is
  lost unless the project was saved. On a 303 track it picks saw or square (`n & 1`), on PSG a mode
  (`n & 3`).
- **CC 7** track volume, **10** pan, **11** expression, **91** reverb send, **120** all sound off,
  **121** reset controllers, **123** all notes off. **CC 1** is LFO depth on PSG, Pluck, 808, and
  Sampler; DX7 takes CC 1, 2, 4, and 64 through `synth_dx7_midi` (`web/synth/dx7synth.c:414–440`).
  303 takes CC 1, 5, 64, 71, 74, 75, and 121; PSG CC 72 and 74; Pluck CC 72, 74, and 75.

**The `7D 'FM' 02` protocol** (`app/transfer.c:85–297`; the Workbench's client is
`demoFrame`/`demoParse`, `sdk/WebUpdate.js:460–475`, and its `Library` from line 557). A request is
`F0 7D 46 4D 02 <cmd> <token lo> <token hi> <payload> <checksum> F7`: the command below 64, a
14-bit token the reply echoes, the payload packed seven bits at a time least significant bit first,
and a checksum making bytes 1 to the checksum sum to 0 mod 128. The reply repeats the first eight
bytes with bit 6 of the command set, then packs a status byte (0 for success, 64 + error otherwise)
and its data the same way. An identical repeated request gets the stored reply rather than running
again. A transfer left idle for 10 s is cancelled.

| Cmd   | Payload                     | Does                                                                                                                                                                                  | Class                               |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0     | none                        | Info: format 4, 16 slots, current slot, project size 4064, clock mode, and each track's engine (14 bytes)                                                                             | Read; approved 2026-10-16           |
| 1     | kind, target                | Starts an export into a RAM buffer; replies with its size. Kind 0 project (4064 bytes), 1 a track's DX7 voice (156, `groove_fm_copy`), 2 a track preset (223, `groove_timbre_export`) | Read; approved 2026-10-20           |
| 2     | offset (16-bit), count ≤ 64 | Reads a chunk of that export                                                                                                                                                          | Read; approved 2026-10-20           |
| 3     | kind, target, size          | Starts a write of the same kinds                                                                                                                                                      | RAM write; needs approval           |
| 4     | offset, ≤ 64 bytes          | Writes the next chunk, in order                                                                                                                                                       | RAM write; needs approval           |
| 5     | CRC-32                      | Checks the CRC and imports into the working project (`groove_fm_import`, `groove_timbre_import`, `groove_project_import`)                                                             | RAM write; needs approval           |
| 6     | none                        | Cancels a transfer                                                                                                                                                                    | Approved 2026-10-20, with the reads |
| 7     | slot                        | Saves the working project to a project slot in Flash (`groove_project_save_slot`, `app/project.c:237`)                                                                                | **Dangerous / excluded**            |
| 8     | slot                        | Loads a slot over the working project, discarding unsaved device work (`app/project.c:270`)                                                                                           | **Dangerous / excluded**            |
| 9     | slot                        | Reads a slot's 12-character name                                                                                                                                                      | Read; approved 2026-10-20           |
| 10    | 12 printable bytes          | Renames the working project                                                                                                                                                           | RAM write; needs approval           |
| 11    | none                        | Sample bank status and size                                                                                                                                                           | Read; out of scope                  |
| 12–14 | begin, write, finish        | Rewrite the sample bank in Flash                                                                                                                                                      | **Dangerous / excluded**            |
| 15    | offset, count               | Reads sample data                                                                                                                                                                     | Read; out of scope                  |
| 16    | none                        | Cancels a sample transfer                                                                                                                                                             | Out of scope                        |
| 17–20 | none                        | Engine, render, audio, and master-level statistics                                                                                                                                    | Read; out of scope                  |

The editor sends only command 0, approved on 2026-10-16 (below). Each other command needs its
approval recorded in `AGENTS.md` before any code sends it, as FM-1+VA's `7D 10` and `7D 04` had.

**What it meant for the editor before this change.** On an unidentified firmware the editor sends
patches as parameter changes, which Official Open ignores, and three things that do harm there:

- Clicking a slot in banks A–D, or opening one in the editor, sent its **Program Change** on the
  note channel, which replaced track 1's voice (or that channel's track's) with a built-in program,
  losing an imported voice with no undo on the device.
- The **effect controls** went as CC 0–23 on the FX channel, by default channel 2, which is track
  2: CC 7, the Reverb Mix, became track 2's volume, CC 10 and 11 its pan and expression, and CC 1,
  2, 4, and 5 its modulation.
- A bank sent from **Send to FM1** and every parameter change did nothing.

**What the editor does now** (`resolveFirmwareProfile`, `src/lib/firmware-profile.ts`). The
`official-open` family lacks three capabilities every other family keeps, `programChanges`,
`effectControllers`, and `parameterChanges`: a slot click sends no Program Change, the effects send
no FX Channel controllers, and the voice editor sends whole voices rather than parameter changes.
Since 2026-10-16 it has `singleVoiceDumps` and `trackEngineRead`, which send a patch to a DX7 track
(below). The badge names it **M-VAVE OPEN** with its
release (V12 for `FM-1_8000012`), and the badge, the firmware setting, and the bank instructions
say what does not reach it. Analytics records the family `official-open`, never the identity.
Notes, the keyboard, and the audition phrases still play on the note channel, which is track 1 by
default. While the identity query is still being answered, the editor behaves as for an
unidentified firmware, so a slot clicked in that second still sends its Program Change.

**Hardware run (2026-10-16, V12 on macOS, by CoreMIDI from a scratch script, not the editor).**
Each message below was sent once, with the user's approval for that test, and the user's project
saved first.

- **Identity query** (`fm1IdentityQuery`): **Confirmed**, as recorded under Identity above.
- **Command 0, info**: `F0 7D 46 4D 02 00 01 00 6D F7` was answered with
  `F0 7D 46 4D 02 40 01 00 00 08 40 00 00 7C 03 00 01 04 00 18 30 60 40 01 03 00 75 F7`: token
  echoed, command 0 with bit 6 set, checksum valid, and unpacked status 0, format 4, 16 slots,
  current slot 0, project size 4064, internal clock, and engines 303, 808, DX7, PSG, PSG, PSG, PSG,
  PSG. **Confirmed**: the framing, packing, checksum, and reply layout match `app/transfer.c`.
- **Single-voice dump on channel 1** (`F0 43 00 …`, INIT VOICE named `CLAUDE TST`, every byte in
  range, checksum valid): no reply, and track 1 unchanged. Command 0 then showed track 1 running
  303, so `groove_fm_import` refused it as the source says. The user had set a different track to
  DX7 than they thought; the device's own report is the way to know.
- **The same dump on channel 3** (`F0 43 02 …`), track 3 running DX7: no reply; the track's sound
  changed to the voice sent. **Confirmed.** The main screen still showed the built-in program's
  name (`SOFT LE`, Soft Lead cut short) with **edited** beneath it, and only the track's edit
  screen named the voice `CLAUDE TST`: the main screen names the track's program, not its voice.
  The voice is an unsaved edit in the working project, as `transfer.c` says.

So a dump reaches only a DX7 track, gives no reply, and fails silently on any other engine. Code
that sends one should first read the engines with command 0 and say when the track it would reach
is not DX7.

**Sending a patch to a DX7 track** (approved by the user on 2026-10-16, for Official Open only).
A slot click, opening a patch in the editor, and each of the editor's edits send the patch as the
163-byte single-voice dump on the note channel, after command 0, read afresh before every dump,
shows the channel's track running DX7 (`sendVoiceToOfficialOpenTrack`,
`src/lib/official-open-track-send.ts`). The read and the dump share one turn of the transfer queue,
so nothing reaches the FM1 between them; `groove_transfer_poll` handles one message at a time and
drops a SysEx message that arrives while another waits. Each read takes a new token, as an identical
request is answered with the reply kept from before, which would report the engines as they were.
A channel that reaches no track (8, 9, 11–16), a track on another engine, and an FM1 that does not
answer twice, a second apart, send no dump; the page says which track runs what and how to fix it.
DX7 parameter changes do nothing here, so the voice editor sends each edit as the whole voice, one
dump per gesture, as it ends. The codec is **Confirmed** against the capture above; the editor's
own sends are **Likely** until a hardware run through the editor.

Next, each needing approval first:

- Read a track's DX7 voice with commands 1 and 2, to import a track's voice into the library.

**Hardware run on V14 (2026-10-20, through the editor,**
[`docs/hardware-runs/official-open-v14-tracks-2026-10-20.md`](hardware-runs/official-open-v14-tracks-2026-10-20.md)**).**
The badge named the FM1 V14. A slot click on a DX7 track (1 and 4) read the engines with command 0,
sent one dump on that channel, and changed the track's sound; track 2, running 303, got nothing and
the page said so. The notification and log both said to save the project. **Confirmed**: the
editor's own sends, as the **Likely** note above expected. The main screen keeps the old patch name
until the track's screen is entered and left, as on V12. Undo was not tested.

Open questions:

1. Does the device's undo bring back the voice a dump replaced, one step per dump?
2. What does the MIDI port appear as on Windows and Linux? On macOS it is `FM1 Community`. The
   Workbench matches `fm.?1` or a bare `USB-MIDI` (`sdk/WebUpdate.js:225`).
3. `.fm1t` is a 223-byte track preset (`struct groove_preset`) and `.fm1` a 4064-byte project; their
   layouts are in the source but not yet mapped here. Answered, from source and **Likely**, in
   "Official Open: track preset (.fm1t)" below: every byte of the preset, each engine's use of
   `data`, and the project's offsets. Still open there: whether the device matches the simulator
   sources the rules were read from, what loading a `.fm1t` sounds like on hardware, and the
   units and a few bytes the source does not explain.

#### Official Open: second reading, transfer details, file formats, and the update gate (2026-10-16)

Same commit as above (`5d3eac2573dbd054254fabda6fde099adc594348`, still the head of `main`; the
repository has three commits, `3be7fbd` the initial V12 release), checked line by line against the
announcement at https://forum.m-vave.com/topic/4 (posted 2026-10-16). Source read only; nothing here
was run, and no MIDI was sent for this reading. Paths are in that commit. This extends the section
above rather than replacing it; where it adds a fact, the fact is new, and where the section above is
confirmed or corrected, that is said.

**Announcement versus source.** The post matches what the source does: eight tracks, six sources,
16 demo and 16 user projects, one 8-slot sample bank of about 20.45 s, USB MIDI, hardware MIDI in
and BLE MIDI, an arpeggiator, and the four file types. It says the Workbench imports "a single DX7
patch or a 32-patch bank" and that the flashing tool "does not accept external firmware files".
Nothing in the post describes an editor-facing MIDI protocol or promises one. The source matches it:
the bank import is a Workbench feature (below), not something the device takes as a bank dump.

##### Framing facts that sharpen the section above

- **Two vendor families, one name.** The `00 32 …` bytes the editor already sends are the 7-bit
  packing of the update tool's own frame: raw bytes `00 59 <cmd> <len lo> <len hi> 00 <payload>
<checksum>`, packed seven bits at a time least significant bit first, inside `F0 … F7`, with the
  checksum the bitwise complement of the payload's byte sum (`frame` and `parse`,
  `sdk/WebUpdate.js:159–175`, a payload of at most 520 bytes). Packing `00 59 11 00 00 00 FF`
  gives `00 32 45 00 00 00 40 7F`, exactly `fm1IdentityQuery`'s body, so the identity query is
  update-family command 17 with no payload (`Link.query`, `WebUpdate.js:208`, and
  `Updater.open`, `:245–259`). **Confirmed** by computation here and by the hardware run above. It is
  the same family section 6.3 and the Felucca notes call `00 32` or `00 59`. The project transfer
  protocol is a different family (`F0 7D 46 4D 02`, the one FM-1+VA's `7D` commands live beside).
- **Reply status.** Besides 0 for success, the project reply's status byte is 1 for "empty" (a
  project slot that was never saved) and `64 + n` for an error `-n`; the Workbench reads 71 as
  "invalid file or parameter" and 72 as "out of memory", and on 72 or 71 says the working project is
  unchanged (`app/transfer.c:277`, `sdk/WebUpdate.js:593`). The section above gave only 0 and
  `64 + error`. **Likely** (source).
- **Size limits.** `fm1_app_sysex` drops any SysEx longer than 192 bytes before it looks at the
  shape (`app/transfer.c:34`), so a 4,104-byte DX7 bank dump is discarded on size as well as on shape.
  The SDK's own limit is 1,024 bytes per frame, assembled separately for USB, BLE, and UART, with
  firmware update messages handled before this hook (`sdk/include/fm1.h:80–86`). Whether BLE MIDI and
  the TRS input carry the project protocol the way USB does is not stated; the Workbench uses USB
  only. **Likely**; BLE and UART unverified.
- **Token and retry.** The 14-bit token is two seven-bit bytes, low first. The Workbench takes a
  fresh token per request and sends a request up to three times, one second apart, until a reply
  with the command's bit 6 and the same token arrives (`Library.query`, `WebUpdate.js:561–580`). The
  device caches only the last reply and sends it again for an identical request (`transfer.c:221`).
- **Port names.** The firmware's USB descriptor lives in the binary SDK and is not in the source.
  The Workbench accepts input names matching `fm.?1` or a bare `USB-MIDI` and pairs the output of the
  same name (`pairs`, `WebUpdate.js:224–238`), and its update path also accepts `felucca`, `sloop`,
  `clipper`, `ota`, `sinco`, `usb.?midi`, and `composite`. Windows is said to show the application as
  `USB-Midi` in a code comment (`:225`). **Likely**.

##### Identity (question 2)

- The reply is the update family's command 17 answer: a 27-byte field holding the name in printable
  ASCII with zero padding. The Workbench accepts a reply only if it is exactly 27 bytes and holds
  1 to 27 printable characters (`WebUpdate.js:255`), then accepts an Open identity with
  `/^(FM1_OFFICIAL_OPEN|FM1_COMMUNITY_\d+|FM-1_8\d{6})$/` (`:58`, used at `:293`). This is
  what `officialOpenIdentity` in `src/lib/fm1-firmware.ts` holds, and `parseFm1IdentityReply` reads
  the same 41-byte frame, so **no change is needed**. **Confirmed** on a V12 FM1 (above).
- The source builds only a `FM1_OFFICIAL_OPEN.fwsc` package whose product string is `FM-1_8`
  and six digits, taken from `FM1_UPDATE_PRODUCT` (`sdk/Build.ps1:227, 289`, `sdk/Package.cs:139`,
  `app/version.h:6`). `FM1_COMMUNITY_<n>` and a bare `FM1_OFFICIAL_OPEN` appear only in the
  Workbench's accepted list, so which builds report them is **not established**; the editor's
  regular expression is the safe superset.
- A device that is in the updater's loader answers the same query with a name starting `ota-`:
  `ota-FM-1_015` for the vendor loader, `ota-<product>` for a stock package, and
  `ota-FM1C_<16 hex digits of the build hash>` for an Open package (`WebUpdate.js:149`, `:290`). The
  editor reads each as unidentified, which is correct: a device in its loader is not playing
  anything. **Likely**.
- `FM-1_8` is the release marker, not a release number the editor can compare: `FM-1_8000012` is
  V12 only by the badge's rule. The Workbench never asks for a version separately; its capability
  command (49, below) carries a 32-byte build hash instead.

##### Project and track transfer (question 3), in full

The table above gives the commands. Details it leaves out, all in `app/transfer.c` and the
Workbench's `Library` (`sdk/WebUpdate.js:551–640`):

- **Kinds.** Kind 0 is the whole project, 4,064 bytes in format 4 or 4,048 in the older format 3,
  which the device still imports (`GROOVE_PROJECT_LEGACY_BYTES`, `transfer.c:61`,
  `project.c:295–300`); kind 1 is one DX7 voice of 156 bytes for a track 0–7; kind 2 is one track's
  preset of 223 bytes. A write of kind 0 must name target 0. The reply to command 0 reports the
  project size, which is how a client tells format 3 from format 4. V12 reports 4.
- **Chunks.** A read takes at most 64 bytes per command 2, with a 16-bit offset. A write takes at
  most 64 bytes per command 4, strictly in order (`at` must equal the bytes already received), then
  command 5 with the CRC-32 as four bytes, low first. Either side may end with command 6, which
  frees the 4 KiB buffer.
- **CRC.** Standard CRC-32 (polynomial `0xEDB88320`, initial and final inversion). The device
  compares the received four bytes against the complement of its own running value, which is the same
  number once the final inversion is applied (`transfer.c:175`, `project.c:38–49`, and the
  Workbench's `crc32`, `WebUpdate.js:455`). **Likely**; the CRC has not been recomputed against a
  device reply.
- **What a write does.** Command 5 applies the buffer to the working project in RAM; nothing reaches
  Flash until command 7. A project import replaces the working project at once and the screen picks
  it up (`screen.c:1866`). The Workbench therefore reads the working project back after a write
  and compares it byte for byte before it saves, saves with 7, reloads the slot with 8, and reads it
  back again before it reports success (`saveProject`, `WebUpdate.js:587–602`).
- **Sample bank.** Command 11 reports a status byte, the bank's size, and the capacity (466,944
  bytes, 456 KiB). The Workbench reads it in 64-byte pieces with command 15 and a 32-bit offset.
  A write begins with 12 (the total size, 32 bits), sends 128-byte pieces with 13, and ends with 14;
  the device erases and rewrites its Flash region (`app/samples.c:152–227`), and the Workbench
  reads the whole bank back and compares it. The write path and its failure case (a bank half
  written when power or USB is lost; a header is committed only at the end, `samples.c:217–222`) stay
  **Dangerous / excluded**. The read path (11, 15, 16) changes nothing and stays out of scope.
- **Save slot 15.** A project slot is one Flash sector, and the last, slot 15, also holds the
  device settings (`project.c:11–35, 251–254`), so a save to it writes both. Command 8 reads a slot
  into RAM, but it also records that slot as the current one in the device settings, which a
  delayed write puts in Flash (`project.c:284–289`). It never erases a slot, so its exclusion in
  `AGENTS.md` is cautious rather than a Flash write in itself: it discards unsaved work on the device
  and changes a stored preference. Keep it excluded.
- **File layouts.** `.fm1` is a 16-byte header, `FM1P`, a version byte (3 or 4), three zero bytes, the
  payload length as 32 bits little-endian, and its CRC-32 as 32 bits little-endian, then the project
  payload: 4,064 or 4,080 bytes in all (`projectFile`, `readProjectFile`, `WebUpdate.js:527–539`).
  The format byte is at offset 3,852 of the payload and the 12-character project name at 3,836
  (`Simulator.js:739`). Upgrading format 3 sets that byte to 4, appends 16 bytes, and writes 66 into
  every second one of them for the eight tracks (`upgradeProject`, `WebUpdate.js:521–526`). `.fm1t`
  is the same header with `FM1T`, version 1, and the 223-byte preset: 239 bytes (`timbreFile`).
  `.fm1s` is read by `sdk/Samples.js`, not mapped here. **Likely** (source); no file has been
  loaded on a device.

##### DX7 `.syx` import (question 4)

- **Over MIDI, by the device.** One shape only: the 163-byte single-voice dump,
  `F0 43 0n 00 01 1B <155 bytes> <checksum> F7`, as recorded above, on the channel of the DX7 track,
  and **Confirmed** on a V12 FM1 (2026-10-16 hardware run). The device checks the checksum and the
  channel, sets operator enable to 63, and takes only a DX7 track and in-range bytes
  (`transfer.c:240–251`, `web/engine/sound.c:1369–1395`). A 32-voice bank dump (`F0 43 0n 09 20 00
…`, 4,104 bytes) is dropped on its size; a parameter change (`F0 43 1n …`) is dropped on its shape.
  **Confirmed** by source for the drops; only the single-voice dump has been sent to hardware.
- **In the Workbench.** A chosen `.syx` must be 163 or 4,104 bytes, first byte `F0 43 0n`, every
  byte below 128, its type byte 0 or 9 matching the size, and a valid checksum
  (`readVoices`, `WebUpdate.js:481–510`). A bank is unpacked with the standard 32-voice-to-single-voice
  field mapping and every byte is range-checked (`validateVoice`, `:474`; the 21-byte operator
  limits and 19 global limits are written out in the function). The user picks one voice and a DX7
  track, and the Workbench sends it through the transfer protocol as **kind 1, one 156-byte voice
  with the operator-enable byte at 63**, not as a MIDI dump (`Update.html.in:636–646`, which also
  confirms with the user and warns that the track's notes stop). Export builds a 163-byte dump on the
  track's channel (channel 10 for track 8) from a kind 1 read (`voiceFile`, `:511`).
  So the Workbench's import and the editor's dump reach the same device function through different
  doors. The kind 1 route needs commands 3, 4, 5, and 6 and a CRC; the dump needs none. Neither
  saves to Flash. **Likely**.
- The 32-voice bank is therefore a Workbench-side convenience: the device holds one voice per DX7
  track, so there is no bank to send to it. This agrees with `AGENTS.md`.

##### Channel messages (question 5), what the section above did not say

- Routing is by channel only, with no Omni or program-to-track mapping: track 1–7 take channels 1–7,
  track 8 channel 10, and every other channel is dropped before it reaches a sound
  (`web/engine/sound.c:698–731`, `groove_channel`, `app/instrument.h:60`). A message with a data byte
  above 127 or the wrong length is dropped too.
- System Reset (`FF`) stops everything, rewinds, silences every track, and clears the effects
  (`sound.c:717–723`). Clock, Start, Continue, Stop, Song Position, and a subset of MMC (`F0 7F 00|7F
06 <01 02 03 06 07 09> F7`) are channel-less and act on the whole device
  (`sdk/Update.html.in:250` states the list in prose; `transfer.c:236–239` and `sound.c:706–723` do
  it). The editor sends none of them.
- Incoming MIDI is also recorded into the sequence while the device is recording (`groove_record_midi`,
  `sound.c:720`), so a note or controller sent to a track during recording becomes part of the
  project's pattern. The audition phrase and the keyboard therefore must not be played at an Open
  FM1 that a person has armed for recording. **Likely**; not tried.
- CC 91 scales 0–127 to the track's reverb send in 16 steps (`sound.c:621–624`), CC 7 is the
  track's volume and, on an 808 track, also releases a parameter lock; CC 121 resets expression to
  127, pan to centre, and the wheel to 0.

All of the above matches the section above and the profile (`programChanges` and `effectControllers`
absent) without change.

##### The update protocol and its gate (question 6): described, never to be sent

**Status: Dangerous / excluded.** Described so that the editor can recognise what it must not send,
not so that it ever does. The host side is `sdk/WebUpdate.js:205–451` (`Updater`); the device side
is the SDK's binary and its vendor loader, which the source does not show, so every claim about what
the device checks is read from what the host assumes.

1. **Discovery and identity.** The tool opens each MIDI input/output pair that names an FM1 (or, with
   Force, any), asks command 17 once or twice, and demands exactly one answering device
   (`discover`, `open`).
2. **Capability.** Command 49 returns 47 bytes: `FMC1`, version 1, a family number 0–7, a state
   byte, a flag that the loader is known, the loader's 512-byte block size, the Flash size
   (1,048,576), a 32-byte build hash, and an error byte (`capability`, `:219–223`). Open's package
   names family 7. A family mismatch without Force routes to "migration" and refuses; a nonzero state
   refuses ("another update in progress").
3. **Arming.** The tool sends command 50 with a 1, the family, the package length, and the build tag;
   a reply of a single 0 is the device accepting it (`:422–424`). The state must be 0 and the build
   must differ from the installed one.
4. **Trigger.** Only after that it sends the raw, unpacked six bytes `F0 22 24 35 7F F7`
   (`:426`, `:431`), the same trigger Felucca's notes record. The device then asks for its image
   itself with command 48 requests (an id, a 32-bit address, a 24-bit length up to 512); the tool
   answers with the bytes from its package, and an address of `0xE0000000` or `0xF0000000` marks the
   end of the first and second stage (`serve`, `:338–373`). Two stages: a loader first, then the
   application, with a reconnect between in which the identity must read the loader's `ota-` name.
5. **Checks on the host.** The package must carry a pinned SHA-256 for the bytes, the loader, and
   (for the V15 package) the factory voices; its header, directory, and per-entry CRC-16 values must
   hold; the product name must match; the family must be 7; the tool refuses any file the user supplies
   (`inspectPackage`, `prepare`, `:60–150`). After the second stage the device must reconnect under
   its product name and its capability reply must show the new build hash with state 0 (`:441`).
6. **The V15 and "Force" routes.** A stock V15 has no capability or arming command. The tool then
   goes ahead only when the user has chosen Force, the identity is exactly `FM-1_015` or the
   capability query times out, and the user confirmed (`:290–309`). In that path the six-byte
   trigger is the only gate the host can see. Restoring V15's four banks uses commands 33 and 34
   (sector-erase-and-write by address, 512 bytes at a time) after the V15 image, and checks the
   result (`restoreFactory`, `:376–401`).
7. **What the host cannot tell us.** Whether the device's loader requires anything beyond the
   trigger bytes, whether update traffic is accepted over BLE or UART as well as USB (`fm1.h:84`
   says update messages are handled before the application hook for every transport), and what
   happens to Flash on an interrupted update. The tool's own comment says a transfer "does not
   guarantee data preservation or recovery from interrupted power" (`:3–5`).

The editor must not send command 49, 50, 48, 33, or 34, the trigger, or anything else from the
`00 59` family but the identity query, which `AGENTS.md` already allows. Because the trigger is a
single six-byte frame with no payload, no editor code may build any `F0 22` frame. No OTA, loader, or
flash path is involved in anything the editor sends today.

##### What this changes for the editor

Nothing is contradicted. `AGENTS.md`'s Official Open paragraph, `src/lib/fm1-firmware.ts`, and
`src/lib/firmware-profile.ts` all agree with the source at this commit. These are the points a later
change can use, each needing its approval recorded first:

- **Command 0's engines** are what decides whether a dump can land, and it is already used.
- **Kind 1 read** (commands 1, 2, 6 with `groove_fm_copy`) would import a track's DX7 voice into the
  library. It changes nothing on the device, needs no Flash, and its reply layout is mapped above.
  **Likely**; needs an approval and a hardware run.
- **Kind 1 write** (3, 4, 5, 6) is the Workbench's own import route and is equivalent to the
  dump the editor already sends. It needs a CRC and four more commands for the same effect; the dump stays.
- **Command 9** (read a project slot's name) is read-only and has no editor use yet.
- **Command 8** and **7** stay excluded for the reasons above.
- A device in recording mode takes incoming MIDI into the pattern; mention it in any future note
  about auditioning on Open.

Hardware run required before any of these ship: yes. Persistence: nothing described here changes
Flash except commands 7, 8 (setting), 12–14, and the update path, all excluded. No OTA, loader, or
flash path is involved in anything this note adds to the editor.

#### Official Open: track preset (.fm1t) (2026-10-16)

Same commit as the two sections above (`5d3eac2573dbd054254fabda6fde099adc594348`). Source read only:
nothing was built or run, and no MIDI was sent. Paths are in that commit. It answers question 3
above, the layout of `struct groove_preset`, and gives the project's offsets with it. Confidence is
**Likely** (from source) throughout; nothing here is **Confirmed**, because no `.fm1t` has been
loaded on a device.

**Which code is read.** `app/` (`instrument.h`, `transfer.c`, `project.c`, `presets.c`) is the
device's own code. The readable engine, `web/engine/*.c`, `web/synth/*.c` and `third_party/synth/*.c`,
is what the Workbench compiles to WebAssembly (`tools/Build-Web.ps1:79`, `-DFM1_OPEN_WEB`); the device
links M-VAVE's prebuilt `sdk/lib/libfm1_engine.a` instead (`sdk/Build.ps1:343`). The validity rule
and every engine's parameter table are only readable in the WebAssembly sources, so what follows
about the device assumes the two agree. That assumption is question 1 below.

##### The struct

`struct groove_preset` (`app/instrument.h:123–130`) is four `uint8_t`, `controls` (`struct groove_fm_controls`, `instrument.h:111–117`, seven
`uint8_t`), `uint8_t data[210]`, and two more `uint8_t`. Every member has alignment 1, so there is no padding, and the source asserts
`sizeof == 223` (`instrument.h:130`). Nothing is `packed`; nothing needs to be. The offsets below add
up to 223, which was checked with a script as well as by hand (4 + 7 + 210 + 1 + 1). Offsets are from
the start of the preset; a `.fm1t` file has 16 bytes in front (`FM1T`, version 1, three zeros, the length
223 and its CRC-32, little-endian; `WebUpdate.js:540–544`), so add 16 for a file offset.

| Offset | Size | Field                | Meaning                                                                | Range                  | Confidence |
| ------ | ---- | -------------------- | ---------------------------------------------------------------------- | ---------------------- | ---------- |
| 0      | 1    | `type`               | The track's engine (table below)                                       | 0–5                    | Likely     |
| 1      | 1    | `volume`             | The track's level                                                      | 0–127                  | Likely     |
| 2      | 1    | `program`            | Built-in program number or mode (per engine, below)                    | per engine             | Likely     |
| 3      | 1    | `modified`           | 1 once the sound differs from its program; the screen's EDITED         | 0–1                    | Likely     |
| 4      | 4    | `controls.envelope`  | DX7: ADSR override. Other engines: the track's LFO                     | 0–100 each, see below  | Likely     |
| 8      | 1    | `controls.enabled`   | DX7: ADSR override on. Other engines: the LFO values are stored        | 0–1                    | Likely     |
| 9      | 1    | `controls.operators` | DX7: operators switched off; bit _i_ set switches off operator _i_ + 1 | 0–63                   | Likely     |
| 10     | 1    | `controls.mono`      | DX7 and 303: monophonic                                                | 0–1                    | Likely     |
| 11     | 210  | `data`               | The sound, laid out by engine (below); byte 209 is the sends           | per engine             | Likely     |
| 221    | 1    | `sequence_pages`     | The track's loop length: 0 is 64 steps, 1/2/3 are 16/32/48             | 0–3; ignored on import | Likely     |
| 222    | 1    | `sampler_pads`       | 8 for SAMPLER, 0 for every other engine                                | exactly 8 or 0         | Likely     |

Inside `data`, offset 11 + _n_ is `data[n]`; `data[209]`, at offset 220, is the sends for every engine.

**The engine byte** (`enum groove_source`, `instrument.h:19–27`; the same numbers are what command 0
reports for each track, `transfer.c:138–139`):

| `type` | Engine  | `program` accepted (`sound.c:1644–1647, 1670–1672`) | Bytes of `data` it reads |
| ------ | ------- | --------------------------------------------------- | ------------------------ |
| 0      | DX7     | 0–15 (`FM1_FM_PROGRAMS`, `app/fm_patch.h:5`)        | 0–155, then 209          |
| 1      | 303     | 0–1, and must equal `data[5]` (Wave)                | 0–11, then 209           |
| 2      | 808     | 0 only                                              | 0–208, then 209          |
| 3      | PSG     | 0–3, and must equal `data[0]` (Mode)                | 0–3, then 209            |
| 4      | PLUCK   | 0 only                                              | 0–3, then 209            |
| 5      | SAMPLER | 0 only                                              | 0–47, then 209           |

Types 6 and above are refused (`sound.c:1640`). The `program` byte is checked and stored for every engine; for the 303 and PSG it is a copy of the
Wave or Mode byte that must agree with it, and a preset that disagrees is refused rather than
repaired. What else reads the stored `program` after a load
was not traced (question 4).

##### The bytes every engine shares

| Offset | Field                     | What the source does with it                                                                                                                                                                                                                                                                                                           | Confidence |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1      | `volume`                  | Track level, 0–127 (`sound.c:1640`). It sets the track's gain through `source_gain`, which divides by 508, 127, 1016, 508, 508 and 254 for DX7, 303, 808, PSG, PLUCK and SAMPLER (`sound.c:735–740`). That is a different scale per engine, so one number is not one loudness; the source gives no dB figure.                          | Likely     |
| 3      | `modified`                | Shown as EDITED (`app/screen.c:564`). Factory presets set it to 1 for every engine but DX7 (`app/presets.c:162–165`).                                                                                                                                                                                                                  | Likely     |
| 4–7    | `controls.envelope`, DX7  | ADSR override: attack, decay, sustain, release, each 0–100, passed in that order to `synth_dx7_set_adsr` (`sound.c:1743`; `web/synth/adsr.c:13–24`, which clamps each to 100). Default 0, 0, 100, 0.                                                                                                                                   | Likely     |
| 8      | `controls.enabled`, DX7   | 1 makes the ADSR override apply. Default 0.                                                                                                                                                                                                                                                                                            | Likely     |
| 4      | LFO rate, other engines   | 0–100, mapped to 5 + 1995·_v_²/10000 hundredths of a hertz (`sound.c:53`), so 0.05 to 20 Hz. Shown as 40 when `enabled` is 0 (`sound.c:54–59`).                                                                                                                                                                                        | Likely     |
| 5      | LFO depth, other engines  | 0–100.                                                                                                                                                                                                                                                                                                                                 | Likely     |
| 6      | LFO target, other engines | 0 volume, 1 pan. Refused above 1 when `enabled` is 1 (`sound.c:1652–1653`).                                                                                                                                                                                                                                                            | Likely     |
| 7      | LFO wave, other engines   | 0 triangle, 1 square, 2 ramp up, 3 ramp down (`instrument.h:112–115`, `sound.c:91–95`). Refused above 3 when `enabled` is 1.                                                                                                                                                                                                           | Likely     |
| 8      | `controls.enabled`, other | 1 means bytes 4–7 are the LFO; 0 means an unmodulated track (`instrument.h:112–116`, `sound.c:80–82`). A track starts with bytes 4–7 as 0, 0, 100, 0 and this byte 0 (`sound.c:812–816, 865–866`).                                                                                                                                     | Likely     |
| 9      | `controls.operators`      | Bit _i_ set switches off operator _i_ + 1; the preset applies it as the operator mask, bit 5 − _i_ clear (`sound.c:1737–1741`, and `groove_fm_import`, `sound.c:1384–1386`). Validated for every engine (0–63); the other engines were not seen to read it.                                                                            | Likely     |
| 10     | `controls.mono`           | DX7: passed to `synth_dx7_set_poly_mode`, whose comment reads "mono: 0, 1" (`web/synth/dx7synth.c:577–582`). 303: monophonic with last-note slide against four voices (`third_party/synth/bass303.h:28–29`; `sound.c:299, 934`). Validated 0–1 for every engine; the rest were not seen to read it.                                    | Likely     |
| 220    | `data[209]`, sends        | Low nibble the reverb send, high nibble the delay send, each 0–15 (`sound.c:1722, 1774–1775`; `instrument.h:126`). A send's level is the track's gain times _n_/15 (`sound.c:973–984`). Not validated, and any byte is two valid nibbles.                                                                                              | Likely     |
| 221    | `sequence_pages`          | The track's loop length when the preset is exported (`web/engine/sequencer.c:544`). A project import reads it (`sequencer.c:553`) and refuses above 3 (`sound.c:1641`). A track import replaces the file's value with the track's own before anything is checked (`web/engine/edit.c:469`), so in a `.fm1t` it is carried and ignored. | Likely     |
| 222    | `sampler_pads`            | Must be 8 when `type` is 5 and 0 otherwise, or the whole preset is refused (`sound.c:1642`).                                                                                                                                                                                                                                           | Likely     |

##### DX7 (type 0): `data[0..155]`

The 156 bytes are the DX7 voice as the editor already knows it, in the layout the Workbench itself
uses for a single-voice dump (`sound.c:1703`, `memcpy` of the track's 156-byte patch).

| `data`  | Offset  | Size | Field                                                                             | Range (`fm_limit`, `sound.c:1279–1289`)                                                                     | Confidence |
| ------- | ------- | ---- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| 0–125   | 11–136  | 126  | Six operators of 21 bytes, operator 6 first, operator 1 last (`instrument.h:106`) | 99 for the first eleven of each (rates, levels, break point, depths), then 3, 3, 7, 3, 7, 99, 1, 31, 99, 14 | Likely     |
| 126–133 | 137–144 | 8    | Pitch envelope rates 1–4, levels 1–4                                              | 0–99                                                                                                        | Likely     |
| 134     | 145     | 1    | Algorithm                                                                         | 0–31                                                                                                        | Likely     |
| 135     | 146     | 1    | Feedback                                                                          | 0–7                                                                                                         | Likely     |
| 136     | 147     | 1    | Oscillator key sync                                                               | 0–1                                                                                                         | Likely     |
| 137–140 | 148–151 | 4    | LFO speed, delay, pitch depth, amplitude depth                                    | 0–99                                                                                                        | Likely     |
| 141     | 152     | 1    | LFO key sync                                                                      | 0–1                                                                                                         | Likely     |
| 142     | 153     | 1    | LFO wave                                                                          | 0–5                                                                                                         | Likely     |
| 143     | 154     | 1    | LFO pitch sensitivity                                                             | 0–7                                                                                                         | Likely     |
| 144     | 155     | 1    | Transpose                                                                         | 0–48                                                                                                        | Likely     |
| 145–154 | 156–165 | 10   | Voice name, one byte per character                                                | 0–127; the panel's own editor offers 32–126 (`sound.c:1399–1400`)                                           | Likely     |
| 155     | 166     | 1    | Operator on/off mask, bit 5 operator 1 … bit 0 operator 6                         | 0–63; **rebuilt on load**, see below                                                                        | Likely     |
| 156–208 | 167–219 | 53   | Not read, not validated; written as zero on export                                | any                                                                                                         | Likely     |

**Against the DX7 single-voice dump.** `data[0..154]` is the 155 data bytes of a DX7 voice (VCED)
byte for byte. The Workbench builds a `.syx` single-voice file from exactly those bytes
(`voiceFile`, `WebUpdate.js:511–515`: `F0 43 0n 00 01 1B`, `patch[0..154]`, checksum, `F7`), and reads
one back into `patch[0..154]` with byte 155 set to 63 (`readVoices`, `WebUpdate.js:489–490`). Byte 155
is an FM1 addition. The meanings of 126–144 are the standard VCED ones, which the source supports
with its limits and with `app/presets.c:153–158` (`p[134]` the algorithm, `p[135]` feedback, `p[144]`
transpose); the source names none of them.

**Byte 155 is not the operator switch.** Loading copies `data[0..155]` into the voice and then writes
byte 155 again from `controls.operators` (`sound.c:1735–1741`). Both are validated, but the preset
that wins is `controls.operators`. A tool that edits one must edit the other, or the byte it edits is
ignored.

##### 303 (type 1): `data[0..11]`

Order and limits are the source's parameter table (`third_party/synth/bass303.c:13–19`,
`third_party/synth/bass303.h:9–13`); `u` below is the value divided by 127 as the setter uses it
(`bass303.c:26–40`). The setter clamps; the validator has refused a larger value before it can run.

| `data` | Offset | Parameter | Range | Default | What the setter does                                                  | Confidence |
| ------ | ------ | --------- | ----- | ------- | --------------------------------------------------------------------- | ---------- |
| 0      | 11     | Cutoff    | 0–127 | 64      | Filter cutoff 314·2^(2.9306·u)                                        | Likely     |
| 1      | 12     | Reso      | 0–127 | 64      | Resonance, (1 − e^(−3u)) / (1 − e^(−3))                               | Likely     |
| 2      | 13     | EnvMod    | 0–127 | 64      | Scales the filter envelope, with Cutoff (`bass303.c:44–49`)           | Likely     |
| 3      | 14     | Decay     | 0–127 | 64      | Decay 0.2·2^(3.3219·u)                                                | Likely     |
| 4      | 15     | Accent    | 0–127 | 64      | Accent amount, _u_                                                    | Likely     |
| 5      | 16     | Wave      | 0–1   | 0       | 0 Saw, 1 Sqr; must equal `program`                                    | Likely     |
| 6      | 17     | Tune      | 0–127 | 64      | Reference pitch 440 + (_v_ − 64)·0.625, so 64 is 440 (`bass303.c:23`) | Likely     |
| 7      | 18     | Volume    | 0–127 | 96      | Gain 2^((_u_ − 1)·9.9658)                                             | Likely     |
| 8      | 19     | Drive     | 0–127 | 0       | Drive gain; its curve depends on DrvTyp (`bass303.c:50–62`)           | Likely     |
| 9      | 20     | DrvTyp    | 0–2   | 1       | 0 Off, 1 Soft, 2 RAT                                                  | Likely     |
| 10     | 21     | Slide     | 0–127 | 21      | Slide time 0.0004 + 0.0716·_u_                                        | Likely     |
| 11     | 22     | AccDec    | 0–127 | 7       | Accent decay 0.030 + 2.970·_u_                                        | Likely     |

`data[12..208]` is not read, not validated, and written as zero. The units of the formulas are the
source's own and are not stated in it; `app/instrument.h:99` says the stored values are "pot
positions, not Hz or milliseconds".

##### PSG (type 3) and PLUCK (type 4): `data[0..3]`

Both read four bytes and nothing else (`sound.c:1666, 1713`). The setters ignore a value above its
maximum rather than clamping it (`web/synth/psg.c:37–41`, `third_party/synth/pluck.c:33–37`), which
the validator makes unreachable.

| Engine | `data` | Offset | Parameter | Range | Default | Notes (`web/synth/psg.c:13–15`, `third_party/synth/pluck.c:19–20`) | Confidence |
| ------ | ------ | ------ | --------- | ----- | ------- | ------------------------------------------------------------------ | ---------- |
| PSG    | 0      | 11     | MODE      | 0–3   | 0       | 0 YM, 1 AY, 2 NOISE, 3 MIX; must equal `program`                   | Likely     |
| PSG    | 1      | 12     | NOISE     | 0–31  | 16      | Not traced beyond the range                                        | Likely     |
| PSG    | 2      | 13     | TUNE      | 0–48  | 24      | 24 is the centre; the unit is not stated                           | Likely     |
| PSG    | 3      | 14     | RELEASE   | 0–127 | 32      | Not traced beyond the range                                        | Likely     |
| PLUCK  | 0      | 11     | DECAY     | 0–127 | 90      | Not traced beyond the range                                        | Likely     |
| PLUCK  | 1      | 12     | BRIGHT    | 0–127 | 100     | Not traced beyond the range                                        | Likely     |
| PLUCK  | 2      | 13     | TUNE      | 0–48  | 24      | 24 is the centre; the unit is not stated                           | Likely     |
| PLUCK  | 3      | 14     | RELEASE   | 0–127 | 35      | Not traced beyond the range                                        | Likely     |

`data[4..208]` is not read, not validated, and written as zero.

##### SAMPLER (type 5): `data[0..47]`

Eight pads of six bytes: pad _p_ parameter _i_ is `data[6p + i]`, offset 11 + 6_p_ + _i_
(`sound.c:1661–1664, 1708–1711`; `web/synth/sampledrum.c:48–50`). `sampler_pads` must be 8.
`sampledrum_set` clamps (`sampledrum.c:67–74`), which the validator makes unreachable.

| `i` | Parameter | Range | Default | Meaning (`third_party/synth/sampledrum.h:17–20`)                                                          | Confidence |
| --- | --------- | ----- | ------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | Level     | 0–127 | 100     | Pad level                                                                                                 | Likely     |
| 1   | Tune      | 0–48  | 24      | −24 to +24 semitones                                                                                      | Likely     |
| 2   | Length    | 0–127 | 127     | Plays (_n_ + 1)/128 of the sample                                                                         | Likely     |
| 3   | Choke     | 0–4   | 0       | 0 off, 1–4 choke groups                                                                                   | Likely     |
| 4   | Variation | 0–3   | 1       | Four-hit cyclic change of pitch, gain and start; the header says it can be bypassed, not which value does | Likely     |
| 5   | Vel LPF   | 0–127 | 96      | How much softer hits darken                                                                               | Likely     |

`data[48..208]` is not read, not validated, and written as zero. **No audio is in the preset, and
nothing in it names the sample bank.** The eight pads read whatever the device's one shared bank holds
(`sdk/Update.html.in:227`: the `.fm1` project carries no sample audio, and the bank is the separate
`.fm1s`). A pad whose slot is empty is silent (`sampledrum.c:126–129`).

##### 808 (type 2): `data[0..208]`

The only engine that fills all of `data[0..208]`. The layout is `D8_PRESET_BYTES` = 209: eleven
selectors, then two sets of 99 parameter bytes (`third_party/synth/drum808.h:33–38`;
`web/synth/voices.c:334–376`). 11 + 99 + 99 = 209, and `data[209]` is the sends.

| `data`  | Offset  | Size | What                                                                                    | Confidence |
| ------- | ------- | ---- | --------------------------------------------------------------------------------------- | ---------- |
| 0–10    | 11–21   | 11   | One selector per drum part, BD to CH, each 0 or 1: which of the part's two sounds plays | Likely     |
| 11–109  | 22–120  | 99   | Variant 0: every part's parameters, parts in the order below                            | Likely     |
| 110–208 | 121–219 | 99   | Variant 1: the same, for the other sound of each part that has two                      | Likely     |

Inside a variant the parts follow each other in the order BD, SD, LT, MT, HT, RS, CP, CB, CY, OH, CH,
then KIT, holding 8, 10, 9, 9, 9, 9, 10, 8, 8, 8, 8 and 3 bytes (`drum808.c:36`), so a part starts
at this offset into its variant: BD 0, SD 8, LT 18, MT 27, HT 36, RS 45, CP 54, CB 64, CY 72, OH 80, CH 88,
KIT 96. Every value runs 0 to its maximum and is refused above it (`drum808_preset_valid`,
`voices.c:334–343`). Names, maxima and defaults are the descriptors (`third_party/synth/drum808.c:17–34`);
`Level`, `Tone`, `Tune`, `Decay`, `Attack`, `Drive`, `Snappy`, `Rev`, `Dly` and `Pan` are 0–127.

| Part | Parameters in order (default; maximum where not 127)                                    |
| ---- | --------------------------------------------------------------------------------------- |
| BD   | Level 64, Tone 42, Decay 87, Tune 64, Attack 24, Drive 0, Dist 0, Pan 64                |
| SD   | Level 64, Tone 64, Snappy 89, Tune 64, Decay 108, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64 |
| LT   | Level 64, Tune 64, Decay 68, Sound 0, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64             |
| MT   | Level 64, Tune 64, Decay 56, Sound 0, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64             |
| HT   | Level 64, Tune 64, Decay 53, Sound 0, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64             |
| RS   | Level 64, Tune 64, Decay 40, Sound 0, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64             |
| CP   | Level 64, Tune 64, Decay 64, Attack 32, Sound 0, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64  |
| CB   | Level 64, Tune 64, Decay 62, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64                      |
| CY   | Level 64, Decay 70, Tune 64, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64                      |
| OH   | Level 64, Decay 74, Tune 64, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64                      |
| CH   | Level 64, Tune 64, Decay 47, Drive 0, Dist 0, Rev 0, Dly 0, Pan 64                      |
| KIT  | Level 100, Accent 127, Choke 1                                                          |

Maxima that are not 127: Dist 6 (DIODE, CLIP, SAT, BFZ, PDIST, FOLD, CRUSH); Sound 1 (LT, MT, HT
TOM or CONGA; RS RIM or CLAVE; CP CLAP or MARAC); Choke 2 (OFF, CH>OH, BOTH).

- **Which variant holds which sound.** The selector pairs are TOM then CONGA for LT, MT and HT, RIM
  then CLAVE for RS, and CLAP then MARAC for CP (`drum808.c:44`). BD, SD, CB, CY, OH and CH have one
  sound, so both variants are the same and their selector changes nothing.
- **Shared bytes.** Pan and the KIT bytes are not per variant, so both sets store the same value.
  On load the second set is written last and wins (`voices.c:365–370`).
- **Storing writes Sound as the variant number.** `drum808_kit_store` reads each part's Sound byte as 0
  in variant 0 and 1 in variant 1 (`voices.c:349–354`), and the factory builder does the same
  (`presets.c:187`). A preset in that form loads exactly. One whose Sound byte disagrees with its
  variant would, on the code read, send the bytes after it in that part to the other variant, and
  the selectors then replace the Sound bytes at the end (`voices.c:365–371`). The validator allows it
  (question 3).
- **808 volume.** Besides each part's Level, the 808 has `volume` in byte 1 like the others; a
  parameter-locked step's base value replaces `volume` on export (`sound.c:1717–1721`).

##### What the preset carries besides the sound

Level (byte 1), the track's reverb and delay sends (`data[209]`), the DX7 ADSR and operator switches
or the other engines' LFO (bytes 4–9), mono (byte 10), and for the 808 each part's Pan inside `data`.
The Workbench's own words agree: a `.fm1t` is "one track's engine type, sound parameters and volume;
it carries no steps" (`sdk/Update.html.in:227`, translated). The source agrees with that, and says more
about what is out:

- **Steps and patterns are excluded.** The 64 step cells, chord table, swing, metronome, count-in and
  parameter locks are in the project (`instrument.h:131–142`). A track import takes none from the
  file; it rewrites the track's steps only to clear them when the engine class changes (below).
- **Loop length** is byte 221, carried on export and ignored on import.
- **The arpeggiator** is the project's `arp[8][2]` (`instrument.h:141`), not the preset's, so it stays.
- **Mute and solo, tempo, the project name, and the global effects** (reverb decay, delay time and
  feedback, return level) are the project's.
- **Pan** has no track-level byte; the 808's parts have their own, and a MIDI pan message sets a
  runtime value reset to 64 (`sound.c:66`).
- **The MIDI channel** follows the track (`groove_channel`, `instrument.h:60`) and is not stored.
- **A held parameter lock's value** is exported as its base value, not the value being played
  (`sound.c:1717–1721`).

##### Loading, validating and defaulting

- **Workbench, reading a file** (`readTimbreFile`, `WebUpdate.js:545–550`): exactly 239 bytes; `FM1T`;
  version byte 1; the next three bytes zero; the length field 223; the CRC-32 of the 223 bytes equal
  to the stored one. **Version 1 is the only one accepted**: there is no other version to upgrade
  from, and a file of another version is refused as "invalid format". `timbreFile` writes version 1
  (`WebUpdate.js:540–544`). The page refuses a file that is not 239 bytes before reading it
  (`Update.html.in:622`).
- **Workbench, sending** (`Library.upload`, `WebUpdate.js:626–639`): for kind 2 it checks only that
  the payload is 223 bytes, where kind 1 runs `validateVoice`. The checks on the preset's values are
  all the device's. It then sends commands 3, 4 (in chunks of 64 bytes), 5 with the CRC-32, and 6.
- **Device, receiving** (`transfer.c:57–79, 165–181`): kind 2 needs a target 0–7 and size 223. A
  chunk must arrive at the offset after the last one. Command 5 compares the CRC-32, then calls
  `groove_timbre_import`. A transfer left open is dropped after ten seconds (`transfer.c:209`).
- **`groove_timbre_import`** (`web/engine/edit.c:458–486`) captures the whole current project into a
  scratch copy, replaces that one track's preset with the file's after putting the track's own
  `sequence_pages` in it, and runs `groove_project_valid` on the **whole project**. A value out of
  range anywhere in the preset refuses the import (return −1, which the reply carries as status 65);
  **nothing is clamped or repaired at this boundary**. Then, still on that copy:
  - if the track crosses between the drum engines (808, SAMPLER) and the pitched ones (DX7, 303, PSG,
    PLUCK), its 64 steps are cleared: drums and velocity 0, and note 0 for a drum track or 60 for a
    pitched one (`edit.c:471–478`);
  - every parameter lock on the track is released, whether or not the class changed
    (`edit.c:479–481`).

  It then opens one undo step (`groove_edit_checkpoint`) and calls `groove_timbre_apply`
  (`sound.c:1783–1810`), which validates again, reuses the engine if the type matches (resetting it
  to its defaults first) or builds a new one (status 72 if memory fails), stops the track's notes,
  applies the preset, and replaces the track's steps and the sequence options. The other tracks keep
  sounding. Nothing reaches Flash, and the Workbench says so: "save the project to keep the change"
  (`Update.html.in:629`).

- **The values after the last check.** Bytes the validator does not read (the ranges named above, and
  `data[209]`) are never applied and are zero in the next export, so a round trip through the device
  normalises them. DX7 byte 155 is applied from `controls.operators`.
- **Defaults.** A new track starts at volume 100, program 0, `modified` 0, bytes 4–10 as
  0, 0, 100, 0, 0, 0, 0 and no sends (`sound.c:857–866`); changing a track's engine does the same,
  apart from keeping its volume (`sound.c:812–818`). Each engine's own defaults are the `def`
  columns above. The factory projects write their own values and set `modified` to 1 for every
  engine but DX7, with `controls.mono` 1 on the 303 (`presets.c:160–215`).
- **Simulator** (`sdk/Simulator.js:40, 60–62, 742, 750`; `web/engine/Simulator.c:385–388`): the same
  223 bytes, applied to or read from the track selected on its screen.
- **Export** (`groove_timbre_export`, `edit.c:448–457`): captures the project and copies out that
  track's 223 bytes, so everything in them is in the form `groove_project_capture` writes
  (`sound.c:1677–1730`), including the zeroed unused bytes and the track's current loop length.

##### How a preset sits in the project

`struct groove_project` (`instrument.h:131–143`, 4,064 bytes, asserted at line 143) holds the eight
presets as one array of the same struct: `memcpy`'d whole in and out (`edit.c:455, 467–470`,
`sound.c:1696–1722`) and checked by one loop (`sound.c:1635–1674`). The offsets, which the format
byte at 3,852 and the name at 3,836 that the Workbench reads agree with (`WebUpdate.js:519`,
`Simulator.js:739`):

| Offset | Size  | Field                                                                                             | Confidence |
| ------ | ----- | ------------------------------------------------------------------------------------------------- | ---------- |
| 0      | 2,048 | `step[8][64]`, four bytes a cell: note, velocity, and a 16-bit cell word                          | Likely     |
| 2,048  | 1,784 | `preset[8]`, 223 bytes each; track _t_ starts at 2,048 + 223·_t_                                  | Likely     |
| 3,832  | 2     | Tempo, 30–300                                                                                     | Likely     |
| 3,834  | 1     | Mute mask                                                                                         | Likely     |
| 3,835  | 1     | Solo mask                                                                                         | Likely     |
| 3,836  | 12    | Project name, printable ASCII                                                                     | Likely     |
| 3,848  | 4     | Effects: reverb decay, delay time, delay feedback, return level, each 0–127                       | Likely     |
| 3,852  | 196   | Sequence options: format byte (3 or 4), swing, metronome, count-in, 16 chords of 8, 16 locks of 4 | Likely     |
| 4,048  | 16    | `arp[8][2]`, format 4 only                                                                        | Likely     |

Track _t_ starts at 2,048, 2,271, 2,494, 2,717, 2,940, 3,163, 3,386 and 3,609 (_t_ = 0–7). The sums
check: 2,048 + 1,784 + 2 + 1 + 1 + 12 + 4 + 196 + 16 = 4,064.

**Format 3 against format 4.** Format 3 is the same bytes up to offset 4,047 and ends there: 4,048
bytes, no arpeggiator (`GROOVE_PROJECT_LEGACY_BYTES`, `instrument.h:144–145`). The device and the
Workbench both upgrade it by appending the 16 arp bytes with the default settings, and setting the
format byte to 4 (`project.c:298–302`; `upgradeProject`, `WebUpdate.js:521–526`). **Nothing differs
in the preset between the two**: no byte is moved, added or reinterpreted by the upgrade. What a
format-3 firmware wrote into a preset is not in this repository, which has three commits and no
history to read; question 5 is about it. A `.fm1t` has no format number beyond its own version byte.

In a project a preset's `sequence_pages` is used, to set the track's loop length (`sequencer.c:553`).
Two tracks may share an engine, and loading a project reuses engines already built for a type
(`sound.c:1826–1858`).

##### MIDI: which commands touch a track preset

Only the transfer family's kind 2, with the commands in the table at the top of the second reading
(`transfer.c:7, 143–181`). No other command reads or writes one: command 0 reports each track's
engine only (`transfer.c:131–142`), and the DX7 single-voice dump and Program Change reach a track's
voice but never a preset as a whole.

| Command | Kind 2 does                                                                                                         | Class (unchanged)               |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1       | Captures the project, copies the track's preset into a 223-byte RAM buffer, replies with 223 (`transfer.c:143–157`) | Read; candidate, needs approval |
| 2       | Reads that buffer, at most 64 bytes a command; four commands cover it (64, 64, 64, 31)                              | Read; candidate, needs approval |
| 3       | Opens a write buffer of 223 bytes for a target track 0–7                                                            | RAM write; needs approval       |
| 4       | Fills it in order, at most 64 bytes a command                                                                       | RAM write; needs approval       |
| 5       | With the right CRC-32, runs `groove_timbre_import`: replaces the track's engine and sound, one undo step            | RAM write; needs approval       |
| 6       | Drops the buffer                                                                                                    | Needs approval with 1–5         |

The read changes nothing on the device but takes the audio gate while it captures the project
(`sound.c:1681, 1728`) and overwrites the shared RAM scratch project; it writes no Flash. The write
is a larger step than the DX7 dump the editor already sends: it can **clear the track's steps** when
the engine class changes, **releases its parameter locks**, stops its notes, and changes the engine.
It stays an unsaved edit until command 7, which stays **Dangerous / excluded**, as do 8 and 12–14. A
failed kind 2 write can reply 65 (a refused value), 71 (a wrong CRC, or an apply that fails) or 72
(no memory); the Workbench words 71 and 72 and shows 65 as an unnamed "operation failed: 65"
(`WebUpdate.js:574`). AGENTS.md lets the editor send command 0 of this family only, and this section
approves nothing else.

##### A fixture, if one is wanted

No code or fixture is added by this change. Three can be built by hand from the tables, one a
default track of an engine whose bytes need no data beyond four or twelve parameters. They are not
captured from a device or from the Workbench, and the layout of each is only what this section reads
from the source:

- **PLUCK**: `type` 4, `volume` 100, `program` 0, `modified` 0, bytes 4–10 as 0, 0, 100, 0, 0, 0, 0, then
  `data[0..3]` as 90, 100, 24, 35 (the table's defaults), the rest zero, `sequence_pages` 0 and
  `sampler_pads` 0. The first fifteen bytes are
  `04 64 00 00 00 00 64 00 00 00 00 5a 64 18 23`. As a `.fm1t` the file is 239 bytes, its header
  `46 4d 31 54 01 00 00 00 df 00 00 00 4b ed 6a 18` (CRC-32 of the payload `186aed4b`).
- **PSG**: `type` 3, `data[0..3]` as 0, 16, 24, 32; CRC-32 of the payload `9b1b044d`.
- **303**: `type` 1, `mono` 0, `data[0..11]` as 64, 64, 64, 64, 64, 0, 64, 96, 0, 1, 21, 7; CRC-32 of
  the payload `3f7dcf4d`.

The CRC-32 is the standard one, which was computed with a library routine and not by the device's
nibble table; the table in `project.c:35–40` and `WebUpdate.js:453–454` is the standard 16-entry one.
A later change would put these into a test with the codec it adds.

##### What this changes for the editor

Nothing is approved. A later change can use these, each needing its approval recorded in AGENTS.md
first, and none is needed by the editor's DX7 work:

- **Read and write `.fm1t` files** is host-side work on bytes the editor already handles: the wrapper
  is a 16-byte header and a CRC-32, and the preset is the map above. Reading needs no MIDI.
- **Edit the non-DX7 engines' sounds** is possible for 303, PSG, PLUCK and SAMPLER from the tables,
  and for the 808 once the variant question (3) is answered. A tool should write only the bytes it
  edits and keep the rest as read, as it does for other FM1 records.
- **Sending a preset to a track** is kind 2, commands 3–6. It would need its own approval, a
  warning that it can clear the track's steps, and a hardware run first; the existing DX7 dump stays
  the route for a single voice.
- **Reading a track's preset** (kind 2, commands 1, 2, 6) is read-only and the likelier first step;
  it needs its approval and a hardware run (question 2).

Hardware run required before any of these ship: yes. Persistence: a kind 2 write changes RAM only,
until the project is saved with command 7, which stays excluded. No OTA, loader, or flash path is
involved in anything this section describes.

Open questions:

1. Do the device's validity rule and engines match the WebAssembly sources read here? The rule and
   the parameter tables are only readable there; the device runs `libfm1_engine.a`. A hardware run:
   export a track of each engine from a device with the Workbench and compare it with a hand-built
   file; then load one with an out-of-range byte per engine and see whether the device refuses it.
2. Does a `.fm1t` exported by the Workbench load back into each engine and sound as it did? Needs a
   hardware run through the Workbench, and the same for kind 2 reads of each engine (command 1 and 2
   replies against the file the Workbench makes from them).
3. On the 808, what does a preset whose Sound byte disagrees with its variant do? The source would put
   later bytes of that part in the other variant (`voices.c:365–371`); a hardware run, or a test of
   the compiled code, is the only way to see it.
4. Units and effects the source does not give: what `volume`'s per-engine divisors sound like, the
   unit of PSG and PLUCK TUNE, PSG NOISE and RELEASE, PLUCK DECAY, BRIGHT and RELEASE, 303 EnvMod and
   Drive, which SAMPLER Variation value is the bypass, and whether the stored DX7 `program` does
   anything after a load.
5. What did earlier firmware store in bytes 4–8 of a non-DX7 preset? The header says `enabled` 0
   "preserves legacy projects" and that the seven-byte layout is unchanged
   (`instrument.h:112–116`), which suggests the LFO reuses bytes that were once only the DX7's.
   Nothing here shows what format-3 projects held there.
6. Does anything else read byte 221 of a track import? The source read finds only `sequencer.c:553`
   (a project import) and `edit.c:469` (which replaces it), and no third reader.
7. What does a loaded SAMPLER preset do when the device's bank is empty or differs from the one the
   preset was made for? The source says the pad is silent when empty, and the preset carries no bank
   identity.

#### Official Open V13 (read 2026-10-18)

Source: https://github.com/m-vave/fm1_open commit `b178ac43` ("Update FM1 Open to V13",
2026-10-17), compared with `5d3eac25`, the V12 commit the sections above read. Source read only:
nothing was run, and no MIDI was sent. Paths are in that commit. Everything is **Likely** (from
source) unless marked otherwise.

**Identity.** `app/version.h` names the release `V13` and its update product `FM-1_8000013`.
`officialOpenIdentity` already accepts it and `fm1FirmwareRelease` names it V13; the tests now say
so. No FM1 here has run V13 yet, so the reply itself is unconfirmed.

**What V13 adds: per-track tuning.** Each track has two tables of twelve signed whole-cent offsets
from equal temperament, `main` and `alt`, indexed by pitch class (MIDI note mod 12, C = 0), each
entry −127 to +127, with −128 reserved and refused (`struct groove_tuning`, `app/instrument.h`). A
melodic step with bit 13 set (`GROOVE_STEP_ALT`) plays from `alt`, as does a live note while the
track's alt hold is on; alt hold is live state and is never saved. The offset is read at note-on, so
an edit changes the next note, never one sounding. DX7, 303, PSG, and Pluck take it; 808 and
Sampler ignore it (`web/engine/sound.c`, `engine_note`). The README says the firmware has the API
but no tuning editor: "a dedicated tuning editor is not included".

**The tuning block.** An exported or imported project may carry 200 bytes after its 4,064:
`FM1T` (`0x54314d46` little-endian), the eight tracks' tables (8 × 24 bytes, `main` then `alt`),
and a CRC-32 of the first 196 bytes, little-endian (`GROOVE_TUNING_BLOCK_BYTES`,
`GROOVE_PROJECT_TUNED_BYTES = 4264`). The header comment calls the last field "~CRC-32"; the
Workbench checks it against its own `crc32`, the standard CRC with final inversion, so it is the
usual CRC-32 value (`sdk/WebUpdate.js`, `projectVersion`). The Workbench refuses a block whose
magic or CRC is wrong or that holds a byte of 128 (−128). The magic is the same four bytes as the
`.fm1t` file header; context, the 4,064-byte offset, tells them apart. A `.fm1` file of a tuned
project is 4,280 bytes: the 16-byte header and the 4,264-byte payload.

**Transfer protocol changes** (`app/transfer.c`). All additive; V12's commands behave as before.

- **Kind 3**, the tuned project, for commands 1 and 3: 4,264 bytes, target 0. A kind 0 write also
  accepts 4,264 bytes; a kind 0 read still returns 4,064.
- **Command 21**, no payload, reports 7 bytes: a flag (1 if this build supports tuning), the tuned
  project size (4,264, 16 bits), and the largest sample bank a new write accepts (462,848, 32 bits).
  V12 answers it with status 71, invalid, which is how the Workbench tells the two apart
  (`extensions`, `sdk/WebUpdate.js`). Read-only.
- **Status 73** (64 + 9, `GROOVE_PROJECT_TUNING_SPACE`): a save needed the tuning sector, which a
  sample bank stored at the old full size still occupies. The FM1 shows REDUCE SAMPLE BANK.
- Command 11's reported capacity stays 466,944 because SDK clients check that exact value, but a new
  bank write over 462,848 bytes is refused.

**Storage.** The last 4 KiB of Flash now holds the tuning tables for the 16 project slots, keyed to
each slot and its project's contents and written through a journal (`app/project.c`), which is why
the sample bank's limit shrank by one sector. Saving a project writes its tuning there; loading a
slot applies it.

**Device undo.** Applying a track preset import (`groove_timbre_apply`) now adds a device undo
checkpoint (`0xb0000 + track`), and a project import can add one (`groove_project_apply_edit`). On
V12 neither did. So loading a sound onto a track from the editor would be undoable on the FM1 too.

**What did not change.** `struct groove_project` is still 4,064 bytes (its static assertion is
unchanged) and `struct groove_preset` is untouched, so the `.fm1t` map above holds for V13. The
SysEx shapes `fm1_app_sysex` accepts, the single-voice dump path, and channel-message routing are
unchanged. The DX7, 303, PSG, and Pluck engines changed only to take the tuning offset.

**What this changes for the editor.** Nothing it sends today: the identity query, command 0, and
the single-voice dump behave as on V12. Two later steps gain from it, each needing its approval
first: reading a project should use kind 3 where command 21 reports tuning, so a tuned project keeps
its tables, and a tuning editor (`docs/official-open-plan.md`, Phase 9) has a format to write. No
OTA, loader, or flash path is involved in anything this note adds.

Open questions:

1. Does a V13 FM1 answer the identity query with `FM-1_8000013`? Not run on V13; a V14 FM1 was
   identified as `FM-1_8000014` on 2026-10-20 (see the track send note above).
2. Does an FM1 updated from V12 keep its projects and samples, and does a sample bank at the old full
   size block saving until it is reduced?
3. What does the device's undo restore after a track preset import? A single-voice dump already
   adds a checkpoint through `groove_fm_import`; question 1 of the released-source section asks
   whether it brings the voice back.

#### Official Open V14 (read 2026-10-20)

Source: https://github.com/m-vave/fm1_open commit `4d266850` ("Update FM1 Open to V14", 2026-10-19),
diffed against V13's `b178ac43`. **Confirmed** from source only, except where a run is named; the
V14 FM1 run on 2026-10-20
([`docs/hardware-runs/official-open-v14-tracks-2026-10-20.md`](hardware-runs/official-open-v14-tracks-2026-10-20.md))
covered the identity, command 0, and the DX7 track send with the default channel map.

**Identity.** `app/version.h` names the release `V14` and its update product `FM-1_8000014`.
**Confirmed** on hardware: the badge read V14.

**What V14 adds** (the commit's own words: a 128-voice DX7 library, configurable track roles and
MIDI routing, Tap Tempo, synchronised delay):

- **A DX7 library on the FM1.** `FM1_FM_PROGRAMS` goes from 16 to 128 (MIDI programs 0–127, panel
  positions 1–128), held as four banks of 32 voices in the last Flash sectors
  (`app/fm_library.c`: standard 128-byte VMEM voices packed to 112 bytes, each sector with its own
  CRC and commit header, a replacement staged in the shared project sector so an interrupted write
  keeps the last bank). The original V15 factory voices are kept (`groove_fm_factory`).
- **Transfer kind 4, a DX7 bank.** `transfer_begin` accepts kind 4 with a target below 4 and a size
  of 4096, which is 32 voices of 128 bytes. Command 1 with kind 4 reads a bank
  (`groove_fm_library_read`); commands 3–5 with kind 4 write it to Flash
  (`groove_fm_library_write`). **This is the first readback of DX7 voices from any M-VAVE
  firmware**: the editor's "no device-to-browser bank readback" holds for stock V15 and FM-1+VA,
  not for Official Open V14. Reading is the same read-only path as commands 1 and 2; writing
  replaces one of four banks in Flash, so it needs its own approval and a hardware run, and stays
  excluded until then.
- **Command 22, capabilities.** An empty request is answered with 9 bytes: `1`, the number of FM
  programs (`128`), the number of banks (`4`), whether the library is available, the sample bank
  limit as a 32-bit value, and a feature mask (`3`: session roles, and extended and synchronised
  delay). Command 21 keeps its layout but reports the limit as the sample bank size less 4 KiB
  again. The sample limit now stops before the library's four sectors.
- **Configurable track roles and input channels.** Each track has a role (Normal, Play, Off) and
  an input channel 0–15, device preferences stored apart from the project
  (`groove_track_role`, `groove_midi_input_channel`; the default is eight Normal tracks on the
  original channel map). **This changes where a DX7 dump goes.** V13 took a dump on the channel
  `groove_channel(track)` gave a track and imported it into that track. V14 imports it into every
  track whose role is not Off and whose input channel equals the dump's channel, so a remapped
  FM1 sends a dump to a different track, or to several, or to none. The editor's channel-to-track
  map (channels 1–7 and 10 are tracks 1–8) holds only for the default. Command 0 is not known to
  report roles or input channels: its reply still carries only the engines, so after a remap the
  track the editor names may not be the one that sounds. **Needs hardware test** with a remapped
  channel.
- **MIDI routing.** Per-port output (DIN, USB, BLE) with independent queues, a router
  (`app/midi_router.c`) with local, local plus MIDI, and MIDI-only modes, clock source selection,
  Thru, and a panic. SysEx replies go out the port the request arrived on, and a transfer another
  port started makes the FM1 answer a busy status rather than interleave. The editor uses one USB
  port, so it meets none of this.
- **Delay, tap tempo.** The delay byte now reaches 1/32T to 1/4 synchronised values (128–136) and
  free times to 2.04 s (137–253), the project layout unchanged; Tap Tempo is on the screen.

**What this changes for the editor.** The identity query, command 0, and the single-voice dump
work as on V12 and V13 with the default channel map (the 2026-10-20 run). Open: whether
Program Change now selects one of the 128 library voices for a track (the source diff for the
router does not handle it, and `track_session.inc` stores the program in the track, so the screen
may); the profile keeps `programChanges` off until a hardware run says. The kind 4 read gives
Phase 1 a way to import the FM1's four banks into the library, which the plan should weigh against
reading a track's voice. No OTA, loader, or Flash path is sent by anything this note adds; a kind 4
write is a Flash write and stays excluded.

**Hardware run of the reads (2026-10-20, V14,**
[`docs/hardware-runs/official-open-v14-reads-2026-10-20.md`](hardware-runs/official-open-v14-reads-2026-10-20.md)**).**
Commands 22, 0, and 9, and kinds 1, 2, and 4 of command 1 with 2 and 6, all answered as the source
says. **Confirmed**: command 22's nine bytes; a track's sound is 223 bytes for DX7, 303, PSG, and
SAMPLER, with the 303's twelve parameters in the mapped order and eight 6-byte SAMPLER pads; a
track's voice (kind 1) is the first 156 bytes of its sound's `data`; a library bank (kind 4) is 32
standard 128-byte voices, 7-bit throughout, named in bytes 118 to 127, and the four banks hold the
128 library voices; an empty project slot answers command 9 with status 1. The 808 and Pluck were
not read. This answers question 3 and question 4 below.

Open questions:

1. Does a dump on a remapped input channel reach the track or tracks the source says it does, and
   does command 0 say which? A hardware run with a track's input channel changed on the FM1.
2. What does Program Change do on V14: select one of the 128 library voices for a track, or still
   one of the built-in sounds?
3. ~~Does a kind 4 read return the four banks' voices?~~ Yes, read 2026-10-20; whether the order is
   the screen's is not checked.
4. ~~Does command 22 answer as the source says?~~ Yes, read 2026-10-20.

### M-VAVE's V16 stock firmware

M-VAVE released V16 (`FM-1_016`, file `FM-1_016.fwsc`, 701.4 KB) on 2026-10-21, in the forum post
"M-VAVE FM-1 Official Firmware Update Summary" (https://forum.m-vave.com/topic/23, read
2026-10-22), which compares it with V15. The table below is the notes; the firmware reading after
it is **Likely**, and the first hardware run
([`hardware-runs/stock-v16-2026-10-23.md`](hardware-runs/stock-v16-2026-10-23.md), on the
orange FM1) confirmed what "Confirmed on hardware" lists. Anything not listed there is still
**Needs hardware test**. The run sheet is
[`hardware-runs/stock-v16-run-sheet.md`](hardware-runs/stock-v16-run-sheet.md).

V16 identifies as `FM-1_016`, which `classifyFm1Firmware` counts as M-VAVE's own (`FM-1_000` to
`FM-1_019`), and it answers the updater's identity query, which the editor sends (**Confirmed**,
2026-10-23).

#### What the notes say changed

| Area                 | V16 per the notes                                                                                                                                                                                                                                                                                        | Editor consequence                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parts and voices     | Eight Voices (timbral parts), each with its own preset, On/Off, MIDI receive channel, level, pan, pitch-bend ranges, glide, and a Fine Tune of −100 to +100 cents. Polyphony rises from 12 to 20, shared across all eight. Voices on one channel layer.                                                  | Where a single-voice dump, the 155 parameter changes, and a Program Change land is unknown: the Voice on the note channel, Voice 1, or every Voice on it. The editor says nothing about parts yet. |
| Effects library      | Effect settings are a library of 128 FX groups (FX001–FX128, each with its own order, On/Off states, parameters, and a 10-character name), saved with SAVE → Globe or ALL, never into a sound preset. All Voices share one stereo chain, and changing a preset, Pattern, or column no longer changes it. | The library's per-patch FM1 effects no longer travel with a preset on V16. Sending them would change the shared group, which is the FX setting every Voice hears.                                  |
| Effect controllers   | External FX control is CC 70–93 on the Effect Ch channel: Filter 70–73, Reverb 74–77, Delay 78–81, Distortion 82–85, Chorus 86–89, Phaser 90–93. "Each group controls the corresponding effect's On/Off state and parameters." The CC 0–23 mapping "is no longer active".                                | The editor sends V16 its effects at CC 70–93 (`effectControllerBase` 70 from release 16), only as they are edited; the map and ranges are below, **Confirmed** on 2026-10-23.                      |
| Controllers now used | CC 1, 2, and 4 stay sound modulation, CC 7 is master volume, CC 11 is expression (CC 121 resets it to 127), on the Voices' channels. CC 7, CC 11, and sustain are routed correctly when an instrument channel overlaps Effect Ch.                                                                        | CC 1, 2, 4, 7, and 11 were the editor's Filter Type, Filter Cutoff, Reverb Enabled, Reverb Mix, and Delay Mix controllers, which is why V16 gets none.                                             |
| Key LEDs             | In normal mode, notes 0–26 on Effect Ch light the 27 key LEDs; they do not sound.                                                                                                                                                                                                                        | The editor's notes go on the note channel. With both channels the same, low notes would light LEDs rather than sound: check.                                                                       |
| Panic                | Holding PLAY/STOP stops the sequencer and arpeggiator and clears stuck notes.                                                                                                                                                                                                                            | **MIDI panic** keeps sending Note Off for every note; nothing to change.                                                                                                                           |
| Bank Export          | Sends the selected bank's 32 saved presets as standard DX7 SysEx (`.syx`): DX7 sound data only, without ENV, FX, Voice setup, Patterns, or global settings.                                                                                                                                              | The first way to read a stock FM1's bank back. **Receive patch…** took it (2026-10-23); **Receive from the FM1…** now does, and sends nothing.                                                     |
| Bank import          | After a 32-voice bank arrives, the FM1 waits for a destination bank to be chosen before writing; nothing is written without one, and a failure allows another choice.                                                                                                                                    | Seen on 2026-10-25: V15's **32 Voice Save To …** with A–D on Knobs 1–4, which saves at once, and SELECT left cancels without writing. The instructions say both.                                   |
| SEQ                  | Patterns grow from 16 to 64 steps, with per-step ratchets ×1–×4; the pool stays at 16. An eight-track, eight-column arrangement replaces chaining, one row per Voice.                                                                                                                                    | Recorded for the parked sequencer work ([roadmap](fm1-roadmap.md)); its next attempt starts from V16. Nothing to build.                                                                            |
| Other                | ARP takes external notes as triggers; USB Loopback; RGB screen colours; Btn BL and Key BL; the firmware version on the last GLOBE page; SAVE offers ALL, Globe, Preset, and Pattern.                                                                                                                     | None for the editor. The GLOBE page lets the run confirm the release without the editor.                                                                                                           |

#### Confirmed on hardware

**Confirmed** by the run of 2026-10-23
([`hardware-runs/stock-v16-2026-10-23.md`](hardware-runs/stock-v16-2026-10-23.md)): `FM-1_016`
on the orange FM1, with the editor's PR #349 and the development FX probe. Each matched the firmware
reading below. The run of 2026-10-25
([`hardware-runs/stock-v16-2026-10-25.md`](hardware-runs/stock-v16-2026-10-25.md)), on the same
FM1, checked two Voices, a bank sent to the FM1, and Bank Export without USB; only the last
differed from the firmware reading.

- **Identity.** V16 answers `F0 00 32 45 00 00 00 40 7F F7` with the 41-byte reply the editor
  reads as `FM-1_016`.
- **Effect controllers.** CC 70–93 on Effect Ch are the editor's 24 effect parameters, in its
  order:
  - Filter 70–73, Reverb 74–77, Delay 78–81, Distortion 82–85, Chorus 86–89, Phaser 90–93.
  - A group's first controller turns its effect on at any value but 0.
  - Values are clamped to V15's limits rather than scaled: the types to 2, Cutoff to 107, Q to 10,
    and the rest to 100. The FM1 shows Cutoff in hertz, 64 as 2789 Hz.
  - CC 0–23 no longer reach the effects, CC 94 and 95 do nothing, and the FM1 sends nothing back
    for an effect change.
  - They reached the effects with Voices 1 and 2 listening on All, so on Effect Ch too.
- **The FX group is live state.** Effect controllers change the live FX group only:
  - SAVE offers Globe and ALL for it.
  - Turning to another preset leaves it as it is.
  - A power cycle without saving restores the stored group.
- **Single-voice dumps and parameter changes.** Both reach the edit buffer of Voice 1's preset
  (Voice 1 alone On, on All): the FM1 shows and plays the dumped patch's name and sound, and
  follows each parameter change.
- **Which Voice a message reaches** (2026-10-25, Voice 1 on channel 1 and Voice 2 on channel 3,
  both On):
  - A Program Change reaches the Voice on its channel, and notes play the Voice on theirs.
  - A single-voice dump reaches the preset of the Voice selected on the FM1's screen, whatever
    device it is sent on. A slot click on note channel 3 with Voice 1 selected moved Voice 2 to
    the program and put the sound on Voice 1.
  - Parameter changes, which are taken from device 1 only, reach the selected Voice only while it
    listens on channel 1 or All. With Voice 2 selected on channel 3 they reached no Voice; moved to
    channel 1, it took them.
  - The preset list marks an edited preset with `*` and shows a new name at once; the header above
    it keeps the old name until the preset is selected again.
- **Keeping an edit.** SAVE opened from a voice editing page offers Preset, which stores the
  edited patch over that preset. It survives a power cycle. Opened from the preset screen or
  GLOBE, SAVE offers only ALL and Globe: it offers what the page it opens from can save. A short
  press offers the same as a hold (2026-10-25).
- **A 32-voice bank sent to the FM1** (2026-10-25) brings up V15's **32 Voice Save To …** with
  A–D over whatever page is showing. Knob 1–4 stores it in that bank at once, with no
  confirmation, and it survives a power cycle. Turning SELECT left closes the prompt and writes
  nothing; left alone, it does not time out.
- **Bank Export.** One 4104-byte Yamaha 32-voice bulk dump, `F0 43 00 09 20 00`, with the
  checksum `(−sum) & 7F` and only 7-bit data, over USB. `n` was 0 with Voice 1 on All.
  **Receive patch…** takes it and sends nothing while it listens (2026-10-25).
- **Bank Export without a USB host** (2026-10-25, cable out at the computer's end) does not show
  **Connect USB**. It shows "Sending Bank A / 0%", then **Receive Timeout**; an Export straight
  after shows **USB Busy**, and plugging in during a send **USB Disconnected**. The next Export with
  a host listening works, with no power cycle.
- **Voice channels.** V16 has no single MIDI channel on GLOBE; each Voice has its own, 0 being
  All.
- **Key presses.** The FM1 sends its own key presses on the Voice channel, Note On at velocity 90
  and Note Off at 100.

Still **Needs hardware test**: what sets the flag at `0x01C3402C` that a single-voice dump needs
(question 6), though it was set in normal use on both runs.

#### What the firmware shows

**Likely** (static reading of `FM-1_016.fwsc`, SHA-256
`d017fb65e70aca97ee29d944470c3515a74581df5c0576bf70de917c7b2b61d5`, against V15's, 2026-10-23).
Nothing below has been run on an FM1.

**Method.**

- **Decryption.** The package decrypts with upstream's SFC cipher and chip key `0x980F`. In file
  terms, each 32-byte block from offset 20 is XORed with a CRC-16 (`0x1021`) keystream starting
  at `0x980A ^ (((offset + 0x3BC00) >> 2) & 0xFFFF)`. The same reading gives V15's `app.bin`
  with upstream's SHA-256 (`306e4706…3203`).
- **Layout.** V16's app is 597,928 bytes at XIP `0x02000140`; V15's was at `0x02000120`. Its C
  runtime copies `0x15048` bytes from file `0x7CF40` to RAM `0x01C00000`; V15 copied `0xA05C`.
  The app area adds `DX7.bin` (128 KiB) and `SEQ64`, and drops `USR`.
- **Disassembly.** Ghidra 12.2 with edco's `ghidra-jieli` fork (pi32v2 `ac7911b8`, which
  decodes the six-byte `80 ff` call), with the RAM copy mapped. Function addresses below are
  V16's.

**MIDI input.**

- V16 parses each port's bytes (`FUN_02025e2c`) into 5-byte events in a 128-entry queue that
  the main loop applies (`FUN_02012cc4`).
- A newer event with the same port, status, and first data byte replaces a queued one, so a
  burst of one controller collapses to its last value.
- The parser still reboots into UBOOT on `F0 22 24 35 7D F7`, as V15 does.

**Effect controllers.**

- `FUN_02012cc4` from `0x02013304` takes a three-byte Control Change on **Effect Ch** whose
  `cc − 70` is at most 23 (the check is `ja r2,0x17`).
- The effect is `(cc − 70) >> 2`, in the order Filter, Reverb, Delay, Distortion, Chorus,
  Phaser, and the parameter is `(cc − 70) & 3`.
- This is V15's CC 0–23 handler with 70 added, and its rules are unchanged:
  - A group's first controller turns its effect on for any value but 0.
  - Filter's and Reverb's second is the type, limited to 2.
  - Filter Cutoff is limited to 107 and Q to 10; every other parameter to 100.
  - A larger value is clamped to the limit, not scaled.
- That is the editor's own table of 24 effect parameters (`fm1EffectParameters`): the same
  order, maximums, and switches, so only the controller numbers differ.
- Each change also moves the FM1's FX page to that effect. It changes the live FX group, which
  stays unsaved until SAVE.
- CC 0–23 no longer reach the effects.
- CC 70–93 still reach them when Effect Ch is also a Voice's channel.
- Code for CC 94 and 95 is present but unreachable behind the range check.

**Voices.**

- Eight 12-byte records at `0x01C3508E`, checked in `FUN_0200be30`, hold:
  - preset 0–127, and MIDI channel 0–16, where 0 is All;
  - level 0–100, and pan −100 to +100;
  - On/Off, and pitch bend up and down, 1–24 each;
  - Glide On/Off, glide time 0–100, and Fine Tune −100 to +100.
- A Program Change loads its program into every Voice that is On and listens on its channel or
  on All (`FUN_02010da6`).

**DX7 SysEx received.** `FUN_02025c66` takes only these messages, each whole, and checks each
checksum:

- **Parameter change.** `F0 43 10 gg pp vv F7`, from device 1 only. The address `gg × 128 + pp`
  must be below 156 and the value within that parameter's limit.
- **Single-voice dump.** `F0 43 0n 00 01 1B`, 155 bytes, and a checksum. It is applied only
  while a flag at `0x01C3402C` is set; what sets the flag is not found.
- **32-voice bank.** `F0 43 0n 09 20 00`, 4096 bytes, and a checksum. The FM1 then waits for a
  destination bank (`FUN_0201041a`).
- **`F0 22 24 36 a b c F7`**, a new M-VAVE command with `a` below 2, `b` up to 127, and `c` up to
  100:
  - It sets Voice 2's On/Off to `a`, its preset to `b`, and its level to `c`.
  - It then sets Voice 1's level to 100, or to `100 − c` while Voice 2 is on: a two-Voice layer
    or crossfade.
  - It is unclassified, so **Dangerous / excluded**.

**Where an edit lands.**

- Parameter changes and single-voice dumps write one 155-byte edit buffer. It belongs to the
  preset loaded on the Voice selected on the FM1's screen, since `FUN_02007d74` sets the two
  together.
- Committing it (`FUN_02007a12`) keeps a RAM copy of that preset (`FUN_020079b4`, one heap block
  per preset). Every Voice playing that preset reloads, and loading a preset prefers the RAM copy.
- Nothing is written to Flash, so on V16 a dump is an unsaved edit of one preset, heard on every
  Voice that plays it. That is V15's behaviour, not FM-1+VA's.

**Bank Export** (`FUN_0200ED88`, from `0x0200F100`).

- **Banks.** Only banks A–D.
- **What it sends.** One 4104-byte message: `F0 43 0n 09 20 00`, 4096 bytes of bank data,
  `(−sum) & 0x7F`, and `F7`.
- **Header.** Bytes 4 and 5 come through a paired instruction (`mov r0,#0x20` beside
  `clr r0_r1`), which Ghidra's decompiler reads as `00 00`. Upstream's rule that a pair reads
  its operands before either writes gives `20 00`, and the `mov` would otherwise be dead.
- **`n`.** A setting minus one, or 0 when the setting is 0, so probably the MIDI channel with
  All giving 0.
- **Checks before sending.** Every byte must be 7-bit, USB must be connected (**Connect USB**),
  and no transfer may be running (**USB Busy**). On hardware, with no host, Export started and
  timed out instead of showing **Connect USB** (2026-10-25).
- **Transport.** Sent over USB-MIDI only (`FUN_02025162`), 64 bytes per transfer, with a
  progress percentage and a timeout (**Receive Timeout**).
- **In the editor.** **Receive from the FM1…** (the **Receive patches** wizard) takes the message
  as a 32-voice bank (`Dx7VoiceReceiver`, checked by `parseDx7Bank`), lets each patch be heard,
  and replaces the bank chosen, with its replace warning and Undo. The editor sends nothing to
  start it: its FM1 steps say to connect USB and open the listening screen, then start Export,
  and to start it again after **Receive Timeout**. The wizard itself is **Needs hardware test**:
  only the earlier dialog was run on an FM1. **Confirmed** by the capture of
  2026-10-23 (`docs/hardware-runs/stock-v16-bank-export-2026-10-23.json`), which is the
  receiver's test fixture; receiving it through the dialog worked on 2026-10-23 and 2026-10-25.

**Also in the event loop.**

- A Note On or Off on Effect Ch below note 27 lights or clears a key LED rather than sounding,
  while the LED setting allows.
- CC 123 and a sustain release (CC 64 below 64) release the channel's voices.

#### Questions for the hardware run

Each question carries the firmware's answer. The run of 2026-10-23 settled the first two, part of
the third, and the fourth; the run of 2026-10-25 the rest of the third, and the fifth.

1. ~~Does V16 answer the identity query as `FM-1_016`?~~ Yes (2026-10-23).
2. ~~Which parameter is each of CC 70–93, what range does each take, and do CC 0–23 on Effect Ch
   now do nothing to the effects?~~ V15's map plus 70, clamped, and CC 0–23 do nothing to them
   (2026-10-23).
3. ~~Does a single-voice dump still reach an edit buffer, and which Voice's?~~ The selected
   Voice's, whatever device it comes on; parameter changes reach it only while it listens on
   channel 1 or All, and a Program Change the Voice on its channel (2026-10-25).
4. ~~What does Bank Export send?~~ One `F0 43 00 09 20 00` message of 4104 bytes, over USB
   (2026-10-23).
5. ~~Does a 32-voice bank sent by **Send to FM1** reach the new destination prompt?~~ Yes:
   **32 Voice Save To …**, as on V15 (2026-10-25).
6. What sets the flag at `0x01C3402C`, without which a single-voice dump is dropped? It was set in
   normal use on 2026-10-23, since the dump arrived.

### FM1 Editor

Repository:

- https://github.com/benny-sparra/fm1-dx7-patch-importer

At the time of this review the editor already supports:

- browser-managed DX7-compatible banks
- all standard DX7 voice parameters
- live DX7 parameter updates
- algorithm and envelope visualisation
- FM1 filter, reverb, delay, distortion, chorus and phaser editing
- voice and 32-voice bank transfers
- program changes
- separate note/program and effect MIDI channels
- incoming/outgoing MIDI monitoring and SysEx hex inspection
- IndexedDB workspace persistence

This means new FM1-specific protocol work should extend the existing MIDI/domain architecture rather than be built directly inside React components.

---

# 1. DX7 voice behaviour

## 1.1 Standard parameter-change SysEx

**Status: Confirmed**

The stock FM1 firmware handles the standard seven-byte Yamaha DX7 parameter-change message:

```text
F0 43 10 gg pp vv F7
```

Firmware behaviour:

```text
address = (gg << 7) + pp
editBuffer[address] = vv
```

The edit buffer is the FM1's 155-byte DX7 VCED-style edit buffer.

The reverse-engineering notes identify the buffer as six operators of 21 bytes each followed by global voice parameters.

### DX7 live-parameter audit (DX-001 / DX-002)

Reviewed against the stock V13 firmware analysis on 2026-08-31.

#### Confirmed at firmware-analysis level

- The parameter-change sub-status must be exactly `10` hex. Unlike voice and bank dumps, the
  stock handler does not accept a channel/device nibble from `0` through `F` for this message.
  Live voice edits therefore do not use the editor's selected note/program channel.
- The address is `(gg << 7) + pp`, with operator 6 occupying addresses 0–20 through operator 1
  at 105–125, globals at 126–144, and the ten voice-name bytes at 145–154.
- The FM1 working voice is a 155-byte VCED buffer. Address 155 is outside that stored voice, and
  the stock handler has no documented special case for the original DX7's edit-only operator
  on/off parameter. Production editor code must not send address 155.
- Importing and exporting uses standard 128-byte DX7 VMEM packing. Tests now exercise a real
  factory-bank fixture through import, edits to two fields sharing packed bytes, bank export, and
  re-import while checking that sibling bitfields and the other 31 voices remain unchanged.

#### Strongly inferred from the DX7 format

- The per-parameter maxima used by the editor match the standard DX7 VCED definitions: 0–99 for
  envelope rates/levels and most continuous values, with the documented narrower enumerated and
  bitfield ranges for curves, scaling, sensitivities, oscillator mode/coarse, detune, algorithm,
  feedback, sync, waveform, pitch-mod sensitivity, and transpose.
- The FM1 firmware's standard DX7 pack/unpack path and msfa-derived engine strongly support those
  meanings and ranges. However, the parameter-change handler itself copies the received value
  byte directly and does not provide independent row-by-row range validation.

#### Unresolved / needs hardware test

- No repository capture set changes every live parameter across representative values on physical
  FM1 hardware. The address/range table is therefore not hardware-confirmed row by row.
- Values outside the standard DX7 range but still within 7-bit MIDI are not known to be clamped,
  ignored, or interpreted unexpectedly by the FM1. The editor rejects them rather than relying on
  undefined device behaviour.
- Voice-name bytes are serialized as printable ASCII by the editor. The FM1 handler accepts a raw
  value byte, but display behaviour for non-printable 7-bit values has not been tested and is not
  used by the UI.

### Editor implication

The editor's current live parameter-update approach is fundamentally aligned with the stock firmware.

### Remaining work

- Keep the parameter definitions as the authoritative address/range table and preserve the current
  table-driven coverage.
- Confirm the strongly inferred row-level ranges with controlled hardware captures before treating
  them as FM1 hardware-tested behaviour.
- Keep parameter encoding in domain/MIDI modules, not UI components.

---

## 1.2 Single voice and 32-voice bulk dumps

**Status: Confirmed**

The stock FM1 accepts normal Yamaha-format SysEx for:

- 32-voice bulk banks
- single 155-byte voices
- parameter changes

The firmware checks the DX7 checksum for bulk transfers.

### Editor implication

The existing editor's use of standard DX7 bank/voice formats is the correct interoperability layer and should remain separate from FM1-specific sequencer/effect/global data.

Do not redefine an FM1 sequence as part of a DX7 voice.

---

## 1.3 Synthesis engine identity

**Status: Confirmed at firmware-analysis level**

The FM1 firmware has a Dexed/msfa-derived six-operator FM synthesis engine. Reverse engineering has identified familiar msfa/Dexed tables and behaviour for operator pitch, velocity, envelopes and related DX7 calculations.

### Known differences from a DX7

**Status: Likely** (FM-1+VA documentation, 2026-09-28; not reproduced by this project)

The FM-1+VA manual (see Primary sources) names four ways M-VAVE's engine plays DX7 patches
differently from the original, all of which its firmware corrects:

1. Operator detune is too wide.
2. Fast LFOs run slow.
3. Algorithms 4 and 6 stay altered after any patch that uses feedback.
4. A note ended with a Note On of velocity 0 keeps sounding.

The editor sends Note Off (`8n`) messages for its keyboard, its audition phrases, and **MIDI panic**
(`sendNoteOff` and `sendEveryNoteOff` in `src/lib/midi.ts`), so the fourth does not affect it. Keep
it that way: never end a note with `9n kk 00`. The first three change how a patch sounds on the FM1
compared with Dexed or a DX7, not what the editor sends; they could inform help text once reproduced
on a stock FM1.

### Possible editor enhancements

This can be used as an authoritative reference for:

- display conversions
- frequency/rate labelling
- envelope visualisation
- velocity-sensitivity descriptions
- future "what this parameter does" help
- validation of algorithm/operator assumptions

These improvements are low risk because they do not require new device write protocols.

---

# 2. MIDI channel and controller behaviour

## 2.1 Channel filters

**Status: Confirmed**

The firmware maintains separate channel filtering for:

- notes
- continuous controllers

### Editor implication

The editor already exposes separate note/program and FM1 effect channels. Before changing this area, audit the existing interpretation against the firmware's channel filters and actual hardware behaviour.

---

## 2.2 Recognised controller messages

**Status: Confirmed in firmware**

The synth dispatch path explicitly handles:

- Note On / Note Off
- Program Change
- Pitch Bend
- CC1 Modulation Wheel
- CC2 Breath Controller
- CC4 Foot Controller
- CC64 Sustain

Controller changes flow through the synth's modulation-update path.

### MIDI panic

**Status: Confirmed over USB** (hardware test through the editor, 2026-09-23); Bluetooth MIDI
still needs a hardware test

The standard MIDI panic messages are Control Changes: All Notes Off (CC 123) and All Sound Off
(CC 120). The stock firmware accepts Control Change only on the CC channel and only for `cc ≤ 23`
(§4.5), so neither reaches the voices. The editor's **MIDI panic** button therefore sends an
ordinary Note Off, `8n kk 00`, for each of the 128 notes on the note channel
(`sendEveryNoteOff`). Note Off is handled above, so this releases a hanging note.

Hardware test on 2026-09-23, over USB: a note left sounding on the FM1 released when the editor
sent a **MIDI panic**, so the 128 back-to-back Note Off messages reached the voices. Bluetooth MIDI
is not yet tested: repeat the same check over it, and confirm the burst arrives without loss.
No persisted state, vendor command, or OTA/loader path is involved.

### Possible editor enhancements

Consider a small diagnostic/controller section rather than a large new feature:

- show currently recognised controllers
- provide an optional test control for modulation/breath/foot/sustain
- improve MIDI monitor decoding for these messages
- document which controllers the FM1 actually consumes

Do not assume these controller values are persisted settings.

---

# 3. Global transpose and note normalisation

**Status: Confirmed internally; external edit mechanism Needs hardware/protocol test**

The firmware note path applies a transpose offset centred around 24 internally:

```text
soundingNote = note + transposeValue - 24
```

Arpeggiator/sequencer note normalisation also uses octave/semitone offsets stored in the shared engine state.

### Possible editor enhancement

A future FM1 Settings or Performance section could expose transpose if a safe normal runtime command can be identified.

### Constraint

Do not implement a write control merely because the RAM field has been identified. We need a safe supported runtime control path first.

---

# 4. Arpeggiator

> **Arpeggiator audit (2026-09-16).** This section summarises the upstream FM-1-RE analysis at commit
> [`ec832f281ca165a7d5e0722985f3acb1465046d5`](https://github.com/AL-255/FM-1-RE/tree/ec832f281ca165a7d5e0722985f3acb1465046d5):
> principally [MIDI §5–§7](https://github.com/AL-255/FM-1-RE/blob/ec832f281ca165a7d5e0722985f3acb1465046d5/docs/io/05-midi.md#6-arpeggiator--sequencer),
> the [syscmd core](https://github.com/AL-255/FM-1-RE/blob/ec832f281ca165a7d5e0722985f3acb1465046d5/docs/io/11-ota-protocol.md#syscmd-core-normal-mode-device-control-cmd-ids-1748),
> and the V13 and V14 string dumps. The commits after `95eca84`, which the sequencer audit in §5
> used, change only OTA and reflash material. Offsets are V13 engine-state offsets (`ENG`, base
> `0x01C0E670`) and must not be projected onto V14 or V15 without testing.

## 4.1 Modes

**Status: Confirmed**

`arp_seq_mode_control` (`0x020201DC`) stores `0 = off`, `1 = arpeggiator`, `2 = sequencer` at
`ENG+40`. Leaving arp or sequencer mode sends note-off for every sounding note.

`arp_pattern_build` (`0x02020724`) switches on the pattern mode at `ENG+4786`:

| Value | Pattern      | Notes                                                                     |
| ----- | ------------ | ------------------------------------------------------------------------- |
| `0`   | Up           |                                                                           |
| `1`   | Down         |                                                                           |
| `2`   | Up/Down      | Mirrored append.                                                          |
| `3`   | Down/Up      |                                                                           |
| `4`   | Random       | Fisher–Yates shuffle seeded from the hardware random-number register.     |
| `5`   | Played Order | Quicksort over per-note press timestamps written by `arp_seq_note_input`. |
| `6`   | Off          | No rebuild.                                                               |

The mapping from these values to the stock menu labels (V14 strings include `Random`, `Order`, and
`Repeat`) is **Needs hardware test**.

## 4.2 Held notes, latch, and note range

**Status: Confirmed internally**

- The arpeggiator holds at most 27 notes. Each note has a held flag and a velocity byte whose bit 7
  marks it as latched, so the stock firmware has a hold/latch behaviour. The V13 and V14 strings
  include `Latch`.
- Held notes are normalised into a 27-semitone window:
  `idx = note - 53 - semitoneShift - 12 * octaveShift`, using the user octave and semitone shifts at
  `ENG+4779` and `ENG+4780` (the shared transpose state described in §3).
- The first note after the arpeggiator has been idle clears the held-note tables and flushes
  sounding notes.

How latch is switched on, and whether it survives a mode change, is **Needs hardware test**.

## 4.3 Octave expansion

**Status: Confirmed internally**

`ENG+4787` sets how many octaves the pattern repeats across, adding ±12 semitones per octave. Its
range and menu label are **Needs hardware test**.

## 4.4 Timing

**Status: Confirmed internally; units Needs hardware test**

- The arpeggiator and sequencer share one tick engine and scheduler. The minimum step is 30 ms.
- Step length comes from the four bytes at `ENG+4788..4791`, scaled by a gate percentage
  (`x * param / 100`). Which of these bytes is rate and which is gate is not established; see the
  per-bank gate, tempo, swing, and rate candidates in §5.4.
- Patterns are held as note/velocity pairs in a 432-byte buffer at `ENG+6808`, rebuilt when the
  dirty flag at `ENG+15` is set.
- The V14 strings near the arpeggiator labels include `Rate`, `Gate`, `Sync`, `Tempo`, and `Swing`,
  and the menu is split into `1/2 Arpeggio` and `2/2 Arpeggio` pages. `Sync` next to `Rate` and
  `Gate` appears in the V14 dump but not in V13; V13 has `Rate` and `Gate` without it. What `Sync`
  controls is **Unknown**.

## 4.5 External control

**Status: No runtime control path identified**

| Path                                   | Evidence                                                                                                                                                                                                               | Arpeggiator relationship                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Control Change                         | Accepted only on the CC channel and only for `cc ≤ 23`, grouped into the six effect slots (§7).                                                                                                                        | Confirmed non-path. Every accepted CC number is already an effect control.     |
| DX7 parameter change / voice dumps     | Writes the voice edit buffer or voice storage (§1).                                                                                                                                                                    | Confirmed non-path.                                                            |
| MIDI realtime (`F8`, `FA`, `FB`, `FC`) | The byte-stream parser consumes `0xF8..0xFF` one byte at a time. No clock-follow or Start/Stop handler is identified; arp mode start calls the OS tick update.                                                         | Unknown. Whether the V14 `Sync` option follows MIDI clock needs hardware test. |
| M-VAVE syscmd (`F0 35 59`)             | Commands 17–48 are decoded: 17 and 18 return fixed records, 21 drains a ring buffer, 33–36 call one of eight callback objects with no recovered stock object, 48 completes an armed transfer, and the rest are no-ops. | No arpeggiator command identified. 33–36 and 48 stay Dangerous / excluded.     |

Treat the arpeggiator as front-panel-only until a capture shows otherwise. Do not send guessed
syscmd requests to find one.

## 4.6 Hardware tests

Follow the one-change capture discipline in `AGENTS.md`, recording firmware version and transport:

1. With a MIDI clock source running, switch the V14/V15 `Sync` option and check whether the arp
   follows the external tempo and responds to Start/Stop. A positive result would give a
   plain-MIDI tempo path with no vendor protocol.
2. Change each arpeggiator menu value on the device (pattern, octave, rate, gate, latch, tempo, swing)
   with the MIDI monitor open, and record whether the FM1 sends anything.
3. Map each stock menu label and value range to the offsets above where captures allow.

### Editor opportunity

An Arpeggiator panel remains a future enhancement that depends on a safe runtime read/write path.
ARP-001 may model the confirmed modes and parameters without MIDI. Anything that sends data comes
after the tests above and after the sequencer data model is understood.

---

# 5. Internal sequencer

> **SEQ-001 audit (2026-08-31).** This section is an evidence inventory, not a
> browser protocol specification. It covers the upstream FM-1-RE V13 analysis at
> commit `95eca8488ac8c3b6f86287b2d3d43678e03e271a` and this editor's current
> code. See [SEQ-001 findings](seq-001-findings.md) for the hand-off summary and
> [SEQ-001A capture plan](seq-001a-capture-plan.md) for the hardware-fixture procedure.

## 5.1 Confidence vocabulary and evidence boundary

- **Confirmed**: directly supported by the V13 firmware control/data flow or current editor code.
- **Strongly inferred**: supported by names, ranges, or use sites, but not yet demonstrated on hardware.
- **Needs hardware test**: a plausible stock operation whose wire behaviour or user-visible meaning is unobserved.
- **Unknown**: no sufficient evidence. It must not drive editor behaviour.

Firmware conclusions below are not a claim of an externally callable protocol. In particular,
firmware RAM addresses are implementation evidence, not MIDI addresses. Firmware versions other
than the analysed V13 image, including the upstream V14 image, need independent confirmation.

Primary upstream evidence: [MIDI / sequencer analysis](https://github.com/AL-255/FM-1-RE/blob/95eca8488ac8c3b6f86287b2d3d43678e03e271a/docs/io/05-midi.md),
[synth-engine notes](https://github.com/AL-255/FM-1-RE/blob/95eca8488ac8c3b6f86287b2d3d43678e03e271a/docs/io/04-synth-engine.md), and the V13
analysis functions `0x02020042`, `0x020201DC`, `0x02020C0E`, `0x02022282`, and
`0x02022310`.

## 5.2 MIDI, SysEx, and vendor-command inventory

| Path                                  | Bytes / structure known                                                                                           | Sequencer relationship                                                                                                                                                                                 | Confidence                                       | Editor status                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------ |
| Ordinary MIDI Note On                 | `9n note velocity`                                                                                                | In mode `2`, `note_on_route` records the raw note and velocity into the selected pattern.                                                                                                              | Confirmed                                        | Can send notes, but does not select/arm a sequence or verify the result. |
| Ordinary MIDI Note Off                | `8n note velocity` (and the normal note-off route)                                                                | When the final held note is released in mode `2`, `note_off_route` closes the current record operation, writes byte 31 as `FF`, copies the bank timing index to byte 10, and advances the slot cursor. | Confirmed                                        | Can send notes, but has no sequencer-specific operation.                 |
| Yamaha DX7 parameter write            | `F0 43 10 gg pp vv F7`                                                                                            | The current editor constrains `pp` to the 155 DX7 voice parameters. No V13 evidence maps this path to sequencer data.                                                                                  | Confirmed non-path                               | Voice only; do not repurpose for sequencer fields.                       |
| Yamaha DX7 voice/bank bulk            | Yamaha single-voice or bank dump                                                                                  | No sequencer record is included in the editor's DX7 voice model or known dump handling.                                                                                                                | Confirmed non-path                               | Voice/bank send only.                                                    |
| Program Change                        | `Cn program`                                                                                                      | May select a voice program; no evidence it selects an internal sequencer pattern.                                                                                                                      | Needs hardware test for any indirect interaction | No sequence handling.                                                    |
| M-VAVE vendor frame                   | `F0 35 59 … F7`                                                                                                   | V13 recognises the framing and routes it to staged system-command handling before the standard MIDI handler. No sequencer command ID, request, reply, checksum, or payload layout is identified.       | Confirmed transport; Unknown sequencer command   | Not sent or parsed. Treat all unknown IDs as dangerous/excluded.         |
| USB/Bluetooth staged vendor transport | USB repacks 7-bit data; Bluetooth event `72` carries `{00,59,x,len_lo,len_mid,len_hi,…}` with a 1,046-byte bound. | Shared syscmd transport only. It is not evidence of a sequence read/write command and must not be probed by the editor.                                                                                | Confirmed transport; Unknown sequencer command   | Absent, correctly.                                                       |
| Device-to-host sequencer response     | None identified                                                                                                   | No captured or analysed response can be decoded as sequence state.                                                                                                                                     | Unknown                                          | Input is logged as raw bytes only.                                       |

There is no identified checksum for a sequence message because there is no identified sequence
message. The vendor marker must not be confused with OTA/loader traffic; unknown vendor commands
remain excluded under the repository safety rules.

## 5.3 V13 in-device representation

The V13 recorder and playback paths use a 32-byte record. For the selected logical bank and slot,
the working-RAM address is:

```text
0x01C128B0 + bank * 0x800 + slot * 0x20
```

`slot` is bounded to `0..15` by the firmware, confirming 16 slots per bank. The 2,048-byte bank
stride is much larger than 16 × 32 = 512 bytes; the remaining 1,536 bytes have not been assigned a
meaning. Do not infer additional pattern fields from that space. The observed 4 KiB working region
can hold two such strides, but that does **not** confirm a user-visible two-bank limit.

| Record offset | Representation / observed use                                                                                                                                                                                              | Classification                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `0..9`        | Ten signed note bytes. Non-negative values are played/considered valid; recorder writes incoming MIDI note values. Clearing writes `FF`, which is a rest in the signed test. Other negative sentinels are not established. | Confirmed; only `FF` as a rest is directly observed.                                                |
| `10`          | Per-record timing/rate selector. The recorder copies the selected bank value here; playback normalises values above `9` to the bank default.                                                                               | Confirmed storage/use; selector's musical labels/rate table are Strongly inferred.                  |
| `11..19`      | Present in the record but no field semantics are identified.                                                                                                                                                               | Unknown; preserve verbatim.                                                                         |
| `20..29`      | Ten velocity bytes paired by index with note bytes `0..9`; recorder writes input velocity and playback uses it when injecting notes.                                                                                       | Confirmed pairing/use. MIDI supplies `0..127`; storage behaviour outside that range is Unknown.     |
| `30`          | Valid-note count, recomputed by `seq_pattern_bank_scan` from non-negative note bytes and incremented while recording.                                                                                                      | Confirmed, range `0..10`; it is derived state rather than an independently reliable length control. |
| `31`          | Written as `FF` after the final note release; a non-zero value makes the next recording start clear count and note slots.                                                                                                  | Confirmed writes/branch; semantic name and bit meaning Unknown.                                     |

No checksum, 7-bit packing, or SysEx serialization is known for this record. It is an internal
RAM/flash layout, not a browser payload.

## 5.4 Parameters and structures

| Requested field / structure | What the evidence actually supports                                                                                                                                                                                                            | Classification                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Mode                        | Values `0 = off`, `1 = arpeggiator`, `2 = sequencer` at the mode-control path (`0x020201DC`).                                                                                                                                                  | Confirmed internally; no host command identified.                                |
| Steps / maximum length      | Ten note/velocity positions per 32-byte record. The derived valid count is `0..10`.                                                                                                                                                            | Confirmed.                                                                       |
| Note / pitch                | One raw MIDI-note byte per position (`0..9`), with global synthesis transposition elsewhere in firmware. Whether the stored value is presented as transposed in the stock UI is untested.                                                      | Confirmed raw storage; Needs hardware test for UI/transposition semantics.       |
| Velocity                    | One velocity byte per position (`20..29`).                                                                                                                                                                                                     | Confirmed.                                                                       |
| Rest                        | `FF` in a note slot is seen on clear and treated as negative by the scan/play logic.                                                                                                                                                           | Confirmed for `FF`; other rest/end encodings Unknown.                            |
| Gate / length               | Scheduler uses a per-bank byte at firmware state offset `4794 + bank`, constrained by stock UI code to `20..100` and used as a percent in note-off timing. No per-step gate byte is found.                                                     | Strongly inferred global gate percentage; per-step gate Unknown.                 |
| Tie                         | No record bit, branch, or dedicated timing path identified.                                                                                                                                                                                    | Unknown.                                                                         |
| Accent                      | No dedicated bit/field identified. Velocity may create an audible accent but is not a separate accent parameter.                                                                                                                               | Unknown.                                                                         |
| Tempo                       | Stock UI constrains a per-bank halfword at `4842 + bank*2` to `30..300`; scheduler reads it for timing.                                                                                                                                        | Strongly inferred tempo in BPM; exact unit/conversion Needs hardware test.       |
| Swing                       | Stock UI constrains a per-bank byte at `4810 + bank` to `50..75`; scheduler alternates timing using it.                                                                                                                                        | Strongly inferred swing amount/percent; exact scale Needs hardware test.         |
| Direction / play mode       | Values `0..6` at state offset `4786` are used by the arpeggiator held-note builder (up/down/up-down/down-up/random/played order/off). They are not evidence of a sequencer-pattern direction field.                                            | Confirmed arpeggiator structure; Unknown for sequencer direction.                |
| Pattern selection           | State selects `slot 0..15`; recording and playback address that slot.                                                                                                                                                                          | Confirmed internally; external selection command Unknown.                        |
| Bank selection / count      | A bank index participates in the `0x800` stride and flash address. The number of stock user banks and how to select them over MIDI are not established.                                                                                        | Needs hardware test / Unknown.                                                   |
| Timing/rate index           | Per-bank byte `4826 + bank`, constrained to `0..9`, copied into record offset `10`.                                                                                                                                                            | Confirmed range/copy; Strongly inferred musical rate selector.                   |
| Per-step parameters         | Note and velocity only. Bytes `11..19` are unresolved; no per-step gate, tie, accent, probability, or automation was found.                                                                                                                    | Confirmed for note/velocity; Unknown otherwise.                                  |
| Persistence                 | Mode entry loads 4,096 bytes from a banked flash address into `0x01C128B0`; firmware also contains a 4,096-byte write of that working region to flash. The stock UI action, dirty-state timing, and reboot persistence have not been observed. | Confirmed load/write routines; Needs hardware test for user-visible persistence. |

The V13 timing-table analysis has a rodata-address anomaly in upstream work: the declared table
address does not match the expected bytes in the supplied image. Do not publish literal rate values
for indices `0..9` without a runtime or hardware capture.

## 5.5 Current editor audit

The editor has no sequence domain model, codec, request/reply parser, vendor-frame encoder, or
device-persistence detector. It therefore currently cannot read sequence state, write one sequence
field, write a complete pattern, select/trigger/save/load a pattern, or detect whether a sequence
survived a device save/reboot.

The only indirect path is the generic note sender in [`src/lib/midi.ts`](../src/lib/midi.ts), used by
[`use-midi.ts`](../src/hooks/use-midi.ts). It can emit Note On/Off, which V13 may record only after
the user has put the hardware in sequencer-recording state. The application neither enters that
state nor verifies the selected bank/slot, so it is not a safe sequence-writing feature. Incoming
MIDI is only appended to the activity log. The patch editor builds history from 155 DX7 voice bytes
plus 24 effect bytes; it has no sequence data boundary.

## 5.6 Contradictions and anomalies resolved by this audit

- The previous wording called byte 31 a `flags` field and suggested multiple negative sentinels.
  Firmware only establishes a non-zero test and writes `FF`; its semantic name and all other
  negative values remain Unknown.
- The previous wording called swing a toggle. The observed alternating byte is runtime phase; the
  candidate user value is the separate per-bank `50..75` field. Its label/scale still needs hardware
  confirmation.
- Arpeggiator direction modes are not sequence direction modes. They operate on a held-note list.
- A 4 KiB RAM buffer and two 2 KiB strides do not prove two user banks. The exposed bank count is
  unresolved.
- Internal flash read/write calls do not establish a browser-accessible upload/download command or
  automatic persistence. No such transport is known.
- V13 addresses and ranges must not be projected onto V14 without testing.

## 5.7 Hardware tests and implementation boundary

Follow the one-change capture discipline in `AGENTS.md`: baseline, one stock control change,
capture, diff, repeat, reconnect/reset. The exact version-labelled fixture contract and complete
core matrix are in [SEQ-001A capture plan](seq-001a-capture-plan.md). Required captures include
mode change, bank/slot change, one note/velocity recording, rest/clear, each timing control, save,
reboot, and any device response. Record hardware firmware version and transport (USB/Bluetooth) for
every fixture.

**SEQ-001A status (2026-08-31):** V15 USB CoreMIDI fixtures are preserved in
[`sequencer-fixtures/V15/`](sequencer-fixtures/V15/). The device is strongly evidenced as V15 because
the operator installed the Glide update and Glide is visible, although the stock device shows no
firmware string at boot. Hardware confirms observable V15 behaviour: a Step length selectable from
1 through 16, ordered 16-note playback, global Gate-controlled playback duration, velocity-preserving
playback, Clear Step rests, separate Pattern 1/2 state, volatile unsaved state, and saved-pattern
survival across power cycling. No vendor/SysEx message was observed or transmitted. These fixtures do
not alter any V13 byte-layout confidence: no raw sequence state or safe request/reply was captured.

The minimum useful editor-facing feature set remains blocked on verified raw V13 state and a safe
read path. Do not infer a V15 codec from its 16 observable steps, or add generic transport, tracks,
piano-roll/DAW features, guessed metadata, or arbitrary vendor-command transmission.

## 5.8 SEQ-001B — host recording semantics

**Status: Confirmed observable V15 behaviour (2026-09-17). Standard channel MIDI only; no SysEx or
vendor frame was sent or observed in either direction.**

Six fixtures in [`sequencer-fixtures/V15/`](sequencer-fixtures/V15/) resolve the three behaviours
that decide whether a host can author a pattern rather than only load a run of notes. Each was run
twice. The device baseline throughout was Pattern 1, Chain 1, Step 9, Voice 1, Rate `1/8T`,
Tempo 120, Gate 80%, Swing 50%, Sync `OFF`, Transpose 0, giving a 166.7 ms step and a 1,500 ms loop.

| Question                                                     | Result                                                                                                                                   | Fixtures                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Can a host advance the step cursor without sounding a note?  | **Yes.** A Note On with velocity 0 (`90 nn 00`) sent on its own advances the cursor one step and records a silent step.                  | `seq-V15-pattern-01-host-rest-single`, `-host-rest-double`                 |
| Do two identical successive notes create two distinct steps? | **Yes.** Two host note 60 recordings occupied steps 1 and 2 and played back twice per loop, 166 ms apart. Repeated pitches do not merge. | `seq-V15-pattern-01-repeated-note-60-run-1`, `-run-2`                      |
| Does recording start at step 1 or at the selected step?      | **Step 1, always.** Arming record places the cursor at step 1; a pass overwrites forward from there and leaves later steps intact.       | `seq-V15-pattern-01-record-start-position-g4`, `-record-start-position-a4` |

The rest result is a clean differential ladder on one variable, the number of velocity-0 messages
sent between two recorded notes. The interval between those notes on playback was 166 ms with no
rest (the 2026-08-31 two-step fixture), 333 ms with one, and 500 ms with two. Consecutive rests
therefore accumulate one step each.

A further observation, repeated across all six captures: **the FM1 transmits nothing while it is
recording.** It does not echo host-sent notes. Every captured device message was a later playback
pass. An editor that transmits a pattern therefore cannot contaminate its own observed read, though
a user playing the device's keys still can.

### What this does not establish

- Nothing about the internal record layout. No raw V15 record bytes were captured, and the V13
  `FF` rest hypothesis in §5.3 remains firmware evidence that these captures neither confirm nor
  refute. A silent step observed on playback is not evidence of any stored byte value.
- Nothing about persistence. No `SAVE` was performed, so all six patterns were volatile.
- Nothing about arming, pattern selection, chain, or any page-2/3 control. All remain stock-UI-only,
  as §5.7 states.
- Whether velocity 0 is the only step-advance encoding. A bare Note Off was not tested.

### Consequences

A host-authored pattern can express pitch, attack velocity, rests, repeated pitches, and position
within the loop. That is the whole of the observable V15 model in §5.7 except the pattern-global
controls, so SEQ-OBS-001 may model rests as `transmittable: true`, and SEQ-REC-001 is unblocked.
Because a recording pass overwrites forward from step 1 and leaves later steps, a transmit that
sends fewer steps than the pattern already holds leaves a tail of old steps behind; the operation
must send a full loop's worth of steps or state plainly that it does not.

---

## 5.9 SEQ-REC-001 — the stock recording input contract

**Status: documentation complete (2026-09-17). Standard channel MIDI only; no implementation yet.**

[SEQ-REC-001 recording contract](seq-rec-001-recording-contract.md) states what the editor may
transmit to record a pattern through the stock recording path: the manual arming sequence, the exact
per-step bytes (`9n nn vv` / `8n nn 00` for a sounding step, `9n 3C 00` alone for a rest), the
captured spacing floor of an 80 ms hold and a 100 ms step period, the validation bounds, and the
failure and recovery story.

Three points from it govern any later work in this track:

- The operation replaces the whole recorded sequence. A pass always starts at step 1 and overwrites
  forward, so the editor transmits exactly a loop's worth of steps, padding silence with rests, and
  can never update one step in place.
- The device acknowledges nothing, so a completed pass is reported as sent, not as recorded.
  Confirmation comes only from observing a later playback pass (SEQ-OBS-002).
- Arming, pattern selection, Step length, and the stock `SAVE` remain manual, and a failed pass is
  never retried automatically.

Three items remain **Needs hardware test** before SEQ-REC-002 can claim verification: an
editor-transmitted pattern with rests at the 100 ms step period, a committed fixture for sending
more steps than the loop length, and pitch behaviour at a non-zero device Transpose.

---

# 6. Vendor-specific FM1 protocol

## 6.1 Vendor SysEx marker

**Status: Confirmed**

The MIDI task recognises vendor-specific SysEx beginning with:

```text
F0 35 59 ... F7
```

The firmware has explicit handling for this M-VAVE-specific channel.

---

## 6.2 Staged vendor/syscmd transport

**Status: Confirmed as an internal transport; command catalogue incomplete**

Reverse engineering identifies a larger vendor/system-command path shared between USB-MIDI and Bluetooth.

USB MIDI:

- performs 7-bit/8-bit packing/unpacking for binary payloads
- stages data in a shared scratch area
- dispatches to a common system-command handler

Bluetooth:

- uses a related framed command path
- converges on the same dispatcher

[ip2k/mvave-fm1-open-firmware `docs/03-update-protocol.md` §4](https://github.com/ip2k/mvave-fm1-open-firmware/blob/main/docs/03-update-protocol.md#4-the-syscmd-device-control-family-normal-mode-separate-from-ota)
independently documents this same family (framing `[00 59][cmd:1][len:3 LE][payload][~sum(payload)]`,
a 32-entry dispatch table) and sharpens why commands 33–36 and 48 stay excluded: 33–36 call methods
on one of eight callback objects whose population is unknown, and 48 "completes an armed transfer"
by copying memory after a token/length match. This does not change this project's existing rule
below; it corroborates it.

### Why this matters

This may be the route used for runtime FM1-specific configuration beyond ordinary Yamaha DX7 SysEx.

Potential targets to investigate:

- sequencer pattern read
- sequencer pattern write
- arpeggiator parameters
- global settings
- effect state
- storage operations
- device information

### Research requirement

Before implementation, build a command catalogue:

| Command | Purpose | Direction | Confidence | Safe runtime? | Tested on hardware? |
| ------- | ------- | --------- | ---------- | ------------- | ------------------- |
| TBD     | TBD     | TBD       | TBD        | TBD           | TBD                 |

Do not send unknown command IDs experimentally without understanding their destination.

---

## 6.3 Updater preset restore over manufacturer ID `00 32`

**Status: Needs hardware test. Treated as Dangerous / excluded.**

> Recorded 2026-09-13 and corrected 2026-09-14 from a third-party capture reported in
> [issue #19](https://github.com/benny-sparra/fm1-dx7-patch-importer/issues/19) and documented in
> [KingParamount/fm1-factory-presets `docs/protocol-and-provenance.md`](https://github.com/KingParamount/fm1-factory-presets/blob/18ea89eab2b27c4c2c51c095ab063253ae658b88/docs/protocol-and-provenance.md)
> at commit `18ea89eab2b27c4c2c51c095ab063253ae658b88`. This project has not reproduced the capture,
> has no fixture of it, and has not observed it through the editor.

### Source of the observation

The traffic was captured while the Chinese-language M-VAVE Windows updater ran its preset-restore
function over USB. MIDI Monitor recorded both directions at once: its output spy showed what the host
sent to the FM1, and the FM1 was also monitored as a source, which is how its replies appear. The
same updater build is reported to downgrade firmware to v14. The capture is therefore **update-tool
traffic**, not traffic from a stock front-panel operation, and it has not been separated from the
tool's update or loader session.

### Reported exchange

The log holds 48 SysEx rows in about 200 ms. Four are the identify message on IAC Driver Bus 1: the
updater polls every MIDI destination, so those are not FM1 traffic. The remaining 44 are the restore:

| Step | Direction      | Reported bytes                                                         | Notes                                                                                    |
| ---- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | Host → FM1 ×2  | `F0 00 32 45 00 00 00 40 7F F7`                                        | Described as identify. The identify exchange (steps 1 and 2) runs twice in a row.        |
| 2    | FM1 → host ×2  | `F0 00 32 45 58 01 00 00 23 4D 5A 44 79 05 26 4C 1A 00 … 20 06 F7`     | 41 bytes, mostly zero. ASCII `#MZD`, then five bytes that may be a version or serial.    |
| 3    | Host → FM1 ×4  | `F0 00 32 05 29 00 00 40 02 00 SS 00 00 20 CK F7`                      | Setup. `SS`/`CK` run `00`/`1F`, `20`/`1D`, `40`/`1B`, `60`/`19`. Purpose unknown.        |
| 4    | FM1 → host ×4  | `F0 00 32 01 08 00 00 00 00 7F 01 F7`                                  | Acknowledgement after each setup message; same bytes as step 6.                          |
| 5    | Host → FM1 ×16 | `F0 00 32 09 41 40 00 40 02 00 SS 00 00 00 00 01 00 ‖ payload ‖ CK F7` | 1,190 bytes each: `F0`, 16 header bytes, 1,171 payload, `CK`, `F7`. `SS` runs `00 … 78`. |
| 6    | FM1 → host ×16 | `F0 00 32 01 08 00 00 00 00 7F 01 F7`                                  | Acknowledgement; each is received before the next block is sent.                         |

Only the byte in the `SS` position changes between the four setup messages. Read as a raw septet,
`00 20 40 60` is voice 0, 32, 64 and 96, the first slot of each 32-voice bank, which matches how the
voice blocks address their first voice. That suggests the setup messages concern banks, not
firmware, but does not show what they ask the device to do.

Reported payload encoding: a continuous 7-bit bitstream, least-significant bit first both within
each septet and within each reassembled byte. 1,171 septets unpack to 1,024 bytes (8,192 bits),
which are eight 128-byte packed DX7 voices. The 16-byte header length is confirmed by decoding: with
16 header bytes the first block names read `PIANO 1`, `ORGAN 1`, `SYN LEAD 1`; with 15 or 17 they are
unreadable. 16 blocks give 128 voices in the order of the four stock banks.

### What is corroborated here

The four `FM-1_factory_bank1-4.syx` files rebuilt from that decode each pass this editor's
`parseDx7Bank` rules when checked on 2026-09-13: 4,104 bytes, `F0 43 00 09 20 00` header, 7-bit voice
data, a valid DX7 checksum, and a trailing `F7`. The decoded names include device quirks that would be
unlikely to survive a wrong decode (`Organ 2`, `PIANO3`, `BI   BEN`, and `SAW EM UP`/`2`/`3` holding
one voice).

The contributor also compared the 112 parameter bytes of each decoded voice, names excluded, against
independent copies of reference banks: 126 of the 128 are byte-identical to voices in the community
Dexed_cart 1.0 collection, and 40 trace to Yamaha ROM or VRC cartridges. A wrong decode could not
produce exact matches against that many independent voices, so the payload decode is well supported.
None of this says anything about the framing, setup messages, checksum, persistence, or safety of
sending the exchange.

### Checksum lead (unconfirmed)

The contributor found no plain or two's-complement sum or XOR over header, payload or decoded data
that matches all sixteen voice blocks. A check here on the four published setup messages found one
rule that fits them: take the eight septets from the second `00` after `29` up to `CK`
(`00 40 02 00 SS 00 00 20`), unpack them with the same LSB-first bitstream as the payload, add the
seven resulting bytes, and `(sum + CK) & 7F` is `7F` in all four. It does **not** fit the
acknowledgement, the start position was chosen to fit, and the four messages differ in only one byte,
so this is a lead to test against the voice blocks, not a result. Under that reading the setup slot
field unpacks to 0, 2, 4, 6 rather than 0, 32, 64, 96, which would also need explaining.

### Relationship to known vendor paths

The `00 32` frames are not the `F0 35 59 … F7` marker in 6.1, and no link to the staged
vendor/syscmd dispatcher in 6.2 or to the OTA path in section 9 has been established. The third byte
changes with the message type: `45` identify, `05` setup, `09` voice block, `01` acknowledgement. In
standard MIDI a three-byte manufacturer ID is `00` plus two bytes, so either the ID is `00 32`
followed by a command byte, which is non-standard, or each message uses a different ID. A command
byte is the more likely reading, but neither is confirmed.

### Contradiction with earlier assumptions

Earlier notes say the FM1 sends nothing back: SEQ-001A saw no device-to-host packet during stock
sequencer operations, and the README says no voice or bank transmission is documented. The
contributor's own summary repeats that the FM1 "never sends" SysEx. This capture shows **solicited**
replies: identity replies and acknowledgements after each setup message and voice block. That does not contradict the absence of
unprompted traffic or of voice readback, since no reply carries voice data. It does mean "the FM1
transmits nothing" is too strong. Use "no unsolicited traffic and no known voice readback"
instead.

### Editor rule

- Production code must not send, construct, or expose any `00 32` message: not setup, not bank
  blocks, and not a generic transmitter. The one exception, approved on 2026-09-29, is the identity
  query `F0 00 32 45 00 00 00 40 7F F7` (`fm1IdentityQuery` in `src/lib/fm1-firmware.ts`), which
  reads the firmware name and changes nothing. The editor sends it when the ports in use change,
  so it can tell M-VAVE's firmware from FM-1+VA and leave others, such as Felucca, unidentified
  (see Primary sources).
- Do not replay the capture, or any part of it, to hardware from editor or test code.
- Standard Yamaha 32-voice bank dumps (1.2) remain the only bank-write path.
- The identity reply carries only the firmware name, such as `FM-1_015`, and no serial (open
  question 6), so the committed reply fixtures need no redaction. Never send the name to analytics
  or monitoring; analytics records only the firmware family it was classified as.
- Do not require the reply's checksum. FM-1_089 answers
  `F0 00 32 45 58 01 00 00 23 4D 5A 44 79 05 06 4E 1C 00×21 20 06 F7` (captured 2026-09-29): its
  name with M-VAVE V15's checksum byte, which does not match it. The editor first rejected this
  reply and fell back, safely, to treating the firmware as unidentified.
- A slot-addressed bank write stays a parked research item in the roadmap until the open questions
  below are answered by stock-safe evidence.

### Open questions

1. What do the four setup messages ask the device to do, and do any enter the updater, loader, OTA,
   or flash-erase path described in section 9? Only their varying bank-slot byte is identified.
2. Is a preset restore possible without the updater's firmware downgrade, or is the restore part of
   the same session?
3. Does a block write go to RAM, to flash immediately, or only after a later setup/commit message?
   What happens if the sequence is interrupted?
4. How is `CK` calculated, and what does the device do with a wrong checksum? Does the setup-message
   lead above hold for the voice blocks?
5. What do the fixed header bytes (`41 40 00 40 02 00` and `00 00 00 00 01 00`) mean? Is `SS` the
   index of the first voice in the block, and is a block count other than eight allowed?
6. Is `00 32` M-VAVE's registered ID with a command byte after it, or is the third byte part of the
   ID? Is the identity reply stable across firmware v13, v14 and v15, and is part of it a unique
   serial?

   **Partially resolved 2026-09-22** by
   [ip2k/mvave-fm1-open-firmware `docs/03-update-protocol.md`](https://github.com/ip2k/mvave-fm1-open-firmware/blob/main/docs/03-update-protocol.md),
   citing a hardware-verified capture (2026-09-06, device `FM-1_015`) and AL-255's disassembly of
   the on-device loader: the identical `F0 00 32 45 00 00 00 40 7F F7` query and 41-byte reply this
   document already recorded are a 7-bit LSB-first packing of a 34-byte JieLi ID block
   `00 59 11 | len 27 | "FM-1_015" + zero padding | checksum`, where `checksum = ~sum(body) & 0xFF`.
   The plain field carries the device's whole `MODEL_NNN` identity string, not a separate firmware
   version number. This still does not test the `05`/`09`/`01` setup, voice-block, and
   acknowledgement messages, so `SS`/`CK` and the rest of the restore exchange remain open here, and
   this reading has not been reproduced by this project.

7. Why does the updater identify the device twice before the restore?
8. Does the acknowledgement ever differ, for example on error, and is a reply expected on
   Bluetooth MIDI as well as USB?
9. Does the same `00 32` family offer a read or bulk-dump request, or is it host-to-device only?

Resolved on 2026-09-14 by the contributor re-reading the capture: the header is 16 bytes after `F0`
(1,190 bytes per block), and the 48 logged rows are 44 restore messages plus 4 identify polls sent to
another MIDI destination.

---

# 7. Effects

**Status: M-VAVE's published MIDI-control guide was compared with the editor on 2026-09-01 and
matches its FX map/ranges. A repeated V15 hardware run confirms Filter Switch/Cutoff compatibility;
V15 persistence, interaction, scaling, and above-range behaviour remain unresolved.**

## 7.1 Current editor data flow

The shipped control path is:

```text
EffectsUnit control
  -> parameter definition (effect id, CC number, UI maximum)
  -> editor state byte at index 155 + CC number
  -> PatchEditorPage.setEffectParameter(CC, value)
  -> useMidi.sendEffectParameter(CC, value)
  -> sendFm1EffectControl(output, selected effect channel, CC, value)
  -> ordinary three-byte MIDI Control Change
```

Effect state is a 24-byte array ordered by controller number. It is deliberately separate from the
155-byte DX7 voice. A live edit sends one CC. Initial patch synchronization, explicit resend,
undo/redo synchronization, and revert synchronization send the voice first and then all 24 effect
CCs in ascending order from 0 through 23. All 24 values are sent even when an effect is bypassed.

The editor does not scale or transform effect values. Select options use their zero-based option
index, switches use 0 or 1, and sliders send the displayed integer directly. The `%` suffix on most
0–100 controls is therefore a UI label, not an implemented percentage conversion.

## 7.2 Message and channel behaviour

Every effect write is an ordinary MIDI Control Change, not SysEx and not an FM1 vendor command:

```text
Bn cc vv
```

Where:

- `n = selected effect channel - 1`, from `0` through `F`
- `cc = effect controller`, from `00` through `17` hex (0 through 23 decimal)
- `vv = raw UI value`, constrained by the editor's per-controller maximum

The effect channel is independently selectable from MIDI channels 1–16, defaults to channel 2,
and is persisted in browser storage under `fm1-midi-effect-channel`. It may be set to the same value
as the note/program channel; the editor does not enforce separation. For example, chorus depth 75
on the default effect channel is `B1 12 4B`.

The public firmware reverse engineering independently confirms that the stock handler accepts CC
numbers up to 23 only when the message's zero-based channel nibble equals the firmware's configured
CC channel. It also identifies six three-value effect slots selected by CC groups. This corroborates
the editor's overall CC count, grouping, and separate-channel transport. It does **not** document the
editor's effect names, parameter names, option ordering, legal maxima, or value-to-DSP scaling. The
reverse-engineering notes also mark the final dispatch target as low confidence because the apparent
table contents in the V13 image cannot be called as function pointers without runtime patching or a
different interpretation. See [FM-1-RE MIDI §7, CC map](https://github.com/AL-255/FM-1-RE/blob/main/docs/io/05-midi.md#7-cc-map-6-slots)
and [FM-1-RE synth engine §4](https://github.com/AL-255/FM-1-RE/blob/main/docs/io/04-synth-engine.md#4-synthesis-engine).

## 7.3 Provenance used in the inventory

- **E1 — legacy editor mapping:** the complete 24-control table, ranges, effect-channel default, and
  CC sender entered repository history together in commit `157fff5` (2026-08-04). Commit `5ffc95a`
  centralized the same meanings in `src/lib/fm1-parameters.ts`. Neither commit cites a protocol
  document, capture, reverse-engineering address, or hardware test record.
- **R1 — public firmware reverse engineering:** corroborates the six-slot CC 0–23 transport and
  channel gate only, as described above. It does not corroborate the row-level semantics.
- **H1 — hardware evidence:** no repeatable capture, fixture, test procedure/result, firmware
  version, or physical-device observation supporting an individual row was found in this
  repository. General product copy saying the effect editor works is not enough to meet this
  document's repeated-hardware-testing standard.

Accordingly, every semantic mapping below is **Needs hardware test**. This does not claim the
existing behaviour is wrong; it records that its provenance is insufficient for a stronger protocol
confidence label. The transport envelope described in §7.2 is **Confirmed at firmware-analysis
level**.

## 7.4 Current effect-control inventory

`Bn` always uses the selected effect channel as defined in §7.2. Decimal ranges are shown because
the UI and code use decimal values; the message's `cc` and `vv` bytes are transmitted as their raw
7-bit binary values.

| Effect     | Parameter | UI range | Encoded/device range | MIDI message | Effect-channel usage | Source / provenance   | Confidence          | Hardware-tested status | Notes / uncertainties                                                                                                  |
| ---------- | --------- | -------: | -------------------: | ------------ | -------------------- | --------------------- | ------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Filter     | Enabled   |      0–1 |              0–1 raw | `Bn 00 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Filter     | Type      |      0–2 |              0–2 raw | `Bn 01 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI labels 0 low-pass, 1 band-pass, 2 high-pass; option order is not independently documented.                          |
| Filter     | Cutoff    |    0–107 |            0–107 raw | `Bn 02 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | No display conversion; the unusual maximum 107 is an undocumented magic number. Frequency curve and units are unknown. |
| Filter     | Resonance |     0–10 |             0–10 raw | `Bn 03 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | No display conversion. Device/DSP range and curve are unknown.                                                         |
| Reverb     | Enabled   |      0–1 |              0–1 raw | `Bn 04 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Reverb     | Space     |      0–2 |              0–2 raw | `Bn 05 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI labels 0 room, 1 hall, 2 plate; option order is not independently documented.                                       |
| Reverb     | Decay     |   0–100% |            0–100 raw | `Bn 06 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Time range, units, curve, and whether the stock term is “decay” are unknown.                          |
| Reverb     | Mix       |   0–100% |            0–100 raw | `Bn 07 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic; dry/wet law is unknown.                                                                               |
| Delay      | Enabled   |      0–1 |              0–1 raw | `Bn 08 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Delay      | Decay     |   0–100% |            0–100 raw | `Bn 09 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. It is unclear whether the device parameter is decay, feedback, or another related value.              |
| Delay      | Rate      |   0–100% |            0–100 raw | `Bn 0A vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. An informal listen heard higher values repeat faster (FX-003 §8); units and curve unknown.            |
| Delay      | Mix       |   0–100% |            0–100 raw | `Bn 0B vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic; dry/wet law is unknown.                                                                               |
| Distortion | Enabled   |      0–1 |              0–1 raw | `Bn 0C vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Distortion | Gain      |   0–100% |            0–100 raw | `Bn 0D vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Gain units and curve are unknown.                                                                     |
| Distortion | Tone      |   0–100% |            0–100 raw | `Bn 0E vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Tone direction, units, and curve are unknown.                                                         |
| Distortion | Level     |   0–100% |            0–100 raw | `Bn 0F vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Output-level law is unknown.                                                                          |
| Chorus     | Enabled   |      0–1 |              0–1 raw | `Bn 10 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Chorus     | Frequency |   0–100% |            0–100 raw | `Bn 11 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. LFO frequency range, units, and curve are unknown.                                                    |
| Chorus     | Depth     |   0–100% |            0–100 raw | `Bn 12 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Modulation-depth units and curve are unknown.                                                         |
| Chorus     | Mix       |   0–100% |            0–100 raw | `Bn 13 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic; dry/wet law is unknown.                                                                               |
| Phaser     | Enabled   |      0–1 |              0–1 raw | `Bn 14 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | UI treats 0 as bypassed and 1 as enabled; device polarity is not independently documented.                             |
| Phaser     | Frequency |   0–100% |            0–100 raw | `Bn 15 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Sweep-frequency range, units, and curve are unknown.                                                  |
| Phaser     | Depth     |   0–100% |            0–100 raw | `Bn 16 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic. Sweep-depth units and curve are unknown.                                                              |
| Phaser     | Mix       |   0–100% |            0–100 raw | `Bn 17 vv`   | Selected FX channel  | E1; R1 transport only | Needs hardware test | Not recorded           | `%` is cosmetic; dry/wet law is unknown.                                                                               |

The table's “encoded/device range” is the range the editor will transmit, not a claim that every
value is accepted or interpreted across that full range by stock firmware.

This table is V15's and earlier. V16 moved the effect controllers to CC 70–93 and stopped taking
CC 0–23 as effects, by its release notes; see [M-VAVE's V16 stock firmware](#m-vaves-v16-stock-firmware).

## 7.5 Audit findings and follow-up candidates

No existing effect behaviour was changed by this audit. The following implementation details are
suspicious or insufficiently documented:

1. The semantic CC map and maxima have no cited origin. In particular, cutoff 107, resonance 10,
   the repeated 100 maxima, both three-option orders, and all UI parameter names need a controlled
   hardware capture or stronger firmware trace.
2. Values displayed with `%` are raw 0–100 integers. No evidence establishes a linear percentage or
   the DSP units behind those controls.
3. `PatchEditorPage.setEffectParameter` permits 0–127 in editor history, while the UI schema,
   stored-state normalizer, and MIDI encoder use per-controller maxima. Normal UI input remains
   bounded, but this is an inconsistent internal validation boundary.
4. Logging builds bytes with `makeFm1EffectControlMessage`, while transmission separately asks
   WebMidi to encode `sendControlChange` from the same arguments. The two paths currently agree,
   but they duplicate the representation of the outgoing message and could drift.
5. The firmware reverse-engineering CC dispatch has an unresolved table/address anomaly and a
   low-confidence final call target. It should not be used to infer more row-level meaning without
   a newer firmware trace or hardware observation.
6. Current unit tests sample chorus depth, filter cutoff, filter type, and filter resonance bounds,
   but do not table-test all 24 controller/range pairs.

Candidate follow-up tasks, without implementation in FX-001:

- **FX-002:** table-driven tests for every existing CC/range, plus the selected effect-channel status
  byte and full-transfer order.
- A hardware-capture task that changes one stock effect control at a time across at least three
  values, reconnects, repeats, and records firmware version, message bytes, audible/UI result, and
  persistence behaviour.
- A firmware-analysis task to resolve the V13 effect dispatch table anomaly and identify parameter
  transforms without treating internal DSP coefficients as user-editable controls.
- After evidence exists, a narrowly scoped naming/display audit for “delay decay/rate” and the
  percentage suffixes. Do not change names, ranges, or scaling before that evidence is recorded.

## 7.6 FX-002 automated-coverage findings

FX-002 added one declarative 24-row mapping fixture and table-driven tests that protect:

- every effect/parameter ID, controller number, value kind, and current metadata range;
- representation of all four controls for each of the six effects;
- storage normalization against every parameter maximum;
- editor-history clamping at every parameter's lower and upper boundary;
- raw `Bn cc vv` encoding at both boundaries for every controller;
- rejection of below-range, above-range, and fractional MIDI values for every controller;
- the default channel-2 status byte, channel 1/16 status bytes, and channel changes that leave the
  controller/value bytes unchanged;
- the shared Control Change transport used by enable, enumerated type/space, and continuous values;
- complete-state transmission of CC 0 through CC 23 in ascending order on the selected effect
  channel.

The FX-001 audit found that `PatchEditorPage` used a generic 0–127 range when recording effect
history even though the UI metadata, stored-state normalizer, and MIDI boundary use parameter-specific
maxima. FX-002 made the minimal internal-consistency change: effect edits now use the existing
metadata minimum and maximum when entering history. No parameter name, range, label, scaling,
control layout, transport, or user-visible semantic behaviour changed. Values outside the metadata
range continue to be clamped by storage/history normalization and rejected at the MIDI boundary.

No additional implementation inconsistencies were found by the new coverage. M-VAVE's published
MIDI-control guide now corroborates the six-slot CC 0–23 map, separate effect channel, controller
meanings, enum order, and maxima. FX-002 used no hardware and introduced no SysEx, vendor command,
OTA, loader, flash, or recovery path. V15-specific persistence, interaction, scaling, and
above-range behaviour remain separate evidence questions.

## 7.7 FX-003 controlled hardware-verification status

The complete reproducible 24-row hardware matrix, exact probe messages, measurement guidance,
persistence/interactions pass, evidence ledger, and FX-004 gate are in
[`docs/fx-003-hardware-verification.md`](fx-003-hardware-verification.md).

FX-003 added a development-build-only **FX probe (dev)**. It can send exactly one known FX CC
(`0..23`) with any 7-bit value (`0..127`) on the selected FX channel and records the exact bytes in
the existing local MIDI log. It exists solely to exercise values outside historical editor limits;
it is absent from the production UI and does not change normal editor validation or transport. It
does not send SysEx, vendor commands, OTA/loader traffic, flash writes, or a generic MIDI utility
interface.

On 2026-09-01, the M-VAVE [FM-1 MIDI Control English guide](https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/releaseNote/firmware/FM-1%20MIDI%20EN.docx)
was retrieved from the [official download centre](https://www.m-vave.com/download). It matches the
editor's FX CC 0–23 grouping, order, maxima, switch rule, and enum order. On a connected V15 FM1,
repeated channel-2 tests confirmed Filter Switch `B1 00 00` as off and `B1 00 01` as on, and showed
the documented Cutoff endpoints 0 and 107 produce a large audible contrast. No FX-004 code change
is justified: the published map agrees with the implementation. The remaining V15 questions are
persistence, interaction/routing, scaling/display units, and above-range behaviour; they do not
authorize a correction without further targeted evidence.

On 2026-09-14, an informal run on a connected FM1 (firmware version not recorded) found that
effects sent to the edit buffer over CC were no longer audible after the library page selected
another A–D slot and then the edited slot again with Program Changes. Once the library page sent
the patch's saved effects after each Program Change, they were retained. This is **Likely**
evidence that effect state does not follow a program across a Program Change, so the browser
library resends saved effects when it selects a slot. It does not settle whether effects reset,
load from the program, or persist through a front-panel patch change, power cycle, or stock
**SAVE**; see the 2026-09-14 entry in
[`docs/fx-003-hardware-verification.md`](fx-003-hardware-verification.md).

## 7.8 FM-1+VA manual: scaling and stored effects

**Status: Likely** (FM-1+VA documentation, 2026-09-28; see Primary sources)

The FM-1+VA manual's effect-controller table has the same CC numbers, groups, maxima, switch rule,
and option orders as M-VAVE's guide and §7.4. The only effect change it names as its own is two
extra Distortion types (Hard Clip and Foldback), which no CC reaches; it calls Soft Clip "M-VAVE's
original distortion". It adds what M-VAVE's guide leaves out:

| Control              |  CC | FM-1+VA manual                                                                             |
| -------------------- | --: | ------------------------------------------------------------------------------------------ |
| Filter Cutoff        |   2 | 0–107 runs from 100 Hz to 20 kHz. The curve between is not given.                          |
| Filter Resonance     |   3 | 0–10, shown on its screen as 0–100.                                                        |
| Delay Decay          |   9 | Named Feedback: how much of each echo is fed back into the delay.                          |
| Delay Rate           |  10 | A higher Rate gives a shorter echo, from 0.8 s down to 0.1 s.                              |
| Chorus Frequency     |  17 | Named Rate: 0.1 to 1 Hz.                                                                   |
| Phaser Frequency     |  21 | Named Rate: 0.5 to 6 Hz.                                                                   |
| Every continuous one |   — | A value above the maximum acts as the maximum. A CC above 23 on the FX channel is ignored. |

This agrees with the direction heard in FX-003 §9: Delay Rate shortens the gap as it rises, and
Delay Decay behaves like feedback. M-VAVE's own guide names CC 9 **Decay**, so the editor keeps that
name and says in its help what it does. The editor's help text gives these ranges as approximate
values. The `%` suffixes and the displayed raw values are unchanged, because the manual gives only
end points and no curve.

One consequence follows from M-VAVE's published map alone, whatever FM-1+VA says: a MIDI keyboard
that sends CC 1 (mod wheel), CC 7 (volume), or CC 11 (expression) on the FX channel sets Filter
Type, Reverb Mix, or Delay Mix instead. `docs/user-guide.md` tells users to keep a
keyboard off the FX channel.

**Stored effects (lead).** FM-1+VA's preset read returns, with each voice, a 59-byte settings
record holding that preset's six effects and their order, and its manual says **Reset Patches**
turns every effect off. If stock firmware stores effects per preset the same way, a Program Change
loads the stored preset's effects over whatever CC set, which would explain the 2026-09-14
observation in §7.7. This is a hypothesis about stock storage, not a finding; test it with FX-003
§7 item 1 before relying on it.

---

# 8. Storage

**Status: Confirmed internally; not automatically safe for editor use**

The reverse-engineering project maps FM1 flash/storage operations and patch-related storage.

### Editor rule

The browser editor should continue treating browser IndexedDB as its own workspace source of truth unless a safe, normal, readback mechanism is explicitly verified.

FM-1+VA firmware has a preset read (Primary sources), but stock firmware has none, and this project
does not send FM-1+VA's commands. Stock firmware remains without a known readback.

Do not add direct flash reads/writes to ordinary editor functionality.

---

# 9. Firmware update / loader / OTA boundary

## Dangerous / excluded

The reverse-engineering project explicitly warns that the update path is **not a demonstrated recovery mechanism** and that ROM recovery, rollback and interrupted-write safety are unresolved.

Normal editor code must never:

- enter the loader
- invoke OTA mode
- write firmware flash
- erase firmware regions
- experiment with firmware update command IDs
- treat update commands as a convenient general-purpose transport

The USB MIDI parser includes a distinct loader-entry magic sequence. This must remain outside the editor's runtime protocol implementation.

### Architectural requirement

If any research code for OTA/update parsing is ever added, keep it physically and logically separate from runtime editor MIDI code.

Prefer that it not ship in the production browser bundle at all.

---

# 10. Confidence framework

Use these tags in code comments and documentation.

### CONFIRMED

Supported directly by:

- stock firmware analysis with high confidence, and/or
- repeated physical FM1 testing.

### LIKELY

Firmware analysis is strong but the behaviour has not been tested from the browser editor.

### NEEDS-HARDWARE-TEST

A specific experiment is needed before the editor may rely on the behaviour.

### DANGEROUS-EXCLUDED

Loader, OTA, flash, recovery or unknown commands capable of device-state damage.

Unknown commands default to **DANGEROUS-EXCLUDED** until classified.

---

# 11. Recommended protocol architecture

Do not construct FM1-specific byte arrays in React components.

Aim for domain modules broadly like:

```text
src/lib/
  midi/
    dx7/
    fm1/
      effects
      controllers
      vendor
      sequencer
  fm1/
    sequence-model
    sequence-codec
```

Adapt this to the repository's existing conventions rather than creating directories mechanically.

Desirable boundaries:

```text
UI
 ↓
feature hook/state
 ↓
FM1 domain operation
 ↓
codec / validated command
 ↓
existing Web MIDI service
```

Useful eventual APIs might include:

```ts
requestFm1Sequence(...)
decodeFm1Sequence(...)
encodeFm1Sequence(...)
sendFm1Sequence(...)
setFm1SequenceStep(...)
setFm1Swing(...)
```

These names are illustrative. Do not add APIs until the underlying behaviour is known.

---

# 12. Hardware research strategy

Use the existing MIDI monitor aggressively.

For each unknown feature:

1. Begin with a known stock-device operation.
2. Capture incoming/outgoing MIDI.
3. Change exactly one hardware value.
4. Capture again.
5. Diff messages.
6. Repeat across at least three values.
7. Reset/reconnect and confirm repeatability.
8. Document findings before implementing writes.

For potentially vendor-specific frames:

- decode first
- do not replay unknown messages automatically
- distinguish runtime settings from loader/update traffic
- store captures as test fixtures where safe

---

# 13. Near-term enhancement candidates

## Low risk / high value

- audit DX7 parameter map
- strengthen SysEx codec tests
- improve MIDI monitor decoding
- improve controller documentation
- validate frequency/envelope displays against the msfa-derived engine
- audit current FM1 effects messages against firmware analysis

## Medium risk

- FM1 global/performance settings where a normal runtime control path is known
- arpeggiator settings
- sequencer read/display

## Higher risk, staged only

- sequencer write
- vendor command use not already observed from normal stock-device behaviour

## Excluded

- firmware flashing
- loader invocation
- direct raw flash manipulation

---

# 14. Open questions

These should be answered before full sequencer implementation.

1. Can the stock FM1 return the currently selected sequence through USB MIDI?
2. Is there a vendor command for reading a whole 32-byte sequence record?
3. Is there a vendor command for writing a whole pattern?
4. Are individual sequencer steps writable in real time?
5. Does the stock UI use the vendor/syscmd path when sequence settings change?
6. Can tempo, gate and swing be queried as well as set?
7. How many user-visible banks are exposed by stock firmware?
8. Which pattern flag bits have user-facing meaning?
9. Are sequence notes stored as absolute notes or normalised relative notes at persistence boundaries?
10. Does writing sequence data update flash immediately or require an explicit save action?
11. Can all required operations be accomplished without touching any OTA/loader command family?
12. Are effects commands part of the same vendor/syscmd dispatcher or a separate MIDI control path?

Update this document whenever one of these questions is answered.
