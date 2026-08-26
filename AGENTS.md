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

## Behavioral constraints

### Persistence

- A storage read failure must never silently create and save factory data over a user's workspace.
- Treat a missing workspace differently from an unreadable or incompatible workspace.
- Keep session-only recovery explicit, preserve unsaved in-memory data after write failures, and
  serialize saves so an older snapshot cannot become final storage.
- Cancellation, retry, disposal, and completions arriving after unmount are normal cases and require
  deterministic handling and tests.

### MIDI

- WebMidi must remain dynamically imported. Do not require hardware or browser permission in tests.
- Validate MIDI channels, controller numbers, values, byte lengths, and 7-bit payload limits at the
  domain boundary.
- Preserve transfer ordering, cancellation, port reconnection, and the separation between note and
  effect channels.
- Web MIDI requires a secure context; local HTTPS setup is provided by `npm run setup:https`.

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

### Bundle boundaries

- Preserve the existing user-intent boundaries: Patch Editor via `React.lazy`, WebMidi on connection,
  `fflate` on bulk export, locale resources by locale, Sentry on production monitoring startup, and
  factory data only for first-run/recovery or explicit restoration.
- Keep the application shell, `RootLayout`, `LibrarianPage`, patch grid, bank selector, persistence
  status, and essential MIDI controls eager.
- Prefer source-level `import()` at genuine interaction or data boundaries. Do not move initial code
  into eagerly imported vendor chunks to make the entry filename smaller.
- A rejected optional chunk must be contained and recoverable; stale deployment chunks must not
  crash the entire application.
- Vite's manifest is used by `npm run bundle:check` to follow all transitive static JavaScript imports.
  Dynamic imports are excluded. Do not weaken or bypass the 148 KiB gzip budget.
- Do not commit `dist/`, source maps, or one-off bundle-analysis reports.

### Privacy, monitoring, and deployment security

- The application handles user-authored patch names, bank names, uploaded filenames, MIDI port
  identities, voice data, and SysEx bytes. Do not send those values to analytics or error monitoring.
- Analytics events must use fixed event names and coarse, bounded properties. Sentry reports must
  keep query strings, fragments, console breadcrumbs, UI breadcrumbs, request data, and user details
  out of events.
- Monitoring must remain disabled in development and tests, and a failed optional monitoring import
  must never prevent the app from rendering.
- Keep `public/_headers`, the origins used by browser code, and `scripts/check-security-headers.mjs`
  aligned. Any new remote resource or endpoint needs an explicit privacy and CSP review.

### Images and generated assets

- Full-size WebP files in `src/assets/` are sources and fallbacks. Do not hand-edit files in
  `src/assets/generated/`; run `npm run images:generate` after a source image changes.
- Keep explicit image dimensions and responsive `srcSet`/`sizes` data to avoid layout shift. Run the
  image checks and `npm run test:cls` for image, font, initial-render, or loading-layout changes.

### UI and accessibility

- Prefer semantic HTML and native dialog behavior. Preserve Escape-to-close, modal semantics, focus
  placement/restoration, and keyboard activation.
- Interactive controls need stable accessible names. Preserve ARIA relationships and avoid nesting
  buttons, links, summaries, inputs, or other interactive elements.
- If a feature body becomes lazy, keep its trigger eager. One activation must eventually open the
  requested feature; repeated activation must not duplicate imports or dialogs.
- Use focused `Suspense` or loading states that do not replace the whole librarian page.
- Treat loading, failure, disabled, empty, and narrow-viewport states as first-class behavior.

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
npm run images:check
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
- Keep user data safety, initial librarian usability, accessibility, and bundle behavior intact.
- Update README documentation when commands, setup, supported behavior, or user workflows change.
- Before handoff, run `git diff --check`, report validation performed, and call out any check that
  could not run.
