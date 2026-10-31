# Browser FX preset library — implementation specification

Prepared 2026-10-30. Status: ready for implementation planning; no feature code implemented by
this document. Audience: a lower-model executor working in the FM1 editor/librarian repository.

## Standalone Effects view — owner decision

Decision recorded 2026-10-30: provide two top-level views, **Sounds** and **Effects**. The FX
preset library and editing are independent of voice data, the sound editor and the eight Voice
tabs. Effects must be reachable without selecting a sound, configuring Voices or enabling MIDI.
Choosing a sound leaves V16 effects alone; choosing an FX preset leaves all voice data alone.

Reuse the Effects panel and current-effects storage from `feature/v16-voice-strip`, inspected in
`/Users/bensparrow/Developer/fm1-voice-strip` at `5812964a`. Commit `04a4a4e1` introduced those
pieces; inspect its follow-up panel/title-bar fixes too. **Adopting or merging the whole branch
is not a prerequisite.** Its Voice-strip navigation and Recall voices workflow are not part of
this feature. Extract/adapt only the reusable Effects pieces and their relevant tests if they
are not already on main. Do not recreate the effect rack or duplicate its state owner.

This decision supersedes the earlier requirement to extend the ninth tab or stack implementation
on the complete Voice-strip branch. It also supersedes a separate FX editing dialog/local-only
knob mode: the standalone Effects view is the editor, with a small dialog for preset management.
No application code or feature-branch files were changed by this document.

Verified existing behaviour:

- `src/components/midi/v16-effects-panel.tsx` uses the existing `EffectsUnit` in a lazy Effects
  tab after the eight Voices. Opening the tab sends nothing; editing sends changed controllers.
- `src/lib/v16-effects.ts` owns the current 24 values through `getV16Effects`, `setV16Effects`
  and `subscribeV16Effects`. It persists version 1 of `fm1-v16-effects` in localStorage.
- `src/components/midi/voice-strip.tsx` already sends these values with **Recall voices**, after
  its Program Changes. This is branch context, not a requirement to port that operation.
- V16's patch editor omits its effects panel. The tab has no Undo and no large notice. Its display
  and compact title bar are established branch decisions; do not reverse them for this feature.

## Outcome and scope

Add a named browser FX preset library to a standalone **Effects** view, reusing the existing
panel. Owners can save its current 24 values, browse and manage saved presets, and load one and apply it
to the eligible FM1. Live editing stays as it works today. The browser owns this library; it does
not mirror the FM1's 128 stored FX groups.

Version one includes:

- A searchable, flat collection of named user presets, with save, update, rename, duplicate, delete.
- A compact **FX presets…** action in the Effects view, opening a preset-management dialog.
  The dialog has no second effect rack or independent editable working copy.
- Explicit **Load and apply** for a selected preset when the device is eligible; **Load into
  Effects** offline, which changes browser values only and does not schedule later traffic.
- Dedicated JSON import/export and inclusion in the existing full-library backup workflow.
- Honest storage/send failure states and preservation of all existing current-effects data.

Do not add a second Effects editor, Voice-tab dependency, local-only knob mode, Undo history, folders, fixed-size
FX banks, preset drag ordering, tags, factory collections, hardware FX-group selection, SAVE,
readback, or multitimbral setup. Do not add the effects rack back into V16's sound editor.

### Correction to the earlier conversation

The existing 24 CC controls **already include** the six effect switches, Filter Type and Reverb
Space. Include these. It was too broad to say that all On/Off and Type controls needed vendor
writes. What remains excluded is chain order and any additional settings not represented in the
existing 24-parameter schema, including FM-1+VA distortion type and Bitcrush.

Use `fm1EffectParameters` in `src/lib/fm1-parameters.ts` as the authoritative ordered schema:

