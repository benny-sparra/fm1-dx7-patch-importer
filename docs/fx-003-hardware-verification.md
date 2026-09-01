# FX-003 — Controlled FM1 effects hardware verification

**Prepared:** 2026-08-31
**Execution status:** prepared; no physical FM1 was available to this task.
**Result status:** no mapping, name, range, scaling, polarity, or persistence claim has been
confirmed or disproved by hardware.

This is a repeatable test record, not evidence that the historical editor meanings are correct.
The only non-hardware support for the six CC groups is the firmware-analysis transport evidence
recorded in `docs/fm1-research.md` §7.2: the configured FX channel gates CC 0–23. It is **Strongly
supported** for transport, not confirmed by hardware.

## 1. Test setup and controls

Use one FM1, one stable audio output path (preferably recorded), headphones/monitors, a Chromium
browser running this repository in development mode, and USB MIDI. Record the FM1 firmware label,
transport, browser/OS, selected note and FX channels, output level, and test patch identifier in
every result sheet. Do not use Bluetooth for the first pass unless USB is unavailable; transport
latency makes repeat comparison weaker.

1. Start from one deliberately plain, repeatable patch. Use a held C3 and repeated C3 note attacks
   at the same velocity. Record a 10-second dry reference before each effect block. If a suitable
   init patch is unavailable, record the exact patch/bank/slot and do not change any voice parameter
   during its complete effect-block test.
2. Set the FX channel to the FM1's configured CC channel. The normal editor and the probe both use
   this independent channel. The table uses the default FX channel 2, therefore status byte `B1`;
   substitute `B0 + channel - 1` if the FM1 is configured differently.
3. In a development build, open **FX probe (dev)** in the header. It only permits the known FX
   controllers `0..23`, values `0..127`, and the selected FX channel. It sends exactly one CC per
   activation and writes the exact message bytes to the local MIDI log. It has no production UI,
   no save action, no SysEx, and no vendor/OTA/loader path.
4. Use **View data** then **Copy hex** in the MIDI log after every probe. Paste the copied message
   beside the observation. The normal editor can be used for in-range values; the probe is required
   for the deliberately out-of-range checks.
5. Change only one CC at a time. Before changing blocks, reload the recorded baseline from the
   browser library or send a documented 24-CC baseline and wait for it to settle. Do not infer a
   control is inactive while its block is bypassed: first establish the enable polarity.
6. Repeat an ambiguous result after reconnecting USB and reloading the same baseline. Mark a result
   **Unknown** rather than treating a barely audible difference as evidence.

The probe values below include one value immediately above every historical editor maximum. This
distinguishes “the device accepts a value above the UI bound” from “the device ignores all high
values”; `126` and `127` identify common 7-bit saturation/wrapping behaviour. The probe does not
claim that any out-of-range value is safe to retain or save.

## 2. Per-control test matrix

For every row, send the listed values in ascending order from the restored baseline. Record the
copied hex, an audible or measured observation, and whether the effect becomes/ceases to be audible.
Each `B1 cc vv` cell gives the exact bytes for default FX channel 2. “Current maximum” is only the
editor's historical bound.

