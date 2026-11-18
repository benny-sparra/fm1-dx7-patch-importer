# Project scan — 7 November 2026

Review of `feature/read-from-fm1-button` at `19cf6e42` for correctness, optimisation, best practice
and security, with implementation tasks and recommended Playwright coverage. The current checkout
included unrelated edits to `firmware/index.html` and a new firmware image; those were preserved.
No production code or dependencies were changed. No MIDI was sent to hardware.

**Five new findings were verified.** The most urgent is a stale FX Undo action that sends to a
deselected device. Two parser paths also allow user-selected files to occupy the UI thread with
quadratic work. No high/critical dependency advisory or production dependency advisory was reported.
This is a broad source scan with focused reproductions, not a penetration test or an exhaustive
proof of every code path.

The ready-to-execute backlog is [`.handoff/TASKS.md`](../.handoff/TASKS.md). Start with
[`.handoff/HANDOFF.md`](../.handoff/HANDOFF.md); it includes constraints, baseline results and
reproduction instructions. Implementation details and acceptance tests live in that package so a
fresh agent does not need this conversation.

## Findings in priority order

| Order | Priority | Area                   | Finding                                                               | Evidence                                           |
| ----- | -------- | ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| 1     | P1       | MIDI / React lifetime  | FX recall Undo sends to the old device after output selection changes | Failing rendered test through the real MIDI hook   |
| 2     | P2       | Data safety            | Saved-bank edits/deletes lack atomic stale-record protection          | Two failing IndexedDB tests                        |
| 3     | P2       | Security / performance | Malformed SysEx framing rescans the remaining file at every F0        | 128 KiB takes 2.75 s to reject                     |
| 4     | P2       | Security / performance | Backup collection deduplication is quadratic                          | 5.14 MB, 32k FX records take 2.04 s to parse       |
| 5     | P2       | Export correctness     | FX Download all can produce JSON its own importer rejects             | 1,001-record round trip fails below the byte limit |

### 1. FX Undo retains a stale MIDI sender

Location: `src/components/midi/fx-preset-library.tsx:267` and `:311`;
`src/hooks/use-midi.ts:842`.

Recall Stage room on output A, switch to output B, then press the still-visible Undo toast. The
toast closes over the previous `recall`, including its output-A sender. The reproduction records
`CC 70 = 0` on channel 2 reaching A after it was deselected. Clearing queued transfers on a route
change cannot stop this later enqueue. This affects live FX, not hardware Flash.

Fix: expire recall Undo with its route/view lifetime, before it changes state or enqueues MIDI.
Never redirect an old Undo to the new output. Test output/channel/offline/unmount transitions and
retain same-route Undo plus storage-only Undo. Full instructions: Task 1.

### 2. Saved-bank metadata is overwritten by stale tabs

Location: `src/lib/patch-library-storage.ts:539` and `:565`;
`src/hooks/use-patch-library.ts:441` and `:462`.

Two tabs load the same saved bank. A changes its name; B changes the description using its old
snapshot. B's unconditional `put` restores the old name. A second reproduction deletes the bank
then renames the stale copy, recreating the deleted record. Deletion also accepts only an ID,
without checking the record the user confirmed. The workspace's revision guard and the FX store's
expected-record check do not cover saved banks.

Fix: separate add from checked update/delete, and compare the expected record inside the same
strict-durability transaction. Surface a translated conflict and preserve form edits. Test stale
updates/deletes, same-timestamp edits, missing and future-version rows. Full instructions: Task 2.

### 3. Malformed SysEx files amplify scanning work

Location: `src/lib/dx7-bank-archive.ts:35`, especially the F7 suffix search at line 39.

A file full of F0 bytes with no F7 makes the parser scan the entire remaining suffix repeatedly.
The completed benchmark measured approximately 42, 163, 646 and 2,746 ms for 16, 32, 64 and
128 KiB. The largest tested input is far below the existing 1,050,624-byte file cap. The user must
choose/import the file; the resulting main-thread stall is a client-side availability issue, not
an automatic remote exploit. Maximum-size timing is not claimed: an earlier larger exploratory
run was interrupted, and these numbers come from the completed bounded run.

