# SEQ-REC-001 — the stock recording input contract

**Status: documentation complete (2026-09-17). No implementation in this task.**

This document states exactly what the editor may transmit to record a pattern into the FM1's
internal sequencer, in what order, with what spacing, and what the user must do by hand. It is the
contract SEQ-REC-002 implements and must not exceed.

Every message in this contract is ordinary channel MIDI: Note On and Note Off. No SysEx, no vendor
frame, no guessed command, no loader or OTA path is involved at any point, in either direction.

The evidence is the V15 hardware fixture set in [`sequencer-fixtures/V15/`](sequencer-fixtures/V15/)
and §5.7–§5.8 of [`fm1-research.md`](fm1-research.md). Everything here is **Confirmed observable V15
behaviour** unless it is labelled otherwise. Nothing here describes the device's internal record
layout; the V13 32-byte hypothesis in §5.3 is firmware evidence and must not appear in this track.

## 1. What the operation is, and what it is not

The operation is: **replace the recorded contents of the pattern the user has already selected and
armed, by playing a whole loop's worth of steps into it as ordinary notes.**

It is not an update. The editor cannot:

- change one step in place — a pass always starts at step 1 and writes forward;
- arm or leave record mode, select a pattern or a chain, or set Step length, Gate, Rate, Tempo,
  Swing, Sync, or Transpose;
- trigger the stock `SAVE`, so everything it records is volatile until the user saves by hand;
- read back what was recorded, other than by observing a later playback pass (SEQ-OBS-002);
- verify which pattern it recorded into.

Those are all stock-UI-only operations, and the editor must present them to the user as manual
steps rather than performing or implying them.

## 2. The manual arming sequence

The stock V15 Sequencer page map, as photographed and recorded across the fixture set:

| Page  | Controls                                          |
| ----- | ------------------------------------------------- |
| 1 / 3 | Pattern (1, 2), Clear, Chain, Step length `1..16` |
| 2 / 3 | Voice, Rate (e.g. `1/8T`), Tempo, Gate %          |
| 3 / 3 | Swing %, Sync, Transpose                          |

`Clear` opens a confirmation overlay offering **Cancel Clear**, **Clear Step**, and **Clear
Pattern**; on the fixture device Clear Pattern is executed by turning K4 clockwise once and displays
`Cleared`. `REC` arms and leaves recording. `PLAY/STOP` starts and stops playback.

The literal sequence the user performs before the editor transmits anything:

1. Put the device in Sequencer mode.
2. On page 1/3, select the pattern to overwrite (Pattern 1 or Pattern 2).
3. On page 1/3, set Step length to the loop length the transmitted pattern is written for.
4. Optionally press `Clear`, then `Clear Pattern`, and observe `Cleared`. This is not required —
   a pass overwrites forward regardless — but it is the only way to be sure no old tail survives
   beyond the transmitted steps.
5. Press `REC`. The cursor sits on step 1 and the leftmost step light flashes.
6. Tell the editor to transmit.
7. When the editor reports that it has finished, press `REC` again to leave recording.
8. Press `PLAY/STOP` to hear the result, and compare it with what was sent.
9. To keep the pattern beyond the next power-off, perform the stock `SAVE` action by hand.

Steps 1–5 and 7–9 are the user's. Only step 6 is the editor's.

The device's own page-2/3 and page-3/3 values do not change what is recorded — they change how it
plays back — with one caveat: every fixture was captured at **Transpose 0**, and the relationship
between a transmitted pitch and the stored pitch at a non-zero Transpose is untested. The pre-flight
must ask the user to confirm Transpose 0.

## 3. The note stream

### 3.1 Per-step messages

The editor sends the note channel the user has already selected in the editor's MIDI settings. The
fixtures were captured on channel 1, so the status bytes below are shown as `90` / `80`; on
channel `n` they are `9n` / `8n`.

| Step content    | Bytes, in order            | Notes                                                   |
| --------------- | -------------------------- | ------------------------------------------------------- |
| A sounding step | `90 nn vv` then `80 nn 00` | `nn` = pitch `0..127`, `vv` = attack velocity `1..127`. |
| A rest          | `90 3C 00`                 | One message, sent alone. **No Note Off follows it.**    |

A rest is a Note On with velocity 0. It advances the step cursor by one and records a silent step;
consecutive ones accumulate one step each. The fixtures sent pitch `3C` (60) for rests, so the
contract fixes the rest pitch at `3C`. Whether any other pitch works in a velocity-0 message is
untested, and the implementation must not vary it.

Velocity `0` is therefore reserved: a sounding step must never be transmitted with velocity 0, or it
becomes a rest.

The hold time between a step's Note On and its Note Off carries no musical information. Playback
duration comes from the device's global Gate, and the paired 180 ms / 299 ms fixtures show hold time
is not stored per step. Hold time is a transport parameter only (§4).

### 3.2 Ordering rules

- Strictly one step at a time, in step order, starting at step 1.
- A step's Note Off must be sent before the next step's Note On. Never overlap two notes: the V13
  recorder closes a record operation when the **last held** note is released, and overlapping or
  chorded input has never been captured on V15. Overlap is excluded, not merely discouraged.
