# Quality sweep

A repeatable review of the whole codebase for security, React practice, accessibility (WCAG 2.2
AA), and Core Web Vitals, written so any model can run it and get the same result. Run it when
asked for a sweep or audit, after a large feature lands, or every few months. The last run and its
open work are in [`quality-sweep-2026-10-15.md`](quality-sweep-2026-10-15.md).

Every finding is a **lead** until you have read the code it names and can say what concretely goes
wrong: which input, which user, which screen. A grep hit alone is never a finding. Most hits are
the deliberate patterns listed under **Known fine** in each area; check that list before reporting.

`AGENTS.md` wins over general best practice. When a general rule (for example "lazy-load
dnd-kit", "add tailwind-merge", "virtualise the grid") conflicts with a rule or a recorded decision
there, the project rule stands and the item is not a finding.

## 1. Prepare

1. `git status` is clean, and you are on a new branch from `main`.
2. `node --version` prints the release in `.node-version`, and `npm --version` the one in
   `package.json`'s `packageManager`.
3. `npm ci`. Tests and builds run against `node_modules`, which an older install leaves behind the
   lockfile; `npm outdated` showing a **Current** below **Wanted** means it was stale.
4. Read the open items in the latest `quality-sweep-*.md` and `code-review-2026-10.md`, so you do
   not report them again. Report a listed item only if it got worse.

Done when: `npm ci` succeeded and you hold the list of already-known items.

## 2. Automated baseline

Run each and record pass or fail with the first error:

```bash
npm run deps:audit:prod
npm run deps:audit
npm audit
npm run check
```

`npm audit` with no filter shows moderate and low advisories too. For each one, follow
**Checking JavaScript packages** in `AGENTS.md`: a patched release that its parent's range accepts
is fixed in the sweep by moving only that package in the lockfile. A high or critical advisory
outside the allowlist is a blocking finding.

Done when: all four have run and each failure is either fixed or recorded as a finding.

## 3. Manual review

Work through the four areas in order. Run every command from the repository root and add
`| grep -v '\.test\.'` where a hit in a test does not count. For each area, write down the
checks that passed as well as the findings; the passed list tells the next sweep what is already
covered.

### 3a. Security

- **HTML sinks.** `grep -rnE 'dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function' src public firmware scripts index.html`.
  Fine: None exist; any hit is a finding unless it writes a constant.
- **Links.** `grep -rn -A3 'target="_blank"' src firmware` and `grep -rnE 'href=\{' src --include='*.tsx'`.
  Fine: `rel="noreferrer"` or `noopener` on each; dynamic `href`s from constants or catalog data.
- **Origins against the CSP.** `grep -rnoE 'https?://[a-zA-Z0-9.-]+' src index.html firmware/index.html public/*.js | sort | uniq -c`.
  Fine: Every origin a script loads or fetches is in `public/_headers` and `scripts/check-security-headers.mjs`. Plain links need no entry. Umami's script from `cloud.umami.is` is accepted as it is (decided 15 October 2026).
- **Untrusted files.** `grep -rnE 'JSON\.parse|\.arrayBuffer\(\)|\.text\(\)|fflate' src`, then read each parser in `src/lib`.
  Fine: Size caps, 7-bit checks, and checksums before use; `fflate` only zips, never unzips.
- **Loops over untrusted data.** In those parsers, `.some(`, `.find(`, or `.includes(` inside a loop over file entries.
  Fine: Quadratic work on a list a file controls is a finding; use a `Set`.
- **Stored strings.** Names, descriptions, and ids read from a backup or IndexedDB.
  Fine: Each goes through its normaliser, such as `normalizeWorkspaceBankNameForSave`, before it is kept.
- **Web storage.** `grep -rnE 'localStorage|sessionStorage' src public`.
  Fine: Every access inside `try/catch`.
- **Privacy.** `grep -rnE 'captureException|setContext|setTag|trackAnalyticsEvent\(' src`, then read `src/lib/monitoring.ts`, `src/lib/monitoring-setup.ts`, and `src/lib/analytics.ts`.
  Fine: Fixed event names, enumerated values; nothing user-authored reaches either.
- **MIDI.** `grep -rnE '0x7d\b|0x32\b' src` and `grep -rnE 'sendSysex|\.send\(' src`.
  Fine: Only the builders `AGENTS.md` names send vendor bytes; the FX probe is gated by `import.meta.env.DEV`.
- **CI.** Read `.github/workflows/quality.yml` and `.github/dependabot.yml`.
  Fine: Actions pinned by SHA, `permissions: contents: read`, `persist-credentials: false`, no `pull_request_target`, a Dependabot cooldown.
- **Install scripts.** `node -e 'const l=require("./package-lock.json");for(const[k,v] of Object.entries(l.packages)) if(v.hasInstallScript) console.log(k)'`.
  Fine: Each one is in `package.json`'s `allowScripts` or is `fsevents`.
- **Lockfile sources.** `grep -o '"resolved": "[^"]*"' package-lock.json | grep -v 'https://registry.npmjs.org/'`.
  Fine: No output.
- **Secrets.** `git grep -nE 'sntrys_|ghp_|github_pat_|AKIA|PRIVATE KEY|SENTRY_AUTH_TOKEN\s*='` and `git ls-files | grep -iE '\.env|\.pem|\.cert'`.
  Fine: No output. The Sentry DSN in `src/lib/monitoring.ts` is public by design.

### 3b. React

- **Ref writes during render.** `grep -rnE '\.current\s*=[^=]' src --include=*.ts --include=*.tsx`.
  Fine: Writes in handlers, effects, layout effects, animation callbacks, and `if (ref.current === null)` lazy initialisers.
- **Throwing updaters.** `grep -rnE 'set[A-Z]\w*\(\s*\(?\s*\w*\s*\)?\s*=>' src`, then read each body and the helpers it calls.
  Fine: No `throw`.
- **Type-only imports.** `grep -rnE '^import \{ type ' src`.
  Fine: Mixed value and type imports. A line whose every specifier is a type is a finding.
- **Fixed ids.** `grep -rnE '\b(id|htmlFor|aria-labelledby|aria-describedby|aria-controls)="[^"]+"' src --include=*.tsx`.
  Fine: A component rendered once. A component rendered twice needs `useId`; count its sites with `grep -rn '<Name\b' src`.
- **Browser dialogs.** `grep -rnE 'window\.(alert|confirm|prompt)' src`.
  Fine: No output.
- **Lint suppressions.** `grep -rnE 'oxlint-disable|eslint-disable' src`.
  Fine: A reason in the comment. An `exhaustive-deps` suppression is a lead for `useEffectEvent`.
- **Cleanup.** For each file from `grep -rlE 'addEventListener|setTimeout|setInterval|requestAnimationFrame|Observer' src`, compare the counts of add and remove, set and clear, observe and `disconnect()`.
  Fine: Equal counts, or an `AbortController` aborted on unmount. Any async work a dialog starts stops when it unmounts.
- **Lazy chunks.** `grep -rnE '\blazy\(' src`, then `grep -n '<Name\b' -B8` at each render site.
  Fine: An `ErrorBoundary` with `LoadFailedNotice` or `onError` encloses it.
- **Keys.** `grep -rnE 'key=\{(i|index|idx)\}|Math\.random' src --include=*.tsx`.
  Fine: Static or positional lists. A list that can be reordered keys by id.
- **Escape.** `grep -rn "'Escape'" src/components src/hooks`.
  Fine: Every handler that closes something outside a `<dialog>` calls `preventDefault()`, so the view's Escape shortcut does not also run.
- **`cn` overrides.** `grep -rn "cn('" src/components/ui`, then read each caller that passes `className`.
  Fine: `className ?? default`. A base class plus a caller's class for the same property is a finding (see `cn` in `AGENTS.md`).
- **Lint config.** `node_modules/.bin/oxlint --print-config`.
  Fine: `react/refs`, `react/purity`, `react/set-state-in-effect`, and `react/exhaustive-effect-dependencies` are off on purpose; they are noisy.

### 3c. Accessibility (WCAG 2.2 AA)

- **Labels holding buttons.** `grep -rn -B2 -A12 '<label' src/components src/routes | grep -E '<label|HelpPopover|labelAction|<button|<input|<select|RackSelect|aria-label'`.
  Fine: The field inside carries its own `aria-label`; a `<label>` names only its first labelable descendant.
- **Names on generic elements.** `grep -rnE '<(div|span|p)\b[^>]*aria-label=' src --include=*.tsx`.
  Fine: The element has a `role`. Otherwise use `sr-only` text.
- **Images.** `grep -rn -A8 '<img' src/components src/routes | grep -E '<img|alt='`.
  Fine: Every `<img>` has `alt`, empty for decoration.
- **Focus visible.** `grep -rnE 'outline-none|outline-0' src/components src/routes src/index.css`.
  Fine: The same class list has a `focus-visible:outline-*` or `focus-visible:ring-*`. A background change alone is too faint.
- **Focus inside portals.** Read each component that calls `createPortal` and holds focusable items.
  Fine: Tab and Escape close it onto its toggle.
- **Motion.** `grep -rnoE '[a-z:-]*animate-[a-z-]+' src --include=*.tsx | grep -v motion-safe:` and `grep -rn 'transition' src --include=*.tsx | grep -v motion-reduce`.
  Fine: Looping animations under `motion-safe:`; moving transitions with `motion-reduce:transition-none`; colour fades need neither.
- **Target size.** `grep -rnE 'size-(3|3\.5|4|5)\b|h-(4|5)\b' src/components --include=*.tsx`, then read the element.
  Fine: Not interactive, or 24 px of space around it (WCAG 2.5.8).
- **Live regions.** `grep -rnE 'aria-live|role="status"|role="alert"|<progress' src`.
  Fine: Toasts are polite; `ErrorNotice` is an alert.
- **Landmarks and headings.** `grep -rnE '<main|<header|<nav|<footer|<h1' src`.
  Fine: One `main`; header and footer outside it.
- **Sticky bars.** `grep -rnE 'sticky|scroll-padding' src`.
  Fine: A sticky bar has matching `scroll-padding`, so focus never lands under it (WCAG 2.4.11).
- **Drag and drop.** `grep -rn -A12 '<DndContext' src | grep accessibility`.
  Fine: Translated `accessibility` announcements, and a way to do the same move without dragging (WCAG 2.5.7).
- **Contrast.** Add any text, border, or focus pairing the sweep finds to `src/test/colour-contrast.test.ts`.
  Fine: 4.5:1 for text, 3:1 for borders, focus rings, and icons, in every colourway.

`npm run test:a11y` runs axe over the main screens; it misses names hidden by a wrapping label,
focus order, and contrast in colourways other than the default, which is why the checks above
exist.

### 3d. Core Web Vitals

- **Head order (LCP).** `npm run build`, then `grep -n -E 'script|preload|stylesheet' dist/index.html`.
  Fine: Third-party scripts are `async`. A `defer` script above the module entry delays the app until it has loaded.
- **Input work (INP).** `grep -rn -E 'useDeferredValue|startTransition|useTransition' src | grep -v test`.
  Fine: Text input that filters many cards or searches the catalog reads a deferred value.
- **Images (CLS).** `grep -rn -E '<img|loading=' src --include=*.tsx | grep -v test`.
  Fine: `width` and `height`, or an `aspect-` class, plus `sizes`.
- **Fonts (CLS).** `grep -n -E 'font-display|unicode-range|size-adjust' src/fonts.css`.
  Fine: Every face swaps, has a range, and its family has a metrics fallback.
- **Late content (CLS).** `grep -rn 'return null' src/components/midi src/components/workspace-persistence-status.tsx`.
  Fine: Content that appears without user input either reserves its space or appears below the fold.
- **Pre-paint attributes.** `grep -rnE 'dataset\.|setAttribute' src/hooks | grep -v test`.
  Fine: Attributes that change colours or layout are set in `useLayoutEffect` or before `createRoot`.
- **Bundle.** `npm run bundle:check`.
  Fine: Under budget. Compare the initial chunk list with `main`'s.
- **Layout shift.** `npm run test:cls`.
  Fine: Passes. A new path that changes the first screen, such as MIDI auto-connect, has a scenario in the script.
- **Caching.** `cat public/_headers`.
  Fine: Hashed `/assets/*` immutable.
- **Field measurement.** None, by decision: analytics only shows whether the site and its features
  are used. Do not report its absence.

Done with section 3 when every row of every table has a result: passed, a finding, or not
applicable with a reason.

## 4. Report

Write the findings to a new `docs/quality-sweep-<date>.md` in the shape of the latest one. Each
finding names its area and criterion, a severity (high, medium, low), `file:line`, the concrete
failure, the smallest fix that keeps to `AGENTS.md`, and the test that proves it. Rank them
most severe first.

Done when: every finding has all six parts, and the passed checks are listed under each area.

## 5. Fix

Fix the findings that are small and clear in the same branch, one at a time:

1. Write the test first and watch it fail on the current code.
2. Make the change.
3. Watch the test pass.
4. When the fix settles how something should be done, add the rule to `AGENTS.md`.

Leave for a follow-up, and mark as such in the report, anything that changes every locale, a
visible layout, a remote resource or the CSP, or behaviour the user has to choose; those need the
user's decision. Then run `npm run check`, `npm run deps:audit`, and `git diff --check`, and record
each result in the report.

Done when: every fixed finding has a test that failed before and passes now, and `npm run check`
passes.
