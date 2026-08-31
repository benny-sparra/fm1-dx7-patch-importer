# SEQ-001A — FM1 sequencer hardware-capture plan

**Status:** V15 stock-hardware observations collected over USB CoreMIDI; byte-level state
correlation remains blocked because no record readback or safe vendor request/reply exists.

This is the reproducible test plan for the version-labelled fixture format in
[`sequencer-fixtures/`](sequencer-fixtures/). It performs observation only. It does not add a
sequencer codec/UI, request data from the FM1, replay captured traffic, or transmit vendor SysEx.

## Preconditions and evidence discipline

1. Record the exact firmware version shown by the stock device. Make a separate fixture directory
   for every version; never fill a V13 fixture with results from another firmware.
2. Put a passive, bidirectional MIDI monitor between all test endpoints and the FM1. Enable SysEx
   capture and retain both complete reconstructed MIDI messages and USB/BLE frames where supplied.
3. Establish and photograph/note the stock-device baseline: mode, selected bank and pattern/slot
   when visible, tempo/rate/gate/swing controls when visible, selected voice, and current audible
   sequence. Do not substitute assumed values for unavailable UI state.
4. For every experiment, start from the named baseline and write the literal physical gestures and
   device labels observed. If an action is not exposed by the stock UI, mark the fixture
   `not_available_on_tested_hardware`; do not invent a control path.
5. Capture five seconds before the first gesture, all traffic during the action, and five seconds
   after the outcome is observed. Record all bytes in chronological order even when they do not
   appear sequencer-related.
6. Repeat each successful paired experiment after a reconnect/reset. Repeat persistence-relevant
   experiments after pattern change, patch change, and a full power cycle.

The FM1 browser editor is not part of this plan unless an experiment explicitly records its commit
and the tested action. Do not use its piano keyboard: it sends fixed-velocity notes and cannot make
the controlled velocity/gate fixtures. Use stock hardware controls or an external standard-MIDI
controller that the passive monitor records exactly.

On 2026-08-31 the local Codex in-app browser was explicitly granted permission to try Web MIDI, but
the browser returned `Permission to use Web MIDI API was not granted` before exposing any endpoints.
No message was sent and no hardware fixture was created. This is a capture-host limitation, not
evidence about the FM1 or its protocol.

## Core fixture matrix

All IDs below are placeholders for a physical capture. Start each independent experiment from the
empty baseline unless another fixture is explicitly named as its baseline. `C4` means MIDI note 60
only after the monitor verifies that byte value; retain the actual bytes as authoritative.

