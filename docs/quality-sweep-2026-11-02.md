# Code quality review, 2 November 2026

Read-only review of `main` at `3d515dfebed068f49fb036dc1dca0c6c9d758af6`.
The current checkout was on another branch with unrelated work in progress, so review and
verification used an exported snapshot in `/tmp/fm1-main-review.TF2LjI`. No application code,
dependencies, user data, or hardware were changed. This report is the only addition to the checkout.

The review covered correctness, duplication, component reuse, React lifecycle behaviour, persistence,
file boundaries, privacy, accessibility checks, dependencies, and bundle behaviour. It used the
repository guidance and `docs/quality-sweep.md`, and checked the October reports to avoid presenting
known debt as new. This is a broad review with focused investigations, not a guarantee that every
code path is defect-free. There was no originating feature specification to assess separately.

## Validation

| Check                           | Result                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                         | Node 24.18.0, npm 11.16.0, as pinned.                                                                                                                                                                                                               |
| Isolated dependency install     | `npm ci --ignore-scripts --no-audit --no-fund` succeeded with the exact lockfile: 315 packages. Existing checkout dependencies were untouched.                                                                                                      |
| `npm run check`                 | Passed, including formatting, lint, TypeScript, Knip, 225 test files / 6,027 tests, assets, build, security headers, source maps, and bundle budget. This baseline ran before adding the temporary regression tests described below.                |
| Production dependency audit     | Passed: zero vulnerabilities.                                                                                                                                                                                                                       |
| Repository full-tree audit gate | Passed: no high or critical advisories.                                                                                                                                                                                                             |
| Unfiltered `npm audit`          | Failed: five moderate affected package entries, all development dependencies; see finding 4.                                                                                                                                                        |
| Chromium browser journeys       | All 192 Chromium journeys passed in the combined browser run. A separate firmware smoke run also passed all four tests.                                                                                                                             |
| Firefox browser journeys        | Could not validate the application: Firefox exits before opening a page with `Could not find profile folder.` A single-worker retry with profiles under `/tmp` failed identically. The combined run was stopped after the repeated launch failures. |
| `npm run test:cls`              | Passed: CLS 0.0002804 against a 0.1 limit; MIDI auto-connect CLS 0.0002882 against a 0.001 limit.                                                                                                                                                   |
| Initial JavaScript              | 171,592 B gzip against 172,032 B: **440 B headroom**.                                                                                                                                                                                               |
| Review reproductions            | Two newly constructed behavioural tests fail on the reviewed code; a third contract test confirms the FX transaction uses default durability. Details below.                                                                                        |
| Checkout whitespace             | `git diff --check` passed; unrelated existing changes were preserved.                                                                                                                                                                               |

The first exploratory run used the existing installed packages. Inspection found they lagged the
lockfile, so those results were superseded by the clean isolated install and full passing run above.

## Correctness and data safety

### 1. Medium: reordering effects can overwrite a concurrent switch edit

**Verified by a failing synthetic MIDI test.**

Location: `src/hooks/use-v16-effect-order.ts:137`, particularly the read at line 141 and direct write
at line 145; `src/components/midi/v16-effects-panel.tsx:85` remains able to send effect edits while
that read waits.

Sequence: start moving an effect, let the FM1 capture its settings reply, switch Filter off in the
rack before the reply arrives, then deliver the reply. The reorder writes the old On/Off byte back
as on, while the browser still shows Filter off. Type changes have the same exposure. The hook's
private promise queue serialises reorders with each other, but its direct port sends do not share
the queue used by effect CCs.

Smallest coherent fix: make the entire read-and-write one operation on the shared MIDI transfer
queue, with subsequent app effect edits queued behind it. Expose pending state so controls can
communicate the operation. A UI-only lock must also account for edits already waiting in the
transfer queue; blocking clicks alone does not cover that case. Physical front-panel edits during
the round trip remain a separate protocol limitation.

Proof: the temporary test **preserves an FX switch changed while a reorder is waiting for its read
reply** in `src/components/midi/v16-effects-panel.test.tsx` fails because the emitted write includes
the old enabled byte. The existing ten tests in that file still pass. No real device was used.

### 2. Medium: recalling an FX preset can skip sending after the voice editor changed the effects

**Verified through the real MIDI hook and a fake output.**

Location: `src/components/midi/fx-preset-library.tsx:253`,
`src/components/midi/v16-effects-panel.tsx:80`, and `src/hooks/use-midi.ts:707`.

Sequence: load and send a named FX preset; leave the Effects view; change Filter in the voice
editor, which calls `sendEffectParameter`; return to Effects and click the original preset. The
global last-sent marker still matches the preset and route, so recall returns without sending.
The fake hardware keeps Filter off although the selected preset calls for it to be on. Route
invalidation also belongs to a component that is absent while another view is showing.

Smallest conservative fix: forget the last-sent marker whenever the Effects rack mounts. That
preserves double-click suppression within the view while making an explicit recall after navigation
reliable. Retaining the cache across views instead requires an always-mounted owner to invalidate it
for all competing effect sends and connection changes.