| Effect     | Four saved controls              |
| ---------- | -------------------------------- |
| Filter     | Enabled, Type, Cutoff, Resonance |
| Reverb     | Enabled, Space, Decay, Mix       |
| Delay      | Enabled, Decay, Rate, Mix        |
| Distortion | Enabled, Gain, Tone, Level       |
| Chorus     | Enabled, Frequency, Depth, Mix   |
| Phaser     | Enabled, Frequency, Depth, Mix   |

Never duplicate the maxima or assume every control accepts 0–127. Internal indices are 0–23;
stock V16 sends them at CC 70–93 using the existing firmware profile and message builder.

## Evidence and constraints

Read current `AGENTS.md` in full before implementation, especially persistence compatibility,
firmware profiles, transfer cancellation, localisation and vendor safety. Also read:

- `docs/fm1-research.md`: V16 effects and the Codex firmware reading of 2026-10-28.
- `docs/hardware-runs/stock-v16-2026-10-23.md`: tested controller mapping and unsaved live effects.
- Research PR #405: <https://github.com/benny-sparra/fm1-dx7-patch-importer/pull/405>.

No new protocol research is necessary for the 24 CC controls. The shared-voice-preset experiment
is not a prerequisite. Nothing here approves a new vendor command or loosens an exclusion.
The FX library sends no SysEx, Program Change, notes, identity query of its own, bank transfer,
raw storage request, loader command or hardware save.

The hardware's chain order can affect the sound and is not captured. User-facing help must say:
“Presets contain the effect controls shown here. Effect order stays as set on the FM1.”

## Decisions for the executor

1. **Reuse the panel in an independent view.** Moving its entry point must not duplicate controls
   or state. Attaching
   presets to voice slots would conflict with V16's shared FX. A hardware-group manager lacks a
   tested approved protocol. Keep one current-effects owner and add a named collection around it.
2. **Keep the existing effect schema.** `src/lib/effect-presets.ts` contains built-in per-effect
   starting points. Preserve it; use `FxLibraryPreset` for named snapshots of all 24 controls.
3. **Separate current values from named snapshots.** Current values remain in `v16-effects.ts`
   and its existing localStorage record. Named presets get independent IndexedDB records. Changing
   knobs never overwrites a named preset; loading a named preset copies its values into current state.
4. **Explicit recall sends a full snapshot.** Live knobs retain changed-controls-only sends.
   Deliberately loading a saved preset sends all 24 values because browser state is not readback.
5. **Separate navigation from send eligibility.** Effects remains available offline and on other
   firmware for local preparation. For all MIDI sends, reuse the existing `multitimbral && effectControllers &&
!presetEffects` capability combination as the initial eligibility rule, not a new
   `sharedFxPresets` capability or a firmware-name comparison. Review current profile entries and
   test all families; do not widen eligibility as a side effect of adding the library. Ineligible/offline knob edits stay local; eligible live edits
   still send only changed controllers. The send gate must not hide the Effects view.

## Firmware compatibility is a release requirement

Owner clarification: branch from current main and retain existing functionality for previous
stock firmware versions and Baud Girl/FM-1+VA. This feature must not move their patch-bound FX
into V16's shared state or remove their sound-editor controls.

- Older stock firmware keeps its existing effect controllers, per-patch effects, slot-send and
  editor-open behaviour. Do not suppress those sends using a global V16 rule.
- Baud Girl/FM-1+VA keeps its existing DX7, Virtual Analog and 8-Bit editor behaviour where
  supported, preset read/write safeguards and timing, record-preserving writes, Bitcrush,
  distortion type, effect order and knob assignments. The new 24-value format does not replace
  or truncate those records.
- Standalone preset application and live edits send only with the shared-FX capability gate.
  On older stock and Baud Girl, this new view is local preparation only; their existing editors
  continue working normally. Do not enable the new sender there merely because CCs exist.
- A firmware/port change while Effects is open re-evaluates send eligibility immediately and
  cancels unsent work. Returning to Sounds shows that firmware's existing controls. Do not discard
  saved/current FX data or change firmware-specific patch data during navigation or detection.
