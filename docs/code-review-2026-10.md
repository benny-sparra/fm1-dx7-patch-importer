# Code review, October 2026

A read-only review of the whole codebase on 2026-10-03, against `main` at e85b8ec. Four reviews ran
side by side: persistence and the patch library, MIDI and the device, React rendering and the UI,
and build, tooling, CI, and deployment. Every finding below was checked against the code, and the
deployment findings against the live site.

Each item names where it is, what goes wrong, the fix, and a rough size: S (an hour or two), M (a
day), or L (several days). Tick an item off, with its pull request, when it lands.

## Fix first: data or device at risk

- [x] **A replugged FM1 keeps its old firmware answer.** (S, fixed on `fix/firmware-reconnect`)
      `src/hooks/use-midi.ts`: the answer counted as current while its port objects matched the
      selected ones, and WebMidi hands back the same objects when a device returns. After a
      reflash from M-VAVE to FM-1+VA and a replug, the old `mvave` answer applied until the new
      reply arrived, up to 3 s, so a slot click sent a single-voice dump, which FM-1+VA writes over
      a stored preset. The answer is now forgotten when a selected port goes away or MIDI is
      switched off.
- [ ] **Two open tabs overwrite each other's workspace.** (M)
      `src/lib/patch-library-storage.ts:311-328`, `src/lib/workspace-persistence.ts:249-296`. Each
      tab `put`s its whole snapshot over `'current'`. A tab left open since yesterday overwrites a
      day's work in another with one heart click, and Undo cannot reach it. A tab still on the old
      release after a deploy also writes an older record version over a newer one, dropping its new
      fields. Fix: inside one readwrite transaction, `get('current')` first and refuse the write
      when the stored `savedAt` is not the one this tab loaded or last wrote, or the stored
      `version` is newer than this release knows. Report it as a new `'conflict'` storage error
      with a translated message offering a reload or a backup. `runTransaction` needs to accept a
      get-then-put operation. Web Locks single-writer election is the alternative.
- [ ] **IndexedDB writes use the browser's default durability.** (S)
      `src/lib/patch-library-storage.ts:122` opens transactions without options. Chromium defaults
      to `relaxed`, so `oncomplete`, which clears `hasUnsavedChanges`, can fire before the data
      reaches disk, and a crash can lose a save the app showed as saved. Fix: pass
      `{ durability: 'strict' }` for readwrite transactions. Saves are debounced, so the cost does
      not matter.
- [ ] **The edit-buffer repeat check survives a reconnect and a failed effects send.** (S)
      `src/App.tsx:102-124`. It is cleared only when `sendVoice` fails. Click A1, power-cycle the
      FM1 or switch MIDI off and on, click A1 again: nothing is sent, not even the Program Change,
      and the FM1 plays its stored preset. Fix: clear it when `sendEffectSettings` resolves `false`
      and when the output or MIDI access goes away, or add a connection count from `useMidi` to the
      key.
- [ ] **The open editor stays live after a switch to another connected output.** (S)
      `src/routes/patch-editor-page.tsx:142-144`. `canSync` stays true, so the new output gets
      parameter changes on top of a voice it never received. Fix: give `PatchEditorMidi` the
      selected output id and treat a change like losing sync: go local, or send the patch again.

## UX and correctness bugs

- [ ] **The algorithm picker cannot be dismissed.** (S)
      `src/components/editor/editor-workspace.tsx:311`. It is the one menu using a bare ref rather
      than `useDismissableDetails`, so Escape and outside clicks do not close it, and because
      Escape yields to any open `details`, Escape does not leave the editor while it is open
      either. Fix: `useDismissableDetails()`, with a rendered test that Escape closes it and returns
      focus to its summary.
- [ ] **Any open `<details>` switches off every bare Escape shortcut.** (S)
      `src/lib/keyboard-shortcuts.ts:91` matches `details[open]`, menus or not. Expanding the
      storage error's **Technical details** stops Escape clearing the search or leaving the editor.
      Fix: mark menu disclosures (for example `data-menu`, set by `useDismissableDetails`) and match
      only those.