| Effect     | Control (historical name) |  CC | Exact values and default-channel bytes                                                                                    | Required observation                                                                                                                                                   |
| ---------- | ------------------------- | --: | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter     | Enabled                   |   0 | `0 B1 00 00`; `1 B1 00 01`; `2 B1 00 02`; `126 B1 00 7E`; `127 B1 00 7F`                                                  | With type/cutoff/resonance set for an obvious effect, establish off/on polarity, binary threshold, and high-value behaviour.                                           |
| Filter     | Type                      |   1 | `0 B1 01 00`; `1 B1 01 01`; `2 B1 01 02`; `3 B1 01 03`; `126 B1 01 7E`; `127 B1 01 7F`                                    | With enabled and a mid cutoff, describe each distinct filter response and its ordering; identify duplicates, clamp, or wrap.                                           |
| Filter     | Cutoff                    |   2 | `0 B1 02 00`; `1 B1 02 01`; `54 B1 02 36`; `106 B1 02 6A`; `107 B1 02 6B`; `108 B1 02 6C`; `126 B1 02 7E`; `127 B1 02 7F` | Measure spectral change or audible cutoff at the low/middle/high steps; determine whether 107 is a device boundary and whether steps appear linear in a measurement.   |
| Filter     | Resonance                 |   3 | `0 B1 03 00`; `1 B1 03 01`; `5 B1 03 05`; `9 B1 03 09`; `10 B1 03 0A`; `11 B1 03 0B`; `126 B1 03 7E`; `127 B1 03 7F`      | With an obvious cutoff, measure/describe peak emphasis or self-oscillation; determine whether 10 is a device boundary.                                                 |
| Reverb     | Enabled                   |   4 | `0 B1 04 00`; `1 B1 04 01`; `2 B1 04 02`; `126 B1 04 7E`; `127 B1 04 7F`                                                  | With a wet reverb setup, establish off/on polarity, binary threshold, and high-value behaviour.                                                                        |
| Reverb     | Space                     |   5 | `0 B1 05 00`; `1 B1 05 01`; `2 B1 05 02`; `3 B1 05 03`; `126 B1 05 7E`; `127 B1 05 7F`                                    | Record tail character/time for each value; only call values room/hall/plate if the device UI or repeatable audio evidence supports that ordering.                      |
| Reverb     | Decay                     |   6 | `0 B1 06 00`; `1 B1 06 01`; `50 B1 06 32`; `99 B1 06 63`; `100 B1 06 64`; `101 B1 06 65`; `126 B1 06 7E`; `127 B1 06 7F`  | Measure tail time to a fixed threshold (for example −60 dB) where possible; test whether the historical word “Decay” and `%` are justified.                            |
| Reverb     | Mix                       |   7 | `0 B1 07 00`; `1 B1 07 01`; `50 B1 07 32`; `99 B1 07 63`; `100 B1 07 64`; `101 B1 07 65`; `126 B1 07 7E`; `127 B1 07 7F`  | Compare dry/wet levels at fixed reverb settings; test whether 0 is dry, 100 is fully wet, and whether `%` is defensible.                                               |
| Delay      | Enabled                   |   8 | `0 B1 08 00`; `1 B1 08 01`; `2 B1 08 02`; `126 B1 08 7E`; `127 B1 08 7F`                                                  | With an obvious delayed repeat, establish off/on polarity, binary threshold, and high-value behaviour.                                                                 |
| Delay      | Decay                     |   9 | `0 B1 09 00`; `1 B1 09 01`; `50 B1 09 32`; `99 B1 09 63`; `100 B1 09 64`; `101 B1 09 65`; `126 B1 09 7E`; `127 B1 09 7F`  | Count/measure repeat amplitude and repeat count. Confirm or reject the name “Decay”; it may instead be feedback or another delay property.                             |
| Delay      | Rate                      |  10 | `0 B1 0A 00`; `1 B1 0A 01`; `50 B1 0A 32`; `99 B1 0A 63`; `100 B1 0A 64`; `101 B1 0A 65`; `126 B1 0A 7E`; `127 B1 0A 7F`  | Measure first-repeat delay in milliseconds. Confirm whether larger values mean faster/slower time, modulation rate, or a different property; do not assume tempo sync. |
| Delay      | Mix                       |  11 | `0 B1 0B 00`; `1 B1 0B 01`; `50 B1 0B 32`; `99 B1 0B 63`; `100 B1 0B 64`; `101 B1 0B 65`; `126 B1 0B 7E`; `127 B1 0B 7F`  | Compare dry/wet levels at fixed delay settings; test whether 0/100 and `%` terminology are justified.                                                                  |
| Distortion | Enabled                   |  12 | `0 B1 0C 00`; `1 B1 0C 01`; `2 B1 0C 02`; `126 B1 0C 7E`; `127 B1 0C 7F`                                                  | With gain/level set audibly, establish off/on polarity, binary threshold, and high-value behaviour.                                                                    |
| Distortion | Gain                      |  13 | `0 B1 0D 00`; `1 B1 0D 01`; `50 B1 0D 32`; `99 B1 0D 63`; `100 B1 0D 64`; `101 B1 0D 65`; `126 B1 0D 7E`; `127 B1 0D 7F`  | Record level/spectral or THD change. Confirm only a gain-like response, not a percentage, unless measurements support it.                                              |
| Distortion | Tone                      |  14 | `0 B1 0E 00`; `1 B1 0E 01`; `50 B1 0E 32`; `99 B1 0E 63`; `100 B1 0E 64`; `101 B1 0E 65`; `126 B1 0E 7E`; `127 B1 0E 7F`  | Measure spectral tilt/brightness direction at fixed gain and level; determine if the historical “Tone” name is accurate.                                               |
| Distortion | Level                     |  15 | `0 B1 0F 00`; `1 B1 0F 01`; `50 B1 0F 32`; `99 B1 0F 63`; `100 B1 0F 64`; `101 B1 0F 65`; `126 B1 0F 7E`; `127 B1 0F 7F`  | Measure output level at fixed gain/tone; determine whether it is a level, mix, or other attenuation and whether `%` is justified.                                      |
| Chorus     | Enabled                   |  16 | `0 B1 10 00`; `1 B1 10 01`; `2 B1 10 02`; `126 B1 10 7E`; `127 B1 10 7F`                                                  | With depth/mix audible, establish off/on polarity, binary threshold, and high-value behaviour.                                                                         |
| Chorus     | Frequency                 |  17 | `0 B1 11 00`; `1 B1 11 01`; `50 B1 11 32`; `99 B1 11 63`; `100 B1 11 64`; `101 B1 11 65`; `126 B1 11 7E`; `127 B1 11 7F`  | Measure modulation period/rate at fixed depth/mix; determine direction, range, curve, and whether frequency is the correct term.                                       |
| Chorus     | Depth                     |  18 | `0 B1 12 00`; `1 B1 12 01`; `50 B1 12 32`; `99 B1 12 63`; `100 B1 12 64`; `101 B1 12 65`; `126 B1 12 7E`; `127 B1 12 7F`  | Measure pitch/modulation excursion at fixed frequency/mix; assess linearity only from measured increments.                                                             |
| Chorus     | Mix                       |  19 | `0 B1 13 00`; `1 B1 13 01`; `50 B1 13 32`; `99 B1 13 63`; `100 B1 13 64`; `101 B1 13 65`; `126 B1 13 7E`; `127 B1 13 7F`  | Compare dry/wet level at fixed chorus settings; test endpoints and `%` claim.                                                                                          |
| Phaser     | Enabled                   |  20 | `0 B1 14 00`; `1 B1 14 01`; `2 B1 14 02`; `126 B1 14 7E`; `127 B1 14 7F`                                                  | With depth/mix audible, establish off/on polarity, binary threshold, and high-value behaviour.                                                                         |
| Phaser     | Frequency                 |  21 | `0 B1 15 00`; `1 B1 15 01`; `50 B1 15 32`; `99 B1 15 63`; `100 B1 15 64`; `101 B1 15 65`; `126 B1 15 7E`; `127 B1 15 7F`  | Measure sweep/modulation period at fixed depth/mix; determine direction, range, curve, and whether frequency is accurate.                                              |
| Phaser     | Depth                     |  22 | `0 B1 16 00`; `1 B1 16 01`; `50 B1 16 32`; `99 B1 16 63`; `100 B1 16 64`; `101 B1 16 65`; `126 B1 16 7E`; `127 B1 16 7F`  | Measure sweep/notch excursion at fixed frequency/mix; assess linearity only from measured increments.                                                                  |
| Phaser     | Mix                       |  23 | `0 B1 17 00`; `1 B1 17 01`; `50 B1 17 32`; `99 B1 17 63`; `100 B1 17 64`; `101 B1 17 65`; `126 B1 17 7E`; `127 B1 17 7F`  | Compare dry/wet level at fixed phaser settings; test endpoints and `%` claim.                                                                                          |