| Fixture ID suffix              | Baseline / sole intended difference                                                                               | Required observation                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `empty`                        | Clear/reset the selected stock pattern, then do nothing.                                                          | Silent/empty playback; any traffic emitted by clear or selection.                                                                                        |
| `step-01`                      | Empty → record one MIDI note 60 at velocity 64 in the first recorded position.                                    | Playback order, pitch, velocity/audible level, and exact Note On/Off bytes.                                                                              |
| `step-02` … `step-10`          | Empty → place the same one note in exactly the named position using only an observed stock rest/cursor operation. | Whether the device exposes a positional cursor/rest and the resulting playback. If it does not, mark unavailable rather than padding with assumed rests. |
| `pitch-61`                     | `step-01` → change only recorded note 60 to 61; retain velocity, channel, and release method.                     | Pitch change, complete traffic diff, and any record-state evidence.                                                                                      |
| `velocity-32`                  | `step-01` → change only attack velocity 64 to 32.                                                                 | Audibility/playback change and complete traffic diff.                                                                                                    |
| `velocity-96`                  | `step-01` → change only attack velocity 64 to 96.                                                                 | Repeatable velocity effect and complete traffic diff.                                                                                                    |
| `gate-short` / `gate-long`     | Identical one-note pattern → adjust only a stock-exposed duration/gate control to two observed values.            | Whether duration changes and whether traffic/record state changes. If no control is exposed, mark unavailable.                                           |
| `rest-between`                 | Record the same two notes as a contiguous control pattern, then create one observed rest between them.            | Whether the rest is preserved and how playback advances.                                                                                                 |
| `repeated-note`                | Empty → record note 60 twice with the same velocity/release.                                                      | Whether two distinct successive steps play.                                                                                                              |
| `ten-steps`                    | Empty → record exactly ten notes at the same known channel/velocity/release method.                               | Maximum-length behaviour and any overflow/stop behaviour.                                                                                                |
| `short-length`                 | `ten-steps` → use only a stock-exposed length control to select a shorter value.                                  | Whether a length control exists independently of valid-note count.                                                                                       |
| `clear`                        | A verified nonempty pattern → perform one observed stock clear/reset action.                                      | Clear traffic, resulting playback, and any state/persistence change.                                                                                     |
| `record-start` / `record-stop` | Empty → separately perform each stock record arm/start/stop action without notes.                                 | Whether either action creates traffic or changes playback/record indicator.                                                                              |
| `pattern-select`               | One verified nonempty pattern → select another stock pattern/slot and back.                                       | Selection traffic and whether the original pattern returns unchanged.                                                                                    |
| `bank-select`                  | One verified nonempty pattern → select another stock bank and back, if exposed.                                   | Selection traffic and whether the original pattern returns unchanged.                                                                                    |
| `save` / `load`                | One verified nonempty pattern → perform each stock save/load action, if exposed.                                  | Traffic and persistence across a later selection/reload.                                                                                                 |
| `power-cycle`                  | One verified nonempty saved/unsaved pattern → power off, wait for full shutdown, power on, restore the same view. | Exact survival result; do not interpret lack of a message as lack of persistence.                                                                        |

The paired pitch and velocity fixtures are the first byte-correlation gate. They must each be run at
least twice from a freshly cleared stock pattern. A record-byte mapping cannot be called confirmed
until a lawful record/state observation reproduces the expected independent change in both repeats.

## Message classification

Classify every message in each fixture using exactly one label:

| Label                          | Use only when                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `known_standard_midi`          | The full message is standard channel MIDI (for example, captured Note On/Off or Program Change) and its normal MIDI meaning is established. |
| `known_fm1_command`            | A documented, safe FM1 runtime command with exact known semantics is captured. No sequencer-specific command currently qualifies.           |
| `candidate_sequencer_related`  | Its appearance/disappearance is repeatably correlated with one controlled stock sequencer action, but semantics remain unproven.            |
| `unrelated_background_traffic` | It also occurs in an unchanged control capture or has a separately established unrelated purpose.                                           |
| `unknown`                      | Any message that lacks enough evidence for the other labels, including unclassified vendor frames.                                          |

An `F0 35 59 … F7` message is `unknown` unless repeatable controlled evidence supports the narrower
candidate label. Its presence alone never makes it safe to transmit. Keep all unknown/vendor traffic
excluded from application code.

## Differential-analysis ledger

There is one incomplete V15 receive-only keypress attempt in
[`sequencer-fixtures/V15/`](sequencer-fixtures/V15/). It preserves eight inbound standard-MIDI
Note On/Off messages but lacks the literal gestures, initial content, outbound traffic, playback
result, and raw record/state evidence. It is not a controlled comparison. Therefore this ledger
contains no record-byte assignments and no candidate host command.

The same directory also contains a controlled V15 Pattern 1 empty-baseline observation: K4 displayed
`Cleared`, then PLAY/STOP was silent with no step LEDs, and no device-to-host packet was received.
It confirms only that stock UI/playback result. The receive-only topology cannot rule out host-to-FM1
traffic and has no record/state bytes, so it is not evidence for record layout or command semantics.

