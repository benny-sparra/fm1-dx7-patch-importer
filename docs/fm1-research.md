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
| `7D 20 <pattern> <part> …`      | Writes eight steps of a sequencer pattern and its settings (177 bytes); a separate memory-read request reads patterns back.                                                                                                                    |

**Its backup file. Confirmed** (two files from **Save a backup** on `FM-1_089`, 2026-09-29, 256
messages). The `.syx` file is 29,568 bytes: 128 preset writes of 231 bytes each, in slot order,
`F0 43 00 7D 04 <slot> <155-byte voice> <68-byte record> <sum> F7`. The voice is a DX7 edit buffer
that converts to the library's packed voice like any other. `<sum>` covers only the 223 payload
bytes after the slot, not the command or the slot: the low seven bits of the sum of each byte's
seven-bit complement. Every byte between `F0` and `F7` is seven-bit. The editor reads this file in
**Import Baud Girl presets file…** (`src/lib/fm1-va-preset-file.ts`), voices only.

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
`FM-1_079` (`readsFm1VaPresets`). The layout below was first read from the modules FM-1+VA's
Presets page loads (`fm1sound.js`, `fm1seq.js`, and `install/bank.js` under
`https://baudgirl.com/fm1/app/835478add641fd2b/`, read 2026-10-02). **Status: Confirmed, seen
once** (FM-1_093, 2026-10-02): the FM1 answered the request for preset 001 (ORGAN 3) with a reply
that decodes as below, and its voice and record match the same preset in the 2026-09-29 backup byte
for byte. The editor's codec is `src/lib/fm1-va-sysex.ts` and `src/lib/fm1-va-preset-read.ts`, and
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

**Bytes 27–44 interleave two lists. Confirmed for the first two positions (seen once) and the
Filter's switch (two presets, one of each engine).** Byte 27 + 3*k* names the effect in position _k_ of the chain, top of the FX screen first,
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

**Mapping the record.** A development build (`npm run dev`) has an **FM-1+VA preset probe (dev)**
in the footer. It reads one preset and shows its record and voice byte by byte, marking each byte
that changed since that preset's last read, and **Copy capture** puts the reply, both parts, and
the changed bytes on the clipboard as JSON for a fixture. Change one setting on the FM1, press
SAVE, read the same preset again, and record each byte here.

#### Writing a stored preset

**Approved 2026-10-03**, gated on FM-1+VA from `FM-1_079` (`writesFm1VaPresets`), one preset per
message, at least 3 s apart, each read back to confirm it (`AGENTS.md`). The message is the one a
backup file holds for each preset, `F0 43 00 7D 04 <slot> <155-byte voice> <68-byte record> <sum>
F7` ("Its backup file", above). **Confirmed offline:** `makeFm1VaPresetWrite` in
`src/lib/fm1-va-preset-message.ts` rebuilds the captured backup messages for 001 (ORGAN 3) and 097
(a Virtual Analog preset whose record sets high bits) byte for byte, and building one from the
read of ORGAN 3 gives the backup's message for it, so reading a preset and writing it back sends
FM-1+VA's own bytes. `fm1VaRecordWithEffects` puts the library's effects into a record in the
bytes "What the record holds" maps, and leaves the rest as read.

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
- **Side effect. Needs hardware test.** The manual says CC 70, 72, 73, or 75 received while the
  preset's Envelope is Off switches it On, as holding ENV does. The 2026-10-04 run sent CC 73 with
  the Envelope already On, so it did not show this; stepping PRESETS away and back did return the
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

#### FM-1_096 (reviewed 2026-10-06)

`FM-1_096`, released 2026-10-06, adds an 8-Bit engine, a seventh effect (Bitcrush), knob banks with
four knob choices saved in each preset, and a Preset Level on the Mixer knob bank. Baud Girl's
Presets page was replaced by a Device Manager (`/work/FM-1+VA/device-manager`; the old address
redirects there), whose **Back up everything** saves the presets file and a separate patterns file.
Sources: the manual, the modules the Device Manager loads (app build `8405c164d16df69a`), and the
two preset packs it installs. **Likely** throughout, since none of it has been checked on hardware
yet; the 8-Bit marker and record size are also seen in the pack files.