## 3. How to classify observations

Record three separate fields for every send: **protocol evidence** (copied hex and selected channel),
**device observation** (front-panel/readback if available), and **audio/measurement observation**
(recording filename, repeat count, milliseconds, level, spectrum, or a concise listening note).
Protocol delivery to the browser output is not proof that the FM1 accepted it.

| Classification                 | Apply only when                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed by hardware          | At least two controlled, repeatable hardware runs demonstrate the stated mapping/meaning, with exact sent values and recorded observation.                                                      |
| Strongly supported             | Firmware-analysis evidence plus a repeatable but incomplete hardware observation supports the claim, or a constrained observation splits realistic alternatives but leaves a detail unresolved. |
| Needs further hardware testing | A plausible mapping exists, but a controlled test has not settled its polarity, range, ordering, semantics, scaling, or retention.                                                              |
| Unknown                        | No reproducible observation, or an observation conflicts with the setup / is too ambiguous to attribute to the target CC.                                                                       |

Do not classify a control as linear from three listening points. For a linearity claim, capture at least
five points across the accepted span after its endpoints are known and compare equal CC increments
against one appropriate measured outcome. It is acceptable to conclude “nonlinear or unresolved.”

## 4. Interaction and persistence pass

After completing the individual rows for one block, run these tests before moving to the next block:

1. **In-block interaction:** at target minimum, midpoint, and historical maximum, vary each other
   control between its minimum and maximum. Record any control that only works when another
   control/mix/enable has a particular value.
2. **Cross-block order:** with two effects set clearly audible, enable them in pairs and compare
   each effect separately. Record whether enabling one changes another's level, time, modulation,
   or audible order. Do not infer DSP routing from one listening result.
3. **Patch change without browser resend:** make a distinctive target-CC change, then use the FM1's
   own controls to select another patch and return. Do not click an editor patch during this test.
   Record whether the changed setting follows the original patch, stays global, resets, or is
   ambiguous.
