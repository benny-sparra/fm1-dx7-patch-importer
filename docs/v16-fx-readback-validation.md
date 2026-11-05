# V16 live FX readback: Phase 1 (offline)

> **Run on hardware on 2026-11-05**
> ([record](hardware-runs/stock-v16-live-fx-read-2026-11-05.md)): the reply echoes the request
> (62 bytes), and all 24 rows of section 2 are **Confirmed**, stored as sent. The production
> contract in section 5 is no longer blocked. The rest of this document is kept as prepared.

Prepared 2026-11-02 for the owner's approval of 2026-11-02 (`AGENTS.md`, "MIDI", the "On stock V16"
bullet that approves object 5's low-offset live read). **No device was connected, no message was
sent, and no test needs hardware.** Static evidence is from `docs/fm1-research.md`, "Controlling
Voices and effects more fully (2026-10-27)" and "Codex firmware reading (2026-10-28)", of stock
`FM-1_016` (SHA-256 `d017fb65…5d5`). Synthetic fixtures are not captures. Nothing below upgrades a
**Likely** to **Confirmed**.

## 1. The request and the reply

**The one operation** (`makeV16LiveEffectsReadRequest`, `src/lib/v16-live-effects.ts`): command
`0x23` on object 5, offset `0x9C`, length 54 (`0x36`): the 27 live effect values (`0x9C`–`0xB6`)
and the 27-byte live FX table (`0xB7`–`0xD1`). It stops before the five opaque bytes `0xD2`–`0xD6`
and before the 156-byte voice, so it asks for nothing the feature does not need.

```
unpacked: 00 59 23 | 08 00 00 | 05 | 9C 00 00 00 | 36 00 00 | 28
          header cmd  length 8   obj  offset (LE32)  length (LE24)  checksum = ~(sum of payload)
on the wire: F0 00 32 0D 41 00 00 40 02 1C 01 00 00 60 06 00 00 28 00 F7
```

| Part                                                                     | Evidence                                                                                                            | Confidence                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Frame: `00 59 <cmd> <len 3 bytes LE> <payload> <checksum>`, packed 7-bit | Hardware: identity, and object 4's read and write, 2026-11-01                                                       | Confirmed                    |
| Payload: object, offset LE32, length LE24                                | Hardware on object 4 (2026-11-01); object 5's restore uses the same layout                                          | Confirmed for the layout     |
| `0x23` on object 5 reaches `FUN_0200c970`, the live read                 | Static: the object table (`FUN_020237b6`), `+4` method                                                              | Likely                       |
| Offsets below `0x10000000` are the live path, at most `0xD7` bytes       | Static: `FUN_0200c970` validates `offset + length` within 215                                                       | Likely                       |
| A range inside the 215 bytes is accepted, not only offset 0              | Static: the handler checks against the remaining size, then copies all 215 and overlays                             | Likely; Needs hardware test  |
| One reply is one coherent snapshot                                       | Static: object 5 runs in the main loop through the mailbox, one request per pass, the copy and overlays in one call | Likely                       |
| The reply is `00 59 23 <len> <payload> <checksum>`, command echoed       | Hardware on object 4's read; the parser accepts exactly this                                                        | Likely for object 5          |
| The payload is the 54 bytes alone **or** the 8 request bytes then 54     | Unresolved: no capture of object 4's reply was kept, and the parser of PR #401 accepts both                         | **Gap: Needs hardware test** |

The reply is correlated by command `0x23`, an exact payload length (54, or 62 with the request's
eight bytes echoed), and a valid checksum. Another read's reply, such as the settings block's 176
bytes, is not this read's and is ignored. A frame that echoes this read's prefix but has the wrong
length, a bad checksum, a byte above seven bits, a truncated frame, or a table the firmware itself
would reject (entry effect numbers at most 8 and all different, On/Off at most 1, Type at most 2)
is an unusable reply, and fails the read at once. Messages over 128 bytes are ignored unread.

Timeout, cancellation, ordering (`readV16LiveEffects`):

- Sent once on an explicit call, **never retried**: no reply in 1,500 ms rejects as `no-reply`.
  A timeout is not permission to try anything else.
- The listener is installed before the send and removed when the read settles, so a duplicate or
  late reply is ignored. A late reply cannot be told from the reply to the next read, since the
  bytes are the same, so the caller starts another only after the first has settled.
- Aborting the signal, which the probe does when the input or output changes or it unmounts,
  rejects as `cancelled`, and sends nothing if already aborted.
