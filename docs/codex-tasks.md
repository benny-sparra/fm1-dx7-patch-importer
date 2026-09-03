# Codex Task Backlog — FM1 Research and Sequencer Work

> Give Codex one task at a time.  
> `docs/fm1-research.md` is authoritative for protocol knowledge.  
> Do not allow an implementation task to invent missing protocol behaviour.

---

# Usage pattern

A good Codex prompt is:

```text
Read AGENTS.md, docs/fm1-research.md and docs/fm1-roadmap.md.

Implement task DX7-001 from docs/codex-tasks.md.

Stay strictly within that task's scope. Do not implement undocumented
FM1 vendor commands. Run the focused tests, then the normal repository
validation required by AGENTS.md. Report files changed and validation.
```

For hardware-research tasks, Codex should normally prepare tooling,
documentation or decoding code. A human should decide when to transmit
newly discovered messages to a physical FM1.

---

# Foundation

## DOC-001 — Add FM1 engineering documentation

**Status:** ready

### Goal

Add the research, roadmap and task documents to the repository.

### Files

```text
docs/fm1-research.md
docs/fm1-roadmap.md
docs/codex-tasks.md
```

### Requirements

- preserve Markdown formatting
- do not alter application code
- add links from an existing developer-documentation location only if that improves discoverability

### Done when

The files are committed and readable by future Codex sessions.

---

## DOC-002 — Extend existing AGENTS.md with FM1 protocol rules

**Status:** ready

### Goal

Merge the supplied `AGENTS.fm1-additions.md` guidance into the existing `AGENTS.md`.

### Constraints

- preserve all existing repository guidance
- do not replace or shorten the existing file
- avoid duplicating rules that are already present
- add links to the FM1 research docs
- keep OTA/loader exclusions explicit

### Done when

Codex is instructed to read the FM1 research docs before FM1 protocol work.

---

# DX7 correctness

## DX7-001 — Audit DX7 live parameter address table

**Status:** ready

### Goal

Compare the editor's current DX7 live parameter mapping with the documented FM1 155-byte edit-buffer behaviour.

### Scope

- inspect current parameter definitions
- produce a mapping table in code/tests or a short audit document
- correct only demonstrated errors
- add regression tests

### Do not

- modify effects
- add sequencer code
- add vendor commands
- change UI styling

### Acceptance criteria

- every live-editable voice parameter has an explicit address
- ranges are validated
- operator ordering is tested
- global parameter ordering is tested
- standard `F0 43 10 gg pp vv F7` encoding is tested

---

## DX7-002 — Strengthen Yamaha SysEx fixture tests

**Status:** ready after DX7-001

### Goal

Increase confidence in voice/bank serialization and checksums.

### Cases

- valid 32-voice bank
- corrupt checksum
- short bank
- oversized bank
- valid single voice
- malformed SysEx delimiters
- non-7-bit payload where illegal
- parameter-change boundary addresses

### Do not

Change user-facing behaviour unless a real bug is found.

---

## DX7-003 — Audit editor display calculations against msfa/Dexed behaviour

**Status:** ready after DX7-001

### Goal

Find display/help calculations that can be made more faithful to the FM1 synthesis engine.

### Areas

- ratio/fixed frequency display
- envelopes
- velocity sensitivity
- key scaling
- transpose labels

### Deliverable

A short findings section in `docs/fm1-research.md` plus small corrections with tests where clearly justified.

---

# Effects

## FX-001 — Inventory current FM1 effect protocol

**Status:** ready

### Goal

Document exactly how every current FM1 effect control communicates with the device.

### Deliverable

Add a table to `docs/fm1-research.md`:

```text
effect
parameter
range
message bytes
channel use
source/provenance
confidence
hardware tested?
```

### Do not

Change behaviour during the inventory task.

---

## FX-002 — Add tests around existing effect message encoders

**Status:** ready after FX-001

### Goal

Make current FM1-specific messages testable and range-safe.

### Requirements

- table-driven tests where practical
- reject out-of-range values
- preserve separate effect channel behaviour
- no hardware requirement in tests

---

## FX-003 — Controlled hardware verification of FM1 effects

**Status:** mapping verification completed (2026-09-01); V15 persistence, interaction, and
above-range behaviour are deferred hardware follow-up.

### Goal

Replace historical assumptions with published vendor documentation, and use bounded physical tests
only to check V15 compatibility or behaviour the documentation does not establish.

### Deliverable

Complete [`fx-003-hardware-verification.md`](fx-003-hardware-verification.md), including:

- the published M-VAVE mapping source and a comparison against the editor;
- exact bytes and repeated V15 observations for the tested Filter Switch/Cutoff path;
- calibrated distinction between documented mapping facts and still-unresolved V15 runtime,
  interaction, persistence, scaling, and above-range behaviour.

