# Repository guidance

This file applies to the entire repository.

## Project overview

This is a client-only React and TypeScript editor/librarian for the M-VAVE FM1 synthesiser. It
manages DX7-compatible voices in browser storage and communicates with the hardware through Web
MIDI. There is no application server and no supported device-to-browser bank readback; the browser
library is the source of truth.

Use Node.js 24.18.0 and npm 11.16.0, as pinned by `.node-version` and `package.json`.

## Technology and architecture

- React 19, TypeScript, and Vite provide the application shell and production build.
- Tailwind CSS 4 is configured through the Vite plugin; shared theme and component styles live in
  `src/index.css` and `src/fonts.css`.
- IndexedDB persistence is isolated behind the patch-library storage modules. React hooks own the
  browser-facing orchestration; keep MIDI, storage, and file-format rules in testable `src/lib/`
  modules rather than UI components.
- `i18next` and `react-i18next` provide localisation. `dnd-kit` provides patch reordering, and
  Testing Library with Vitest covers observable UI behaviour.
- Production hosting is static. Cloudflare Pages headers provide the deployed security policy;
  Umami supplies privacy-limited analytics, and Sentry is loaded as an optional monitoring chunk.

## Repository layout

- `src/components/`: UI grouped by editor, MIDI, patch-library, and shared UI concerns.
- `src/hooks/`: React state and browser-integration hooks.
- `src/lib/`: domain logic, MIDI encoding, persistence, and reusable utilities.
- `src/routes/`: the eager root/librarian views and lazy patch editor.
- `src/i18n/locales/`: complete resources for each supported locale.
- `src/data/`: bundled static data.
- `src/assets/`: source artwork; `src/assets/generated/` contains committed responsive derivatives.
- `src/test/`: shared accessibility helpers and rendered accessibility coverage.
- `scripts/`: deterministic repository checks that do not belong in application code.
- `public/`: files served unchanged by Vite.

Use the `@/` alias for cross-directory imports. Use relative imports for a module's immediate local
files when that is clearer.

## Code style

- Follow `.editorconfig` and Prettier: two spaces, single quotes, no semicolons, trailing commas,
  100-column width, and LF endings.
- Let `prettier-plugin-tailwindcss` order utility classes. Add conditional class names through
  `cn(...)`; review formatting changes to conditional strings carefully.
- Prefer small named functions and explicit domain types. Keep state near the behavior that owns it.
- Keep TypeScript compatible with `verbatimModuleSyntax` and `erasableSyntaxOnly`; use type-only
  imports where required and avoid runtime TypeScript-only constructs.
- Use Lucide icons and the existing components in `src/components/ui/` before adding new UI
  primitives.
- Do not use dangerous lint autofixes. `npm run lint:fix` is the supported autofix command.
- Do not throw from React state updater functions. React runs them during render, so the caller's
  `try/catch` never sees the error. Work out the next state where the caller can catch a failure,
  then set it.
- Keep one source for shared constants and helpers such as key lists, limits, and value formatting.
  Reuse or export the existing one rather than copying it into another module: for example
  `makeYamahaSysexMessage` for Yamaha SysEx framing, `src/lib/sysex-file.ts` for `.syx` file
  choosers, filenames, and downloads, and `bankDescriptionLength` for text limits.

## Behavioral constraints

### Persistence

- A storage read failure must never silently create and save factory data over a user's workspace.
- Treat a missing workspace differently from an unreadable or incompatible workspace.
- Keep session-only recovery explicit, preserve unsaved in-memory data after write failures, and
  serialize saves so an older snapshot cannot become final storage.
- Cancellation, retry, disposal, and completions arriving after unmount are normal cases and require
  deterministic handling and tests.
- Debounced saves must not lose recent edits: write any pending save immediately when the page is
  hidden or closed, and warn before leaving while a save has not committed.
- Read and write `localStorage` and `sessionStorage` only inside `try/catch`. Blocked or throwing
  storage must leave the feature working with a safe default, never break the action that uses it.

### Legacy stored data compatibility

Users keep their only copy of their voices in browser storage, so every release must be able to
open everything an earlier release could have saved.