Proof: the temporary test **recalling an FX preset restores it after the voice editor changed the
shared effect group**, in `src/components/midi/review-effects-regressions.test.tsx`, loads the
panel, unmounts it, sends the editor's effect operation through `useMidi`, remounts, and recalls.
It fails with the observed hardware control still 0 instead of 1.

### 3. Medium: FX preset writes bypass the established strict-durability policy

**Verified configuration gap; crash-related data loss is a risk, not a reproduced crash.**

Location: `src/lib/fx-library-storage.ts:69`, compared with
`src/lib/patch-library-storage.ts:179`.

The new FX transaction helper opens `readwrite` without `{ durability: 'strict' }`. The shared
helper already requests strict durability for workspace and saved-bank writes, following the data
safety fix recorded in the October review. A successful FX save can therefore be acknowledged using
the browser's default durability, with weaker protection against a subsequent operating-system
crash or power loss. The [IndexedDB specification's durability discussion](https://w3c.github.io/IndexedDB/#transaction-durability-hint)
describes this distinction; strict durability is a hint, not an absolute guarantee.

Smallest fix: pass `{ durability: 'strict' }` to this transaction too. A later refactor can share
transaction lifecycle/error handling with the existing storage implementation, while retaining the
FX helper's atomic read/check/write behaviour.

Proof: the temporary test **requests strict durability before reporting a named FX preset as saved**
in `src/lib/fx-library-storage.test.ts` inspects the actual fake IndexedDB transaction's public
`durability`: expected `strict`, received `default`. The five existing tests still pass.

## Dependency security

### 4. Medium upstream advisories in development tooling

**Verified by the npm registry audit against the lockfile. No production dependency advisory.**

Locations: `package-lock.json:4766` (`fast-uri`), `:4937` (`glob`), and `:5835` (`minimatch`).

| Installed chain                                                           | Advisory scope                                                                                                                                    | Follow-up                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stylelint → table → Ajv → `fast-uri@3.1.8`                                | Four URI-normalisation/spoofing advisories. These are development tooling dependencies; this review did not demonstrate an application exploit.   | `fast-uri@3.1.9` is published and fits Ajv's `^3.0.1` range. Move this lockfile entry through the normal dependency workflow and rerun the audits/checks.                                    |
| Sentry Vite plugin → bundler plugins → `glob@13.0.6` → `minimatch@10.2.6` | Glob cancellation bypass and minimatch resource exhaustion. npm counts the affected parents too, producing five affected package entries overall. | Follow supported parent upgrades; the currently locked bundler plugin asks for glob `^13.0.6`, while the published fixes cross major versions. This needs dependency vetting and validation. |

References: [fast-uri advisory](https://github.com/advisories/GHSA-w74x-v6f9-j3xg),
[glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), and
[minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).
The repository audit gate intentionally fails only on high/critical advisories, which explains its
passing result alongside the unfiltered audit's moderate findings.

## Standards, duplication, and component reuse

These are maintenance recommendations, separate from the demonstrated behavioural failures above.
The existing shared dialog, rack, parameter, notice, select, menu, and bank-wizard components already
provide substantial reuse. Extract components where behaviour is repeated or ownership becomes
clearer; component count alone is not a useful quality target.

### 5. Medium: share the Virtual Analog and 8-Bit editor lifecycle

Locations: `src/routes/virtual-analog-editor-page.tsx:160` and
`src/routes/eight-bit-editor-page.tsx:235`.

Roughly 240 lines of each route repeat session wiring, sender refs, abortable engine verification,
route reselection, live/local status, unload protection, navigation confirmation, compare, and
shortcuts. The engine-read sequence differs mainly by engine identity. A safety or cancellation fix
currently needs parallel changes and parallel regression coverage.

Extract small shared hooks for live-preset verification and editor navigation. Retain engine-specific
rows and panels. This is a design judgment, supported by substantial repeated behaviour rather than
file length alone. Verify reconnect, cancellation, save/discard, and compare for both engines;
React's [effect guidance](https://react.dev/reference/react/useEffect) supports custom hooks that
encapsulate reusable external-system synchronisation.

### 6. Medium: compose edited settings records in one domain helper

Locations: `src/routes/patch-editor-page.tsx:212`,
`src/routes/virtual-analog-editor-page.tsx:303`, and
`src/routes/eight-bit-editor-page.tsx:368`.

All three save paths compose Distortion type, Bitcrush, effect order, and knob choices through the
same nested domain setters. The byte setters themselves are correctly isolated in `src/lib/`;
their sequencing and extraction are copied into the routes. Adding another record field creates
three places to update and risks engine-specific omissions.

Add one domain helper accepting the source record, engine, and edited settings. Keep the existing
preservation semantics. Verify captured/synthetic records retain every unrelated byte and that all
three editor saves call the same composition path.

### 7. Low: share the apply-once preset selector

Locations: `src/routes/eight-bit-editor-page.tsx:165` (`PresetSelect`) and
`src/components/editor/effects-unit.tsx:265` (`EffectPresetControl`).

Both implement an empty controlled `RackSelect`, a disabled placeholder, label/help association,
very similar field styling, and applying an option before returning to the placeholder. Extract a
small shared selector accepting translated options and the necessary presentation variation.
Verify accessible naming, help placement, and applying the same preset twice. This is an optional
small component refactor, not a runtime defect.

### 8. Low: consolidate byte-array equality in a leaf module

Locations include `src/components/midi/fx-preset-library.tsx:78`,
`src/components/midi/fm1-va-preset-probe.tsx:73`,
`src/lib/fm1-va-preset-download.ts:25`, `src/lib/fm1-va-write-timing.ts:87`,
`src/lib/fm1-va-write-plan.ts:82`, `src/lib/fm1-va-preset-file.ts:127`,
`src/lib/patch-editor-session.ts:80`, and `src/lib/fm1-va-editor-session.ts:53`.

The same length-and-element comparison is independently implemented throughout these modules.
`AGENTS.md` explicitly asks for one source for shared helpers. A tiny dependency-free `bytesEqual`
module would remove the copies. Keep it a leaf so lazy features do not import a larger module just
for this helper. Existing comparisons look correct. Verify unequal lengths and differing bytes,
then measure the resulting chunk graph and bundle.

### 9. Medium: the known librarian decomposition work has grown

Location: `src/routes/librarian-page.tsx:1607` and the surrounding page.

The October review recorded 1,377 lines; the page now has 1,975, with 15 `ErrorBoundary` sites and
many repeated dialog boundary/Suspense/load-failure wrappers. New features continue adding request
state, handlers, and modal lifecycle code to the same component. This is worsened known debt.

Start with one small lazy-dialog boundary and coherent bank/file action hooks or components.
Retain the existing lazy import declarations and loading/error behaviour. Validate one activation,
failed chunks, focus restoration, and existing browser journeys. Measure the initial bundle after
each extraction: only 440 B of budget remains. Avoid a generic modal framework or a wholesale
rewrite.

## Other checks and limits

- Security scans found no application HTML injection sinks, `eval`, string-created functions, or
  native alert/confirm/prompt calls. External link targets inspected carry safe `rel` attributes.
  The lockfile has only npm-registry resolved URLs; its only install-script entry is `fsevents`.
  CI uses pinned action SHAs, read-only contents permission, and checkout credentials disabled.
  The tracked-secret scan matched only the source-map checker containing its detection patterns.
- File boundary review checked the new FX JSON reader's size/count/value validation and existing
  backup/voice/bank boundary patterns. Their existing fixture and compatibility tests pass.
  Web storage accesses inspected are guarded; optional monitoring remains filtered and lazy.
  This was not a penetration test or a live hosting configuration audit.
- React review inspected the new FX asynchronous lifetimes, cancellation, route ownership, and
  existing shared component patterns. The important cross-view/state findings are recorded above.
  No wholesale move to new state, styling, or component libraries is justified by this review.
- Accessibility: the existing rendered accessibility, contrast, keyboard, localisation, and
  reduced-motion tests passed, as did all Chromium browser journeys. This is not a new visual WCAG
  certification, and Firefox remains unverified due to its local launch error.
- Performance: the production build, transitive bundle budget, responsive asset checks, font/image
  baseline, deferred librarian search, and real-Chrome layout checks passed. Bundle headroom is
  the immediate constraint on otherwise sensible abstractions.

## Follow-up order and reproduction evidence

Fix findings 1 and 2 first, then restore strict durability for FX writes and address the dependency
advisories. Extract the shared editor lifecycle and settings composition before another engine or
record field adds a third or fourth copy. The selector and byte helper are small follow-ups;
librarian decomposition can proceed incrementally.

The temporary snapshot contains the failing tests. Run from that directory:

```bash
npx vitest run src/components/midi/review-effects-regressions.test.tsx
npx vitest run src/components/midi/v16-effects-panel.test.tsx
npx vitest run src/lib/fx-library-storage.test.ts
```

Logs live under `/tmp/fm1-main-review-*.log`; the baseline is
`/tmp/fm1-main-review-check-locked.log`. The added regression tests are also captured as
`/tmp/fm1-main-review-regressions.patch`. These temporary artefacts are local evidence, not committed
application changes. Follow-ups should add the regressions to their fixes and watch them pass.

The review produced three correctness/data-safety findings, one development dependency finding,
and five standards/design findings. No feature-spec compliance review was applicable.

## Implementation status (2026-11-02)

The MIDI ordering, rack recall and strict-durability findings are fixed with synthetic regression coverage. The scoped editor, selector, byte comparison and librarian refactors are implemented. fast-uri was updated to 3.1.9; Sentry’s glob 13.0.6 and minimatch 10.2.6 remain subject to moderate GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249 because the latest supported Sentry bundler still requires glob 13. The full repository check passed (6,042 tests), as did all 192 Chromium journeys and the layout-shift check. Firefox could not launch because it could not find its profile folder. The initial bundle measured 171,891 B gzip, within the 172,032 B budget.

On 3 November the PR's merge build exceeded the bundle budget by 19 B. Moving the bank-file import
action back into the librarian kept the dialog-boundary extraction while saving 155 B gzip in a local
build of the merged branch. That build measured 171,864 B gzip, 168 B below the unchanged limit.
