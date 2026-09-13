# M-VAVE FM1 Editor & Librarian

A browser-based voice editor and patch librarian for the [M-VAVE FM1](https://www.mvave.com/).

The app runs entirely in the browser. Build and organise up to 10 local patch banks, edit every standard DX7 voice parameter and the FM1 effects chain, and transfer individual voices or complete banks over MIDI SysEx. Four classic Yamaha DX7 factory banks are loaded initially. New workspace banks can use any of 35 bundled catalog banks or a standard 32-voice DX7 `.syx` upload.

![M-VAVE FM1 synthesiser](src/assets/fm1-header.png)

## Features

- Start with Yamaha DX7 ROM 1A, ROM 1B, ROM 2A, and ROM 2B in browser banks A–D
- Add up to six additional workspace banks from the bundled DX7 bank catalog or your own SysEx file, so every bank starts populated
- Rename, describe, or delete workspace banks, with descriptions available from their tabs
- Replace a populated bank only after confirming that its current sounds will be overwritten
- Restore the four factory banks at any time without removing additional workspace banks
- Restore imported and edited banks automatically from IndexedDB browser storage
- Retry browser-storage failures or continue explicitly with a session-only workspace without overwriting unreadable saved data
- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Search and reorder patches with pointer or keyboard drag-and-drop
- Export one browser bank as `.syx` or all loaded banks as a `.zip`
- Edit all standard DX7 voice parameters with live MIDI updates
- Work on the six operators as a rack: five sit as compact readouts while the selected one opens in place with its full controls
- Mute or solo any operator straight from its rack column, without opening it first
- Fold the operators and effects panels away to focus the editor on the sections in use
- Visualise all 32 DX7 algorithms, including carrier and modulator roles
- Edit four-stage amplitude and pitch envelopes graphically or with precise numeric controls
- Start the pitch envelope from Flat, Attack blip up, Attack drop, Scoop, or Release fall shapes as a single undo step
- Watch the LFO on a scrolling scope that follows the selected wave and LFO Speed
- Edit the FM1's filter, reverb, delay, distortion, chorus, and phaser within their documented ranges
- See a live animated scope for every FM1 effect, drawn from its parameters: filter response, delay taps, chorus drift, reverb tail, distortion clipping, and phaser sweep
- Apply six sound-shaping presets as undoable starting points
- Randomise a sound as an undoable starting point
- Open contextual help for voice, envelope, algorithm, and effect controls
- Rename patches using DX7-compatible 10-character names
- Undo and redo edits within the voice editor
- Save edits to the browser library, resend them, or revert both the editor and FM1 to the last saved version
- Warn before leaving an unsaved editing session, with save, discard, and keep-editing choices
- Undo, redo, save, and leave the voice editor from the keyboard
- Jump to patch search, clear it, and open the lit slot from the keyboard
- Send individual sounds to the edit buffer or a complete 32-patch bank over Web MIDI
- Select matching FM1 slots with MIDI Program Change and track whether a bank is local, transferred, or changed since transfer
- Select MIDI input and output ports, with separate channels for notes/program changes and FM1 effects
- Monitor incoming and outgoing MIDI messages, inspect SysEx data, and copy it as hexadecimal
- Play notes on the FM1 from an on-screen keyboard
- Use the interface in English, French, Spanish, German, Brazilian Portuguese, or Simplified Chinese
- Use a dark CRT-terminal interface whose accent, product image, and tab icon follow any of the six FM1 colour finishes, with contrast checked to WCAG 2.2 AA in each
- Install the editor as a standalone desktop app in browsers that support installation

## Requirements

- An M-VAVE FM1
- A MIDI connection between the computer and FM1
- A Chromium-based browser with Web MIDI and SysEx support, such as Chrome, Edge, or Opera

A standard 4,104-byte Yamaha DX7 32-voice bulk bank (`.syx`) is optional if you want to import additional sounds.

Web MIDI requires a secure context. The local development server uses HTTPS by default.

## Using the editor & librarian

1. Open the app in a supported browser.
2. Switch **MIDI online** on and grant MIDI/SysEx permission.
3. Open **Settings** to select the FM1 MIDI output and, if needed, the note/program and effects channels.
4. Select DX7 Bank 1, 2, 3, or 4. On first use these contain DX7 factory ROM 1A, ROM 1B, ROM 2A, and ROM 2B respectively. Use **Add new bank** to name and describe an additional workspace bank while populating it from the bundled [Yamaha Black Boxes DX7 catalog](https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/) or your own standard 32-voice DX7 SysEx file.
5. Click a patch to select the matching FM1 slot and play it. Double-click it, or choose **Edit** in the toolbar, to load it into the edit buffer and open the voice editor. Changes are sent live once the initial voice and effects have reached the FM1.
6. Use **Save to Library** to keep an edit, or open its adjacent menu to resend the working copy or **Revert to Saved** on both the editor and FM1.
7. Return to the librarian and choose **Send to FM1** to transfer the selected browser bank.
8. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay.

After the first successful connection, the app remembers the selected MIDI ports and both channels and reconnects automatically on future visits. Switch **MIDI online** off to disable automatic connection.

The selected bank in the browser does not determine the hardware destination—the final destination is chosen on the FM1 itself.

To send one sound instead, open its patch in the editor. The app selects the matching hardware slot and sends the voice and its FM1 effects to the edit buffer; hold **SAVE** on the FM1 to store it on the hardware.

To import another bank, open that workspace bank's menu, choose **Import DX7 bank**, and select a compatible `.syx` file. Replacing a populated bank requires confirmation. The same menu lets you edit the bank title and description, download the bank, or delete it when more than one workspace bank exists. Use the menu in the patch-bank header to download all loaded banks or restore factory banks A–D. Additional workspace banks are left intact. If a bank is empty, you can load the built-in demo bank instead.

The interface follows the browser language on first use when it is supported. Change it later in **Settings**; the selection is remembered. Settings also provides separate channels for notes/program changes and effects because the FM1 defaults its effects controls to MIDI channel 2.

> [!IMPORTANT]
> Imported voices, edits, and FM1 effect settings are saved in this browser and restored after a page reload. Download important banks as `.syx` files as an additional backup, especially before clearing browser data. DX7 `.syx` export contains voice data only; the FM1-specific effect settings remain in the browser library.

Workspace-bank titles, descriptions, imported sounds, voice ordering, saved editor changes, and FM1 effect settings are saved automatically in the browser.

If the saved workspace cannot be opened, the app leaves its browser record untouched and offers **Retry** or **Continue without saving**. The latter creates an explicit session-only workspace whose changes are lost when the page closes. If a later save fails, the latest changes remain available in memory and can be saved again with **Retry saving**.

### The voice editor

The editor is laid out as a rack. The six operators stand side by side as columns: five show a compact readout, and the selected operator grows in place to carry its full controls. On narrower screens the open operator drops onto a row of its own. Each column has its own mute and solo buttons, so an operator can be silenced without opening it.

Click anywhere on the title strip of the operators or effects panel to fold it away, and click again to bring it back. Each panel folds on its own and keeps its title visible, so a long editor can be trimmed to the sections you are working on.

The pitch envelope has a presets menu of starting shapes: **Flat**, **Attack blip up**, **Attack drop**, **Scoop**, and **Release fall**. Each one is applied as a single undo step.

The LFO and every FM1 effect open with a small animated scope drawn from their current settings. The LFO scrolls its selected wave at a rate set by LFO Speed. The filter shows its response curve, delay its echo taps, chorus its drifting copies, reverb its tail, distortion its clipped wave, and phaser its sweeping notches. A scope dims when its effect is bypassed or when the LFO has no modulation depth. With reduced motion enabled, each scope shows a still frame instead.

### Keyboard shortcuts

The **?** guide lists these on its own tab. Each view binds the actions that also appear in its
toolbar. `Ctrl` stands in for `Cmd` on Windows and Linux, and the matching button or field shows the
shortcut in its tooltip for the current platform.

In the patch banks:

| Shortcut           | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `/`                | Jump to the search field                                    |
| `Cmd`/`Ctrl` + `F` | Jump to the search field, selecting whatever it holds       |
| `Esc`              | Clear the search                                            |
| `Enter`            | Play the focused slot, then open the lit slot in the editor |

In the voice editor:

| Shortcut                     | Action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `Cmd`/`Ctrl` + `Z`           | Undo the last edit                                                      |
| `Cmd`/`Ctrl` + `Shift` + `Z` | Redo the undone edit                                                    |
| `Cmd`/`Ctrl` + `S`           | Save to Library                                                         |
| `Esc`                        | Return to the patch banks, prompting first if there are unsaved changes |

These act on the view as a whole and stay out of the way of everything else: they are ignored while
a dialog is open, `Esc` closes an open menu before the view reacts to it, and a shortcut that takes
a modifier still works while a text field has focus, so `Cmd`/`Ctrl` + `S` saves without leaving the
patch-name field. Bare keys are left to whatever is being typed into, so `/` and `Esc` behave
normally inside the search field, where `Esc` clears it.

`Enter` gives the keyboard the route the mouse already had through double-click: it plays an unlit
slot as a click would, and opens the slot that is already lit. The toolbar's **Edit** button
remains the signposted way in.

Individual controls keep their own keyboard behaviour. Rotary controls and envelope points respond
to the arrow keys, `Home`, `End`, `Page Up`, and `Page Down`, and the bank tabs move with the arrow
keys.

The patch grid is a single tab stop. The arrow keys move between slots, following the rows as the
grid reflows, and `Home` and `End` jump to the first and last slot. Moving only changes which slot
has focus: because selecting one sends a Program Change and plays it on the FM1, that waits for
`Enter`. Each slot's grip handle stays separately reachable for keyboard reordering.

The on-screen piano plays from the computer keyboard while it is open, using the usual two-row
layout: `A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K` from the root note upwards,
with `Z` and `X` shifting the octave down and up.

## Anonymous usage analytics

The deployed site uses cookie-free [Umami](https://umami.is/) analytics to understand aggregate
feature usage and connection failures. Tracking is restricted to the production domain, respects
the browser's Do Not Track preference, and excludes URL query strings and fragments. Events contain
only fixed feature names and coarse diagnostic categories. Patch and bank names, uploaded filenames,
MIDI port identities, SysEx data, browser error messages, and persistent user identifiers are never
sent. The interface links to [Umami's privacy policy](https://umami.is/privacy).

## Error monitoring

Production builds load the official Sentry React SDK in a recoverable dynamic chunk once the page
has finished loading and the browser is idle, keeping it off the critical rendering path, and report
unhandled browser and React errors to the project's EU Sentry endpoint. Sentry structured logging is
enabled for future fixed, non-user-authored diagnostic messages. Performance tracing, application
metrics, and session replay are disabled.

The integration does not collect cookies, HTTP headers or bodies, URL query parameters, user
details, or stack-frame local values. Console and UI-interaction breadcrumbs are discarded because
they could contain patch or bank names. Request and navigation URLs are stripped of query strings
and fragments again immediately before an event is sent. Development and test builds do not load
Sentry or send events.

Genuine MIDI bank transport exceptions are reported with a fixed error message, source-mappable
stack frames, and safe operational context: MIDI channel, SysEx availability, voice count, and the
failure stage. Raw browser error text, MIDI port identities, bank and patch names, voice contents,
and SysEx bytes are excluded. Expected states such as a missing output or unavailable SysEx remain
anonymous analytics events rather than Sentry issues.

The Sentry DSN is a public routing identifier embedded in the production client, not an
authentication secret. Production deployments with the three server-side Sentry build variables
described below also inject debug IDs and upload source maps so Sentry can reliably resolve minified
stack traces.

## Deployment security

Cloudflare Pages applies the Content Security Policy in `public/_headers` to every route. The policy
keeps scripts, styles, fonts, images, frames, workers, and network requests self-hosted except for the
Umami tracker, the Umami event endpoint, and the project's Sentry ingestion endpoint. Run
`npm run build` followed by `npm run security:check` after changing the policy or introducing a new
browser resource origin.

## Local development

Use Node.js 24.18.0 and npm 11.16.0, as pinned by `.node-version` and
`package.json`, then run:

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

### Responsive image assets

The full-size WebPs in `src/assets/` are the source images and the largest browser fallbacks.
Smaller candidates in `src/assets/generated/` are committed build inputs so a normal Vite build
does not depend on platform-specific manual tooling. After changing a source image, run
`npm run images:generate` with the pinned Node/npm toolchain and commit the regenerated candidates.
`npm run images:check` checks the source and candidate dimensions and aspect ratios, verifies each
candidate is a readable WebP, and rejects candidates larger than their source. It intentionally does
not byte-compare newly encoded images because native WebP output can vary by platform. The
post-build check also requires a hashed production asset for every candidate. Do not edit files in
`src/assets/generated/` manually.

### Installed-app icons

`public/manifest.webmanifest` describes the app for browsers that offer installation, giving the
editor its own window, launcher entry, and name. It adds no service worker, so the app still
requires a network connection to load and works offline no further than before.

The PNGs it references are committed build inputs rendered from `public/favicon.svg` by
`npm run icons:generate`, so the launcher icon and the icon the page starts with cannot drift apart.
The maskable icon is inset onto an opaque white plate, matching the default tile, because a platform
may crop it to any shape inside 80% of its width. `npm run icons:check` verifies every icon the manifest declares exists, is a
square PNG of the declared size, and is fully opaque when it is maskable. Like the responsive image
check, it does not byte-compare a fresh render, because native PNG output can vary by platform. Do
not edit `public/icon-*.png` manually.

`public/favicon.svg` is the icon the document loads with. Once the app has booted it swaps the tab
icon for `public/favicon-<colourway>.svg`, so the tab follows the selected FM1 finish. These are
served as files rather than generated data URLs because the production security policy only admits
images from the app's own origin, and `src/lib/fm1-favicon.test.ts` keeps each one's tile and
wave colours in step with the colourway tokens in `src/index.css`. Each tile is flooded with the
finish's accent and carries an oscilloscope trace in the darkest surface colour, so the finish is
legible at tab size. The mark is drawn as a path rather than set in type, so a favicon never waits
on a webfont. The launcher icons stay on the plain default,
because an installed app cannot repaint its icon per session.

### Production source maps

The standard `npm run build` produces public external source maps for every first-party JavaScript
chunk, including lazy chunks. This remains intentional because the project is open source and public
maps make browser debugging and Lighthouse analysis useful. Maps retain `sourcesContent` for
reliable debugging. Browsers do not ordinarily request external maps during page loading; developer
tools fetch them when needed.

The official Sentry Vite plugin additionally uploads source maps when all of these build-time
variables are available:

- `SENTRY_AUTH_TOKEN`: a Sentry upload token stored as an encrypted deployment secret
- `SENTRY_ORG`: `little-old-me`
- `SENTRY_PROJECT`: `fm1-editor`

Set all three for the production environment in Cloudflare Pages. The token needs Sentry's
source-map upload permissions and must never use a `VITE_` prefix. A build with none of the variables
stays offline; a partial configuration or upload failure stops the build rather than silently
deploying unmatched artifacts. The plugin's own usage telemetry is disabled.

For a one-off local upload, put the same variables in the already-ignored
`.env.production.local` file and run `npm run build`. Never commit the token. The pinned
`@sentry/cli` install script is explicitly approved because the plugin needs its platform uploader;
other dependency install scripts remain unapproved.

To complete Sentry's onboarding verification, temporarily add `VITE_SENTRY_VERIFY=true` to the
Cloudflare Pages production environment and deploy. A clearly labelled verification strip appears
above the librarian patch grid. Clicking **Send Sentry test error** emits Sentry's fixed onboarding
log and counter, then throws `This is your first error!`. Remove the variable and deploy again as
soon as Sentry confirms the event; the control is absent unless the flag is exactly `true` in a
production build. The flag is public configuration and contains no credential.

`npm run sourcemaps:check` verifies that each JavaScript chunk advertises exactly one matching map,
that every map is valid and non-orphaned, and that maps contain no inline data, private filesystem
paths, environment files, or development certificate material. `dist/`, source maps, and one-off
Lighthouse reports are generated deployment artifacts and must not be committed.

The deliberate alternatives are `SOURCE_MAPS=none npm run build` and
`SOURCE_MAPS=hidden npm run build`; unknown values fail the build. An authenticated Sentry upload
rejects `SOURCE_MAPS=none` because there would be nothing to upload. Run the source-map check with the
same `SOURCE_MAPS` value used for the build.

### Lighthouse

Run Lighthouse against a production build rather than the Vite development server:

```bash
npm run build
npm run preview:https
```

Then audit the HTTPS URL printed by Vite in a private browser window. The development
server includes React diagnostics, hot reloading, source modules, and unminified
dependencies, so its performance score does not represent a deployed build.

## Tech stack

- React 19 and TypeScript
- Vite
- Tailwind CSS
- WebMidi.js
- dnd-kit
- i18next and react-i18next
- fflate
- Lucide icons

## SysEx compatibility

The DX7 import feature intentionally validates bank files before loading them. A compatible file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain a valid Yamaha checksum

Single-voice dumps, larger archive files, and banks using another SysEx format are not accepted.

The browser library is the source of truth. The current FM1 firmware does not document transmission of stored voices or banks over MIDI, so the librarian cannot import a bank directly from the hardware. Keep `.syx` source files or download browser banks as backups. If M-VAVE adds bulk-dump output in a future firmware release, device-to-browser bank import can be added without changing the saved library format.

## FM1 protocol research

The repository records the evidence behind FM1-specific behaviour in
[the FM1 research notes](docs/fm1-research.md). The live effect controls use the documented
24-controller FM1 effects block, with their supported ranges enforced by the editor. The internal
sequencer is being researched through captured fixtures only; it is not yet exposed in the app and
the editor does not send sequencer or other unclassified vendor commands.

## Future development

Future development could add grouped modulation workflows, a focused internal-sequencer editor once
its protocol is proven safe, and device readback if M-VAVE documents a compatible transmit protocol.

## Project structure

```text
src/
├── components/       UI, MIDI controls, and patch-bank components
├── data/             Patch metadata and bundled DX7 factory banks
├── hooks/            Patch-library, MIDI, and FM1 colourway state
├── i18n/             Localisation setup and translated interface/help text
├── lib/              DX7 SysEx parsing, MIDI transfer, and utilities
└── routes/           Application layout, librarian, and voice editor pages
```

## Acknowledgements

The interface links to independent DX7 patch archives to help users find compatible banks. Those downloads are provided by their respective sites; only import files you trust.