The development-only FX probe is permitted only for known CC 0–23 and raw values 0–127 on the
selected FX channel. It must retain exact local MIDI logging and must not become production UI or a
general MIDI utility.

### Do not

Change production FX names, labels, ranges, scaling, controls, or transport before the corresponding
hardware evidence exists. Do not touch sequencer functionality or send vendor/OTA/loader/flash
traffic.

---

## FX-004 — Correct verified FM1 effect behaviour

**Status:** completed (2026-09-01): no production correction justified

### Goal

Implement only the smallest corrections directly justified by FX-003 evidence.

### Requirements

- Every change cites the completed FX-003 row, exact bytes/values, repeated observation, and FM1
  firmware/transport details.
- Add regression tests for each evidence-backed correction.
- Preserve unknown fields and keep normal FX traffic restricted to the verified CC path.

### Do not

Change a label, range, percentage suffix, enum order, enable polarity, scaling, or persistence model
because it merely appears plausible. The completed FX-004 outcome is intentionally no code change:
the current mapping/ranges agree with the published guide, and the remaining V15 questions do not
identify a correction.

---

# MIDI monitor / research tooling

## MIDI-001 — Improve SysEx monitor classification

**Status:** ready

### Goal

Make protocol research easier without sending new commands.

### Desired classifications

- Yamaha DX7 bulk
- Yamaha DX7 single voice
- Yamaha DX7 parameter change
- FM1 vendor prefix `F0 35 59`
- unknown SysEx

### Requirements

- keep raw hex available
- do not log MIDI data to analytics/error monitoring
- tests must use fixtures only

---

## MIDI-002 — Add safe message-diff utility

**Status:** ready

### Goal

Make "change one hardware value and compare captures" easy.

### Possible implementation

A development-only or monitor-side utility that:

- accepts two captured messages
- highlights changed bytes
- shows decimal and hex values
- does not transmit anything

### Do not

Add automatic replay.

---

# Vendor protocol research

## PROTO-001 — Create vendor command catalogue structure

**Status:** ready

### Goal

Add a durable place to record vendor/syscmd findings.

### Deliverable

Add a section or separate document containing:

```text
id
subcommand
observed action
request bytes
reply bytes
transport
confidence
safe runtime?
hardware tested?
notes
```

No device messages need to be sent for this task.

---

## PROTO-002 — Trace known vendor/syscmd dispatcher in public RE source

**Status:** research

### Goal

Use the `AL-255/FM-1-RE` documentation and analysis artefacts to identify known normal-runtime command IDs.

### Requirements

Classify each command as:

- normal runtime
- informational
- uncertain
- OTA/loader/update

### Critical safety rule

Unknown commands and anything related to update/loader/flash must be classified as excluded from production editor code.

### Deliverable

Documentation only.

---

## PROTO-003 — Prepare stock-operation capture checklist

**Status:** ready

### Goal

Document the exact physical FM1 operations needed to reverse engineer sequence controls.

### Include

- mode off → sequence
- pattern selection
- bank selection
- clear pattern
- record C4 at velocity X
- change only velocity
- change only note
- add rest if supported
- tempo change
- swing off/on
- save operation if present

### Output

A checkbox-style test sheet with spaces for captured hex.

No transmission code.

---

# Sequencer model

## SEQ-001 — Audit and document the FM1 internal sequencer protocol

**Status:** completed (2026-08-31); see [`seq-001-findings.md`](seq-001-findings.md)

### Goal

Establish the evidence boundary for a future stock-sequencer model and transport.

### Requirements

- audit application paths and upstream V13 firmware evidence
- document record offsets, command paths, ranges, unresolved bytes, and persistence uncertainty
- distinguish Confirmed, Strongly inferred, Needs hardware test, and Unknown claims
- define hardware captures needed before implementation

### Do not

Implement a codec, UI, MIDI/SysEx, or generic vendor-command path.

---

## SEQ-002 — Implement 32-byte pattern decoder

**Status:** blocked until version-labelled hardware fixtures corroborate the V13 record layout

### Goal

Decode a verified raw stock pattern record into the domain model.

### Requirements

- exactly 32 bytes
- validate bounds
- only the observed `FF` rest representation treated as known
- unknown fields preserved
- descriptive decode errors

### Tests

Use static fixtures only.

---

## SEQ-001A — Capture version-labelled sequencer hardware fixtures

**Status:** V15 observable-behaviour captures collected; byte-level record correlation and any safe
sequencer transport remain blocked.

### Goal

Collect real, version-labelled stock-device captures that correlate controlled sequencer actions,
complete MIDI traffic, observable playback, persistence behaviour, and lawful record/state evidence
where available.

