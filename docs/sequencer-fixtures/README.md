# FM1 sequencer hardware fixtures

This directory contains only **real, version-labelled hardware captures** for FM1 internal
sequencer research. It is not a source of generated records, assumed SysEx, replay commands, or
production test data. A fixture may be committed only after the corresponding stock-device
experiment in [`../seq-001a-capture-plan.md`](../seq-001a-capture-plan.md) has been performed.

No completed core hardware fixture has been collected in this repository yet. The V13 directory is
deliberately empty of fixtures; the V13 record layout remains firmware evidence, not hardware
corroboration. The V15 directory contains one explicitly incomplete receive-only keypress attempt;
it is preserved as raw evidence but cannot support protocol conclusions.

## Layout

```text
docs/sequencer-fixtures/
  README.md                         this contract
  fixture.template.json             copy before each hardware experiment
  V13/
    README.md                       V13 capture index and evidence boundary
    <fixture-id>.json               one completed hardware fixture
  V<other-firmware>/
    <fixture-id>.json               captures for that firmware only
```

Use the firmware string displayed by the physical device in the directory name. Do not place a
capture from an unverified firmware version in `V13`, and do not compare firmware versions until
each set has repeatable internal results.

## Fixture contract

Each completed JSON fixture must have `capture_status: "captured"` and contain all fields in the
template. In particular, it must record:

- exact firmware version and how it was observed;
- editor build/commit when the editor was involved (otherwise `editor.involved: false`);
- initial pattern, slot, bank, mode, and all other relevant stock-device state, marking unknown
  values as unknown rather than guessing them;
- literal physical gestures/display labels or the exact external-controller action;
- every observed message to and from the FM1, in chronological order, as complete uppercase hex
  bytes;
- a classification for every message: `known_standard_midi`, `known_fm1_command`,
  `candidate_sequencer_related`, `unrelated_background_traffic`, or `unknown`;
- playback observations and the separate pattern-change, patch-change, reconnect, and power-cycle
  outcomes when those checks were performed.

Messages must not be omitted merely because they appear irrelevant. Mark them
`unrelated_background_traffic` or `unknown`, with a short reason, instead. Include no device serial
number, Bluetooth address, local path, user patch name, or other personal data.

`bytes_hex` is the canonical wire representation: two uppercase hexadecimal characters per byte,
separated by one space. It records a whole observed MIDI message, including `F0`/`F7` for SysEx.
When the capture tool reports USB-MIDI packets as well as reconstructed MIDI messages, preserve the
raw packet bytes in `transport_frame_hex` and the reconstructed message in `bytes_hex`.

## Capture requirements

Use an external bidirectional monitor/interposer that records both directions with SysEx enabled.
The current browser MIDI activity log is useful for live troubleshooting, but its eight-entry
retention and local timestamps make it insufficient for these fixtures. The monitor must be passive:
it must not emit, replay, transform, filter, or synthesize any message.

### Optional host receive logger

On macOS, `swift scripts/capture-midi.swift --list` lists CoreMIDI input sources and
`swift scripts/capture-midi.swift --source <index>` writes received raw CoreMIDI packets as NDJSON
to standard output. It creates an **input port only** and has no output/send code. For example:

```bash
swift scripts/capture-midi.swift --source 0 > /safe/location/fm1-from-device.ndjson
```

This helper preserves every raw packet—including SysEx fragments and realtime/background traffic—but
does not see messages sent to the FM1 by an external controller and does not reconstruct messages
from packets. It is therefore supplementary evidence only; a completed fixture still needs the
bidirectional passive capture described above. Keep the raw NDJSON export outside the repository and
record its checksum/reference in the fixture.

For each action, begin a fresh capture before the baseline is inspected, retain traffic through the
action and observation window, and stop only after the post-action state is checked. Record the
capture tool name/version and transport topology. Preserve its original export outside the
repository when possible; put a redacted checksum or reference in `source_export` so the JSON
fixture remains auditable.

All direct hardware controls are performed on the stock device. Where a fixture requires external
MIDI notes, use a known standard MIDI controller or monitor injection only after the FM1 is manually
placed in its stock recording mode. Record the bytes the monitor actually saw. Never send an
unidentified M-VAVE frame, a guessed SysEx command, loader traffic, or an arbitrary vendor command.

## Differential-analysis rule

A claim about a record byte or message needs at least two repeatable paired fixtures where the
declared independent variable is the only intended difference, plus an observed result consistent
with that difference. One apparent correlation is `needs_more_hardware_testing`, not a byte-field
assignment. Store the comparison in `comparison` and add the conclusion to
[`../seq-001a-capture-plan.md`](../seq-001a-capture-plan.md).

Raw internal RAM/flash bytes are optional and may be recorded only when obtained from a lawful,
non-invasive firmware/debug artefact. They are not MIDI traffic and must state their provenance.
They do not authorise a host request, upload, or write operation.
