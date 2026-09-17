# Maintaining

Notes for deploying the app and keeping its generated assets and source maps in order. For local
setup and the everyday quality checks, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Deployment security

Cloudflare Pages applies the Content Security Policy in `public/_headers` to every route. The policy
keeps scripts, styles, fonts, images, frames, workers, and network requests self-hosted except for the
Umami tracker, the Umami event endpoint, and the project's Sentry ingestion endpoint. Run
`npm run build` followed by `npm run security:check` after changing the policy or introducing a new
browser resource origin.

## Responsive image assets

The full-size WebPs in `src/assets/` are the source images and the largest browser fallbacks.
Smaller candidates in `src/assets/generated/` are committed build inputs so a normal Vite build
does not depend on platform-specific manual tooling. After changing a source image, run
`npm run images:generate` with the pinned Node/npm toolchain and commit the regenerated candidates.
`npm run images:check` checks the source and candidate dimensions and aspect ratios, verifies each
candidate is a readable WebP, and rejects candidates larger than their source. It intentionally does
not byte-compare newly encoded images because native WebP output can vary by platform. The
post-build check also requires a hashed production asset for every candidate. Do not edit files in
`src/assets/generated/` manually.

## Installed-app icons

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
on a webfont. Every 10 seconds the trace wipes and redraws like a scope beam, taking about a
second; Firefox animates tab icons, while Chromium and Safari show the resting whole trace, and
`prefers-reduced-motion: reduce` holds it still. The launcher icons stay on the plain default,
because an installed app cannot repaint its icon per session.

## Production source maps

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

## Release names

A production build names the deployment it came from, so an event points at an exact revision
instead of one guessed from its date. The name is taken from the first of `SENTRY_RELEASE`,
`CF_PAGES_COMMIT_SHA` and `GITHUB_SHA` that is set, so a Cloudflare Pages deployment needs no
configuration; set `SENTRY_RELEASE` only for a build made somewhere that supplies neither commit.

The same name is given to the client and to the uploaded source maps, so a resolved stack trace is
filed where the event that needs it will look. A build served without any of the variables, such as
a local `npm run build`, reports no release rather than one matching no deployment.

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

## Lighthouse

Run Lighthouse against a production build rather than the Vite development server:

```bash
npm run build
npm run preview:https
```

Then audit the HTTPS URL printed by Vite in a private browser window. The development
server includes React diagnostics, hot reloading, source modules, and unminified
dependencies, so its performance score does not represent a deployed build.