4. **Power cycle without browser resend:** make the same distinctive change, disconnect/disable
   browser MIDI, power-cycle the FM1, return to the same patch using the FM1 itself, and record the
   state. This tests transient retention only; it is not a save test.
5. **Stock save operation:** from a documented baseline, make the distinctive change and use the
   FM1's normal **SAVE** operation. Then repeat the patch-change and power-cycle checks without
   browser sends. Record exactly what slot/bank was saved and whether the target CC persisted.
6. **Browser-library distinction:** record separately whether the browser patch is saved. Browser
   persistence is known application behaviour and must never be reported as FM1 hardware
   persistence.

Use a different distinctive value for the two slots in a per-patch test (for example 20 in slot A
and 80 in slot B, only after their individual acceptance has been established). Do not use a high
out-of-range probe value for a save test.

## 5. Tests actually performed and evidence ledger

No physical hardware, audio capture, front-panel readback, device response, patch-change test,
power-cycle test, or stock-save test was performed during FX-003 preparation. The following is the
complete result ledger at handoff; it must be replaced row-by-row with an execution record, never
silently upgraded from editor code or firmware analysis.

| Claim group                                      | Current classification         | Evidence / result                                                                                                 |
| ------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Raw CC 0–23 on independently selected FX channel | Strongly supported             | Existing sender/hex logging and public firmware analysis corroborate the envelope; no FM1 hardware run in FX-003. |
| All 24 controller-to-effect/parameter meanings   | Needs further hardware testing | Historical editor labels only; no row has a hardware observation.                                                 |
| Filter cutoff maximum 107                        | Needs further hardware testing | `107`, `108`, `126`, and `127` are prepared but unsent to hardware.                                               |
| Filter resonance maximum 10                      | Needs further hardware testing | `10`, `11`, `126`, and `127` are prepared but unsent to hardware.                                                 |
| Repeated 100 maxima                              | Needs further hardware testing | `100`, `101`, `126`, and `127` are prepared but unsent to hardware.                                               |
| Percentage terminology / direct raw values       | Needs further hardware testing | The editor transmits raw integers; no device scaling or units have been measured.                                 |
| Delay “Decay” / “Rate” terminology               | Needs further hardware testing | No measured repeat count/time evidence.                                                                           |
| Enable polarity and binary behaviour             | Needs further hardware testing | No hardware response to `0`, `1`, `2`, `126`, or `127`.                                                           |
| Enum ordering (Filter Type / Reverb Space)       | Needs further hardware testing | No device/UI or repeatable audio evidence for value ordering.                                                     |
| Effect persistence and interaction               | Needs further hardware testing | No patch-change, power-cycle, stock-save, or interaction pass has run.                                            |

### Editor assumptions confirmed or disproved

**None by hardware.** FX-003 confirms only the editor's own emitted bytes and its ability to log
them. It does not confirm or disprove a hardware mapping, range, name, `%` suffix, scaling curve,
enum order, enable polarity, or persistence model.

## 6. FX-004 proposal — implement only verified corrections

**Status: blocked on FX-003 execution; current implementation scope is empty.**

FX-004 may contain only a correction whose corresponding FX-003 result row is **Confirmed by
hardware** or, for a strictly transport-level defensive fix, independently supported by repeatable
hardware evidence and reviewed as such. Each included change must cite:

- the FX-003 row, exact sent values, copied bytes, hardware/firmware details, and repeated result;
- the precise current editor assumption it corrects;
- the smallest resulting code/UI/documentation change and regression test;
- retention and interaction impact, if any.

Potential corrections such as changing the `107`, `10`, or `100` bounds; renaming delay controls;
changing `%` suffixes; inverting enables; reordering enums; adding scaling; or altering persistence
must remain out of FX-004 unless that evidence exists. This task authorizes no implementation change
today.

## 7. Remaining manual experiments

1. Execute every row in §2 twice, retaining exact log bytes and an audio/device observation.
2. Repeat any high-value result (`current max + 1`, `126`, `127`) after USB reconnect and after a
   device reset; determine clamp, wrap, ignore, or distinct behaviour before proposing a range.
3. Perform five-or-more-point measurement series for any accepted continuous parameter whose curve
   matters to UI terminology or scaling.
4. Complete all six blocks' interaction and persistence pass in §4, including separate slots where
   practical.
5. If an FM1 front-panel effect display exists, photograph/read it for enum and range tests; retain
   it as device evidence but do not rely on it in place of the exact outbound CC log.
6. Report ambiguous/no-audible-change cases with patch, notes, levels, controls held constant, and
   recording rather than guessing that the mapping is wrong.
