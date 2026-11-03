# FM-1+VA editing reference

A single place to look before building an editor feature for Baud Girl's FM-1+VA firmware. It
gathers what is already known from [`fm1-research.md`](fm1-research.md), the hardware runs in
[`hardware-runs/`](hardware-runs), and the code in `src/lib/fm1-va-*.ts`, into one byte map, one
code map, and one list of open questions.

**This file indexes the research; it does not replace it.** [`fm1-research.md`](fm1-research.md)
stays the source of truth, under "FM-1+VA replacement firmware". If the two disagree, the research
wins: fix this file. When a hardware run maps a new byte, record it in the research first, then
update the row here.

Compiled 2026-11-03, covering releases up to `FM-1_101`.

## Sources

Baud Girl has not published a protocol or data-format specification. Its source, decompilation,
and emulator were announced under GPL-3.0-or-later but had not been released by 2026-11-03.
Everything known comes from:

| Source                                                                           | What it gives                                                                                                                                           | Confidence it supports                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [The manual](https://baudgirl.com/work/FM-1+VA/manual)                           | User behaviour, controller table, release notes                                                                                                         | **Likely** until checked on hardware                       |
| [The Device Manager](https://baudgirl.com/work/FM-1+VA/device-manager)'s modules | `editmodel.js`, `fm1preset.js`, `chipnames.js`: every Virtual Analog row and 8-Bit field, which the modules say come from the firmware's own row tables | **Likely**; **Confirmed** row by row through hardware runs |
| Hardware runs with the editor's preset probe                                     | One change, SAVE, read back, diff                                                                                                                       | **Confirmed** (most rows seen once)                        |
| Baud Girl's own backup and pack files                                            | Layout of the presets file, engine markers, pack contents                                                                                               | **Confirmed** for layout                                   |

The project is MIT-licensed. Write code from the facts recorded here. Never copy Baud Girl's
modules, or the unlicensed FM-1 Pulses code.

## Wire messages

All of them start `F0 43 00 7D`, with `ysum` as the checksum: the low seven bits of the sum of each
byte's seven-bit complement. Which bytes it covers depends on the command. USB only: over
Bluetooth, FM-1+VA's commands got no answer (seen once).

| Message                                       | Status in the editor                                  | Checksum covers          | Module                                               |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------ | ---------------------------------------------------- |
| `7D 10 <slot> <sum>`: read a preset           | Approved 2026-10-02, from `FM-1_079` (`presetRead`)   | Command and slot         | `fm1-va-sysex.ts`, `fm1-va-preset-read.ts`           |
| `7D 04 <slot> <155> <68> <sum>`: write one    | Approved 2026-10-03, from `FM-1_079` (`presetWrite`)  | The 223 bytes after slot | `fm1-va-preset-message.ts`, `fm1-va-preset-write.ts` |
| CC 24–31, 52–57, 70–78 on the note channel    | Approved, from `FM-1_086` (`soundControls`)           | —                        | `fm1-va-sound-control.ts`                            |
| `7D 20` pattern write, `21` locks, `22` steps | **Not approved.** Needs its own entry in `AGENTS.md`  | Every byte after `7D`    | —                                                    |
| `7D 11` raw memory read                       | **Excluded**: a generic memory read                   | —                        | —                                                    |
| CC 85–119 on the note channel                 | **Excluded**: they press the FM1's own panel controls | —                        | —                                                    |

**Read reply.** `F0`, an 8-bit buffer packed seven bits at a time with the least significant bit
first (`unpackSevenBitStream`), then `F7`. The buffer holds `7D`, the kind (`50` for a preset), the
status (`0` done, `1` out of range, `2` damaged, `3` Sequencer playing), a 32-bit argument (the slot), a 16-bit length, the data, and a checksum. A preset's data is 187 bytes: the
128-byte packed DX7 voice, then the 59-byte record at **eight bits a byte**. If you parse the length
field, read it as seven-bit groups. Ask up to three times, 1.5 s apart.

**Write.** The voice goes as a 155-byte DX7 edit buffer, and the record as 68 bytes: 59 in 8-into-7
groups, where bit _k_ of a group's first byte is the high bit of the group's byte _k_. There is no
reply. Read the preset back to confirm the write. Pacing comes from the profile's
`presetWriteTiming`: 320 ms apart from `FM-1_096`, and 3 s with a 1.5 s wait before it.

**The presets file** (`fm1-presets-<date>.syx`, 29,568 bytes) is 128 of these writes in slot
order. The packs and **Save as a file** use the same format with fewer writes.

## The 59-byte record

Bit 7 (`80`) often marks a setting as set. Without the mark, the FM1 plays a default and the byte
may hold a leftover, often `03`. Every editor that writes a record changes only the bits it owns,
and only when the value changed, so unmapped bits survive.

Abbreviations: **C1** Confirmed, seen once on hardware; **C** Confirmed more than once;
**L** Likely (Device Manager modules or manual only); **?** unknown.

### Bytes every engine shares

| Byte                   | Holds                                                                                                                    | Conf.           | Written by                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------- |
| 0, 1                   | Filter effect Cutoff, Resonance (CC 2, 3 values)                                                                         | C1 each         | `fm1VaRecordWithEffects`                           |
| 2                      | FM and VA: Preset Level. 8-Bit: Drums Level. Stored as `80` \| (99 − level); unmarked reads 99                           | C1 (`FM-1_097`) | 8-Bit editor only. **FM and VA: not offered**      |
| 3, 4                   | Reverb Decay, Mix                                                                                                        | C1              | `fm1VaRecordWithEffects`                           |
| 5                      | Bitcrush: `80` mark, `08` switch, bits 0–2 its place among the seven effects                                             | C1 (`FM-1_096`) | `fm1VaRecordWithBitcrush`                          |
| 6–8                    | Delay Decay, Rate, Mix                                                                                                   | C1              | `fm1VaRecordWithEffects`                           |
| 9–11                   | Distortion Gain, Tone, Level                                                                                             | C1              | `fm1VaRecordWithEffects`                           |
| 12–14                  | Chorus Frequency, Depth, Mix                                                                                             | C1              | `fm1VaRecordWithEffects`                           |
| 15–17                  | Phaser Frequency, Depth, Mix                                                                                             | C1              | `fm1VaRecordWithEffects`                           |
| 18                     | Engine: `5A` Virtual Analog, `C3` 8-Bit, anything else FM (`03` stored, `A5` erased)                                     | C               | Never; read by `fm1VaRecordEngine`                 |
| 27, 30, 33, 36, 39, 42 | Effect chain, top first: the effect number in each of six positions (0 Filter … 5 Phaser; Bitcrush's place is in byte 5) | C (`FM-1_096`)  | `fm1VaRecordWithEffectOrder`                       |
| 28, 31, 34, 37, 40, 43 | Each effect's switch, indexed by effect, not by position                                                                 | C1 each         | `fm1VaRecordWithEffects`                           |
| 29, 32                 | Filter type, Reverb type (CC 1, 5 values)                                                                                | C1              | `fm1VaRecordWithEffects`                           |
| 35, 41, 44             | Bitcrush Bits (1–16), Sample Rate (0–100), Mix (0–100): the spare type bytes of Delay, Chorus, Phaser                    | C1              | `fm1VaRecordWithBitcrush`                          |
| 38                     | Distortion type: `00` Soft Clip, `01` Hard Clip, `02` Foldback                                                           | C1 each         | Effects panel, through `saveSound`                 |
| 52                     | Knob 3 and 4 choices in bits 0–5, `80` marks them set                                                                    | C1 (`FM-1_097`) | `fm1VaRecordWithKnobChoices`                       |
| 53                     | Knob 1 and 2 choices in bits 0–5, bit 6 Envelope On, `80` marks the knobs set                                            | C1              | Knob choices; Envelope by the VA and 8-Bit editors |
| 54–57                  | Envelope Attack, Decay, Sustain, Release, 0–100                                                                          | C1              | VA and 8-Bit editors (`fm1-va-shared-rows.ts`)     |
| 58                     | Mono: `00` Off, `01` On                                                                                                  | C1              | VA editor                                          |

### Bytes whose meaning depends on the engine

Check byte 18 before reading these.

| Byte | Virtual Analog                                            | 8-Bit                                       | FM preset (FM-1_092 filter)                       |
| ---- | --------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| 19   | Waveform: Sine `01`, Saw `02`, Triangle `03`, Square `04` | Bass Wave (bits 0–3), Duty Sequence (4–7)   | Not read                                          |
| 20   | Super 0–100                                               | Bass Arpeggio (0 Off, 1–31, 32 User)        | Not read                                          |
| 21   | Detune 0–100                                              | Lead Wave, Duty Sequence                    | Not read                                          |
| 22   | Drift 0–100                                               | Lead Arpeggio                               | Not read                                          |
| 23   | Cutoff `80` \| 0–100                                      | Bass User Arpeggio (with 24, 25, 45, 46)    | Cutoff, same form (C1: `D0` = 5 kHz)              |
| 24   | Resonance `80` \| 0–100                                   | Bass User Arpeggio                          | Presumably Resonance (**L**)                      |
| 25   | Filter Envelope `80` \| 0–100                             | Bass User Arpeggio                          | Presumably Filter Envelope (**L**)                |
| 26   | `80` \| Filter Type bits 0–1, Key Tracking bits 2–3       | Key bits 0–3, Accidentals bit 5, mark bit 6 | Bit 4 Filter On (C1), bit 7 mark; type bits **L** |
| 45   | Sub `80` \| 0–100                                         | Bass User Arpeggio                          | Not read                                          |
| 46   | Noise `80` \| 0–100                                       | Bass User Arpeggio                          | Not read                                          |
| 47   | Filter Velocity `80` \| 0–100                             | Lead User Arpeggio (47–51)                  | Presumably Filter Velocity (**L**)                |
| 48   | PWM `80` \| 0–100                                         | Lead User Arpeggio                          | Not read                                          |
| 49   | Filter Shape `80` \| 0–100                                | Lead User Arpeggio                          | Presumably Shape (**L**)                          |
| 50   | LFO to Cutoff `80` \| 0–100                               | Lead User Arpeggio                          | Presumably LFO to Cutoff (**L**)                  |
| 51   | Filter Decay `80` \| 0–100                                | Lead User Arpeggio                          | Presumably Filter Decay (**L**)                   |

Virtual Analog rows: C1 for every one, from the 2026-10-04 and 2026-10-07 maps
([`fm1-va-byte-map-2026-10-04.json`](hardware-runs/fm1-va-byte-map-2026-10-04.json),
[`fm1-va-editor-map-2026-10-07.json`](hardware-runs/fm1-va-editor-map-2026-10-07.json)). 8-Bit
fields: one field of each kind C1 on `FM-1_098`, the rest **L**
([`fm1-va-8bit-fields-map-2026-10-16.json`](hardware-runs/fm1-va-8bit-fields-map-2026-10-16.json)).
A User Arpeggio is eight five-bit steps, least significant first across its five bytes, storing
−12 to +18 as value + 12, with 31 meaning End.

## The voice bytes

The 128 packed bytes, or the 155-byte edit buffer they unpack to, are a DX7 voice only on an FM
preset. On the other engines they hold fields that fit inside the DX7 ranges, and sometimes break
them: Virtual Analog packs hold 127 where the DX7 allows 99. **Never normalise, clamp, or unpack
them through the DX7 voice path.** Keep the 128 bytes exactly as read (`virtualAnalog` and
`eightBit` maps in the snapshot), and change only the bits a row owns.

- **FM.** An ordinary DX7 voice. The name is in bytes 145–154 of the edit buffer on every engine.
- **Virtual Analog.** Level is packed byte 14 (operator 6's Output Level, 0–99). Velocity to Level
  is byte 13, bits 2–4. The LFO is bytes 112–116: Speed, Delay, Pitch Mod Depth, and Amp Mod Depth
  in 112–115, and Sync, Wave, and Pitch Sensitivity in 116. Operator 6's rates and levels act as the
  amplitude envelope, and the FM1 shows no row for them. The editor leaves them as read.
- **8-Bit.** Twelve drums, two drums per operator. Bass and lead envelopes, levels, octaves, and
  more sit at edit-buffer offsets. The full table is in
  [`fm1-research.md`, "Every field of an 8-Bit preset"](fm1-research.md), and the code is
  `fm1-va-eight-bit-editor.ts`. Edit-buffer bytes 17, 97, 118, 126–136 are not read by an 8-Bit
  preset.

## Erased presets

Erase Preset (M3, `FM-1_097`) names every blank `INIT`:

- **FM:** byte 18 `A5`, a DX7 init voice, effect defaults
  `6B 03 03 1E 1E 03 1E 1E 19 1E 37 46 1E 19 28 1E 32 14`, every effect Off and in order. Bytes 19–26
  and 45–51 keep whatever was there.
- **VA:** byte 18 `5A`, 19–26 `02 00 32 00 E4 80 80 80`, 45–51 `80`, OP6 Level 78.
- **8-Bit:** byte 18 `C3`, 19–22 `04 00 01 00`, 23–25 and 45–51 `FF`, byte 26 kept, plus the
  firmware's kit, bass, and lead.

## What can be heard before a write

FM-1+VA has no message that loads a preset without storing it. A live edit reaches the FM1 only as
a controller over a stored preset of the same engine. Anything else is heard only once `7D 04`
writes the preset.

| Engine | Live through controllers                                                                            | Heard only after a write                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FM     | DX7 parameter changes; CC 58 Algorithm, 71 Feedback, 74 Brightness; Envelope 70/72/73/75; LFO 76–78 | Distortion type, Bitcrush, effect order, knob choices, Preset Level, the FM Filter, Mono                               |
| VA     | CC 24–31, 52–57, 70–78, while the FM1 plays the same stored VA preset                               | Level, Mono, LFO Wave, Amp Mod Depth, Pitch Sensitivity, Sync, Envelope switch, plus everything FM lists after effects |
| 8-Bit  | Envelope 70/72/73/75 and LFO 76–78 only                                                             | Every other field                                                                                                      |

FX Channel effect controllers (CC 0–23) work on every engine. CC 70, 72, 73, or 75 received while
the Envelope is Off **switches it On** (C1). Send them only while the editor's Envelope switch is on.

## Code map

| Concern                                     | Module                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| What each release can take                  | `firmware-profile.ts` (`presetRead`, `presetWrite`, `soundControls`, `bitcrush`, `knobChoices`)                                     |
| Read request, reply parser                  | `fm1-va-sysex.ts`, `fm1-va-preset-read.ts`, hook `useFm1VaPresetReader`                                                             |
| Write message, pacing, plan                 | `fm1-va-preset-message.ts`, `fm1-va-write-timing.ts`, `fm1-va-write-plan.ts`, `fm1-va-preset-write.ts`, hook `useFm1VaPresetWriter` |
| Presets file in and out                     | `fm1-va-preset-file.ts`, `fm1-va-preset-download.ts`                                                                                |
| Record container and engine                 | `fm1-va-record.ts`, `fm1-va-engine.ts`                                                                                              |
| Effects in the record                       | `fm1-va-record-effects.ts`, `fm1-va-knob-choices.ts`                                                                                |
| Rows shared by VA and 8-Bit (Envelope, LFO) | `fm1-va-shared-rows.ts`                                                                                                             |
| Virtual Analog rows, page                   | `fm1-va-virtual-analog-editor.ts`, `routes/virtual-analog-editor-page.tsx`                                                          |
| 8-Bit rows, names, page                     | `fm1-va-eight-bit-editor.ts`, `fm1-va-eight-bit-names.ts`, `routes/eight-bit-editor-page.tsx`                                       |
| Live sends while editing                    | `fm1-va-editor-session.ts`, `fm1-va-sound-control.ts`                                                                               |
| Presets                                     | `virtual-analog-presets.ts`, `eight-bit-presets.ts`                                                                                 |
| Captured fixtures                           | `src/test/fm1-va-captures.ts`                                                                                                       |

## Adding an editable row

1. Find the row in the tables above. If it is **L** or **?**, map it first with the development
   build's **FM-1+VA preset probe (dev)**, using **Map a setting**. Change one value on the FM1,
   press SAVE, read it back, and repeat for several values. Record the result in
   [`fm1-research.md`](fm1-research.md) and update this file.
2. Add the row where its engine's rows live, as a `read`/`write` pair that touches only its own
   bits. Keep the mark convention: write `80` \| value, and read the default without the mark.
3. If a controller reaches it live, add the controller to the session's sends and to
   `makeFm1VaSoundControlMessage`'s allowed list. Otherwise the page says it is heard once
   written.
4. Gate it on a profile capability, never on `kind` or the release number. A capability for a new
   release is an entry in `familyProfiles`.
5. Tests: a fixture-based round trip that changes only the row's bits, an undo test if it writes
   several values at once, and strings in every locale.

## Open questions

Each line names the test that would settle it. Test IDs refer to
[`fm1-va-096-tests.md`](fm1-va-096-tests.md).

| Question                                                                                         | Blocks                                                               | Settled by                                            |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------- |
| An FM preset's own Filter: Type, Resonance, Envelope, Velocity, Key Tracking, Shape, Decay bytes | An FM-1+VA panel in the voice editor (Device Manager review, idea 1) | One probe map per row on an FM preset                 |
| Does any of CC 70–78 move an FM preset's Filter or Envelope live?                                | Whether that panel can be live                                       | Short controller run on an FM preset                  |
| What bit 7 of byte 26 means beyond "set"                                                         | Nothing yet; keep it as read                                         | Probe map                                             |
| Is a single DX7 dump an unsaved edit on `FM-1_096` and later, not a store?                       | Sending an FM patch as one dump, not 155 parameter changes           | D1                                                    |
| Does one DX7 parameter change reach an 8-Bit preset live?                                        | Live 8-Bit edits beyond Envelope and LFO                             | D2                                                    |
| Does a write to the selected preset change what it plays at once, beyond the name?               | Live auditioning by writing                                          | A write that changes the sound of the selected preset |
| Are the remaining 8-Bit fields where the Device Manager says?                                    | Moving them from **L** to Confirmed                                  | §4b, one field at a time                              |
| Filter Shape's curve between 0, 50, and 100                                                      | Drawing it                                                           | Photographs at more values (V27)                      |
| Preset write timing and read-all on `FM-1_101`                                                   | Nothing yet; timing is per release                                   | F1, M4, the write timing run                          |
| The pattern format and a `7D 20` write over USB                                                  | Any sequencer feature                                                | Approval in `AGENTS.md`, then a USB write test        |
| Whether Baud Girl publishes the firmware source                                                  | Would let many **L** rows be checked against code                    | Check baudgirl.com on each release                    |