- Production ordering is the transfer queue's (`MidiTransferQueue`, owned privately by `useMidi`).
  The probe does not use it, to keep `useMidi`, which is in the entry, untouched; the production
  contract below puts the read in the queue.

## 2. The 24-control mapping

The 27 values are **not** the editor's 24 controls. The table holds nine 3-byte entries, byte 0 of
entry `p` the chain order, bytes 1 and 2 of entry `e` effect `e`'s On/Off and Type **by effect
number**. Effects: 0 Filter, 1 Reverb, 2 Delay, 3 Distortion, 4 Chorus, 5 Phaser. The 27 values are
effect `e`'s three at `3e`; entries/values 18–26 belong to effects V16 does not have and are kept,
not decoded. The raw bytes of the whole reading are preserved. `candidateEffectValues` applies this
table and refuses an out-of-range value; it is read only by the development probe.

Offsets are within the object, as `0x9C` + `values` index and `0xB7` + `table` index. The table
bytes are the same live table object 4's read returns at `0x92`, so a run can compare them.

| Editor parameter   | Editor index (V16 CC) | Raw location        | Decoding and range                 | Static source and evidence                                                                                                                                                                                                                             | Open question                                                                             |
| ------------------ | --------------------- | ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| filter.enabled     | 0 (CC 70)             | table[1] = `0xB8`   | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| filter.type        | 1 (CC 71)             | table[2] = `0xB9`   | 0–2, stored as sent (**Likely**)   | firmware: CC `71`/`75` write `e·3+2` (same sources); not yet read back                                                                                                                                                                                 | Does 0/1/2 equal the editor's option order (Low/Band/High; Room/Hall/Plate)?              |
| filter.cutoff      | 2 (CC 72)             | values[0] = `0x9C`  | 0–107, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| filter.resonance   | 3 (CC 73)             | values[1] = `0x9D`  | 0–10, stored as sent (**Likely**)  | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| reverb.enabled     | 4 (CC 74)             | table[4] = `0xBB`   | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| reverb.space       | 5 (CC 75)             | table[5] = `0xBC`   | 0–2, stored as sent (**Likely**)   | firmware: CC `71`/`75` write `e·3+2` (same sources); not yet read back                                                                                                                                                                                 | Does 0/1/2 equal the editor's option order (Low/Band/High; Room/Hall/Plate)?              |
| reverb.decay       | 6 (CC 76)             | values[3] = `0x9F`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| reverb.mix         | 7 (CC 77)             | values[4] = `0xA0`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| delay.enabled      | 8 (CC 78)             | table[7] = `0xBE`   | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| delay.decay        | 9 (CC 79)             | values[6] = `0xA2`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| delay.rate         | 10 (CC 80)            | values[7] = `0xA3`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| delay.mix          | 11 (CC 81)            | values[8] = `0xA4`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 2? Is the stored value the CC value, or scaled/clamped? |
| distortion.enabled | 12 (CC 82)            | table[10] = `0xC1`  | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| distortion.gain    | 13 (CC 83)            | values[9] = `0xA5`  | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| distortion.tone    | 14 (CC 84)            | values[10] = `0xA6` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| distortion.level   | 15 (CC 85)            | values[11] = `0xA7` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 2? Is the stored value the CC value, or scaled/clamped? |
| chorus.enabled     | 16 (CC 86)            | table[13] = `0xC4`  | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| chorus.frequency   | 17 (CC 87)            | values[12] = `0xA8` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| chorus.depth       | 18 (CC 88)            | values[13] = `0xA9` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| chorus.mix         | 19 (CC 89)            | values[14] = `0xAA` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 2? Is the stored value the CC value, or scaled/clamped? |
| phaser.enabled     | 20 (CC 90)            | table[16] = `0xC7`  | 0–1, stored as sent (**Likely**)   | firmware: CC `70+4e` writes `e·3+1` (research, 2026-10-27; Codex 2026-10-28 checked the table decode at `0x0200969A`); not yet read back on hardware                                                                                                   | Does the live table byte read 0/1 as the switch shows?                                    |
| phaser.frequency   | 21 (CC 91)            | values[15] = `0xAB` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 0? Is the stored value the CC value, or scaled/clamped? |
| phaser.depth       | 22 (CC 92)            | values[16] = `0xAC` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 1? Is the stored value the CC value, or scaled/clamped? |
| phaser.mix         | 23 (CC 93)            | values[17] = `0xAD` | 0–100, stored as sent (**Likely**) | **analogy only**: the firmware stores three values per effect by number (`0x01C3609B`), and FM-1+VA's record, mapped on hardware, keeps each effect's controls in controller order in that triple; V16's own CC handler's value stores were not traced | Is this control the triple's byte 2? Is the stored value the CC value, or scaled/clamped? |

