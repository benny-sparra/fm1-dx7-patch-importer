# SEQ-001 findings — FM1 internal sequencer protocol audit

**Status:** documentation complete; implementation remains blocked on hardware protocol captures.

## Conclusion

V13 firmware analysis confirms an internal, ten-position sequencer record and a stock recording
path driven by ordinary MIDI Note On/Off. It does **not** identify a safe host command to query,
replace, select, or persist a pattern. The editor currently has no sequencer functionality beyond
generic notes that might be recorded if the user manually arms the device.

This report concerns upstream FM-1-RE commit
[`95eca8488ac8c3b6f86287b2d3d43678e03e271a`](https://github.com/AL-255/FM-1-RE/tree/95eca8488ac8c3b6f86287b2d3d43678e03e271a),
principally its [MIDI analysis](https://github.com/AL-255/FM-1-RE/blob/95eca8488ac8c3b6f86287b2d3d43678e03e271a/docs/io/05-midi.md).

## Known protocol

| Path                                     | Evidence                                                                                              | Classification                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Note On `9n note velocity`               | V13 `note_on_route` (`0x02022282`) appends note and velocity when mode is sequencer.                  | Confirmed internal path; hardware test required before editor-assisted recording. |
| Note Off `8n note velocity`              | V13 `note_off_route` (`0x02022310`) closes/advances after all held notes release.                     | Confirmed internal path.                                                          |
| Vendor `F0 35 59 … F7`                   | Recognised staged syscmd transport, but no sequencer command ID/payload/reply/checksum is documented. | Confirmed transport; Unknown sequencer use; excluded from production.             |
| Sequence read response                   | No message/capture found.                                                                             | Unknown.                                                                          |
| Sequence write / complete-pattern upload | No message/capture found.                                                                             | Unknown.                                                                          |

The Yamaha `F0 43 10 gg pp vv F7` parameter path is a DX7 voice parameter path in the editor,
not a known sequencer path.

## Known data structure

V13 working address: `0x01C128B0 + bank * 0x800 + slot * 0x20`; `slot` is `0..15`.

| Offsets  | Field                                                   | Classification                                             |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `0..9`   | signed note slots; `FF` is an observed rest/clear value | Confirmed (`FF` only)                                      |
| `10`     | per-record timing-index copy; index constrained `0..9`  | Confirmed storage/range; musical meaning Strongly inferred |
| `11..19` | unresolved bytes                                        | Unknown                                                    |
| `20..29` | paired per-step velocity bytes                          | Confirmed                                                  |
| `30`     | derived valid-note count `0..10`                        | Confirmed                                                  |
| `31`     | recorder boundary/state byte written `FF`               | Writes/branch Confirmed; semantic Unknown                  |

The records are an in-device RAM/flash structure, not a known SysEx payload. There is no known
checksum or byte-packing rule for a sequence message.

## Parameters and uncertainties

- Confirmed: three internal modes (off/arp/sequence), 16 slots per bank, ten note/velocity
  positions, valid-count derivation, `FF` clear/rest, device-local flash load and write routines.
- Strongly inferred: global per-bank gate `20..100`, swing `50..75`, tempo `30..300`, and timing
  index `0..9`. Their labels/scales need a hardware test.
- Unknown: ties, distinct accents, per-step gate/length, sequencer direction, user-visible bank
  count, external pattern selection, external save/load, a readback protocol, and persistence
  trigger/confirmation.

The arpeggiator's seven direction modes must not be presented as sequencer direction. The upstream
V13 timing-table address anomaly also blocks literal rate-value claims.

## Current editor capability matrix

| Capability                           | Result                                            |
| ------------------------------------ | ------------------------------------------------- |
| Read sequencer state                 | No                                                |
| Write individual sequencer parameter | No                                                |
| Write complete pattern               | No                                                |
| Select/trigger/save/load pattern     | No                                                |
| Detect device persistence            | No                                                |
| Send generic Note On/Off             | Yes, indirect and unsafe as a sequencer operation |
| Parse/log raw incoming MIDI          | Logs only; does not parse sequence state          |

Relevant current boundaries: [`src/lib/midi.ts`](../src/lib/midi.ts),
[`src/hooks/use-midi.ts`](../src/hooks/use-midi.ts), and
[`src/routes/patch-editor-page.tsx`](../src/routes/patch-editor-page.tsx).

## Required hardware tests

1. Capture a baseline, then one stock-device change at a time: sequencer mode, bank, slot, clear,
   one note, one velocity, each timing control, save, reboot, and reload.
2. Capture both USB and Bluetooth traffic, including any device-to-host bytes, and record firmware
   version.
3. Repeat after reconnect/reset; establish whether the device persists automatically, on a stock
   save action, or neither.
4. Only after a response or bounded command is proven should a browser codec or transport be added.

## Recommended boundaries and follow-up tasks

The first editor feature should be a small stock-pattern view: one selected slot, ten note/rest
cells, velocity, derived length, and opaque preservation of unresolved bytes. It should be read-only
until a real capture supports readback. A DAW-style transport, multitrack, MIDI-file, automation,
or generic vendor-command feature is out of scope.

- **PROTO-003:** turn the required tests above into a capture sheet before using hardware.
- **SEQ-002:** decode a static, version-labelled 32-byte record only after at least one hardware
  fixture corroborates the V13 layout. Decode known bytes and preserve `11..19` and `31` verbatim.
- **SEQ-003:** add lossless decode/edit/encode fixtures only after SEQ-002; no transmission.
- **SEQ-READ-002:** implement readback only after a captured, safe response exists.
- **SEQ-WRITE-001 (new candidate):** design one complete-pattern apply operation only after a
  command, persistence behaviour, and failure/reconnect tests are verified. Never probe unknown
  vendor IDs.