Fix: one forward framing scan, retaining interrupted-dump recovery and all checksum/seven-bit
validation. Test malformed prefixes followed by valid banks and measure scaling without adding
fragile millisecond limits to unit tests. Full instructions: Task 3.

### 4. Backup deduplication blocks on large accepted collections

Location: `src/lib/workspace-backup.ts:521` and `:561`.

Each readable FX preset scans all previously accepted IDs with `.some`; saved banks use the same
pattern. Valid version-6 backups containing 8k/16k/32k distinct FX records took 171/528/2,041 ms.
The largest is 5,141,132 bytes, within the 32 MiB cap. A crafted shared backup can exploit the same
cost, with user interaction. Timing evidence is for FX records; the saved-bank quadratic pattern
was verified by reading its loop, not separately benchmarked.

Fix: use one ID set per collection, preserving order, first-readable-copy wins and damage counts.
Do not break historical files with a new count limit. Test damaged/valid duplicate permutations.
Full instructions: Task 4.

### 5. FX export and import disagree about collection size

Location: `src/lib/fx-preset-file.ts:80` and `:88`;
`src/hooks/use-fx-library.ts:163`; `src/components/midi/fx-preset-library.tsx:94`.

Two supported imports can leave 1,001 named FX presets in storage. Download all serialises all of
them, but the reader rejects the resulting file because it contains more than 1,000 records. The
reproduction is below the separate 1 MiB byte limit. This is a broken portability/recovery path,
not evidence that existing browser storage is already lost.

Recommended fix: retain single JSON for small exports and package larger collections as a ZIP of
bounded version-1 JSON members, using existing `fflate` support. Preserve every record and explain
individual import after extraction; do not remove input limits or cap existing storage. Test every
member's round trip and total completeness. Full implementation proposal: Task 5.

## Known dependency follow-up