- [ ] **Loading a saved bank with no description keeps the old bank's description.** (S)
      `src/lib/named-bank.ts:162-167`. The title is always replaced, the description only when the
      saved bank has one. Fix: delete `bankDescriptions[destinationBank]` when it is empty, and test
      loading over a bank that has a description; the current tests load only into an empty
      library.
- [ ] **`sendVoice` and `sendBank` can throw rather than resolve.** (S)
      `src/hooks/use-midi.ts:442-443`, `:535-536`. The DX7 payload builders call
      `assertPackedVoice` outside any `try`. A throw escapes the slot click and leaves the repeat
      check set, blocking a retry. Fix: wrap both and resolve `false` or
      `{ ok: false, reason: 'invalid_bank' }`.
- [ ] **Saved banks added before the first list read can vanish until reload.** (S, unlikely)
      `src/hooks/use-patch-library.ts:128-145`. `setNamedBanks(banks)` replaces the list when the
      first `listStoredNamedBanks()` resolves. Fix: merge by id with banks already in state.
- [ ] **The algorithm and LFO wave pickers are radio groups without arrow keys.** (M)
      `src/components/editor/editor-workspace.tsx:343-368`,
      `src/components/editor/parameter-controls.tsx:613-635`. The algorithm picker is 32 Tab stops.
      Fix: a roving `tabIndex` with Arrow, Home, and End, or a listbox pattern instead.

## Deployment

All three were confirmed against the live site with `curl`.

