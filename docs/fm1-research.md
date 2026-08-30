# FM1 Editor Research Notes

> Status: working engineering reference  
> Last reviewed: 2026-08-30  
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

### FM1 Editor

Repository:

- https://github.com/benny-sparra/fm1-dx7-patch-importer

At the time of this review the editor already supports:

- browser-managed DX7-compatible banks
- all standard DX7 voice parameters
- live DX7 parameter updates
- algorithm and envelope visualisation
- FM1 filter, reverb, delay, distortion, chorus and phaser editing
- Web MIDI auditioning
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

### Editor implication

The editor's current live parameter-update approach is fundamentally aligned with the stock firmware.

### Recommended work

- Audit all editor parameter addresses against the documented 155-byte layout.
- Add table-driven tests for all parameter addresses and legal value ranges.
- Keep parameter encoding in domain/MIDI modules, not UI components.
- Prefer one authoritative parameter definition table if this is not already the case.

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

## 4.1 Modes

**Status: Confirmed**

Firmware analysis identifies arpeggiator pattern modes:

1. Up
2. Down
3. Up/Down
4. Down/Up
5. Random
6. Played Order
7. Off

Random mode uses a shuffle. Played Order tracks note press timestamps.

## 4.2 Octave expansion

**Status: Confirmed**

The firmware supports octave expansion/repetition.

## 4.3 Timing

**Status: Confirmed internally**

The arp/sequencer timing engine uses parameterised step lengths and gate percentages.

### Editor opportunity

An Arpeggiator panel may be a worthwhile future enhancement if safe runtime read/write commands are identified.

This should come after protocol research and after the sequencer data model is understood.

---

# 5. Internal sequencer

This is the most important new feature opportunity.

## 5.1 Sequencer mode

**Status: Confirmed**

The firmware has explicit modes:

```text
0 = off
1 = arpeggiator
2 = sequencer
```

The sequencer shares scheduler and note-injection infrastructure with the arpeggiator and normal MIDI engine.

---

## 5.2 Pattern record

**Status: Confirmed at firmware-analysis level; exact browser-side serialization still Needs hardware test**

The reverse-engineering project documents a **32-byte per-pattern record**.

A pattern contains:

- up to **10 note positions**
- corresponding velocity data
- a valid-count field
- flags
- negative/sentinel note values representing rests/end conditions in firmware-side structures

The exact byte offsets and signedness should be copied from the current upstream reverse-engineering notes when implementing the TypeScript codec rather than reproduced from memory.

### Important design rule

Create a typed domain model before building device I/O.

Example conceptual model:

```ts
type Fm1SequenceStep = {
  note: number | null
  velocity: number
}

type Fm1SequencePattern = {
  steps: Fm1SequenceStep[]
  validCount: number
  flags: number
}
```

The final type should reflect verified stock behaviour, not this illustrative shape.

---

## 5.3 Banks and slots

**Status: Confirmed internally**

Firmware analysis identifies:

- 16 pattern slots per bank
- bank-selection state
- RAM regions for pattern data
- flash load behaviour
- per-bank timing parameters
- a swing toggle

### Important uncertainty

The firmware memory layout being understood does **not** automatically mean the stock device exposes a normal user-level MIDI command to upload/download arbitrary pattern records.

That transport is the central protocol question.

---

## 5.4 Recording behaviour

**Status: Confirmed internally**

In sequencer capture mode:

- Note On records note/velocity information
- Note Off / all-release advances sequence state
- the firmware writes end markers and manages the active pattern

### Editor implication

If direct pattern read/write is not available, one fallback avenue may be controlled use of the stock recording input path.

This must be investigated experimentally and should not be assumed to be the preferred implementation.

---

## 5.5 Desired editor scope

The goal is **not** to build another DAW.

The Sequencer section should exist only to make the FM1's own internal sequencer easier to edit.

Desired eventual workflow:

```text
FM1 sequence
    ↓
display in browser
    ↓
edit notes / velocity / supported timing values
    ↓
send back to FM1
```

Potential UI:

- pattern/bank selector
- compact step grid or mini piano roll
- note value
- velocity
- rest
- pattern length / valid count
- tempo/timing values if safely controllable
- swing if safely controllable
- read/refresh from device
- send/apply to device
- local save/load only if useful

Explicitly out of scope:

- multitrack sequencing
- audio tracks
- plugins
- automation lanes
- arrangements
- clip launching
- DAW-style transport architecture
- arbitrary MIDI-file composition

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
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |

Do not send unknown command IDs experimentally without understanding their destination.

---

# 7. Effects

**Status: Existing editor feature + firmware analysis opportunity**

The current editor already edits:

- filter
- reverb
- delay
- distortion
- chorus
- phaser

The reverse-engineering repository identifies the firmware effects/audio path and may expose additional implementation detail.

### Recommended work

Perform an effects audit:

1. inventory every existing editor effect parameter
2. document its current MIDI message
3. find corresponding firmware handling where possible
4. mark each mapping Confirmed / Inferred / Hardware-tested
5. look for additional safe parameters exposed by the firmware
6. avoid surfacing internal coefficients that are not intended user parameters

This may yield useful editor improvements before the sequencer is ready.

---

# 8. Storage

**Status: Confirmed internally; not automatically safe for editor use**

The reverse-engineering project maps FM1 flash/storage operations and patch-related storage.

### Editor rule

The browser editor should continue treating browser IndexedDB as its own workspace source of truth unless a safe, normal, readback mechanism is explicitly verified.

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