- Treat every persisted shape as a public format: the IndexedDB database name, schema version,
  object store names, key paths, and record keys in `src/lib/patch-library-storage.ts`; the
  versioned workspace record (`StoredPatchLibrary`) and saved bank (`NamedBank`) shapes; the
  backup file in `src/lib/workspace-backup.ts`, which users keep outside the browser and which is
  versioned separately from the storage records; and `localStorage` keys such as `fm1-language`,
  `fm1-colourway`, `fm1-last-backup`, and the MIDI port and help-dialog keys. Do not rename,
  remove, or repurpose any of them.
- Changing a stored shape means bumping its record `version` and adding an upgrade path that reads
  every earlier version. Never drop support for an old version, and never reuse a version number for
  a different shape.
- Upgrade on read, in memory. Write back only in the newest format through the normal save path,
  and never delete or overwrite the legacy record before the upgraded data has been saved
  successfully.
- Only bump the IndexedDB schema version for additive changes. `onupgradeneeded` may create stores
  and indexes but must not delete stores, clear records, or reshape existing data.
- New fields must be optional when read, with safe defaults for records that predate them. Unknown
  or out-of-range values from old records are normalised, not treated as a reason to discard the
  workspace; genuinely unreadable data surfaces the `incompatible` error rather than being replaced.
- In a store that holds many independent records, such as saved banks, a damaged record is skipped,
  left in storage unchanged, and reported to the user. It must not hide the readable records.
- Stored preference values (locale, colourway, port names) that no longer match a supported option
  fall back to a default without throwing or erasing other storage.
- Every stored version needs a fixture-based test in the co-located storage test that loads a record
  as that version wrote it and asserts the upgraded result. Add the fixture for the current version
  in the same change that introduces it, so it becomes the legacy fixture for the next one.
- A change that cannot preserve legacy data needs explicit approval and a user-visible migration or
  export path; call it out in the handoff.

### MIDI

- WebMidi must remain dynamically imported. Do not require hardware or browser permission in tests.
- Validate MIDI channels, controller numbers, values, byte lengths, and 7-bit payload limits at the
  domain boundary.
- Preserve transfer ordering, cancellation, port reconnection, and the separation between note and
  effect channels.
- Web MIDI requires a secure context; local HTTPS setup is provided by `npm run setup:https`.
- Check DX7 voice data at every boundary: reject bytes above 7-bit in imported files and SysEx
  payload builders, and normalise stored voices on read.
- When MIDI chooses a port automatically, prefer a port named for the FM-1 (Linux lists
  `FM-1 MIDI 1`; macOS only `USB Composite Device`), then skip ports every system lists without an
  instrument, such as ALSA's Midi Through, unless nothing else is available. Match them by name in
  `resolveMidiPortSelection`; a port the user chose is kept.
- Never move MIDI traffic to a different device on its own. When the selected port disconnects, select
  nothing until it returns or the user chooses another, and drop queued messages when the output
  changes or MIDI is switched off. A dropped transfer is not a transport failure for monitoring.
- Do not resend unchanged data to the FM1 on repeated interaction, such as a double-click. Forget
  what was sent as soon as anything else replaces that device state, and after a failed send.
  The edit-buffer audition compares voice objects by identity, so a library change that puts a
  sound in a slot, such as copying, gives it new voice and effect objects.

### Internationalisation

- English is the dependable eager fallback. Other locales must remain separate dynamic imports.
- Resolve and load the initial non-English locale before the first React render; do not introduce an
  English-language flash.
- Load a selected locale before changing language, cache in-flight/completed loads, and prevent an
  older request from winning a rapid sequence of language changes.
- Locale failures must leave a usable current language. Storage access may be absent, invalid, or
  throw.
- Keep `document.documentElement.lang`, the document title, and description metadata synchronized.
- Every locale must contain the same leaf keys. Update `src/i18n/resources.test.ts` whenever resource
  structure changes.
- Call a library item a patch, and say sound only for what you hear. Voice means the DX7 voice data,
  as in the voice editor and Init voice. German uses Sound for a patch and Klang for what you hear;
  Simplified Chinese uses 音色 and 声音.
- Every user-visible string and accessible name comes from the locale files: labels, `aria-label`,
  `aria-valuetext`, `title`, option lists, empty states, confirmations, and error messages. Only
  product and site names, DX7 cartridge titles, the technical MIDI log, and the editor's
  hardware-style panel abbreviations (such as RATIO, DTUNE, VEL, and R1/L1, whose accessible names
  are translated) stay untranslated.
