# Contributing

This page covers setting up the project, the checks expected before a pull request, and how the
source is organised. Repository conventions and behavioural constraints are recorded in
[AGENTS.md](AGENTS.md). Deployment, generated-asset, and source-map details are in
[the maintainer notes](docs/maintaining.md).

## Local development

Use Node.js 24.18.0 and npm 11.16.0, as pinned by `.node-version` and
`package.json`; npm warns about a different version when installing. Then run:

```bash
npm install
npm run setup:https
npm run dev
```

After adding, removing, or updating a dependency, refresh and validate the
lockfile with the same npm release used by Cloudflare:

```bash
npm run lockfile:refresh
npm run check:install
```

The second command catches incomplete platform-specific optional dependency
entries before they reach a pull request build.

The one-time HTTPS setup uses [`mkcert`](https://github.com/FiloSottile/mkcert) to create and trust a local certificate. On macOS, install it first with `brew install mkcert`. Open the HTTPS URL printed by Vite.

To use HTTP instead, run `npm run dev:http`.

## Quality checks

Before opening a pull request, run the deterministic local quality suite:

```bash
npm run check
```

This checks formatting, TypeScript/React and CSS linting, compiler types, unused
dependencies/files/exports, unit and rendered accessibility tests, reproducible responsive image
assets, the production build, deployed security headers, public source maps, and the initial
JavaScript budget. It does not contact the npm registry. GitHub Actions runs the same layers on
pushes to `main` and on pull requests.

The separate browser-journey job uses Playwright and a production preview to cover IndexedDB
persistence, editor loading, DX7 import validation, downloads, keyboard reordering, and narrow
viewport controls. Install its Chromium runtime once locally, then run it with:

```bash
npx playwright install chromium
npm run test:e2e
```

The run builds the app and starts its own preview on port 4173. If something is already serving that
port, the run stops rather than testing an older build: stop the other server, or set
`PLAYWRIGHT_REUSE_SERVER=true` to test against it deliberately.

Add or update automated tests whenever functionality or a regression path changes. Use focused
Vitest coverage for domain, component, and mocked browser behaviour; add a Playwright journey when
the behaviour depends on a real browser or production build, such as storage, downloads, native
dialogs, drag-and-drop, responsive layout, or lazy-loaded code. Keep FM1 hardware MIDI validation
fixture-based rather than requiring a device in automated tests.

Use `npm run format` for deterministic formatting and Tailwind class ordering. Use
`npm run lint:fix` for ordinary Oxlint and Stylelint autofixes. Review both diffs before committing,
especially conditional class strings passed to `cn(...)`. Do not use Oxlint's
`--fix-dangerously` option or `npm audit fix --force`.

Accessibility is checked in three complementary ways:

- Oxlint's JSX accessibility rules catch static roles, properties, names, labels, and keyboard
  patterns.
- `npm run test:a11y` runs Axe against representative rendered interactive states. The normal
  `npm test` command includes these tests.
- Lighthouse and manual browser testing cover layout-dependent behaviour such as colour contrast,
  focus visibility, and responsive interaction that jsdom cannot evaluate reliably.

The audit commands below require npm registry access. A registry failure is a failed audit, not a
clean result. Both commands block on high or critical advisories.

## Available scripts

| Command                     | Description                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run check`             | Run all deterministic checks expected before a pull request         |
| `npm run format:check`      | Verify Prettier formatting and Tailwind class ordering              |
| `npm run format`            | Apply Prettier formatting and Tailwind class ordering               |
| `npm run images:generate`   | Regenerate committed responsive WebP candidates with Sharp          |
| `npm run images:check`      | Verify responsive candidates are current, sized, and reproducible   |
| `npm run images:check:dist` | Verify hashed responsive candidates in the production output        |
| `npm run icons:generate`    | Regenerate the committed installed-app icons with Sharp             |
| `npm run icons:check`       | Verify the manifest icons are present, square, and correctly typed  |
| `npm run lint`              | Run Oxlint and Stylelint; warnings fail the command                 |
| `npm run lint:code`         | Run type-aware TypeScript, React, import, promise, and test linting |
| `npm run lint:css`          | Check CSS with Stylelint                                            |
| `npm run lint:fix`          | Apply ordinary safe Oxlint and Stylelint fixes                      |
| `npm run lint:css:fix`      | Apply Stylelint fixes only                                          |
| `npm run security:check`    | Verify the built Cloudflare Pages Content Security Policy           |
| `npm run typecheck`         | Check TypeScript with `tsc` without emitting files                  |
| `npm run deps:check`        | Find unused dependencies, source files, and exports with Knip       |
| `npm run deps:audit:prod`   | Audit production dependencies (requires registry access)            |
| `npm run deps:audit`        | Audit the full dependency tree (requires registry access)           |
| `npm test`                  | Run all unit and rendered accessibility tests                       |
| `npm run test:a11y`         | Run the focused rendered Axe accessibility suite                    |
| `npm run test:e2e`          | Build and run Chromium browser journeys with Playwright             |
| `npm run test:cls`          | Check layout stability across representative responsive viewports   |
| `npm run build`             | Create a production Vite build in `dist/`                           |
| `npm run bundle:check`      | Enforce the transitive initial JavaScript gzip budget               |
| `npm run check:install`     | Validate a clean install (requires registry access)                 |
| `npm run lockfile:refresh`  | Refresh the lockfile (requires registry access)                     |
| `npm run setup:https`       | Create and trust the local HTTPS certificate                        |
| `npm run sourcemaps:check`  | Validate every emitted JavaScript chunk and production source map   |
| `npm run dev`               | Start Vite on `127.0.0.1` with HTTPS                                |
| `npm run dev:http`          | Start the Vite development server with HTTP                         |
| `npm run dev:https`         | Start Vite on `127.0.0.1` with HTTPS                                |
| `npm run preview`           | Preview the production build locally                                |
| `npm run preview:https`     | Preview the production build locally over HTTPS                     |

## Tech stack

- React 19 and TypeScript
- Vite
- Tailwind CSS
- WebMidi.js
- dnd-kit
- i18next and react-i18next
- fflate
- Lucide icons

## Project structure

```text
src/
├── components/       UI, MIDI controls, and patch-bank components
├── data/             Patch metadata and bundled FM-1 factory banks
├── hooks/            Patch-library, MIDI, and FM1 colourway state
├── i18n/             Localisation setup and translated interface/help text
├── lib/              DX7 SysEx parsing, MIDI transfer, and utilities
└── routes/           Application layout, librarian, and voice editor pages
```
