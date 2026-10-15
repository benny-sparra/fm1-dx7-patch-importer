# Quality sweep, 15 October 2026

The sweep in [`quality-sweep.md`](quality-sweep.md), run against `main` at b99d123c on the branch
`chore/code-sweep-2026-10-15`. It found no high-severity security issue. The fixes below landed on
that branch; the open items are written as tasks that need no other context, for a model or a
person to pick up one at a time.

## Baseline

- `npm run deps:audit:prod`: no vulnerabilities.
- `npm run deps:audit`: passes. Only the allowlisted `braces` advisory (GHSA-vfj7-8cjw-p6xm,
  through stylelint) remains.
- `npm audit`: one moderate dev-only advisory, `postcss-selector-parser` below 7.1.6
  (GHSA-rj75-hqrm-r3gf), fixed below.
- The local `node_modules` was behind the lockfile (`@sentry/react` 10 installed, 11 locked), so
  local results did not match CI until `npm ci`. The sweep's first step now runs it.
- `npm run check`: passes after the fixes. The initial JavaScript grew 70 B gzip, from 167,685 B to
  167,755 B, leaving 1,205 B of the budget.

## Fixed on this branch

| Area         | Finding                                                                                                                                              | Fix                                                                                                  | Test                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| React        | Escape on an open help popover also ran the view's Escape shortcut: it left the editor, or opened the unsaved-changes prompt, or cleared the search. | `help-popover.tsx` claims the key with `preventDefault`.                                             | `help-popover.test.tsx`                               |
| React        | Unmounting the write dialog mid-write, as browser Forward into the editor does, kept writing the queued presets with no UI.                          | `write-fm1-va-presets-dialog.tsx` aborts on unmount; the preset already sent finishes.               | `write-fm1-va-presets-dialog.test.tsx`                |
| React        | `CardHeader` combined its padding with the caller's (`cn` base plus override).                                                                       | `className ?? default`, as `CardTitle` does.                                                         | Covered by the patch grid's existing tests.           |
| WCAG 4.1.2   | The Left and Right Curve selects had no accessible name: the wrapping `<label>` named its help button instead.                                       | `ParameterControl` names its field with `aria-label`.                                                | `parameter-controls.test.tsx`                         |
| WCAG 2.4.7   | Focus on `PortalMenu` items showed only a background change, as faint as 1.25:1.                                                                     | A `--crt-led` outline, as the search field has.                                                      | Visual; jsdom cannot evaluate it.                     |
| WCAG 2.4.3   | Tab inside a `PortalMenu` sent focus to the browser chrome and left the menu open.                                                                   | Tab closes the menu onto its toggle.                                                                 | `portal-menu.test.tsx`                                |
| WCAG 1.1.1   | The editor's unsaved-changes dot named a bare `span`, which assistive technology ignores.                                                            | The dot is hidden and `sr-only` text says **Unsaved changes**.                                       | Covered by the editor's rendered tests.               |
| INP          | Every keystroke in the patch search re-rendered up to 320 cards and searched every saved bank and the catalog before the key showed.                 | `LibrarianPage` reads the search through `useDeferredValue`; the box and Escape use the typed value. | The librarian's existing search tests.                |
| LCP          | Umami's `defer` script ran before the app's module entry, putting a third-party round trip in front of first render.                                 | `async` on both pages. Analytics already tolerates a missing `window.umami`.                         | Check Umami still records page views after deploying. |
| Visual       | A stored colourway was applied in a passive effect, so the default finish could show for a frame.                                                    | `useLayoutEffect`.                                                                                   | Existing colourway tests.                             |
| Security     | Backup restore checked favourite ids with `.some()` per entry, quadratic in a list a file controls.                                                  | A `Set` in `readFavourites`.                                                                         | Existing favourites tests.                            |
| Security     | `.env` files, which Vite reads `SENTRY_AUTH_TOKEN` from, were not ignored.                                                                           | `.env` and `.env.*` in `.gitignore`.                                                                 | None tracked (`git ls-files`).                        |
| Supply chain | CI checkouts kept the token in `.git/config`; Dependabot proposed releases the day they shipped.                                                     | `persist-credentials: false` on every checkout; a seven-day Dependabot cooldown.                     | CI run on the pull request.                           |
| Supply chain | `postcss-selector-parser` 7.1.5, moderate CPU exhaustion (dev only).                                                                                 | Moved to 7.1.6 in the lockfile only.                                                                 | `npm audit`                                           |

