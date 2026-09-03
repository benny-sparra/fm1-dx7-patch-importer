# V15 FM1 sequencer captures

**Firmware label:** V15 is operator-reported as the glide/portamento release. The device version
screen has not yet been recorded, so it remains an unverified device label rather than a confirmed
firmware reading.

## Stock-UI observation (2026-08-31)

A user-provided photo of the device's Sequencer page `1/3` shows this clear-confirmation text:

| Control | Displayed V15 action | Confidence                             |
| ------- | -------------------- | -------------------------------------- |
| K2      | Cancel Clear         | Confirmed by the photographed stock UI |
| K3      | Clear Step           | Confirmed by the photographed stock UI |
| K4      | Clear Pattern        | Confirmed by the photographed stock UI |

The screenshot shows voice `001 BRASSBEN`. It proves the UI labels but does not prove that K4 was
executed, what data it changed, whether it persisted, or whether it emitted MIDI traffic. It also
supersedes the generic manual-derived Knob-2 clear instruction in the capture plan: do not use that
instruction for V15 hardware.

The two additional user-provided V15 page photos establish this visible stock-control map:

| Page            | K1          | K2          | K3            | K4                        |
| --------------- | ----------- | ----------- | ------------- | ------------------------- |
| `1/3 Sequencer` | Pattern `1` | Clear       | Chain `1`     | Step `15`, then `16`      |
| `2/3 Sequencer` | Voice `1`   | Rate `1/8T` | Tempo `120`   | Gate `80%`                |
| `3/3 Sequencer` | Swing `50%` | Sync `Off`  | Transpose `0` | no labelled control shown |

These photographs confirm the labels and values at the time of the photo only. They do not show a
pattern-length control beyond the observed selectable Step `16`, a persistence operation, or a host
protocol.

| Fixture ID                                                 | Controlled difference                                                    | Status             | Evidence conclusion                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| `seq-V15-pattern-01-keypress-attempt-2026-08-31`           | Operator pressed device keys while trying to locate the clear control.   | Incomplete capture | Eight inbound standard-MIDI note messages; no observed SysEx/vendor frame. No sequencer conclusion. |
| `seq-V15-pattern-01-empty-2026-08-31`                      | K4 Clear Pattern on Pattern 1, then PLAY/STOP.                           | Incomplete capture | Display said `Cleared`; playback was silent with no step LEDs; no device-to-host packets received.  |
| `seq-V15-pattern-01-one-note-64-velocity-90-2026-08-31`    | Empty Pattern 1 -> one physical MIDI note 64 at velocity 90 -> playback. | Incomplete capture | Three candidate sequencer-playback repetitions after the recorded note; no SysEx/vendor frame.      |
| `seq-V15-pattern-01-one-note-64-repeat-2026-08-31`         | Fresh empty Pattern 1 -> the same physical MIDI note 64 -> playback.     | Incomplete capture | Repeats the candidate playback note/cadence; the physical hold differed.                            |
| `seq-V15-pattern-01-one-note-65-velocity-90-2026-08-31`    | Empty Pattern 1 -> physical MIDI note 65 at velocity 90 -> playback.     | Incomplete capture | Candidate playback changed 64 -> 65 while velocity/cadence remained stable.                         |
| `seq-V15-pattern-01-note-60-velocity-32-2026-08-31`        | Empty Pattern 1 -> host MIDI note 60 at velocity 32 -> playback.         | Incomplete capture | Candidate playback retained attack velocity 32.                                                     |
| `seq-V15-pattern-01-note-60-velocity-90-2026-08-31`        | Same host note and baseline, velocity 32 -> 90.                          | Incomplete capture | Candidate playback attack velocity changed exactly 32 -> 90.                                        |
| `seq-V15-pattern-01-two-step-60-65-velocity-90-2026-08-31` | Add host note 65 after host note 60.                                     | Incomplete capture | Three playback passes emitted C4 then F4 at the same velocity.                                      |
| `seq-V15-pattern-01-two-step-60-65-gate-50-2026-08-31`     | Change only visible K4 Gate from 80% to 50%.                             | Incomplete capture | Note gates shortened from 131-134 ms to 83 ms; pitches and step period stayed stable.               |
| `seq-V15-pattern-01-step-16-note-60-2026-08-31`            | Set visible active Step length 16, then record C4.                       | Incomplete capture | C4 recurred after 2,665 ms, proving a 16-step playback length.                                      |

## Differential observation

Across the two fresh-baseline one-note runs, the FM1 emitted physical `90 40 5A` / `80 40 64` and
then candidate playback pairs with the same bytes. The candidate playback Note Ons recur every
2,498–2,501 ms. Physical holds differed (299 ms and 180 ms), while the observed candidate playback
gates stayed in the 131–134 ms range. This is a repeatable observation that playback is not plainly
replaying those two physical hold durations; it remains **Needs more hardware testing** for gate
semantics, V15 record representation, and any persistence claim.

Across the note-64 and note-65 fixtures, both the physical key event and the candidate playback event
changed by one MIDI semitone (`40` to `41` hex) while velocity stayed `5A`. This is **Confirmed
observable V15 playback behaviour** for these two stock recordings; it is not evidence of the raw
record's byte offsets or serialisation.

The matched Note-60 velocity pair held the requested pitch, nominal 300 ms host duration, channel,
and user-confirmed cleared baseline constant while changing Note On velocity from `20` (32) to `5A`
(90). The matching candidate playback Note On changed by the same values. This is **Confirmed
observable V15 playback behaviour** for those two captures. It does not reveal the V15 record field
layout, quantisation, or the representation of velocity in internal state.

The controlled two-note fixture emitted C4 then F4 in that order on three observed playback passes;
the pair started again every 2,499-2,500 ms. This is **Confirmed observable ordered playback** for
that V15 recording. It does not prove the number of internal steps, spacing rules, or a byte-level
record mapping.

The normal V15 page exposes a Step control that visibly changes through `16`. With active Step length
`16` before a cleared-pattern one-note recording, the note recurred after 2,665 ms—sixteen
approximately 166.6 ms intervals at the displayed `1/8T` / 120 BPM setting. Changing Step to `1`
then caused one-note-per-step playback, confirming it is loop length rather than a record-position
selector. This is **Confirmed observable V15 1–16 length behaviour** and disproves the earlier
15-step-capacity interpretation. A later full-16 fixture recorded and replayed C4 through B4 in
order; the older 15-note burst remains an incomplete length-15 fixture.

The page-2 rate, tempo, and gate values predict a 1/8-triplet step of roughly 166.7 ms at 120 BPM.
At the photographed 80% gate, playback gates were 131-134 ms; after changing only Gate to 50%, they
were 83 ms. This is **Confirmed observable V15 global-gate behaviour**. It is strongly inconsistent
with the previously observed physical 180 ms versus 299 ms input holds being stored as individual
note durations. It remains **Needs more hardware testing** whether any other per-step gate data
exists, and no V15 internal record bytes have been captured.

The initial pattern content, confirmed sequencer mode, outbound traffic, stock playback outcome, and
firmware screen are missing from this attempt. It did **not** establish that a pattern was cleared.
It must not be used to infer V15 record bytes, sequencer command semantics, or a safe host operation.

The second fixture confirms the user-visible K4 operation and empty-pattern playback result. Its
receive-only transport cannot establish that no traffic was sent _to_ the FM1 and does not provide a
record dump; it is therefore not a completed core traffic fixture.