- Send exactly as many steps as the pattern's loop length (§5.3).
- Send nothing else during the pass: no Program Change, no CC, no panic/all-notes-off, no audition
  of the edit buffer. A transmit must suspend any other outbound traffic on the note channel.

### 3.3 Worked example

Loop length 4; step 1 = note 60 velocity 90, step 2 = rest, step 3 = note 60 velocity 90,
step 4 = note 65 velocity 40. On channel 1, with the spacing of §4:

```text
t+0     90 3C 5A      step 1 on
t+80    80 3C 00      step 1 off
t+100   90 3C 00      step 2, rest
t+200   90 3C 5A      step 3 on
t+280   80 3C 00      step 3 off
t+300   90 41 28      step 4 on
t+380   80 41 00      step 4 off
```

Note that step 1 and step 3 are the same pitch at the same velocity and still occupy two distinct
steps.

## 4. Spacing

Spacing is a transport question, not a musical one: recording is untimed, and the recorded loop plays
back at the device's own Rate and Tempo whatever cadence the editor transmitted at.

Captured evidence:

| Fixture                                                           | Note On period | Hold   | Result                                     |
| ----------------------------------------------------------------- | -------------- | ------ | ------------------------------------------ |
| `seq-V15-pattern-01-fifteen-step-60-through-74-2026-08-31`        | 100 ms         | 80 ms  | All 15 ascending notes recorded, in order. |
| `seq-V15-pattern-01-two-step-60-65-velocity-90-2026-08-31`        | ~900 ms        | 300 ms | Both notes recorded, in order.             |
| `seq-V15-pattern-01-repeated-note-60-run-1` / `-run-2-2026-09-17` | 900 ms         | 300 ms | Two identical notes recorded as two steps. |
| `seq-V15-pattern-01-host-rest-single` / `-double-2026-09-17`      | ~600 ms        | 300 ms | Rests recorded; ladder 166/333/500 ms.     |

The contract therefore fixes spacing inside the captured envelope and does not extrapolate past its
fast end:

- **Hold (Note On to its Note Off): 80 ms.** The fastest captured value that recorded correctly.
- **Step period (Note On to the next step's first message): 100 ms.** The fastest captured value
  that recorded correctly, giving a 20 ms gap after each Note Off.
- **Rest period: 100 ms** between a rest and the next step's first message. Only ~600 ms is captured
  for rests, so a faster rest cadence is **Needs hardware test**; SEQ-REC-002 must verify a
  rest-bearing pattern at 100 ms on hardware before shipping that value, and until then transmit
  rests at the captured 600 ms.

Nothing below 100 ms has been captured and nothing below 100 ms may be sent. A 16-step pattern at
100 ms takes about 1.6 s to transmit; that is the operation's whole duration budget, and it needs no
progress optimisation.

The timing source must be a scheduled transmission rather than a busy loop, and the implementation
must not assume the browser delivers timers precisely: late is safe, early is not, so any scheduler
jitter must only ever lengthen the interval.

## 5. What SEQ-001B established, and how the contract handles it

All three results were captured twice. See §5.8 of [`fm1-research.md`](fm1-research.md).

### 5.1 Rests: positive

A host Note On with velocity 0 records one silent step, and consecutive ones accumulate one step
each (166 ms / 333 ms / 500 ms between the surrounding notes for zero, one, and two rests).

**Contract:** a rest is transmittable, exactly as §3.1 specifies. A pattern containing rests is not
refused.

### 5.2 Repeated pitches: positive

Two identical successive notes occupy two distinct steps. They do not merge.

**Contract:** no de-duplication, no minimum pitch change, no tie encoding. Each step is transmitted
independently.

### 5.3 Start position: negative for in-place editing

Arming record always places the cursor at step 1. A pass overwrites forward from step 1 and leaves
later steps intact; it neither appends nor clears.

**Contract consequences:**

- The operation is defined as replacing the whole recorded sequence. There is no "record from step
  N" and no single-step update, and the UI must not offer one.
- The editor must transmit exactly `stepLength` steps, padding with rests where the pattern is
  silent, so that every step in the loop is defined by the pass. Transmitting fewer leaves a tail of
  whatever the pattern held before, which will play.
- Because the editor cannot set Step length, `stepLength` is a number the user tells the editor,
  and the pre-flight must state it and ask the user to confirm the device matches. A mismatch is a
  user-visible wrong result, not an error the editor can detect.
- Sending **more** steps than the loop length is forbidden. The one relevant observation — a 16-note
  input that replayed only its last 15 notes — is a console trace rather than a committed fixture,
  and is consistent with the cursor wrapping and overwriting from step 1. Wrap behaviour is
  therefore **Needs hardware test**, and until it is captured the editor refuses to send more steps
  than the stated loop length.

### 5.4 The device is silent while recording

Across all six captures the FM1 transmitted nothing while recording: it does not echo host notes,
and every captured device message was a later playback pass.

**Contract:** a transmit cannot contaminate a concurrent observed read, so SEQ-OBS-002 may verify
the result from the playback pass that follows. Two consequences remain: the editor must not treat
device silence during the pass as a failure signal, because silence is expected either way, and the
user playing the device's own keys during a pass still corrupts the recording, so the pre-flight
must say so.

## 6. Failure and recovery

No outcome below is detectable from the transmission itself. The device acknowledges nothing, so the
editor must never report success on the strength of having sent the bytes. The honest report after a
completed pass is that the pattern **was sent**; only an observed playback pass makes it
**confirmed**.

| Situation                                         | What actually happens                                                                      | What the editor does                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| The device was not armed                          | The notes sound as ordinary played notes and nothing is recorded.                          | Nothing is lost. Report the pass as sent-but-unconfirmed, tell the user to check the pattern, and offer resend after arming.                       |
| The device was on the wrong pattern               | The wrong pattern is overwritten, irrecoverably if it was saved.                           | Name the pattern in the pre-flight and require the user to confirm it. There is no undo; say so plainly before the first byte.                     |
| The device Step length differs from the editor's  | A short device loop truncates the pattern; a long one leaves an audible tail of old steps. | State the expected Step length in the pre-flight. On a mismatch heard later, the user fixes Step length and resends.                               |
| The user cancels mid-pass                         | The pattern holds a partial overwrite: the transmitted steps, then the old tail.           | Stop at the next step boundary, send the pending Note Off so no note is left hanging, and report the partial state honestly with the step reached. |
| The output port disconnects mid-pass              | Same partial state, plus a possible hanging note.                                          | Treat as cancellation, drop the queue, and report the partial state and the step reached.                                                          |
| The user plays the device keys during the pass    | Their notes are recorded too, interleaved.                                                 | Warn in the pre-flight. Detectable only by observation afterwards.                                                                                 |
| Playback does not match what was sent             | Any of the above, or an untested device state.                                             | Report the mismatch plainly against the observed pattern. Never quietly accept it.                                                                 |
| The device is powered off before the stock `SAVE` | The whole pattern is lost.                                                                 | After a pass, state that the result is unsaved and that persistence requires the stock `SAVE`.                                                     |

Recovery is always the same shape: the local pattern is the source of truth, it is never mutated by
a transmit, and the user can resend after fixing the device state. A failed or cancelled pass must
never be retried automatically — an unattended second pass would record into whatever the device is
showing by then.

## 7. Validation SEQ-REC-002 must perform before sending a byte

| Value         | Bound                                            | On violation              |
| ------------- | ------------------------------------------------ | ------------------------- |
| Pitch         | integer `0..127`                                 | refuse the whole transmit |
| Velocity      | integer `1..127` for a sounding step             | refuse the whole transmit |
| Rest          | encoded only as `9n 3C 00`                       | refuse the whole transmit |
| Step count    | integer `1..16`, equal to the stated loop length | refuse the whole transmit |
| Channel       | the configured note channel, `1..16`             | refuse the whole transmit |
| Hold / period | `>= 80 ms` / `>= 100 ms`                         | refuse the whole transmit |

Validation is all-or-nothing and happens before the first message: a pattern that fails partway
through transmission would leave the device half-overwritten.

Only pitches `60..74` have been exercised on hardware. The `0..127` bound is the MIDI bound, not a
hardware-verified one; a pitch outside the device's own range may be normalised or dropped by the
device, which observation will reveal.

Two implementation details that the byte-level contract makes non-negotiable:

- The rest must go out as literally `9n 3C 00`. A MIDI library that rewrites a zero-velocity Note On
  into a Note Off (`8n 3C 00`) breaks the operation, because a bare Note Off as a step-advance has
  never been tested. SEQ-REC-002 must assert the emitted bytes rather than trust
  [`sendNoteOn`](../src/lib/midi.ts)'s velocity handling.
- The operation belongs in a bounded domain function that takes a pattern and emits this exact
  stream. No raw note API beyond it may be exposed to the UI.

## 8. What implements this

- [`src/lib/fm1-sequence.ts`](../src/lib/fm1-sequence.ts) — the behavioural pattern model
  (SEQ-OBS-001), with per-field provenance naming the fixtures behind it.
- [`src/lib/fm1-sequence-transmit.ts`](../src/lib/fm1-sequence-transmit.ts) — `makeFm1PatternTransmission`
  builds the exact byte stream, and `transmitFm1Pattern` performs the bounded pass. Validation is
  all-or-nothing before the first message; a pass reports `sent`, `cancelled`, or `interrupted`
  with the step reached, and never retries.

The UI layer — the pre-flight naming the pattern and Step length, transmit progress, cancel, the
unsaved/`SAVE` notice, and the SEQ-OBS-002 confirmation pairing — is not built yet.

## 9. Still required before SEQ-REC-002 ships

- Hardware verification of a complete editor-transmitted pattern, including rests, at the 100 ms
  step period (§4).
- A captured fixture for the over-length case, to replace the console-trace wrap observation
  (§5.3).
- Confirmation that a transmitted pitch is stored unchanged at a non-zero device Transpose, or a
  documented requirement that Transpose stays at 0 (§2).

None of these blocks writing the implementation against this contract; each blocks claiming the
corresponding behaviour is verified.