- Never render `error.message` or browser error text. Give an error the user can act on a typed error
  or code in `src/lib/` and translate it, as `bankErrorMessage` does; show a translated fallback for
  anything else. Technical error text may appear only in a collapsed, labelled technical-details
  disclosure below that translated explanation, as the workspace storage error does, to help with
  bug reports.
- Write every new string in every locale in the same change, including help text. A non-English
  locale must not copy an English sentence; `src/i18n/resources.test.ts` rejects that.
- Format dates and numbers with the interface language (`i18n.resolvedLanguage`), not the browser
  default.

### Bundle boundaries

- Preserve the existing user-intent boundaries: Patch Editor via `React.lazy`, WebMidi on connection,
  `fflate` on bulk export, the saved-bank dialogs when a bank menu opens them, the copy dialog when **Copy to…** opens it, the replace dialog and single-voice file code when **Import patch…** or **Download patch** uses them, the add-bank dialog when **Add new bank** opens it, the backup format and restore dialog when **Download backup** or **Restore from backup…** uses them, the piano keyboard dialog when **Keyboard** opens it, the saved-bank and catalog search results and the catalog's patch names on the first search, locale resources by locale, Sentry on production monitoring startup, and
  factory data only for first-run/recovery or explicit restoration.
- Keep the application shell, `RootLayout`, `LibrarianPage`, patch grid, bank selector, persistence
  status, and essential MIDI controls eager.
- A dialog the librarian mounts on demand opens itself from an effect and takes an `onClose`, rather
  than being rendered always and opened through a `dialogRef`. Unmounting it discards its state, so
  it needs no reset, and `onClose` returns focus to the control that opened it. Making another eager
  dialog lazy no longer frees headroom: Rolldown moves the code it shares with the entry into new
  shared chunks, which the entry still loads, and compressing them separately costs as much as the
  dialog saved. Measure with `npm run bundle:check` before and after any such move.
- When every name taken from a module is a type, write `import type { … }`, not `import { type … }`,
  in lazily loaded code and in eager code that names a lazy module. Under `verbatimModuleSyntax` the
  second form still imports the module for its side effects: eager code pulls the lazy module into
  the entry, and a lazy chunk that pulls in modules the entry shares can make Rolldown split them
  out of the entry. The saved-bank and catalog search once cost 1.5 KiB of the budget this way.
- Prefer source-level `import()` at genuine interaction or data boundaries. Do not move initial code
  into eagerly imported vendor chunks to make the entry filename smaller.
  Vite 8 (Rolldown) makes its own shared chunk for React once enough lazy chunks use it; that
  bundler-made chunk is expected, and the budget counts it because the entry imports it.
- When every name taken from a module is a type, write `import type { A, B }`, not
  `import { type A, type B }`. Under `verbatimModuleSyntax` the second form still emits
  `import '…'`, which keeps the module in the chunk graph and can make Rolldown split shared code
  out of the entry. `typescript/no-import-type-side-effects` enforces this; mixed value and type
  imports keep their inline `type` specifiers.
- Development and verification controls are gated where they are rendered, with a build-time
  constant such as `sentryVerificationEnabled`, so normal production builds leave them out.
- A rejected optional chunk must be contained and recoverable; stale deployment chunks must not
  crash the entire application. Every deploy renames every chunk, so a tab left open across a
  deploy cannot load any lazy part it has not loaded yet. When a lazy feature fails to open, explain
  it with `LoadFailedNotice`, which offers the reload that fetches the current deployment.
- Vite's manifest is used by `npm run bundle:check` to follow all transitive static JavaScript imports.
  Dynamic imports are excluded. Do not weaken or bypass the 151 KiB gzip budget; raising it needs
  explicit approval, as the drag-to-bank copy's raise from 148 KiB and workspace backup's raise
  from 149 KiB had.
- Do not commit `dist/`, source maps, or one-off bundle-analysis reports.

### Privacy, monitoring, and deployment security

- The application handles user-authored patch names, bank names, uploaded filenames, MIDI port
  identities, voice data, and SysEx bytes. Do not send those values to analytics or error monitoring.
- Analytics events must use fixed event names and coarse, bounded properties. Sentry reports must
  keep query strings, fragments, console breadcrumbs, UI breadcrumbs, request data, and user details
  out of events.
- Removing request data also removes the user agent Sentry derives the operating system from, so a
  report that a platform explains must carry that fact itself. `resolveCoarsePlatform` is the one
  source: it answers with an operating-system family from a fixed list and `other` for anything it
  does not recognise. Do not widen it to a version, an engine, or a device.