- **Unchanged.** The preset read and write keep their layout and sizes: a 59-byte record, a
  187-byte read reply, a 231-byte write, no version byte, and no new preset command. The presets
  file is still 128 preset writes, 29,568 bytes, named `fm1-presets-<date>.syx`. The identity query
  is the one the editor sends. Effect switches and types stay indexed by effect, not by chain
  position, as the editor reads them.
- **The engine marker.** Record byte 18 is `C3` in every preset of the 8-Bit pack (slots 096–111),
  and the Device Manager reads `C3` as 8-Bit, `5A` as Virtual Analog, and anything else as FM. An
  8-Bit preset keeps its drums, parts, and arpeggios partly in the voice bytes, which are not a DX7
  voice, and partly in record bytes 19–26 and 45–51. Its name stays in the name bytes. The editor
  treats `C3` as 8-Bit (`src/lib/fm1-va-engine.ts`): reading and importing leave an 8-Bit preset
  out, a write never replaces one, and a library patch whose record carries `C3`, which a read on
  `FM-1_096` gave the library before the editor knew the engine, is never written.
- **Bitcrush** lives in bytes the editor never writes: byte 5, `80` marking it set, its switch in
  bit 3 and its place among the seven in bits 0–2; Bits in byte 35, Sample Rate in 41, and Mix in
  44, the unused type bytes of Delay, Chorus, and Phaser. Without the `80` marker a preset has
  Bitcrush Off after the Distortion, at Bits 8, Sample Rate 72 (about 10.9 kHz), and Mix 100. It has
  no effect controller on the FX Channel; CC 85–88 reach it only through its knob bank, and the
  editor never sends them.
- **Knob choices** are bits 0–5 of bytes 53 (knobs 1 and 2) and 52 (knobs 3 and 4), with bit 7
  marking them set; Envelope On stays bit 6 of byte 53. The 8-Bit Drums Level is byte 2, stored as
  `80` | (99 − level). Where an FM or Virtual Analog preset keeps Preset Level was not found; byte 2
  is the likely place.
- **The Device Manager writes faster.** It sends each preset write 120 ms after the read that
  confirmed the previous one, rather than 3 s. The editor keeps 3 s until a hardware run shows the
  shorter gap is safe.