- Test stock V15/V16 across the threshold, the current FM-1+VA capability thresholds and sound
  engines, unknown/checking firmware, Official Open and Felucca. Tests must exercise the UI and
  actual queued messages, not just repeat the profile table.

## User flows and exact behaviour

### Entry and layout

Place **Sounds** and **Effects** together in the main library navigation, outside any Voice strip.
Sounds retains the current voice-patch library/editor workflow. Effects shows the reusable
`V16EffectsPanel`/`EffectsUnit` and its own preset-library actions. Switching views sends nothing,
preserves current values and does not alter the selected sound or MIDI channel. Use the existing
navigation mechanism; do not repurpose the `#p=` share-link format or change the app origin.

The Effects entry remains available with no selected sound, no device and unsupported firmware.
Keep editing and management available locally, while clearly explaining when sending is unavailable.
Retain lazy loading and a retryable load-failure state. In Sounds, V16's sound editor directs the
owner to Effects rather than hosting another rack; preserve other firmware's existing sound-editor
FX behaviour. Reuse the inspected branch's compact panel/title-bar refinements, not its nine-tab layout.

Add **FX presets…** to the Effects title-bar area. Use responsive overflow if needed and preserve
keyboard focus. The Effects page contains the single live rack; its management dialog does not.

The management dialog contains search, a named preset list, selected preset details, Save current,
Load, and row management/import/export actions. Selecting a row is only selection. It sends
nothing and does not update `v16-effects`. Double-click is not recall. Require the labelled Load
button. On narrow screens keep this one simple list/dialog, not another editing page.

Use existing UI primitives and focus handling. Closing preset management returns focus to its
launcher in Effects. No additional Library actions launcher is required now that Effects is a
first-class view. Unsupported firmware may load saved values into the browser, but sends nothing.

Keep brief shared-FX, unsaved-on-device and no-readback explanations in contextual help near
Load; do not reintroduce the large notice intentionally removed from the Effects tab.

### Current effects and saving

- Opening/switching views continues to use `getV16Effects()` and sends nothing. Never replace the
  current values with defaults on opening the library. First-use defaults remain the existing
  storage owner's responsibility.
- Live knobs and the existing per-effect starting points keep calling the panel's current
  changed-controls-only path. Do not divert them through a local draft or full snapshot send.
- **Save current as…** captures a copy of all 24 current values when clicked, then asks for a
  name. The preview/save uses that immutable capture even if values change elsewhere while the
  naming dialog is open. It saves a new named record and sends nothing.
- **Update from current effects…** is an explicit action on an existing named preset. Confirm
  the preset name, capture the current values and update only after storage commits. Do not
  auto-update on knobs, view navigation or live sends.
- No dirty-draft navigation prompt is needed: current effects retain their established browser
  persistence, and named presets change only through explicit Save/Update. Cancelling a naming
  dialog loses only its uncommitted name. Do not add a second effects history or patch history.
- Do not persist a selected named-preset ID as if it proved the hardware is using it. If showing
  “matches current values”, compare all 24 browser values; clearly identify that as local matching.
- Current-state localStorage failure must not report durable success for a local-only load. Keep
  its in-memory values and show a session-only notice. Extend the current storage owner's status
  interface minimally to expose this; do not replace the existing key or record format.

### Naming and organisation

- Names are trimmed, 1–80 Unicode code points. Reject blank/overlong new input inline rather than
  silently truncating it. Render names as plain text. Duplicate names are allowed; IDs identify records.
- **Duplicate** confirms a bounded “Copy of …” name and creates a new ID with copied values.
- **Rename** changes only the name. **Delete** confirms the name and deletes the browser record
  only. It does not change current effects, send MIDI, or erase a hardware group. On failure keep
  the row present. Deleting a selected row clears selection and restores focus sensibly.
- Sort by active-locale name then ID. Search is case-insensitive name substring matching. Empty
  library and no search results have distinct messages. Do not seed factory records automatically.