- Monitoring must remain disabled in development and tests, and a failed optional monitoring import
  must never prevent the app from rendering.
- A lazy chunk that fails to load after a deployment, and that an error boundary contains, is expected
  and is not reported to Sentry. React reports such a failure to `onRecoverableError` as well as to
  `onCaughtError`, so both drop it in `src/lib/monitoring.ts`; filtering only `onCaughtError` still
  lets one event per failure through. `onUncaughtError` stays unfiltered, so the same failure
  outside any boundary is still reported.
- Keep `public/_headers`, the origins used by browser code, and `scripts/check-security-headers.mjs`
  aligned. Any new remote resource or endpoint needs an explicit privacy and CSP review.
- A production build names its release from the deploying platform's commit, resolved once in
  `resolveSentryRelease`. The client and the uploaded source maps must take the name from that same
  helper, or a resolved stack trace is filed where the event that needs it will not look. A build
  without one reports no release rather than a name matching no deployment.

### Images and generated assets

- Full-size WebP files in `src/assets/` are sources and fallbacks. Do not hand-edit files in
  `src/assets/generated/`; run `npm run images:generate` after a source image changes.
- Keep explicit image dimensions and responsive `srcSet`/`sizes` data to avoid layout shift. Run the
  image checks and `npm run test:cls` for image, font, initial-render, or loading-layout changes.
- `public/icon-*.png` are rendered from `public/favicon.svg`. Do not hand-edit them; run
  `npm run icons:generate` after changing the favicon or the manifest icon list.
- `public/favicon-<colourway>.svg` are hand-authored, one per finish. Keep them in step with the
  default `public/favicon.svg` mark and with the colourway tokens; `src/lib/fm1-favicon.test.ts`
  enforces the colours. Launcher icons stay on the default finish because an installed app cannot
  repaint its icon per session.

### Bundled bank catalog

- `src/data/dx7-bank-catalog.ts` lists the bank files in `public/dx7-banks/`. Adding, removing, or
  replacing a bank changes both in the same change, together with the bank count and sources in the
  README.
- Catalog search reads the patch names from `src/data/dx7-catalog-index.json` rather than the bank
  files. Run `npm run catalog:index` whenever a bank is added, removed, or replaced;
  `src/data/dx7-catalog-index.test.ts` fails in `npm test` while the index is stale.

### Theme and finishes

- The shell is a CRT terminal theme. Colour lives in tokens in `src/index.css`: the `--crt-*`
  palette, the `--fm1-*` aliases that UI code consumes, and one `:root[data-fm1-colorway='…']`
  block per finish. Style components from the aliases rather than hard-coded colours.
- `src/lib/fm1-colorway.ts` is the list of finishes. Adding or renaming one means updating its token
  block, its favicon, its colourway images, and the tests that pair them.
- Panels, dialogs, racks, and slots share the bevelled terminal chrome already in `src/index.css`.
  Reuse those classes instead of introducing a parallel surface style.

### UI and accessibility

- Prefer semantic HTML and native dialog behavior. Preserve Escape-to-close, modal semantics, focus
  placement/restoration, and keyboard activation.
- While a dialog's action is in progress, keep the dialog open: block Escape with `onCancel` and
  backdrop clicks, as the add-bank, import, and unsaved-changes dialogs do.
- A component that can be rendered more than once takes its ARIA ids from `useId` rather than fixed
  strings.
- Browser page translators replace text nodes with `<font>` elements, and React then crashes when it
  removes a text node it rendered next to other children, or inserts a node before one; a label
  that changes beside an icon keeps showing its old text. Give text that sits beside a conditional
  element, or changes beside other children, its own `<span>`, as the MIDI log's copy button and
  the working labels on bank buttons do, and key the branches of a conditional that swaps layouts
  built from the same element type, as `Fm1BankSelectionDialog` does. Cover it with
  `translatePageText` from `src/test/page-translator.ts`.
- Show an error in a dialog or on the page with `ErrorNotice` from
  `src/components/ui/error-notice.tsx`, which is the destructive panel and an alert, rather than
  restyling another paragraph.
- Interactive controls need stable accessible names. Preserve ARIA relationships and avoid nesting
  buttons, links, summaries, inputs, or other interactive elements.
- If a feature body becomes lazy, keep its trigger eager. One activation must eventually open the
  requested feature; repeated activation must not duplicate imports or dialogs.