**Gaps, stated plainly.** Eight of the 24 rows (six switches, Filter Type, Reverb Space) rest on
the firmware's table layout, which is static and agrees with the hardware-confirmed object 4 table
at `0x92`; they are the better supported. The other 16 rest on analogy: no document records that
V16's CC 72–93 handlers write `values[3e + k]` in controller order, nor whether the stored value is
the CC value or scaled (FM-1+VA's record stores it as sent). The `0x9C`–`0xB6` values are therefore
**Likely at best, and every one of the 16 needs its own hardware change-one-control run** (below).
The five bytes `0xD2`–`0xD6` and the third value of the Filter and Reverb triples are unmapped and
are not read at all. No row is proven; the feature stays blocked until each is.

## 3. Hardware checklist (do not run until the owner approves)

The owner drives; each step waits for the owner's observation. Preserve unsaved work first, use one
MIDI sender at low volume, no ARP/SEQ or audition.

1. Connect, confirm the identity is `FM-1_016` (the existing approved query), select both ports.
2. Dev build, **V16 live FX read (dev)** dialog. Press **Read live FX** once, controls idle.
   Expect `F0 00 32 0D 41 … F7` out and one reply; copy the capture. Record whether the reply
   echoes the 8 request bytes (settles the gap above) and its exact length.
3. Compare the reply's table with the Effects view's object 4 read: identical.
4. For each of the 24 controls: change that one control on the front panel, read once, diff,
   restore; for each switch/type try every option, and for each continuous control try 0, a middle
   value and the maximum. Record the front-panel display with the raw bytes. Keep playback stopped
   for extreme gain and resonance.
5. Repeat a few reads after switching the FM1's FX group to see that a read follows the live group.
6. Stop on a different identity, a disconnect, an unexpected length or content, a timeout, or a
   screen change. No retries, no other command.

**Reads in total:** one in step 2, then one per change in steps 3–5. Reads are not sent in bursts.

## 4. Approval request

The owner approved the _operation_ on 2026-11-02 (object 5's low-offset live read) and withheld
approval of its bytes. The bytes proposed are:

- **Frame:** `F0 00 32 0D 41 00 00 40 02 1C 01 00 00 60 06 00 00 28 00 F7`, unpacked
  `00 59 23 08 00 00 | 05 9C 00 00 00 36 00 00 | 28`: command `0x23`, **object 5**, **offset `0x9C`**,
  **length 54**, nothing else; no other command, object, offset, or length can be built.
- **Expected reply:** `00 59 23` with a payload of 54 bytes (or 62, the request's 8 bytes first),
  the checksum valid, the table passing the firmware's own check, within the 1.5 s timeout.
- **Count:** one read at step 2, then one per front-panel change; no automatic retry.
- **On failure:** nothing further is sent. An unusable reply, a timeout, or a disconnect ends the
  attempt and is reported; it is not retried or replaced by another command, including a full
  215-byte read, which would be a separate approval.
- **Unchanged exclusions:** object 5's write, offsets from `0x10000000`, command `0x15`, any SAVE
  or save helper, object 8, `0x30`, the loader, and reading the group's name or number.
- **Changes nothing** on the FM1 (**Likely**, static: the handler only copies and overlays).

Asked of the owner: approve the frame above (record it in `AGENTS.md`), and say whether a read of
only 54 bytes, rather than the approved ceiling of 215, is acceptable (it is narrower).

## 5. Production contract (unblocked 2026-11-05, not implemented)

Only after all 24 rows are proven on hardware: an explicit **Read effects from FM1** action, offered
only on a profile that lists it and while the ports are those the read started on; it takes its turn
in the transfer queue and cancels on route or firmware change. Only a complete valid reading changes
the browser's current effects, through a local-only path that never triggers the live-edit sender;
a failed read keeps the previous values and says so. A reading never overwrites a named preset;
saving stays an explicit action. If only some rows are proven, the feature stays blocked, with no
guessed or default values for the rest.

## 6. Files

`src/lib/v16-live-effects.ts` (request, parser, candidate decoding, one-shot read, with
`v16-live-effects.test.ts`), `src/components/midi/v16-live-effects-probe.tsx` (development only,
lazy behind `import.meta.env.DEV` in `root-layout.tsx`, with its test), and the synthetic replies in
`src/test/v16-live-effects-replies.ts`.