- Save/update/import/export/rename/delete and row selection produce zero MIDI.

### Loading a saved preset

1. Resolve any pending save/load. Capture a copy of the selected record's validated 24 values.
   Show the destination output and Effect Ch when available, and the shared-FX consequence in help.
2. Offline or ineligible: **Load into Effects** replaces current browser values through
   `setV16Effects`, with no MIDI. Say “Loaded into the browser's V16 effects.” Do not auto-send on
   connection, firmware detection or view opening.
3. Online and eligible: **Load and apply** replaces current values and queues exactly one full
   24-controller send. Do not also run the panel's changed-controller handler or an effect subscriber
   that transmits, which would double-send. Saved source records remain immutable.
4. Live knob/per-effect preset interactions and another load are disabled while the batch is pending.
   Closing the dialog is disabled until it settles; teardown still cancels unsent work. Ordinary
   view navigation must not orphan traffic or cause it to be sent again on remount.
5. Use existing paced `sendEffectSettings`/queue/message-builder machinery with strict validation
   and eligibility checks. Capture output, Effect Ch and firmware/connection generation. Revalidate
   at execution and cancel unsent work when any changes; no redirection or automatic retry.
6. This is not atomic: controls arrive individually. Send existing order 0–23; add no invented
   mute/bypass envelope. A successful API send is not acknowledgement from the FM1.
7. Show **Sent to FM1**, never “Saved on FM1”, “In sync” or “Verified”. Mention that front-panel
   changes are not read back. On failure/cancellation retain current values and show “Not all
   effects were sent. The FM1 may have changed partially.” Retry is a deliberate full send.
8. Ignore double-click/Enter repeats while pending. After successful load, disable ordinary Load
   for the same record/values and route while no known effects activity intervenes. Offer explicit
   **Send again** for restoring after hardware knob/group changes; this intentionally sends all 24.
   After a live knob change, failed send, route change or other known effect send, invalidate the indication.

Do not call voice recall or slot audition from preset load: those send Program Changes. Loading
FX never changes Voice setup, current voice patches, effect order or the hardware group selection.
Do not add Recall voices as part of this feature. If it exists on the eventual base, preserve its
separate explicit behaviour without making it a dependency of Effects.
Track send status as “last sent”, not as a second authoritative hardware-state model. Where shared
send invalidation is needed, make it a lightweight event/revision; current values still have one owner.

## Data and persistence contract

New independent persisted record, version 1:

```ts
type FxLibraryPreset = {
  version: 1
  id: string
  name: string
  effects: Uint8Array // exactly 24 entries in fm1EffectParameters order
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}
```

Generate IDs with the project's existing ID convention (UUID if no reusable convention exists).
Do not derive identity from a name or timestamp. Copy arrays on entry/exit so changing current effects
cannot mutate the saved record. Timestamp ordering is not required: a clock can move backwards.
Use name/ID sorting, not wall-clock last-write assumptions.

Add an `fx-presets` object store keyed by `id` to the existing `fm1-librarian` database, via an
additive schema upgrade. The inspected checkout opens schema version 2; if that is still current,
use version 3. Inspect current main first and use the next version if another additive upgrade
has landed. Share the database opener; never have competing modules open it with different versions.
Do not change the `library` / `named-banks` stores or the workspace record solely for this feature.

- Missing store on upgrade/empty store means an empty library. A failed read is an error with
  Retry, not an empty library to save over. Do not perform writes until initial loading succeeds.
- Skip and report an individually unreadable or newer-version preset; keep it unchanged in storage
  and show the remaining records. Do not erase it during a later whole-library operation.
- Stored names are trimmed and bounded on read. For a correctly shaped 24-byte stored array,
  normalise out-of-range values using existing effect maxima, in memory. Wrong-length/wrong-type
  arrays, missing identities or invalid timestamps make that record unreadable. Future versions
  stay unreadable until an explicit reader exists; never reinterpret them as version 1.