- Use focused `Suspense` or loading states that do not replace the whole librarian page.
- Treat loading, failure, disabled, empty, and narrow-viewport states as first-class behavior.
- Do not use `window.alert`, `window.confirm`, or `window.prompt`; some embedded browsers block them
  silently. Confirm destructive actions in the app’s own UI, move focus into the confirmation, and
  return it to the triggering control on cancel.
- Use `autoFocus` only for the control a native dialog should focus as it opens, such as its safe
  close action. Lint allows it inside a `<dialog>` element written in the same JSX; a dialog built on
  another component needs its file in the `jsx-a11y/no-autofocus` exception in `.oxlintrc.json`.
  Anywhere else, move focus with a ref in an effect when content appears.
- Deleting a workspace bank moves every later bank up a letter. Anything that keeps a bank letter or
  slot id across the deletion, such as the selected bank or the lit slot, must follow the move or be
  cleared.
- **Backup** names only this app's own file, which holds FM1 effects and saved banks; **SysEx**,
  `.syx`, patch, and bank name the DX7 files other tools read. **Restore** means restoring a backup
  and nothing else, which is why putting the factory banks back is **Reset to factory patches**.
  Restoring replaces the workspace, which Undo reverses, and only adds saved banks, never
  overwriting a stored one (`addStoredNamedBank`), because Undo cannot reach saved banks.
- A library change that replaces or removes sounds (deleting a bank, resetting to factory banks,
  restoring a backup, importing or loading over a bank, copying a sound over a slot) offers Undo in its notification through `undoToastOptions`, and a
  notification with an action stays up for 10 seconds. The
  undo applies only while that change is still the latest (`undoChange`), and a dialog must not
  promise an undo the app does not offer. The editor reads its voice only as it opens, so when a
  change opens the editor on the slot it replaced, as copying a search result to edit it does, its
  Undo closes the editor before reverting (the `beforeUndo` of `undoToastOptions`).
- Continuous input is one undo step. Start a gesture on pointer down or key down and end it on
  pointer up, key up, and blur, as the sliders, knobs, and envelope points do. A preset or randomise
  that writes many parameters is also one step.

### Keyboard and motion

- View-level shortcuts are declared in `src/lib/keyboard-shortcuts.ts` and bound through
  `useKeyboardShortcuts`. Widget keyboard behaviour (rotary controls, envelope points, the piano
  keyboard, the bank list) stays with the widget that owns it.
- A shortcut must yield to whatever already owns the keyboard: an open native dialog, a text field
  for bare keys, and an open menu for Escape. Modified shortcuts still run while typing, and while
  only a dialog marked `data-plain-keys-only` (the floating piano keyboard) is open. A widget that
  claims plain keys must ignore Ctrl, Command, and Alt presses and close on Escape.
- Closing a menu with Escape claims the key, so no view shortcut also runs, and moves focus back to
  the menu's toggle when focus was inside it.
- A menu inside a container that clips its overflow, such as a slot's ⋮ menu in the patch grid or
  the open operator's ⋮ menu in the rack, opens in a portal. Build it with `PortalMenu` from
  `src/components/ui/portal-menu.tsx` rather than another copy. It is not a `<details>` menu, so it
  claims Escape with `preventDefault`.
- A key chosen for its position, such as the piano's two-row note layout, is matched by
  `KeyboardEvent.code` and labelled with the user's layout letter (`useKeyboardKeyLabel`). A key
  chosen for its letter, such as Cmd/Ctrl + Z, is matched by `KeyboardEvent.key`.
- Shortcut definitions are the single source: button tooltips and the help dialog read them, so they
  cannot drift. When a shortcut is added, changed, or removed, update the help dialog listing, the
  locale keys, and the keyboard shortcut list in `docs/user-guide.md` in the same change.
- Match the short easing durations already used in `src/index.css` and always provide the
  `prefers-reduced-motion: reduce` snap. Animated disclosure must not leave controls half-hidden in
  the accessibility tree: flip visibility once the transition has finished.
- The reduced-motion snap applies to Tailwind utilities too: a transition that moves, resizes, or
  slides needs `motion-reduce:transition-none`, and a looping animation such as `animate-spin` needs
  `motion-safe:`. Keyframe animations and transitions in `src/index.css` need a
  `prefers-reduced-motion: reduce` override.

## Tests