Subsequent controlled V15 fixtures establish observable behaviour only: a stock pattern has a
selectable Step length of `1..16`; 16 ascending standard-MIDI notes replay in order at Step `16`;
Step `8` replays only the first eight notes; attack velocity is preserved; the global Gate control
sets playback duration; stock Clear Step creates a silent step; Pattern 1 and Pattern 2 have separate
state; unsaved state is lost on power-off; and the stock `SAVE` action, which displayed `all data
saved`, persisted the two-note Step-8 pattern across a power cycle. The fixture records classify all
captured messages as standard MIDI or candidate sequencer playback. No SysEx/vendor message was
observed or transmitted.

| Question                                                | Current evidence                                                                    | Classification                                                      | What would confirm or disprove it                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Which bytes encode pitch?                               | V13 firmware says record offsets `0..9`; no hardware record capture.                | Strongly inferred for V13 hardware; not confirmed by fixture.       | Two repeated pitch-only pairs with lawful record/state evidence.                                      |
| Which bytes encode velocity?                            | V13 firmware says record offsets `20..29`; no hardware record capture.              | Strongly inferred for V13 hardware; not confirmed by fixture.       | Two repeated velocity-only pairs with lawful record/state evidence.                                   |
| Is duration/gate per-step?                              | V13 analysis finds a per-bank candidate and no per-step field.                      | Unknown.                                                            | Paired gate experiments plus state/traffic evidence.                                                  |
| How are empty steps encoded?                            | Firmware clears note slots with `FF`; no captured stock pattern state.              | Strongly inferred for V13 hardware; `FF` only.                      | Empty, clear, and rest fixtures with repeatable record/state evidence.                                |
| Is sequence length separately encoded?                  | V15 exposes Step `1..16`; Step 8 limits playback to the first eight recorded notes. | Confirmed observable V15 behaviour; raw representation Unknown.     | Lawful V15 state/readback evidence.                                                                   |
| Is playback metadata outside 32 bytes?                  | V15 Rate/Tempo/Gate/Swing UI and global Gate playback effect; V13 state analysis.   | Confirmed observable Gate; raw location Unknown.                    | Lawful V15 state/readback evidence.                                                                   |
| Is the record persistent / are there multiple patterns? | V15 Pattern 1/2 separation and save/power outcomes captured.                        | Confirmed observable V15 behaviour; raw persistence format Unknown. | Lawful V15 state/readback evidence.                                                                   |
| Is a host read/write command available?                 | No captured response or safe command.                                               | Unknown; excluded.                                                  | Passive capture of a repeatable stock operation with an independently verified request/reply meaning. |

## SEQ-002 decision

**SEQ-002 remains blocked.** The V15 label is strongly evidenced by the user-installed Glide update
and visible Glide feature, but not directly printed by the device. More importantly, there is no
real V13 32-byte record capture, V15 state capture, or safe sequencer request/reply. Firmware-derived
offsets alone do not meet the fixture-first gate and do not authorise a decoder.

Minimum additional experiments to reconsider the block:

1. Obtain lawful, non-invasive raw record/state evidence for a controlled V13 baseline, pitch, and
   velocity pair, or capture a
   demonstrably safe stock request/reply that returns the record. Without either, traffic alone
   cannot corroborate individual record bytes.
2. Confirm the firmware version through a stock device string if a future firmware exposes one; do
   not enter an updater/loader just to obtain it.
3. If any vendor traffic occurs, repeat the action and an unchanged control capture before labelling
   it `candidate_sequencer_related`; do not transmit it.

### V15 boundary

Do not apply the V13 ten-step working-record hypothesis to V15. The V15 fixture set shows a normal
Sequencer page with Pattern, Clear, Chain, and selectable Step `1..16`; the Clear confirmation overlay
then offers Cancel Clear, Clear Step, and Clear Pattern. V15 playback and persistence semantics must
remain separate from the V13 record-layout hypothesis.

Even after these experiments, SEQ-002 would be limited to a static decoder. A sequencer read/write
transport remains separately blocked until a safe captured request/reply or stock runtime operation
is proven.