The unfiltered npm audit reports four moderate affected package entries through Sentry's build
plugin: `@sentry/vite-plugin`, `@sentry/bundler-plugins`, `glob` and `minimatch`. These represent the
two advisories already documented on 2 November: aborted glob traversal continuing after
cancellation, and minimatch pattern expansion consuming excessive resources.
[Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Fresh registry metadata now offers a supported candidate chain:
`@sentry/vite-plugin@11.11.0` → bundler plugins 11.11.0 → `glob@^14.0.3` → `minimatch@^11.0.2`.
The plugin was published on 5 November and is too young under the repository's two-week rule on
this review date. Recheck the entire resolved tree and release ages before installing it. This is
a maintenance follow-up, not a newly discovered browser vulnerability; no app exploit was shown.
Task 6 records the safe workflow. No packages were upgraded during the scan.

## Recommended Playwright work

The current suite already covers normal imports/downloads, a basic backup restore, editor history,
FX persistence, responsive layouts, firmware-page controls and many keyboard journeys. Add these
missing integration cases rather than duplicating that happy-path coverage:

1. **Two-tab conflicts and recovery:** same-context pages, saved-bank conflict after Task 2,
   workspace conflict, in-memory backup of the losing tab. Task 7; blocking.
2. **Live FX read lifecycle:** exact fixed request, captured replies, rack/order adoption, local-only
   Undo, timeout, invalid reply and unmount cancellation. Task 8; blocking.
3. **MIDI routing and device safety:** old recall Undo after output change, phrase note release on
   its original route, panic, and SMK bank refusal while identified or unanswered. Task 9; blocking.
4. **Complete backup and partial-failure recovery:** DX7/VA/8-Bit/favourites/saved-bank/FX round trip,
   old backup leaves FX intact, failure after a partial commit and safe retry. Task 10; blocking.
5. **Stale deployment chunk recovery:** intercepted 404, contained translated notice, focus return,
   preserved data, successful reload. Task 11; blocking.
6. **Touch FX interactions:** sheet, search, menu, scrolling without accidental recall, move controls
   and live-read focus. Task 12; advisory phone/tablet suites.

The browser fake must gain exact vendor-request matching and controlled multiport/state-change
events first. Its current generic identity response cannot verify readback. Keep codec edge cases
and algorithmic complexity tests in Vitest/benchmarks; the browser tests prove the complete user
journey. Each task lists exact files, setup and assertions.

## Validation performed

| Check                                | Result                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Runtime and clean dependency install | Node 24.18.0, npm 11.16.0; `npm ci --ignore-scripts --no-audit --no-fund` succeeded                                              |
| `npm run check`                      | Passed: format, lint, types, Knip, 232 files / 7,499 tests, responsive images/icons, build, security policy, source maps, bundle |
| Production audit                     | Passed, zero vulnerabilities                                                                                                     |
| Full-tree high/critical gate         | Passed, empty allowlist                                                                                                          |
| Unfiltered registry audit            | Exit 1: four moderate development-package entries, two known underlying advisories                                               |
| Chromium journeys                    | All 197 passed                                                                                                                   |
| Firefox journeys                     | Environment launch failure `Could not find profile folder.`; stopped after three failures, not an app verdict                    |
| Layout shift                         | Passed: 0.0002803918; auto-connect 0.0002881804                                                                                  |
| Initial JavaScript                   | 172,646 B gzip / 173,056 B budget; 410 B spare                                                                                   |
| Review reproductions                 | Four expected red behavioural cases; completed bounded parser measurements                                                       |
| Whitespace                           | `git diff --check` passed                                                                                                        |

The sandbox initially prevented registry DNS and binding the preview port; approved retries ran
the audits and browser checks. The browser build was the one produced by the full deterministic
check. Temporary reproduction tests were removed afterwards; only evidence copies remain.

## Other checks and limitations

Following `docs/quality-sweep.md`, the review checked existing decisions before assessing findings.
The October accepted Umami risk, existing HTTP/cache policy debt, old decomposition proposals and
known test-tooling tasks are not presented as new issues.

| Area                      | Checks and result                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injection and links       | No app HTML/eval sinks found. Firmware-page HTML assignments use fixed markup or repository-owned card/filter data; no user-input path to those sinks was found. External links inspected are static/catalog values with safe `rel` attributes.                                                                                             |
| Files and MIDI boundaries | Inspected JSON, share-link, SysEx and MIDI receive/read paths; existing size/checksum/seven-bit checks and profile gates retained. Findings 3–5 concern resource amplification and export consistency. Not every protocol was independently re-derived.                                                                                     |
| Persistence               | Workspace conflict/durability/recovery paths and FX atomic mutations reviewed; saved-bank gap reproduced. Legacy fixture suites pass. No data migration proposed.                                                                                                                                                                           |
| Privacy and storage       | Inspected guarded Web Storage access, fixed analytics event schema, Sentry filtering, lazy startup and current remote-resource policy. Built CSP checks pass. No live telemetry capture or hosting-admin audit performed.                                                                                                                   |
| Supply chain and CI       | Registry-only lockfile sources; only `fsevents` has an install-script entry. SHA-pinned actions, read-only permissions and disabled persisted checkout credentials. Tracked-secret patterns matched only documentation/checker patterns; no tracked env/certificate files found. This was a pattern scan, not full-history secret scanning. |
| React practices           | Scanned ref writes, type-only imports, lint suppressions and browser-dialog calls; reviewed hot-path effects, queue lifetimes and lazy boundaries. New lifetime bug is finding 1. Not an exhaustive manual proof of every effect cleanup.                                                                                                   |
| Accessibility             | Existing axe, contrast, localisation, keyboard and reduced-motion tests pass; Chromium responsive/focus journeys pass. Inspected FX dialog IDs and shared controls. No new manual screen-reader certification or full colourway visual audit was performed.                                                                                 |
| Performance               | Existing lazy boundaries/deferred librarian search retained; bundle, asset and CLS checks pass. Parser timings demonstrate two concrete optimisation targets. No new generic memoisation/virtualisation prescription without a measured need.                                                                                               |

Application fixes, permanent new tests, dependency changes and hardware validation remain for
follow-up. The handoff package contains runnable evidence, explicit scope limits and acceptance
criteria for each item.