- [ ] **Plain HTTP serves the whole app, with no redirect and no HSTS.** (S; one-day HSTS added on
      `chore/hsts`, redirect and a year's max-age still to do)
      Web MIDI fails without a secure context, and the http origin has its own empty IndexedDB, so
      a visitor there sees a blank library or starts a second one. Fix: turn on Cloudflare **Always
      Use HTTPS** and add `Strict-Transport-Security: max-age=31536000; includeSubDomains` to
      `public/_headers`, asserted in `scripts/check-security-headers.mjs`. Check Umami for http
      visits first: anyone who saved patches at the http origin loses access after the redirect, so
      tell them to download a backup.
- [ ] **Hashed assets are not cached.** (S)
      `public/_headers` has only the `/*` CSP rule, so `/assets/*` is served with `max-age=0`, and
      every repeat visit revalidates the entry, preloads, CSS, fonts, and images. Fix: a `/assets/*`
      rule with `Cache-Control: public, max-age=31536000, immutable`, and a static `public/404.html`
      so a deleted chunk returns 404 rather than `index.html`, which immutable caching would keep
      for a year. The app never changes the URL path, so it does not need the SPA fallback.
- [x] **Common security headers are missing.** (S, fixed on `chore/security-headers`)
      Add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
      `Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy` allowing `midi=(self)`
      and denying camera, microphone, geolocation, USB, serial, HID, Bluetooth, and payment. Assert
      each in the security check.

## Performance and bundle

- [ ] **Radix `Slot` ships in the entry with no caller.** (S, about 1.3 KiB gzip)
      `src/components/ui/button.tsx:2,63,67-68`. Nothing passes `asChild`. Fix: remove `asChild`,
      `Slot`, and `@radix-ui/react-slot`, and measure with `npm run bundle:check`.
- [ ] **Space Grotesk is declared but never used.** (S)
      `src/fonts.css` has three `@font-face` blocks no `font-family` names, about 1 KB of
      render-blocking CSS; `knip.jsonc` hides the unused dependency. Fix: delete the blocks, the
      dependency, and the knip entry.
- [ ] **The font preload predates the theme change.** (S)
      `index.html:7-13` preloads Doto, but IBM Plex Mono became the body face afterwards. Fix: also
      preload `ibm-plex-mono-latin-400-normal.woff2`, and check with `npm run test:cls`.
- [ ] **Nothing in `src/` uses `memo`, so every edit redraws the scopes and thumbnails.** (S)
      `src/components/editor/effect-scopes.tsx:58-71`, `scope-frame.tsx:25-27`,
      `editor-workspace.tsx:348-368`. Each knob, slider, or envelope move re-renders all effect
      scopes and the 32 algorithm thumbnails (about 800 SVG nodes), and `FilterScope`'s `step(0)`
      re-rolls its random bars on every render, so they flicker at pointer rate, under reduced
      motion too. Fix: wrap the scopes, `LfoScope`, and `AlgorithmDiagram` in `memo`; their props
      are already primitives or static references. The editor is a lazy chunk, so the entry is
      untouched. Add a test that an operator edit leaves the filter bars unchanged.
- [ ] **React Compiler: not worth adopting globally.** (assessment)
      It would grow the eager components, against a budget raised five times already. The `memo`
      item above gets most of the benefit. If it is still wanted, limit it to the editor with
      `compilationMode: 'annotation'` and measure.
- [ ] **Clicking slots quickly builds a backlog of stale sends.** (M)
      `src/hooks/use-midi.ts:539-540`, `:560-580`, `:652-658`; `src/App.tsx:118-124`. The Program
      Change goes out at once, but the voice dump queues without a key and the 24 effect CCs take
      about 840 ms, so clicking N slots means hearing stale effects over new presets. Fix: give the
      single-voice dump a coalescing key, with a "superseded" result rather than resolving as sent,
      and queue the effects with the voice rather than in `.then`. Do not shorten the CC gap without
      a hardware test.
- [ ] **Edits while the editor is still sending restart the whole send.** (S–M)
      `src/lib/patch-sync-coordinator.ts:33-52`. Each edit during `sending` resends all 155 voice
      parameters and 24 effect CCs. Fix: remember what the previous pass sent and skip whichever
      half is unchanged.
- [ ] **Smaller rendering costs.** (S each)
  - `PianoKeyButton` (`src/components/midi/piano-key.tsx:15`) is not memoised, so its stable
    callbacks are wasted and all 25 keys re-render on every phrase note. Its keydown effect also
    re-subscribes on every Level change; `useEffectEvent` would bind it once.
  - Pointer drags call `getBoundingClientRect()` on every move
    (`src/components/editor/envelope-editor.tsx:87`,
    `src/components/midi/piano-keyboard-dialog.tsx:427`). Read it once on pointer down.
  - Sound keys are hashed for every slot on every render, twice during a search
    (`src/routes/librarian-page.tsx:563-570`, `search-everywhere-results.tsx:144-150`), and again
    in `saveSound` and `addFavourite`. Memoise one slot-to-key map in `usePatchLibrary`.
  - The MIDI log card stays mounted in its closed dialog and re-renders up to 50 rows on every
    message (`src/components/midi/midi-log-dialog.tsx:26,59`). Render it only while open.
  - Scope glows use `filter: drop-shadow` on SVG that changes every frame
    (`src/components/editor/scope-frame.tsx:107-115`). Profile paint time on a slow laptop before
    changing anything.

## Maintainability

- [ ] **Split `src/routes/librarian-page.tsx` (1,377 lines).** (M–L) Seams: `useBankTransfer`
      (407-497, 1112-1123), `useBankFileImport` (361-373, 499-536), `LibraryActionsMenu`
      (828-957), `BankActionsMenu` (660-745, which also copies `menuItemClassName` inline),
      `useFavouriteActions` (563-604), and one `LazyDialogBoundary` for the ErrorBoundary, Suspense,
      and load-error wrapper repeated eight times (1124-1374). Keep the `lazy()` declarations in
      place and never import a value from a lazy module; measure with `npm run bundle:check`.
- [ ] **Split `src/hooks/use-midi.ts` (855 lines).** (M) Seams, matching how its tests are already
      split: `useFm1Identification` (the firmware state and identity effect) and `useMidiPorts`
      (loading WebMidi, enabling, port selection, storage keys, and the port listeners), leaving the
      senders in `useMidi`. Fold `readStoredChannel` and `readStoredEffectChannel` into one.
- [ ] **Remove dead library API that knip cannot see.** (S) `updateVoice`
      (`src/hooks/use-patch-library.ts:222-231`, no callers, and unsafe to revive because it
      bypasses `saveSound`), `renameBank` and `renameVoice` (tests only),
      `makeBankFingerprint` (`src/lib/patch-library.ts:592-602`), `initializePatchLibrary`
      (`src/lib/factory-patch-library.ts:45-47`), and `MidiDevice.manufacturer` and `state`
      (`src/lib/midi.ts`, never read).
- [ ] **Give the repeated normalisation one source.** (S) `patch-library-storage.ts:287` trims a
      bank title inline rather than calling `normalizeWorkspaceBankNameForSave`; the description
      expression is copied at `patch-library-storage.ts:280`, `patch-library.ts:298`, and
      `workspace-backup.ts:284`; the bank text readers in storage and backup are nearly identical;
      `isRecord` is defined in both `favourites.ts` and `workspace-backup.ts`.
- [ ] **Build the FM-1+VA preset read with `makeYamahaSysexMessage`.** (S)
      `src/lib/fm1-va-preset-read.ts:87` and the header in `src/lib/fm1-va-sysex.ts:8` frame
      `F0 43 … F7` themselves.
- [ ] **Move the undo history out of a hand-mirrored ref.** (M) `src/hooks/use-patch-library.ts:72-76,
111-115, 147-149` mirror `useState` into `historyRef`, and the workspace has two owners kept in
      step by an effect. Move the history into an external store or the persistence controller,
      read with `useSyncExternalStore`.
- [ ] **Simplify the storage loader's version checks.** (S) `patch-library-storage.ts:205-257`
      repeats `version === 4 || … || version === 7` six times; validate an integer once, then use
      `version >= n`.

## Tests and CI

- [ ] **Split `src/routes/patch-editor-page.test.tsx`.** (M) It took 54 s of the unit suite's 56 s
      locally. Split it by area, as the `librarian-page.*` tests are.
- [ ] **Speed up the browser-test job.** (S–M) It takes 6 min against 2.5 min for the quality job.
      Run Chromium and Firefox as a matrix or shard, and record trace and video only on the first
      retry on CI (`playwright.config.ts:12,19-20`).
- [ ] **Upload browser-test failure artifacts.** (S) Add `actions/upload-artifact` with
      `if: failure()` for `test-results/` to the browser-tests job.
- [ ] **Type-check `e2e/` and `playwright.config.ts`.** (S) No tsconfig covers them; a strict check
      finds one error, at `e2e/editor.e2e.ts:373`. Add a `tsconfig.e2e.json` referenced from
      `tsconfig.json`.
- [ ] **Move test cleanup into the Vitest config.** (S–M) All 83 Testing Library files call
      `cleanup` by hand. Add `unstubGlobals`, `unstubEnvs`, and `restoreMocks`, and a jsdom-guarded
      `afterEach(cleanup)` setup file, so a new file cannot leak DOM between tests.
- [ ] **Add the missing persistence tests.** (S) A flush while a save is in flight and a newer edit
      waits (`workspace-persistence.ts:171-174` with `249-258`).
- [ ] **Consider `noUncheckedIndexedAccess`.** (L) 168 errors in source, 443 in tests, most in
      `src/lib/dx7.ts`, `effects-unit.tsx`, `midi.ts`, and `fm1-va-sysex.ts`. Worth doing module by
      module for the byte-offset code at the SysEx and DX7 boundary.
- [ ] **Use `import.meta.dirname` in `vite.config.ts`.** (S) Lines 76, 77, and 107 use
      `__dirname`, which Vite warns will stop working with its native config loader.

## Checked and already good

- Saves are serialised by revision, a missing workspace is told apart from an unreadable one, a
  pending save is written when the page hides, transactions resolve on `oncomplete`, schema upgrades
  are additive, damaged saved banks are skipped and kept, and every stored version has a fixture.
- The MIDI log, the patch editor session, and the transfer queue live outside React; the queue is
  cleared on output change and MIDI off; live edits coalesce by key; the identity and preset-read
  listeners and timers are cleaned up; bytes are range-checked before sending.
- The animation loop stops off-screen and under reduced motion, `useKeyboardShortcuts` binds once,
  lazy dialogs mount on demand with load-failure notices, and the piano releases its notes on blur,
  panic, and route changes.
- CI cancels superseded runs, pins actions by SHA, caches npm and Playwright, and matches
  `npm run check`. The CSP is strict and enforced, fonts are self-hosted and subset with matched
  fallbacks, `strict` and `noImplicitOverride` are on, and oxlint runs type-aware with exhaustive
  deps and promise rules. Stricter TypeScript flags other than `noUncheckedIndexedAccess` were
  measured and are not worth their noise.