- Save/delete commit only after the IndexedDB transaction completes. Serialize mutations; failed
  updates retain the previous saved record and the current effects and pending operation data. Retry is explicit.
- Write immediately on explicit Save; no debounced persistence is needed. A pending transaction
  triggers the existing leave-warning discipline. Disposal cannot change an in-flight commit's
  truth; ignore stale UI callbacks and reload authoritative data on the next open.
- Cross-tab updates: reload named records on dialog open/window focus without changing current effects.
  Compare the originally loaded record to the current record inside the write transaction before
  update/delete. If changed or deleted elsewhere, report conflict and offer Reload or Save as new;
  do not silently overwrite. Compare content as well as timestamps. Test this with two owners.

## Export, import and full backups

Dedicated UTF-8 JSON format:

```json
{
  "format": "fm1-fx-presets",
  "version": 1,
  "presets": [
    {
      "name": "Example",
      "effects": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  ]
}
```

Export selected preset or all saved readable presets through `download-file.ts`; never include a
unsaved current values silently; those must first be saved as a named preset. Export order follows the displayed name/ID ordering. IDs/timestamps are local
identity and are omitted from this portable format. Name the file `fm1-fx-presets.json`.

Import is append-only with fresh IDs/timestamps; show the count and explain that existing presets
are kept. Duplicate names/content are allowed, including an explicitly repeated import. Reject
files over 1 MiB before reading and files containing over 1,000 presets. Validate the complete
file before writing: exact format/version, nonblank bounded names, exactly 24 finite integer values
within each control's limits. Reject the entire import on any invalid entry; show an actionable
error and leave storage unchanged. Do not use `normalizeFm1Effects` to silently convert malformed
external input into defaults. An empty array imports nothing with an explicit message. Ignore
unknown non-schema properties without retaining them. Commit a valid import in one transaction;
if it fails there is no partial import. Importing sends no MIDI and leaves current effects alone.

Extend the normal full-library backup so “backup” includes FX presets. The inspected backup format
is version 5; add version 6 if still current, otherwise the next unused version. Add a versioned
`fxPresets` section using the full record fields, with effects encoded consistently with existing
backup arrays. Preserve all older readers/fixtures. Do not change the IndexedDB workspace record
version just because the exported backup version changes.

Restoration policy for the FX section is **merge**, made explicit in the restore review:

- Old backups with no FX section leave existing FX presets untouched.
- New backups add missing records; identical records with the same ID are skipped.
- Same ID with different content becomes a new-ID copy. Never overwrite a local FX preset by
  restoring a backup. Allocate collision IDs inside the restore transaction.
- Validate the full FX section before any restore write. Use the existing restore operation's
  coordinated commit path, extending it as necessary to avoid reporting overall success before
  FX records commit. If existing restore is not transactional across stores, preserve its recovery
  behaviour and report component failures explicitly; never conceal partial restoration.
- Backups must wait for FX loading/pending saves. A failed load must not be represented as an
  empty successful backup. If damaged records are skipped, use the existing partial-backup warning
  convention and state that some FX presets are omitted; do not claim a complete backup.

Include fixtures for dedicated format version 1, full backup's new version and every prior backup
version. Keep legacy voice, bank, favourite and FM-1+VA data byte-for-byte compatible.

## Suggested implementation map

All paths are relative to the implementation checkout. Branch-only files are reuse sources to
adapt onto current main, not a requirement to adopt the Voice-strip interface.