- Two new pattern writes, `7D 21` (a pattern's locks) and `7D 22` (whole steps), are writes the
  editor may not send.

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
first source release, and 0.9-beta (2026-10-03) the latest. 0.9 has nine engines (ANALOG, DIGITAL
4-operator FM, PHASE CZ-style phase distortion, LOFI, SAMPLE, VOICE formant, and new TRIO, WHEEL
organ, and GRAIN granular), a per-track SLICER insert, three synth parts and a GM drum track sharing
eight voices, a 64-step sequencer per track, 32 user preset slots, 4 project slots, and 3 user
sample slots, edited by its own web editor (`README.md`). Users moving to it from FM-1+VA are told
to go back to stock firmware first (`docs/switching-firmware.md`).

The notes below come from reading the source at the 0.9-beta tag, commit
`e5a908d0383848cd85149de6dc35150c792231fc` (2026-10-03), and at `main`, commit
`1e838e17e170b20ff09b9660c9a7171aadfc5dca` (2026-10-03, two commits later, adding a white-key
scale option), mainly `firmware/src/usb.c`, `seq.c`, `ota.c`, `editor.c`, `tools/build.py`, and
`web/EDITOR_PROTOCOL.md`. They were first written from 0.8-beta (commit `334477d`); the changes
since then do not touch the points below, except as noted. Where marked, they also rest on a static
reading of the 0.4-beta package. Reading source counts as analysis, so nothing here is
**Confirmed**: no Felucca FM1 has been run with this editor.

**Identity. Likely.** Felucca answers the identity query (§6.3) outside an update with its package
identity. Release builds name it `FM-1_9XY` for release X.Y (`build.py --release`, one digit each),
so 0.4-beta is `FM-1_904`, 0.8-beta `FM-1_908`, and 0.9-beta `FM-1_909` (`BUILDING.md`); a
development build is `FM-1_900`. The whole 900s range is therefore Felucca's while its version stays
below 10.0. The editor counted Felucca as FM-1+VA until 2026-10-02 and left it unidentified until
2026-10-03; it now names the 900s as Felucca (`classifyFm1Firmware`) and shows release X.Y.

**USB identity and port. Likely.** A composite device, vendor `1209` (pid.codes), product
`0001`, manufacturer "Hügelton Instruments", product "Felucca", with Audio Control, MIDI
Streaming, and a CDC serial port. Its protocol notes say the MIDI port is named "Felucca", so
`resolveMidiPortSelection` picks it only as the first port without an instrument name, not by
preference. Which name each operating system shows has not been seen.

**What it does with the editor's MIDI. Likely: nothing beyond notes.**

- **Notes.** Note On and Note Off are the only channel messages it acts on. Channels 1–3 play the
  three parts, the drum channel (global `CH`, default 10, 0 = off) plays the drum track, and every
  other channel plays the selected track. The editor's audition notes will sound on whichever part
  its note channel reaches.
- **Control Change, Program Change, pitch bend, and pressure** are queued from USB but never read in
  0.8 or 0.9 (`seq.c` still tests only `0x80` and `0x90`), so the FM1 effect controllers and the
  bank-slot Program Change have no effect. A TRS MIDI-in jack (`midi_uart.c`) would feed the same
  queue, dropping SysEx, but it is compiled in only with `FELUCCA_UART=1`, which `felucca.c` leaves
  off as untested, so released builds take MIDI over USB only.
- **DX7 SysEx.** The USB SysEx assembler keeps one frame of at most 640 bytes. A frame is handed to
  the web-editor parser, which takes only `F0 7D 46 4C …`, and then to the updater parser, which
  takes only pack7-encoded `00 59 …` frames with a valid checksum; anything else is discarded. In
  0.9 `usb.c` still has the 640-byte frame and the `F0 22 24 35 7D F7` key; its changes move
  register access into `firmware/hal/`. A single-voice dump (163 bytes) and each of the 155
  parameter changes are discarded that way; a 32-voice dump (4104 bytes) is too long and dropped
  while it arrives. So Felucca ignores every patch or bank the editor sends, and none of it can
  overwrite a Felucca preset. The 0.4-beta package's lack of any DX7 header (below) agreed.
- **MIDI out.** It sends from its own playing, queued from the audio interrupt, which the
  editor's MIDI log would show.

**Felucca's own editor protocol. Likely; not used by this editor.** `F0 7D 46 4C <cmd> … F7` (`7D`
is the non-commercial ID, `46 4C` is "FL"), documented in `web/EDITOR_PROTOCOL.md`: one request at a
time, one reply each, values as 14-bit offset pairs. Commands 1–15 read and set parameters, describe
them, read and write sequencer steps, apply presets, load and save projects, list preset names, and
upload samples; 16–26 (v2) read and write the 32 user presets and push live changes while watched;
27–30 (v3) address the four tracks; 31–32 (v4, new in 0.9, asked for with bit 1 of `WATCH`) get and
set a parameter of any track and push mixer changes of unselected tracks. `PROJECT` save, the sample
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
- The CDC serial console offers `status`, `dbg`, `crash`, `params`, `memr`, `flr`, and `uboot yes`,
  which enters the same boot loader. The editor uses Web MIDI only.

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
3. Will a release from 10.0 on keep an identity in the 900s?

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
