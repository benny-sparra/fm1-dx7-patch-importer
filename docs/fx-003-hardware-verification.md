# FX-003 — Controlled FM1 effects hardware verification

**Prepared:** 2026-08-31
**Execution status:** partially executed on 2026-09-01; V15 FM1 over USB CoreMIDI.
**Result status:** The published M-VAVE guide matches the editor's mapping/ranges; Filter Switch
polarity is also confirmed by repeated V15 hardware observation. Scaling, interaction, persistence,
and above-range behaviour remain unresolved unless a result row below says otherwise.

This is a repeatable test record, not evidence that the historical editor meanings are correct.
The only non-hardware support for the six CC groups is the firmware-analysis transport evidence
recorded in `docs/fm1-research.md` §7.2: the configured FX channel gates CC 0–23. It is **Strongly
supported** for transport, not confirmed by hardware.

## Published vendor control guide

On 2026-09-01, M-VAVE's published [FM-1 MIDI Control English guide](https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/releaseNote/firmware/FM-1%20MIDI%20EN.docx)
was retrieved from its [download centre](https://www.m-vave.com/download). It identifies `effectch`
as defaulting to channel 2 and lists CC 0–23 with the same six groups, controller order, switch
rule, enum order, and maxima that the editor currently uses: Filter `0–3` (Switch, Type 0–2
LPF/BPF/HPF, Cutoff 0–107, Q 0–10), Reverb `4–7`, Delay `8–11`, Distortion `12–15`, Chorus
`16–19`, and Phaser `20–23`; the remaining continuous ranges are 0–100.

The published document is associated with the V14 download, whereas the connected physical device
is V15. It is therefore authoritative documentation for the intended map, but not proof that every
row has identical V15 runtime semantics. The controlled V15 Filter Switch/Cutoff result below
confirms compatibility for CC 0 and 2 only. Do not use the document alone to infer scaling curves,
device persistence, interaction/routing, or acceptance behaviour above a documented maximum.

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

### 2026-09-01 — Filter switch polarity, first hardware run

- **Setup:** FM1 V15, USB CoreMIDI host destination 0, channel 2 (`B1`), patch `003 BRASS. 3`,
  normal play mode, no save operation. The bounded `scripts/send-standard-midi-cc.c` sender issued
  only the logged standard CC messages; no SysEx, vendor, loader, OTA, flash, or save traffic was
  sent. Audio observation was performed by the operator on the FM1's normal output.
- **Common setup:** `B1 01 00` (Filter Type 0), `B1 03 05` (Filter Q 5). The initial midpoint
  setup `B1 02 36` (Cutoff 54) was audibly unchanged both with the switch at 0 and then 1; this is
  inconclusive for a midpoint response, not counter-evidence to the mapping.
- **Decisive setup:** `B1 02 00` (Cutoff 0) while the switch was 1 made the patch dramatically
  quieter. With every other controlled value retained, the two following switch cycles were
  repeatable: `B1 00 00` restored normal volume/brightness and `B1 00 01` again made the patch
  dramatically quieter.
- **Classification:** **Confirmed by hardware** for the limited claim that CC 0 on channel 2
  switches the configured filter path off at 0 and on at 1. This does not establish filter type
  order, cutoff scaling/range, Q behaviour, persistence, or any other effect-control mapping.

### 2026-09-14 — Browser slot selection and effect retention, informal run

- **Setup:** FM1 connected to the operator's Mac over Web MIDI; firmware version not recorded. A
  patch in workspace banks A–D was given effects in the editor and saved to the browser library.
  The operator then clicked another A–D slot on the library page and clicked the edited slot again.
  Each click sent a Program Change on the note/program channel. No SysEx, vendor, loader, OTA,
  flash, or FM1 **SAVE** traffic was involved.
- **Before the editor change:** the library page sent only the Program Change. When the edited slot
  was selected again, its effects were no longer audible.
- **After the editor change:** the library page sends the patch's saved 24 effect CCs after the
  Program Change. When the edited slot was selected again, its effects were retained.
- **Classification:** **Likely** for the limited claim that an edit-buffer effect state sent over
  CC does not follow its program across a Program Change, so the browser must resend saved effects
  when it selects a slot. It was one uncontrolled run: it does not establish whether effects reset
  to defaults, load from the selected program, or depend on firmware version, and it is not the
  front-panel patch-change, power-cycle, or stock-save pass in §4.

| Claim group                                      | Current classification         | Evidence / result                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw CC 0–23 on independently selected FX channel | Strongly supported             | Firmware analysis and M-VAVE's published V14 guide corroborate the complete envelope; the V15 run confirms CC 0/2 only.                                                                               |
| Filter Switch (`B1 00 vv`)                       | Confirmed by hardware          | With type 0, Q 5, and cutoff 0, `vv=0` restored normal output and `vv=1` made output dramatically quieter in two controlled cycles.                                                                   |
| All 24 controller-to-effect/parameter meanings   | Strongly supported             | M-VAVE's published V14 guide matches the editor's controller group/order and names closely; V15 runtime compatibility is directly tested only for Filter Switch/Cutoff.                               |
| Filter cutoff maximum 107                        | Strongly supported             | The guide lists 0–107. V15 Cutoff 0 was dramatically quieter and 107 restored normal brightness; 108 and the high sweep did not establish clamp/wrap behaviour.                                       |
| Filter resonance maximum 10                      | Strongly supported             | The guide lists Filter Q 0–10; the editor's “Resonance” is a descriptive label for that documented field.                                                                                             |
| Repeated 100 maxima                              | Strongly supported             | The guide lists 0–100 for the corresponding continuous controls; no V15 above-range acceptance/persistence claim follows.                                                                             |
| Percentage terminology / direct raw values       | Needs further hardware testing | The guide gives raw 0–100 ranges but no percentage units, scaling curve, or display unit. The editor's `%` suffixes remain a UI convention, not a documented device unit.                             |
| Delay “Decay” / “Rate” terminology               | Strongly supported             | The guide uses the same two parameter names, but does not define their physical units or scaling.                                                                                                     |
| Enable polarity and binary behaviour             | Strongly supported             | The guide documents every switch as 0=off / ≥1=on. Filter has the stronger repeated V15 confirmation above; other blocks still lack direct V15 observation.                                           |
| Enum ordering (Filter Type / Reverb Space)       | Strongly supported             | The guide specifies Filter LPF/BPF/HPF and Reverb Room/Hall/Plate in the current editor order; direct V15 screen/audio confirmation remains incomplete.                                               |
| Effect persistence and interaction               | Needs further hardware testing | One informal 2026-09-14 run: effects sent over CC were not retained across a browser Program Change unless resent. No front-panel patch-change, power-cycle, stock-save, or interaction pass has run. |

### Editor assumptions confirmed or disproved

The published guide supports the editor's current controller map, maxima, switch rule, and enum
order; no production mapping/range correction is identified. The repeated V15 Filter Switch/Cutoff
run additionally confirms that those two controls are accepted at runtime. The guide does not prove
the editor's `%` suffixes, scaling curves, interaction/routing, persistence, or above-range response.

## 6. FX-004 proposal — implement only verified corrections

**Status: completed with no production change.**

FX-004 may contain only a correction whose corresponding FX-003 result row is **Confirmed by
hardware** or, for a strictly transport-level defensive fix, independently supported by repeatable
hardware evidence and reviewed as such. Each included change must cite:

- the FX-003 row, exact sent values, copied bytes, hardware/firmware details, and repeated result;
- the precise current editor assumption it corrects;
- the smallest resulting code/UI/documentation change and regression test;
- retention and interaction impact, if any.

The published guide agrees with the existing `107`, `10`, and `100` maxima, switch rule, and enum
order. It uses the same Delay names. Its silence on display units/scaling does not justify changing
the UI's `%` suffixes. No FX-004 implementation is authorized or required.

## 7. Deferred V15 hardware follow-up

No broad subjective audio matrix is required while the published mapping agrees with the editor.
Future work is limited to questions the guide does not answer:

1. Test a documented, distinctive in-range effect setting across stock patch change, power cycle,
   and stock save to establish its V15 retention model.
2. Test any apparent V15 divergence from the published table with exact bytes and a repeatable
   device/front-panel observation before proposing a correction.
3. Measure a curve or high-range behaviour only when a concrete UI/product decision depends on it.
4. Check which way each continuous effect control moves the sound (§9), before presets for that
   effect are built. Delay Rate turned out reversed from the editor's assumption.
5. Listen to each effect preset before its phase ships (see "Effect presets" in
   [the feature backlog](feature-backlog.md)). A preset names a character, so the check is whether
   it sounds like its name, not a measurement. The values are in `src/lib/effect-presets.ts`.

## 8. Effect preset listening check

Use the setup in §1 with a plain sustained patch such as **Init voice**, and a short staccato phrase
as well as a held note. Apply each preset from the **Preset** menu in its effect's box, with the other effects
switched off, and record whether it matches its name. A preset that does not is retuned in the table, or renamed,
and listened to again. Record the firmware label and date.

Phase 1 also settles two assumptions the presets depend on:

- **Reverb space order.** Whether values 0, 1 and 2 sound like room, hall and plate. If not, the
  reverb presets are misnamed as well as the Space labels.
- **Delay rate direction.** Whether a higher Rate means faster repeats or a longer gap between them.
  The delay presets and the delay scope both depend on it.

On 2026-09-16 the first five phase 1 presets were heard on an FM1 and each was reported to match its
name, which matched the reverb space order. A later listen the same day found the delay rate
direction the other way round from the editor's original assumption: a higher Rate gives faster
repeats, closer together. The earlier Slapback and Echo results were heard with their rates
reversed, so they are void. The delay scope now draws taps closer as Rate rises, and every delay
preset rate was mirrored (`100 - rate`), keeping the intended spacing. These are informal listening
results: the firmware label was not recorded and neither run has been repeated, so the confidence
levels in `docs/fm1-research.md` §7 are unchanged.

Later on 2026-09-16, after the control direction check in §9, every preset in all three phases was
heard on an FM1 and reported to sound like its name.

| Phase | Preset        | Matches its name | Notes                                                |
| ----- | ------------- | ---------------- | ---------------------------------------------------- |
| 1     | Small room    | Yes (2026-09-16) | Firmware label not recorded.                         |
| 1     | Large room    | Yes (2026-09-16) | Heard in a later session the same day.               |
| 1     | Small hall    | Yes (2026-09-16) | Heard in a later session the same day.               |
| 1     | Large hall    | Yes (2026-09-16) | Firmware label not recorded.                         |
| 1     | Plate         | Yes (2026-09-16) | Firmware label not recorded.                         |
| 1     | Slapback      | Yes (2026-09-16) | Rate mirrored from 15 to 85; heard after the change. |
| 1     | Quick delay   | Yes (2026-09-16) | Rate mirrored from 25 to 75; heard after the change. |
| 1     | Quick repeats | Yes (2026-09-16) | Rate mirrored from 25 to 75; heard after the change. |
| 1     | Echo          | Yes (2026-09-16) | Rate mirrored from 55 to 45; heard after the change. |
| 2     | Subtle chorus | Yes (2026-09-16) |                                                      |
| 2     | Ensemble      | Yes (2026-09-16) |                                                      |
| 2     | Chorus wash   | Yes (2026-09-16) |                                                      |
| 2     | Shimmer       | Yes (2026-09-16) |                                                      |
| 2     | Gentle phase  | Yes (2026-09-16) |                                                      |
| 2     | Slow sweep    | Yes (2026-09-16) |                                                      |
| 2     | Deep phase    | Yes (2026-09-16) |                                                      |
| 2     | Fast swirl    | Yes (2026-09-16) |                                                      |
| 3     | Warm          | Yes (2026-09-16) |                                                      |
| 3     | Muffled       | Yes (2026-09-16) |                                                      |
| 3     | Telephone     | Yes (2026-09-16) | Band pass; the Filter Type order was heard in §9.    |
| 3     | Thin          | Yes (2026-09-16) | High pass; the Filter Type order was heard in §9.    |
| 3     | Resonant      | Yes (2026-09-16) | Resonance 7; start at a low volume.                  |
| 3     | Light drive   | Yes (2026-09-16) |                                                      |
| 3     | Warm drive    | Yes (2026-09-16) |                                                      |
| 3     | Crunch        | Yes (2026-09-16) | Start at a low volume.                               |
| 3     | Fuzz          | Yes (2026-09-16) | Gain 85; start at a low volume.                      |

## 9. Control direction check

The published guide gives each control's CC number and range but not which way it moves the sound.
The editor's scopes, help text, and presets each assume a direction, and delay Rate was found to be
the reverse of its assumption (§8). This check confirms or corrects the rest by ear.

Use the setup in §1 and a plain sustained patch such as **Init voice**. For each row, switch only
that effect on, set its other controls to about the middle, then move the control from low (about 10) to high (about 90) and back. Record what the rise sounds like, and whether it matches the
editor's assumption. Change nothing in the editor from one listen: repeat a reversed or unclear
result after reconnecting, as §1 asks, before correcting a scope, help text, or preset.

Check chorus and phaser before their presets are built (phase 2), and filter and distortion before
phase 3. The rows most likely to be wrong are marked **Doubtful**.

| Control          | The editor assumes that raising it…                                      | Listen for                           | Result                                        | Notes                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter Cutoff    | moves the cutoff frequency up                                            | Low pass gets brighter               | Brighter, heard once (2026-09-16)             | Matches the scope, which moves the cutoff right as it rises. Filter type not noted; assumed low pass. Repeat it.                                     |
| Filter Resonance | sharpens the peak at the cutoff                                          | More ring or whistle near the cutoff | Sharper, heard once (2026-09-16)              | Matches the help text and the scope's taller peak. Repeat it.                                                                                        |
| Reverb Decay     | lengthens the tail                                                       | Longer tail after release            | Longer tail, heard once (2026-09-16)          | Matches the help text and the scope. Repeat it.                                                                                                      |
| Reverb Mix       | adds more reverb                                                         | 0 is fully dry                       | More reverb, and dry at 0; heard 2026-09-16   | Direction matches, and 0 is fully dry, as the help text says. An earlier report of reverb remaining at 0 was a misstatement, corrected the same day. |
| Delay Decay      | gives more repeats before they fade                                      | More repeats                         | More repeats, heard once (2026-09-16)         | Matches the help text and the scope. Behaves like feedback; whether the stock name is decay or feedback is still open (§2). Repeat it.               |
| Delay Rate       | repeats faster, closer together                                          | Shorter gap between repeats          | Heard once (2026-09-16)                       | Originally assumed the reverse; the editor was corrected after this informal listen. Repeat it.                                                      |
| Delay Mix        | makes the echoes louder                                                  | 0 is fully dry                       | Louder, and dry at 0; heard once (2026-09-16) | Direction matches, and 0 is fully dry, as the help text says. Repeat it.                                                                             |
| Distortion Gain  | drives the distortion harder                                             | Dirtier, more saturated              | Dirtier, heard once (2026-09-16)              | Matches the help text and the scope's harder clipping. Repeat it.                                                                                    |
| Distortion Tone  | brightens the sound (help text); the scope draws harder clipping instead | Brighter, or harsher clipping?       | Brighter, heard once (2026-09-16)             | Matches the help text. The scope's harder clipping stands in for the added brightness, so nothing changes. Repeat it.                                |
| Distortion Level | raises the output volume                                                 | Louder                               | Louder, heard once (2026-09-16)               | Matches the help text. The distortion presets rely on it, lowering Level as Gain rises. Repeat it.                                                   |
| Chorus Frequency | speeds up the movement                                                   | Faster wobble                        | Faster, heard once (2026-09-16)               | Matches the help text and the scope. Repeat it.                                                                                                      |
| Chorus Depth     | widens the pitch movement                                                | Wider, more obvious wobble           | Wider, heard once (2026-09-16)                | Matches the help text and the scope. Repeat it.                                                                                                      |
| Chorus Mix       | adds more chorus                                                         | 0 is fully dry                       | Stronger, heard once (2026-09-16)             | Direction matches. Whether 0 is fully dry was not noted. Repeat it.                                                                                  |
| Phaser Frequency | speeds up the sweep                                                      | Faster sweep                         | Faster, heard once (2026-09-16)               | Matches the help text and the scope. Repeat it.                                                                                                      |
| Phaser Depth     | widens the sweep                                                         | Wider, more intense sweep            | Wider, heard once (2026-09-16)                | Matches the help text and the scope. Repeat it.                                                                                                      |
| Phaser Mix       | adds more phasing                                                        | 0 is fully dry                       | Reported as matching (2026-09-16)             | Covered by a general report that the remaining sliders behave as expected; no specific observation. Whether 0 is fully dry was not noted. Repeat it. |

Enumerated controls and switches are covered elsewhere: Reverb Space order in §8, Filter Type and
the effect switches in §2, with Filter Switch polarity recorded in the §5 ledger. On 2026-09-16 the
Filter Type options were also heard in the editor's order, low pass, band pass, high pass, which
the Telephone and Thin presets depend on. That listen, like the rows above, has not been repeated.