The knobs' value readouts became number fields that take a typed value (WCAG 2.5.7): a knob whose
value is formatted, such as the Virtual Analog cutoff in hertz, shows its label until the field is
focused, and gives it to assistive technology as the field's description. Tested in
`parameter-controls.test.tsx`; one undo reverses a typed value.

`AGENTS.md` gained **Checking JavaScript packages** under Validation, and rules for a label that
holds a help button, names on generic elements, popovers claiming Escape, and Tab in a portal
menu.

## Open tasks

Tasks 12 and 13 are settled and need no work. Each other task names its files, the change, and
what proves it. Before starting one, run `git status`,
read the `AGENTS.md` sections it names, and branch from `main`. Finish with the focused test, then
`npm run check` and `git diff --check`. Tasks marked **Decision** need the user's answer before any
code changes: ask, quoting the options given.

### Accessibility

1. **Slot names cannot tell two patches apart (WCAG 2.5.3, medium). Done.**
   `src/components/patches/patch-button.tsx:170` names each slot with `banks.sendPatch`, and :201
   names its grip with `banks.reorder`; neither includes the slot code (A1…) shown on the card. A
   bank of INIT VOICE patches gives every slot the same name. Add `{{slot}}`, from
   `patchSlotCode`, to both strings in every locale under `src/i18n/locales/`, with Ukrainian's
   `_few` and `_many` forms if the string counts. Read **Internationalisation** in `AGENTS.md`.
   Test: a rendered test that two slots holding the same patch have different names, in `en-GB`
   and one other locale; update tests that query the old names.
   Proved by `patch-button.test.tsx` (two slots holding one patch have different names, in en-GB and German).

2. **dnd-kit reads English to screen readers in every locale (WCAG 3.1.2, medium). Done.**
   `<DndContext>` in `src/components/patches/patch-grid.tsx:232` and
   `src/components/editor/effects-unit.tsx:756` passes no `accessibility` prop, so dnd-kit
   announces "draggable item 3" in English. Pass `accessibility={{ announcements,
screenReaderInstructions }}` built from new locale strings naming the slot code and patch name,
   or the effect name. Test: a rendered test in a non-English locale that the instructions are
   translated.
   Proved by `librarian-page.test.tsx` and `patch-editor-page.test.tsx`, “reads a slot’s / an effect’s drag instructions and announcements in the interface language”. Shared by `src/lib/drag-accessibility.ts`, with the strings under `ui.drag` in every locale.

3. **Patch and effect order need a drag (WCAG 2.5.7, medium). Done.** The knobs are done: their
   readouts take a typed value (decided 15 October 2026). Patch reordering
   (`src/components/patches/patch-button.tsx`) and effect order
   (`src/components/editor/effects-unit.tsx`) are still drag-only. Add **Move earlier** and **Move
   later** to the slot's ⋮ menu and to each effect box's controls, with their strings in every
   locale, each move one undo step. Test: a rendered test that each item moves the patch or effect
   one place and that one undo reverses it.
   Proved by `librarian-page.test.tsx`, “moving a slot from its menu” (one `moveVoice` call a move, focus follows, disabled at the ends, not offered in search results), and `patch-editor-page.test.tsx` (an effect moves from its menu and one Undo takes it back).

