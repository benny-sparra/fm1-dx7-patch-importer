# Privacy

The M-VAVE FM1 Editor & Librarian runs entirely in the browser. Voices, banks, and settings stay in
browser storage. This page describes the limited analytics and error monitoring used by the deployed
site.

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
described in [the maintainer notes](docs/maintaining.md#production-source-maps) also inject debug
IDs and upload source maps so Sentry can reliably resolve minified stack traces.

A production event also carries the release it came from, which is the deployment's commit
identifier. It describes the build rather than the person using it, and is the same identifier
already published in this repository's history.