### Deliverables

- fixture contract: [`sequencer-fixtures/README.md`](sequencer-fixtures/README.md)
- JSON capture template: [`sequencer-fixtures/fixture.template.json`](sequencer-fixtures/fixture.template.json)
- controlled core matrix, traffic taxonomy, differential ledger, and unblock gate:
  [`seq-001a-capture-plan.md`](seq-001a-capture-plan.md)

### Safety boundary

Do not manufacture fixtures from firmware analysis. Do not send unidentified vendor frames, guessed
SysEx, loader, OTA, update, or raw-flash traffic. A captured unknown message stays excluded from
production until repeatable evidence proves both its semantics and normal-runtime safety.

---

## SEQ-003 — Implement pattern encoder and round-trip tests

**Status:** after SEQ-002

### Goal

Encode domain data back to the exact stock record shape.

### Critical requirement

Unknown bits/bytes must survive a decode/edit/encode round trip unless proven irrelevant.

### Tests

```text
encode(decode(fixture)) === fixture
```

for multiple fixtures.

---

# Sequencer UI

## SEQ-UI-001 — Add lazy Sequencer route/screen shell

**Status:** after SEQ-002 (verified static decoder)

### Goal

Create the navigation and feature boundary only.

### Requirements

- follow existing lazy-loading/bundle conventions
- accessible navigation
- loading failure contained
- no hardware read/write yet
- no sequence editing yet

---

## SEQ-UI-002 — Build pattern editor using mock domain data

**Status:** after SEQ-UI-001 and SEQ-002

### Goal

Edit an in-memory FM1 sequence.

### UI scope

- pattern selector mock
- note/rest controls
- velocity
- pattern length
- clear/reset
- unsaved state

### Explicitly excluded

- generic MIDI piano roll features
- MIDI file support
- multiple tracks
- audio playback engine
- DAW transport
- automation

### Accessibility

Support keyboard editing and stable accessible names.

---

## SEQ-UI-003 — Add compact visual note grid

**Status:** after SEQ-UI-002

### Goal

Make the ten-note pattern easy to understand visually.

### Requirement

Optimise for the FM1's actual limited sequence model rather than importing a general DAW piano-roll dependency.

---

# Hardware read

## SEQ-READ-001 — Define sequence read transport interface

**Status:** blocked on protocol research

### Goal

Create an interface that can request/read sequence data without coupling the UI to WebMidi.

### Do not

Implement an unknown command.

Mock the interface until a safe protocol exists.

---

## SEQ-READ-002 — Decode verified captured sequence response

**Status:** blocked on hardware capture

### Goal

Feed a real captured response through the codec.

### Requirements

- fixture first
- no transmission in unit tests
- reject malformed response
- preserve raw capture for regression tests if it contains no sensitive user data

---

## SEQ-READ-003 — Connect read-only hardware state to Sequencer UI

**Status:** after SEQ-READ-002

### Goal

Allow the user to refresh the current FM1 sequence.

### Requirements

- loading
- failure
- retry
- reconnect
- cancellation
- unmount
- no write side effects

---

# Hardware write

## SEQ-WRITE-001 — Document smallest verified write operation

**Status:** blocked

### Goal

Before coding, document one known-safe runtime sequence write.

### Deliverable

Exact request, expected response/state change, persistence semantics and recovery action.

No implementation in this task.

---

## SEQ-WRITE-002 — Implement one bounded sequence write

**Status:** after SEQ-WRITE-001 and explicit hardware verification

### Goal

Implement only the operation documented in SEQ-WRITE-001.

### Requirements

- strict range validation
- no raw arbitrary command API exposed to UI
- no OTA/loader command code
- error reporting
- user state retained on failure

---

## SEQ-WRITE-003 — Expand to full pattern editing

**Status:** after repeated success of SEQ-WRITE-002

### Goal

Safely support all understood pattern fields.

### Do not

Write unknown flags or unknown data from newly generated defaults.

---

# Optional later work

## ARP-001 — Model confirmed arpeggiator settings

Research/data-model task only.

## GLOBAL-001 — Investigate normal runtime transpose control

Do not implement until a safe runtime path is known.

## LIB-SEQ-001 — Evaluate local sequence persistence

Only after hardware read/write workflow is stable.

Keep FM1 sequences separate from DX7 voice SysEx.

---

# Permanent exclusions

Codex must not implement these as part of normal editor work:

- firmware flashing
- OTA update invocation
- loader entry
- raw flash erase/write
- guessed vendor command transmission
- generic arbitrary SysEx transmission UI justified only for experimentation

Protocol research should produce explicit, bounded operations instead.