4. **The sticky editor header can cover the focused control (WCAG 2.4.11, medium). Done.**
   `src/components/editor/patch-editor-header.tsx:134` is `sticky top-0` and wraps to two rows on
   a phone, and nothing sets `scroll-padding`. Measure the header with a `ResizeObserver` into a
   CSS variable on the editor page and set `scroll-padding-top` from it in `src/index.css`. Test:
   Playwright at 375 px, Shift+Tab up the operator panel, and assert each focused control's top is
   below the header's bottom.
   Proved by `e2e/editor.e2e.ts`, “sticky header” (fails at control 10 without the fix) and `use-sticky-header-offset.test.tsx`.

5. **Help buttons inside labels (WCAG 2.5.8 and 4.1.2, low). Done.** `SliderParameterControl` (:318),
   `TypedValueControl` (:667) in `parameter-controls.tsx`, `effects-unit.tsx:265,413,552`, and
   `editor-workspace.tsx:404` put `HelpPopover` inside a `<label>`, so clicking the caption opens
   the help. Move the `HelpPopover` beside the label rather than inside it, keeping the visual
   layout, and keep each field's `aria-label`. The help button is 20 px (`size-5`); where it sits
   beside `KnobAssignMenu` (`RotaryParameterControl` :171-178), add `ml-1` so the two targets keep
   24 px apart. Test: clicking a caption does not open a `note`; the field keeps its name.
   Proved by `parameter-controls.test.tsx`, “help beside a caption”, and `patch-editor-page.test.tsx`, “opens no help when any caption on the page is clicked”. Covers the slider, number, choice, and typed-value controls, the effects’ rows, Distortion type, preset and Bitcrush rows, Feedback, and the pitch envelope presets.

6. **Landmarks and a skip link (WCAG 1.3.1 and 2.4.1, low). Done.** `src/routes/root-layout.tsx:102`
   wraps the masthead, the view, and the `<footer>` in one `<main>`. Make the masthead a
   `<header>`, `<main>` hold only the view, and `<footer>` a sibling, and add a visually hidden
   **Skip to patch banks** link, shown on focus, as the first focusable element, with its string in
   every locale. Run `npm run test:cls`, since this changes the first screen. Test: the
   accessibility test finds one `banner`, one `main`, one `contentinfo`, and the link moves focus
   into `main`.
   Proved by `root-layout.test.tsx`, “RootLayout landmarks” (one banner, main, and contentinfo; axe clean; the skip link is first and moves focus into main), and `npm run test:cls` (CLS 0.043). The link reads **Skip to main content** rather than **Skip to patch banks**, since the editor is in `main` too.

7. **Field borders below 3:1 (WCAG 1.4.11, low). Done.** The `.crt-inset` lower and right edge
   (`--crt-line-lt2`) is 2.13–2.75:1 against the panel, and `Select` and `SettingsSelect` borders
   (`--crt-line`) are 1.55–1.98:1 against a dialog body. The patch search field relies on that
   edge alone. Give text inputs the `--crt-acc-dim` border already used by `border-input`, and add
   each pairing, in every colourway, to `src/test/colour-contrast.test.ts`.
   Proved by `colour-contrast.test.ts`, “field edges” and the new pairings in every colourway. Text fields in the rack take `crt-field`; the dialog and settings dropdowns take `border-input`.

8. **Sending is silent and drops focus (WCAG 4.1.3, low). Done.** In
   `src/components/midi/fm1-bank-selection-dialog.tsx:191-198` the Send button becomes `disabled`
   while sending, which drops focus, and **Sending…** is not announced. Use `aria-disabled` with a
   guard in `onSend`. `src/components/midi/midi-panic-button.tsx:34` gives its disabled reason only
   in `title`; add it as `aria-describedby` text. Test: focus stays on the button while sending.
   Proved by `fm1-bank-selection-dialog.test.tsx` (focus stays on Send while sending, **Sending…** is in a status, a second press is ignored) and `midi-panic-button.test.tsx` (focusable while unavailable, the reason is its description).