- Use Vitest. Co-locate `*.test.ts` and `*.test.tsx` with the code under test unless the coverage is a
  shared rendered accessibility scenario in `src/test/`.
- Add `// @vitest-environment jsdom` to rendered DOM tests.
- Use Testing Library queries by role/name and `userEvent` for user interactions. Assert observable
  outcomes rather than implementation details such as hook calls or the presence of `React.lazy`.
- Use deterministic fakes/deferred promises for storage, MIDI, time, imports, and races. Do not use
  real sleeps, network calls, hardware, or test-order-dependent state.
- Give each test one behavioral claim with a descriptive name. Cover success, failure, retry,
  duplicate activation, out-of-order completion, cancellation, and unmount where applicable.
- Add or update the smallest appropriate automated coverage whenever new functionality, behaviour,
  regression path, or browser integration is introduced. Use Playwright for browser-only journeys
  that cannot be faithfully covered by Vitest; keep hardware MIDI validation fixture-based.
- Treat tests as part of the feature, not a follow-up: a commit that adds a module, component, or
  interaction adds its coverage in the same change. In particular:
  - Data tables such as presets get a `src/lib/` test for their invariants: unique ids, parameter
    ranges, and any rule their comments promise.
  - An edit that writes several parameters at once needs a rendered test that it lands and reverses
    as a single undo step.
  - A new scope, meter, or other decorative visual gets a rendered test alongside its siblings (see
    `effect-scopes.test.tsx` and `lfo-scope.test.tsx`): it redraws when its inputs change, dims when
    inactive, and stays `aria-hidden`. Shared animation helpers keep their reduced-motion test.
  - A label that keeps its width by hiding alternate text needs a test that the accessible name
    reads only the current state.
  - Hit areas, overlays, and stacking done in CSS cannot be checked in jsdom; cover the click
    behaviour, including anything that must stay clickable above the overlay, in Playwright.
  - Continuous input grouped into one undo step gets a rendered test that a held key or drag
    reverses in a single undo.
  - A new string assembled from interpolated parts, or a new locale-formatted value, gets a rendered
    test in at least one non-English locale.
  - A new motion’s reduced-motion snap is checked in `src/test/reduced-motion.test.tsx`, because
    jsdom cannot evaluate the media query.
  - A new error a user can hit gets a test that it reaches the UI as translated text, not a raw
    message.
  - A browser journey that needs MIDI installs the fake FM-1 from `e2e/fake-midi.ts` before the page
    loads and asserts the bytes it recorded. Wait for the editor to be live (its back button is
    enabled) before editing, or the edit resends the whole voice rather than one parameter.
  - A dialog that opens itself and focuses a field in an animation frame makes that frame run at
    once in its test, as `named-bank-library-dialog.test.tsx` does, so the focus cannot select the
    field part-way through typing.
- Run a focused test while developing, then run the complete validation before handoff.

## Validation

The normal deterministic validation is:

```bash
npm run check
```

It checks formatting, TypeScript/React and CSS linting, types, unused files/dependencies/exports, all
unit and accessibility tests, responsive image assets, the production build, deployed security
headers, emitted source maps, and the transitive initial-JavaScript budget.