| Path                                                                 | Work                                                                                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/midi/v16-effects-panel.tsx`                          | Add compact library action; keep live changed-control editing and one shared rack. Disable conflicting edits during snapshot sends. |
| `src/lib/v16-effects.ts`                                             | Remain the sole current-values owner. Preserve version-1 compatibility; expose local persistence failure if needed.                 |
| `src/components/midi/voice-strip.tsx`                                | No dependency: do not port the Voice strip for this feature. Preserve it if already present on the chosen base.                     |
| `src/routes/librarian-page.tsx`                                      | Add top-level Sounds/Effects navigation and reuse lazy panel/error handling independently of Voice tabs.                            |
| `src/components/midi/fx-preset-library-dialog.tsx` (new)             | List, selection, naming, management, import/export, explicit Load; no effect rack.                                                  |
| `src/lib/fx-library-preset.ts` (new)                                 | Named-record types, limits, strict external validation and stored-record reader.                                                    |
| `src/lib/fx-preset-file.ts` (new)                                    | Dedicated JSON codec/file bounds; reuse `download-file.ts`.                                                                         |
| `src/hooks/use-fx-library.ts` (new)                                  | Named collection loading and mutations, conflict handling and operation states; not current-effect ownership.                       |
| `src/lib/patch-library-storage.ts`                                   | Add store and transactional per-record operations using the shared database opener.                                                 |
| `src/hooks/use-midi.ts`, `src/lib/midi-transfer-queue.ts`            | Reuse sending/pacing/cancellation; change only what proven route/batch-result gaps require.                                         |
| `src/lib/firmware-profile.ts` and tests                              | Verify send eligibility for all live edits and loads; never use it to hide offline Effects navigation.                              |
| `src/lib/workspace-backup.ts`, `src/hooks/use-workspace-backup.ts`   | Backward-compatible named FX backup and coordinated loading.                                                                        |
| `src/components/patches/restore-backup-dialog.tsx` and restore owner | FX merge review/commit/failure handling without applying restored presets.                                                          |
| `src/i18n/locales/` and lazy registration                            | All locales; keep panel/dialog English lazy, retain US overrides and Ukrainian plurals.                                             |

The existing `sendEffectSettings` normalises input and can return true without sending on
unsupported firmware. Validate/gate before invoking it, and test completion/cancellation rather
than treating enqueue success as delivery. Use a small semantic load operation with injected
sender/storage dependencies if that makes sequencing testable; do not create an alternate effects
session merely to wrap the current store.

### Preserve current-effects storage separately

`fm1-v16-effects` version 1 is a public persisted format. Never rename, clear or repurpose it as
the named library. No automatic creation of a named preset from its contents is required. Preserve
its existing fixture and field normalisation. Explicit named-library backup/restore is separate:
restoring named presets does not replace the tab's current values or send them. If full backups
on current main already include current V16 effects, retain that existing section and semantics.
Do not accidentally drop it when adding the named collection.

## Edge cases and required acceptance tests

Tests use mocked MIDI and fake IndexedDB; no hardware permission is required.

| Case                                                 | Decision and observable test                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Existing current-effects record                      | Preserve exact version-1 loading/normalisation and values across installing the feature; no writes merely on opening.                    |
| Open panel or management dialog                      | Zero MIDI; no current-value replacement or automatic named record.                                                                       |
| Live knob/per-effect starting point                  | Same changed-controller sends as the branch; no full snapshot or named-record update.                                                    |
| Select/double-click/search/rename/save/import/delete | Zero MIDI; current values unchanged. Deleting the source preset does not reset the rack.                                                 |
| Save current then edit                               | Saved snapshot stays unchanged; captured arrays do not alias current effects.                                                            |
| Offline Load                                         | Updates current store and persistence, zero MIDI; reconnect sends nothing automatically.                                                 |
| Online Load and apply                                | Exactly 24 CCs, correct values on Effect Ch, zero SysEx/PC/notes; rack updates once without duplicate sends.                             |
| Unsupported/unknown/checking firmware                | Effects navigation, editing and local load available with clear wording; zero MIDI.                                                      |
| Sound selection/view navigation                      | Zero FX sends; selecting/loading FX leaves voice bytes, slot selection, Voice setup and note channel unchanged.                          |
| Repeated Load                                        | Pending repeats ignored; unchanged ordinary Load disabled after success; explicit Send again works.                                      |
| Route/channel/firmware change or disconnect          | Cancel unsent work; no new-route messages, stale success or automatic retry.                                                             |
| Partial batch failure                                | Keep current values, show partial-change warning, permit explicit full retry; no claim of rollback.                                      |
| Tab/dialog unmount                                   | No duplicate send on return, orphaned unsent work or stale state update.                                                                 |
| Hardware knobs/chain order differ                    | Accept inability to detect; show honest last-send wording and order limitation.                                                          |
| Blank/long/Unicode/duplicate names                   | Enforce code-point bounds for new input, plain-text rendering; distinct IDs survive operations.                                          |
| Malformed file/record                                | Strict import rejection; damaged stored rows skipped/reported and left untouched; no default overwrite.                                  |
| Empty library/read failure                           | Distinct states; read failure cannot save an empty replacement. Retry recovers.                                                          |
| Quota/write/delete error                             | No false save success or removal; keep operation data/current values and allow retry.                                                    |
| Current localStorage unavailable                     | Current values work in memory; local-only Load reports session-only status, not durable persistence.                                     |
| Cross-tab record edit/delete                         | Transactional conflict detection; Reload or Save as new; no silent overwrite.                                                            |
| Import abort halfway                                 | Whole transaction aborts; no partial records or current-state change.                                                                    |
| Full backup/legacy restore                           | New/old fixtures pass; merge preserves local FX; no automatic current-state load or MIDI.                                                |
| Layout/accessibility                                 | Sounds/Effects reachable without Voice tabs on desktop/mobile; keyboard focus, Firefox layout, title-bar usability and load error retry. |

## Execution order and completion gates

1. Read current `AGENTS.md` on main and inspect the reusable Effects code on the feature branch.
   Start from current main in an isolated branch (suggested `codex/v16-fx-preset-library`). Reuse
   already-merged pieces or selectively adapt the panel/store/tests and relevant follow-up fixes.
   Do not merge/cherry-pick the whole Voice-strip branch or introduce eight Voice tabs to obtain
   Effects. Preserve the legacy storage key and other firmware's patch-editor behaviour. Record
   which pieces were reused in the PR and leave the source branch and dirty checkouts untouched.
2. Implement named-record/file validation and additive persistence with failure and legacy tests.
   Preserve the existing current-effects owner and version-1 fixture.
3. Add independent Sounds/Effects navigation, the compact action and lazy management dialog. Verify all browsing and saving are MIDI-silent
   and that live knobs still behave exactly as before.
4. Add explicit local Load / online Load and apply. Verify full-send sequencing, eligibility,
   cancellation and deduplication against the existing queue and other effect senders.
5. Add full backup/restore and dedicated import/export, translations and accessibility. Do not
   ship user-created persistent records without a working backup/export path.
6. Run focused tests for each step, then `npm run check` on the complete branch. Use current
   repository-pinned Node/npm (inspected 24.18.0/11.16.0). Add independent Effects/library end-to-end coverage; it must run with no Voice strip present.
   Retain Firefox/narrow-layout coverage and existing Voice tests if those are on the base. Record environment-blocked checks honestly.
7. Before release, an owner-assisted V16 smoke test should save two contrasting named presets,
   load/apply each, verify 24 CCs and unchanged Voice setup/group selection, exercise live editing,
   reload/export/import, and confirm ordinary voice selection/opening sends no FX. No hardware SAVE.
   This spec does not instruct an agent to connect or run a hardware test unattended.
8. Deliver a PR stating the reused branch components, independent navigation, storage/backup versions,
   validations and remaining hardware checks. Do not merge/deploy or change research PRs.

Definition of done: Sounds and Effects are independently accessible without eight Voice tabs;
Effects reuses the existing rack and gains a durable, backed-up named preset collection;
live editing and current-effects persistence remain intact; deliberate preset recall sends only
the 24 existing controls; browsing/saving never sends MIDI; ordinary voice selection leaves FX alone;
failures neither erase user data nor claim verified hardware state.