9. **The piano's drag handle names a `div` (WCAG 4.1.2, low). Done.**
   `src/components/midi/piano-keyboard-dialog.tsx:468` puts `aria-label={t('ui.dragKeyboard')}` on a
   `div` without a role. Apply the `AGENTS.md` rule: hide the decoration and give the name to
   `sr-only` text, or drop the name if the handle is mouse-only and the dialog moves by keyboard
   another way.
   Proved by `piano-keyboard.test.tsx`, “gives no name to a header that has no role”. The hint is a `title` on the grip and title, and the grip icon is hidden.

10. **Reflow at 320 px is not tested (WCAG 1.4.10, low). Done.** `e2e/librarian.e2e.ts:622` starts at
    360 px, and `DialogTitle` (`src/components/ui/dialog.tsx:96`) truncates. Add 320 px to the
    widths, let dialog titles wrap, and check German and Ukrainian titles at that width.
    Proved by `e2e/i18n-layout.e2e.ts`, “reflows the de / uk librarian at 320 px and wraps its dialog titles in full” (fails without the fix), and `dialog.test.tsx`. The 360 px ten-character-name check stays at 360, which `AGENTS.md` sets as the narrowest card.

### Web vitals

11. **The header moves when MIDI connects by itself (CLS, low to medium). Done.** With
    `fm1-midi-auto-connect` stored, `useMidi` connects at start-up (`src/hooks/use-midi.ts:378-388`)
    and `MidiFirmwareBadge` (`src/components/midi/midi-controls.tsx:86`) returns `null` until the
    FM1 answers, then adds a 32 px row on phones (`root-layout.tsx:157-160`); the switch's label
    also changes width. Render the badge's container empty while MIDI is connecting or online and
    the firmware is checking, and keep the label's width with the hidden-alternate-text pattern in
    `AGENTS.md`. Add a scenario to `scripts/check-layout-shift.mjs` that installs
    `e2e/fake-midi.ts` and stores auto-connect, then run `npm run test:cls`.
    Done. The scenario in `scripts/check-layout-shift.mjs` shifted the page by 0.0753 before and
    by 0 now. `useMidi` reports `isConnecting` from its first render when MIDI is left connected
    and the browser can connect it (`use-midi.analytics.test.tsx`), `MidiFirmwareBadge` holds its
    place while MIDI connects or is online and the FM1 is being asked, and `MidiConnectActions`
    stacks its three labels (`midi-controls.test.tsx`, each state's accessible name). One case
    still moves: a visitor with MIDI left connected and no FM1 answering sees the held row go
    away on a phone, as the page used to have no row at all.
12. **No field data for web vitals. Declined.** Analytics only shows whether the site and its
    features are used, so no performance measurement of real visitors is added. Nothing to do.

### Security

13. **Umami loads from cloud.umami.is. Accepted.** The hosted script can change without notice
    and runs with the app's access; the risk is accepted, and it stays loaded from
    `https://cloud.umami.is`. Nothing to do; later sweeps do not report it.
14. **Restored names are kept unnormalised (low). Done.** `readSavedBank` in
    `src/lib/workspace-backup.ts:441-451` stores a saved bank's `name` and `description` as the
    file gives them; `validateNamedBank` (`src/lib/named-bank.ts:138-139`) checks only the trimmed
    length, so megabytes of padding survive. A favourite's `origin.bankName`
    (`src/lib/favourites.ts:145`) has no limit. Store the normalised values and cap `bankName` at
    `workspaceBankTitleLength`. Read **Legacy stored data compatibility** first: this changes what
    is kept, not what is accepted. Test: restoring a padded name keeps the trimmed name.
    Done, with one change from the task: `readSavedBank` keeps the trimmed name and description
    (`workspace-backup.test.ts`, failed before), and `readOrigin` cuts `bankName` to 80
    (`favourites.test.ts`, failed before), not to `workspaceBankTitleLength`. The origin of a
    favourite added from a search result is a saved bank's or a catalog bank's name, up to 80
    characters, so a cap of 10 would have cut the origin of favourites already in storage the next
    time the page loaded. 80 is `savedBankNameLength`, which a test pins the new constant to.
15. **The header check does not compare the built pages with the CSP (info). Done.**
    `scripts/check-security-headers.mjs` could also fail when `dist/*.html` holds an inline
    `<script>` or loads an origin the CSP does not list. Both mistakes break the site rather than
    weaken it, so this is optional. Done in `scripts/check-html-policy.mjs`, which the header
    check runs over every built page; proved by `scripts/check-html-policy.test.mjs`. It also
    refuses a `<style>` element, an inline event handler, and an image carried in the page.

### React

16. **Small consistency fixes (low). Done.** One change each, each with the existing tests passing:
    - `src/components/patches/copy-patch-dialog.tsx:122-130`: replace the `exhaustive-deps`
      suppression with `useEffectEvent`, as `import-dx7-bank-dialog.tsx:110-115` does. Done; a
      refactor with no change to behaviour, covered by `copy-patch-dialog.test.tsx`.
    - `src/hooks/use-midi.ts:211`: `sysexAvailable` reads `webMidi.current` during render; keep
      `sysexEnabled` in state set beside `setMidiAccess(true)`. Done; a refactor with no change to
      behaviour, covered by the `use-midi.*.test.tsx` files.
    - `src/hooks/use-editor-history-entry.ts:34-36`: replace the callbacks mirrored into a ref with
      `useEffectEvent`. Done; covered by `use-editor-history-entry.test.tsx`.
    - `src/routes/root-layout.tsx:274-277`: wrap the development-only `Fm1VaPresetProbe` in an
      `ErrorBoundary`, as `SentryVerificationButton` is in `librarian-page.tsx:935-940`. Done;
      proved by `root-layout.probe.test.tsx`, which failed before.
    - Dialogs that open from a mount effect call `showModal()` unguarded in
      `write-fm1-va-presets-dialog`, `import-dx7-bank-dialog`, `delete-workspace-bank-dialog`,
      `add-workspace-bank-dialog`, and `duplicate-patches-dialog`; guard with `!dialog.open`, as the
      copy and save dialogs do. Done; proved by `dialog-open-guard.test.tsx` and, for the write
      dialog, `write-fm1-va-presets-dialog.test.tsx`, which failed before. The same guard is on the four
      other dialogs the librarian mounts that opened the same way (`fm1-bank-selection`,
      `midi-connection-required`, `import-fm1-va-presets`, `restore-factory-banks`); the first
      three are in `dialog-open-guard.test.tsx`, and the preset import dialog is too heavy to
      render there.

## Checked and fine

- **Security:** no HTML sinks, `eval`, or string timers; external links carry `rel`; every parser
  of a user's file checks size, 7-bit bytes, and checksums, and only zips are written, never read;
  every web storage access is in `try/catch`; analytics and Sentry carry no user-authored data;
  every SysEx goes through a bounded builder, and `00 32` is only the identity query; CI actions
  are pinned by SHA with read-only permissions; the lockfile resolves only from the npm registry;
  no secrets are tracked.
- **React:** no ref writes during render, no throwing updaters, no type-only `import { type }`, no
  browser dialogs, no components defined inside components; every production `lazy()` sits in an
  error boundary; listeners, timers, and observers are cleaned up; no controlled and uncontrolled
  switches.
- **Accessibility:** every image has `alt`; knobs, faders, and envelope points expose slider
  values; switches use `role="switch"`; looping animations honour reduced motion; the viewport
  allows zoom; toasts use a polite live region and errors an alert.
- **Web vitals:** fonts swap, are subset, and have metric fallbacks; the header photo has its size
  and `srcSet`; English needs no locale fetch before first render; Sentry loads when idle.