Useful focused commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run deps:check
npm test
npm run test:a11y
npm run test:e2e
npm run images:check
npm run icons:check
npm run build
npm run images:check:dist
npm run security:check
npm run sourcemaps:check
npm run bundle:check
npm run test:cls
```

Run `npm run build` before `npm run bundle:check`. Use `npm run test:cls` for changes affecting the
initial render, fonts, images, loading states, or layout. The CLS check starts a local server and may
need permission in a restricted environment.

Run the checks with the Node.js and npm versions pinned in `.node-version` and `package.json`;
`engines` makes npm warn about others, and CI always uses the pinned versions. When a step is added
to `npm run check`, add the same step to the quality job in `.github/workflows/quality.yml` so local
and CI checks stay equal. `npm run test:e2e` starts its own preview server; set
`PLAYWRIGHT_REUSE_SERVER=true` only to test an already running build on purpose.

Dependency audits require registry access and are separate from the deterministic suite:

```bash
npm run deps:audit:prod
npm run deps:audit
```

When dependencies change, run `npm run lockfile:refresh` with the pinned npm release, then run
`npm run check:install`. Do not use `npm audit fix --force`.

## Change discipline

- Inspect `git status` and the existing diff before editing. Preserve unrelated worktree changes.
- Make the smallest coherent change and avoid opportunistic reformatting or architecture churn.
- When removing a user flow, remove its now-dead state, props, component exports, and locale keys;
  verify the cleanup with `npm run deps:check`.
- Keep user data safety, initial librarian usability, accessibility, and bundle behavior intact.
- Update the README and its linked documentation (`CONTRIBUTING.md`, `PRIVACY.md`,
  `docs/user-guide.md`, `docs/maintaining.md`) when commands, setup, supported behavior, or user workflows change.
- Before handoff, run `git diff --check`, report validation performed, and call out any check that
  could not run.
- When a review or bug fix settles how something should be done, record the rule in this file in the
  same change, so later work follows it without repeating the review.

## FM1 protocol research

Before changing FM1-specific MIDI behaviour, read:

- `docs/fm1-research.md`
- `docs/fm1-roadmap.md`
- the applicable task in `docs/codex-tasks.md`

Treat `docs/fm1-research.md` as the project source of truth for known stock-FM1 behaviour.

Use these confidence levels:

- **Confirmed** — supported by firmware analysis and/or repeated hardware testing.
- **Likely** — supported by analysis but not yet verified through the editor on physical hardware.
- **Needs hardware test** — do not make production behaviour depend on it yet.
- **Dangerous / excluded** — OTA, loader, flash, recovery, or unknown commands that must not be sent by normal editor code.

Do not invent missing FM1 protocol behaviour. If an encoding, command ID, flag meaning, readback mechanism, or persistence rule is unknown, leave the implementation blocked and document the question.

## FM1 runtime MIDI boundaries

Keep Yamaha DX7 voice data separate from FM1-specific data such as effects, arpeggiator settings and sequencer patterns.

FM1-specific byte encoding must live in testable domain/MIDI modules rather than React components.

UI code should call bounded semantic operations rather than construct raw SysEx/vendor messages.

Examples of acceptable API shape:

```ts
setVoiceParameter(...)
requestSequence(...)
sendSequence(...)
setEffectParameter(...)
```

These examples are illustrative; use existing repository conventions and do not introduce an operation until its protocol is known.

Validate at the domain boundary:

- message length
- MIDI channel
- 7-bit payload values where required
- parameter ranges
- sequence record lengths
- note and velocity bounds
- vendor payload lengths
- all enumerated values

Preserve unknown device fields/bits during read-modify-write where possible rather than silently zeroing them.

## Sequencer scope

The Sequencer feature exists only to edit the **FM1's internal sequencer** more conveniently.

Do not turn it into a general sequencer or DAW.

Unless explicitly approved by a future task, do not add:

- multitrack sequencing
- MIDI-file composition
- an audio engine
- arrangements
- clip launching
- automation lanes
- plugins
- a mixer
- generic DAW transport architecture

Prefer a small UI tailored to the stock FM1 sequence representation.

Build in this order:

1. domain model
2. codec
3. mock/read-only UI
4. verified hardware read
5. smallest safe write
6. broader write support

Do not let UI implementation force assumptions about unresolved device protocol.

## Vendor/syscmd safety

The stock firmware recognises M-VAVE-specific protocol traffic in addition to normal Yamaha DX7 SysEx.

The public reverse-engineering work also documents OTA/update/loader paths.

Normal production editor code must never:

- enter the loader
- invoke OTA/update mode
- erase or write firmware flash
- use raw flash operations
- send guessed vendor command IDs
- expose a generic arbitrary vendor-command transmitter

Unknown vendor commands default to **Dangerous / excluded** until classified.

Any future update/recovery research must remain physically and logically separate from normal runtime editor MIDI code and should not ship in the production application bundle unless explicitly justified.

## Hardware research discipline

When reverse engineering a normal FM1 control:

1. capture a baseline
2. change exactly one stock-device value
3. capture again
4. diff messages
5. repeat across several values
6. reconnect/reset and confirm repeatability
7. document the result in `docs/fm1-research.md`
8. add fixture-based tests
9. only then implement a bounded production operation

Never make unit tests require MIDI permission or physical hardware.

Prefer captured fixtures for parser/codec tests.

Do not automatically replay an unknown captured message.

## Protocol-backed feature definition of done

For FM1-specific protocol work, handoff must state:

- documentation updated
- confidence level
- fixtures/tests added
- validation performed
- hardware test performed or explicitly still required
- persistence semantics if the device stores the change
- confirmation that no OTA/loader path is involved
