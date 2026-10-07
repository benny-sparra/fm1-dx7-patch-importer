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
- `firmware/index.html`: the static firmware list served at `/firmware/`, a second Vite page.

Use the `@/` alias for cross-directory imports. Use relative imports for a module's immediate local
files when that is clearer.

## Code style

- Follow `.editorconfig` and Prettier: two spaces, single quotes, no semicolons, trailing commas,
  100-column width, and LF endings.
- Let `prettier-plugin-tailwindcss` order utility classes. Add conditional class names through
  `cn(...)`; review formatting changes to conditional strings carefully.
- `cn` only joins class names; `tailwind-merge` was removed to save 8.4 KiB of the initial bundle.
  Two utilities for the same property both stay, and Tailwind's stylesheet order, not their order
  in the call, decides which applies. Give each element one utility per property: choose between
  alternatives with a ternary or a variant, never a base class plus a conditional override. A
  shared component applies its default only when no `className` is passed, as
  `className ?? default`, as `DialogFooter` and `HelpPopover` do. `Button` sets its colours in its
  variant and its dimensions in its size, so a caller picks a variant such as `danger`,
  `ghostDanger`, or `pressed`, or `bare` to style itself, rather than overriding either through
  `className`.
- Prefer small named functions and explicit domain types. Keep state near the behavior that owns it.
- A component takes only the members of `MidiController` or `PatchLibrary` it reads, as a `Pick`,
  as `MidiPanicButton` does. A parent that passes the controller on takes the intersection of its
  children's slices through `ComponentProps<typeof Child>['midi']`, so a child that starts reading
  another member widens every parent with it.
- Keep TypeScript compatible with `verbatimModuleSyntax` and `erasableSyntaxOnly`; use type-only
  imports where required and avoid runtime TypeScript-only constructs.
- Use Lucide icons and the existing components in `src/components/ui/` before adding new UI
  primitives.
- Do not use dangerous lint autofixes. `npm run lint:fix` is the supported autofix command.
- Do not throw from React state updater functions. React runs them during render, so the caller's
  `try/catch` never sees the error. Work out the next state where the caller can catch a failure,
  then set it.
- State that async callbacks must read synchronously has one owner outside React, subscribed with
  `useSyncExternalStore`, as `PatchEditorSession` is for the open editor, rather than each
  `useState` mirrored into a ref by hand.
- Never write a ref during render to keep the latest prop or callback: a render React discards
  still leaves the ref pointing at values that never took effect. Read the latest value from an
  effect or event handler through `useEffectEvent`, as `useKeyboardShortcuts` does. When code
  outside the component reads it, such as a session's async sends, update the ref in a layout
  effect, as `PatchEditorPage` does for its MIDI controller.
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
- Storage and backups keep a workspace bank title to `workspaceBankTitleLength`, so every path that
  sets one, loading a saved bank included, goes through `normalizeWorkspaceBankNameForSave`. A
  title longer in memory than in storage changes when the page reloads.
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
- A looping audition phrase is live MIDI and nothing else: it is never written to the device, and it
  stops rather than moves when the selected output goes away or changes, or the note channel
  changes. It releases its notes through the output and channel it struck them on, before the new
  route takes over. Its notes are sent quietly (`StartNoteOptions`), because logging them several
  times a second would bury everything else in the MIDI log; the log records the phrase starting
  and stopping instead.
- A phrase timer that fires a little late still sends what it missed. Beyond
  `phraseLatenessLimitMs` the phrase player drops the missed notes and rejoins the loop where it
  should be, because a hidden tab holds timers back for up to a minute and the backlog would reach
  the FM1 as hundreds of notes at once.
- **MIDI panic** sends a Note Off for each of the 128 notes on the note channel
  (`sendEveryNoteOff`), because the FM1 takes Control Change only for its effect controllers, so
  All Notes Off (CC 123) never reaches its voices. Do not call the button All notes off, which
  names that message. Anything that plays notes by itself, such as the audition phrase, stops when
  `midiPanicCount` changes rather than striking them again.
- The editor asks which firmware the FM1 runs with the updater's identity query
  (`fm1IdentityQuery` in `src/lib/fm1-firmware.ts`), whenever the output or input in use changes.
  It is the one `00 32` message the editor may send: never send another from that family. The
  firmware counts as unknown until the answer
  for the ports in use arrives. An answer holds only while its ports stay selected: WebMidi hands
  back the same port objects when a device returns, so forget the answer when a port goes away or
  MIDI is switched off, rather than matching it by port identity. FM-1+VA is `FM-1_020` to `FM-1_899`, and Felucca, which names
  release X.Y `FM-1_9XY`, is `FM-1_900` to `FM-1_999`; any other name is unidentified, so no
  firmware's behaviour is assumed for it. Felucca ignores DX7 voice data, Program Change, and the
  effect controllers, so it gets the cautious parameter changes like an unidentified firmware, and
  the badge, firmware setting, and bank instructions say that patches do not reach it. Analytics
  records only the family (`fm1_identified`: `mvave`, `fm1-va`, `felucca`, or `unidentified`),
  once per family per page load so the split counts sessions rather
  than reconnections; the name and version, such as `FM-1_089`, stay out of analytics and
  monitoring, because a release has few enough FM1s on it to single one out.
- Of FM-1+VA's own `F0 43 00 7D` commands, the editor may send only the preset read,
  `7D 10 <slot>` (`readFm1VaPreset` in `src/lib/fm1-va-preset-read.ts`, approved 2026-10-02),
  and only while `readsFm1VaPresets` allows it: FM-1+VA from `FM-1_079`, the release that added
  it. It reads one stored preset and changes nothing. Every other FM-1+VA command, the raw memory
  read `11` among them, needs its own approval recorded here first.
- The preset write, `7D 04 <slot>` (`makeFm1VaPresetWrite` in `src/lib/fm1-va-preset-message.ts`,
  approved 2026-10-03), stores one preset at once, and the FM1 cannot undo it. Send it only while
  `writesFm1VaPresets` allows it (FM-1+VA from `FM-1_079`), only through `useFm1VaPresetWriter`,
  which paces writes as `fm1VaPresetWriteTiming` gives for the firmware: from `FM-1_096`, 320 ms
  apart with no wait for a reply, as tested on hardware on 2026-10-06
  (`docs/hardware-runs/fm1-va-write-timing-2026-10-06.md`); before it, 3 s apart with a 1.5 s
  reply wait, as FM-1+VA's Presets page did. A faster timing for an earlier release needs its own
  hardware run. One preset per message, and never twice for one write. Only the development probe's write timing
  test changes the spacing or the 1.5 s reply wait, through the hook's timing option, and it
  writes presets back exactly as read. Read each preset back with `7D 10` to confirm
  it, and stop at the first that does not read back the same. A write already sent is never
  cancelled; changing the ports cancels only one still waiting its turn. Anything that writes asks
  first, naming every preset it replaces and saying an FM-1+VA backup is the way back. A patch
  without a settings record of its own takes the FM1 slot's stored record, with only the
  library's effects put in it (`fm1VaRecordWithEffects`), so bytes not yet mapped keep the FM1's
  values. The write carries a Virtual Analog patch's voice bytes exactly as read, with its own
  record, as FM-1+VA's own backup restores one; never send them any other way. A DX7 patch never
  replaces a Virtual Analog preset on the FM1, and a Virtual Analog patch whose bytes the write
  would not store exactly (`fm1VaStoredVoice`) is not written. Nothing replaces an 8-Bit preset
  on the FM1, and a patch whose record names 8-Bit is never written.
  A read belongs to the ports it started on: changing either, or switching MIDI off, cancels it.
  Keep what it reads exactly as read until each byte is mapped in `docs/fm1-research.md`.
  Code that reads presets goes through `useFm1VaPresetReader`, which takes the ports from the
  `useMidi` slice it is given, rather than through `useMidi` itself: `useMidi` is in the initial
  bundle, and the read's wiring there cost 1.6 KiB. **Read presets from the FM1…** reads all 128
  presets through it, one at a time (`readEveryFm1VaPreset`), and the development probe uses it
  too. The reply parser takes `unpackSevenBitStream` from `src/lib/fm1-firmware.ts`; when the
  import dialog started reading, that split nothing out of the entry.
- FM-1+VA's sound-setting Control Changes, CC 24–31, 52–57, and 70–78 on the note channel, are
  built only by `makeFm1VaSoundControlMessage` (`src/lib/fm1-va-sound-control.ts`), which refuses
  every other controller, and sent only through `useFm1VaSoundControl` while
  `sendsFm1VaSoundControls` allows it (FM-1+VA from `FM-1_086`, the release that added them). The
  hook lives outside `useMidi`, as the preset reader does, so it costs the entry nothing, and the
  module imports nothing from `src/lib/midi.ts`, so a lazy page can take it. Each is an unsaved
  edit, like turning the knob. CC 85–119 press the FM1's own controls and are never sent. Today
  only the development probe's map sends them.
- Send a patch as a DX7 single-voice dump only to firmware identified as M-VAVE's
  (`sendsSingleVoiceDumps`). FM-1+VA writes a dump straight over the selected stored preset, so
  every other firmware, including one not yet identified, gets the patch as its 155 parameter
  changes, which it holds as an unsaved edit. The bank destination instructions follow the firmware
  too: FM-1+VA asks **Replace Bank A?** starting on bank A, and chooses the bank with ALGORITHM.
  Where `hasFm1VaPresetCommands` allows the preset write (FM-1+VA from `FM-1_079`), **Send to
  FM1** sends no DX7 bank: it opens the write dialog for the one bank (`sendBank`), which chooses
  the FM1 bank in the app and writes only the presets that differ, effects included.
- Clicking a slot in banks A–D sends its Program Change, then the library's voice and effects to
  the edit buffer, because the FM1's stored preset may not match the library and the app cannot
  read it back. Only without SysEx does the click fall back to the Program Change and effects. The
  repeat check covers the program too, since resending it alone would bring the stored preset back.
- Do not resend unchanged data to the FM1 on repeated interaction, such as a double-click. Forget
  what was sent as soon as anything else replaces that device state, and after a failed send.
  The edit-buffer audition compares voice objects by identity, so a library change that puts a
  sound in a slot, such as copying, gives it new voice and effect objects.

### Internationalisation

- English is the dependable eager fallback. Other locales must remain separate dynamic imports.
- English comes in two locales. `en-GB` is complete and every locale falls back to it. `en-US`
  holds only the strings British English spells differently, and i18next's fallback chain reads the
  rest from `en-GB`, so it loads eagerly too (about 200 B). Give every `en-GB` string with a British
  spelling an `en-US` override in the same change; `src/i18n/resources.test.ts` checks. Releases
  before the split stored `fm1-language` as plain `en`, which `resolveLocale` reads as the
  browser's own English.
- Unit tests and Playwright read `en-GB` (`src/test/test-locale.ts`, `playwright.config.ts`), since
  jsdom and Playwright report American English. A test of the American spelling sets `en-US`.
- Resolve and load the initial non-English locale before the first React render; do not introduce an
  English-language flash.
- Load a selected locale before changing language, cache in-flight/completed loads, and prevent an
  older request from winning a rapid sequence of language changes.
- Locale failures must leave a usable current language. Storage access may be absent, invalid, or
  throw.
- Keep `document.documentElement.lang`, the document title, and description metadata synchronized.
- Every locale apart from `en-US` must contain the same leaf keys. Update
  `src/i18n/resources.test.ts` whenever resource structure changes.
- British English keeps the editor's help (`controlHelp`, `effectHelp`, `effectParameterHelp`) in
  `src/i18n/locales/en-GB-editor-help.ts`, out of the entry; other locales keep it in their own
  file. Every module that reads those keys imports `@/i18n/editor-help`, which adds them to `en-GB`;
  `src/i18n/resources.test.ts` checks both. That module reaches `i18next` directly: importing
  `@/i18n` from the editor's chunk made Rolldown split `Button` and Lucide out of the entry, costing
  800 B. Since a test can import an editor module before `@/i18n`, it waits for `initialized`.
- Call the banks the library holds banks, a named copy of one a saved bank, and everything together
  the library. Users never read "workspace" or "browser bank"; code keeps the name workspace bank.
  A bank's title in a sentence goes in quotation marks, as in "Save “Leads”".
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
  `fflate` on bulk export, the saved-bank dialogs when a bank menu opens them, the copy dialog when **Copy to…** opens it, the replace dialog and single-voice file code when **Import patch…** or **Download patch** uses them, the change-to-FM dialog, with the Init voice, when **Change to FM…** opens it, the add-bank dialog when **Add new bank…** opens it, the backup format and restore dialog when **Download backup** or **Restore from backup…** uses them, the FM-1+VA preset file reader, the preset read, and their dialog when **Read presets from the FM1…** or **Import Baud Girl presets file…** opens it, the preset write and its dialog when **Write patches to the FM1…** opens it, the FM-1+VA header photos when the FM1 is identified as running FM-1+VA, the DX7 bank import dialog, with its bank picker, when **Import DX7 bank…** opens it, the duplicate patches dialog and the comparison it runs when **Find duplicate patches…** opens it, and the bank file reader, which splits a file joining several banks, when a bank file is chosen, the piano keyboard dialog, with the audition phrases and their player, when **Keyboard** opens it, the help guide when its **?** button opens it or a first visit opens it itself, the editor's British English help with the Patch Editor, the saved-bank and catalog search results and the catalog's patch names on the first search, locale resources by locale, Sentry on production monitoring startup, and
  factory data only for first-run/recovery or explicit restoration.
- Keep the application shell, `RootLayout`, `LibrarianPage`, patch grid, bank selector, persistence
  status, and essential MIDI controls eager.
- A dialog the librarian mounts on demand opens itself from an effect and takes an `onClose`, rather
  than being rendered always and opened through a `dialogRef`. Unmounting it discards its state, so
  it needs no reset, and `onClose` returns focus to the control that opened it. Making another eager
  dialog lazy no longer frees headroom: Rolldown moves the code it shares with the entry into new
  shared chunks, which the entry still loads, and compressing them separately costs as much as the
  dialog saved. Measure with `npm run bundle:check` before and after any such move. A dialog whose
  own code is large can still pay: the DX7 bank import dialog, once it carried the bank picker,
  freed 1.4 KiB when it became lazy.
- When every name taken from a module is a type, write `import type { A, B }`, not
  `import { type A, type B }`. Under `verbatimModuleSyntax` the second form still emits
  `import '…'`, which keeps the module in the chunk graph: eager code that names a lazy module pulls
  it into the entry, and a lazy chunk that pulls in modules the entry shares can make Rolldown split
  them out of the entry. The saved-bank and catalog search once cost 1.5 KiB of the budget this way.
  `typescript/no-import-type-side-effects` enforces this; mixed value and type imports keep their
  inline `type` specifiers.
- The same holds for values. A lazy chunk that needs a small constant from a large module the entry
  uses takes it from a leaf module both import, as the piano keyboard takes its velocity limits
  from `src/lib/note-velocity.ts` rather than `src/lib/midi.ts`. Importing `midi.ts` itself made
  Rolldown split `fm1-effects` out of the entry and cost 412 B. The other way round, an error class
  eager code recognises lives in a module the entry already holds: `bankErrorMessage` once took
  `Dx7CatalogBankUnavailableError` from `src/lib/dx7-bank-catalog.ts`, which put the whole catalog
  list in the entry for 1.3 KiB, so the class is in `src/lib/dx7.ts`.
- The modules a lazy chunk shares with the entry decide how Rolldown cuts the entry's shared
  chunks, so a new lazy chunk can cost bytes it never loads. The duplicate patches dialog first used
  React, i18next, and `cn` but no Lucide icon, and Rolldown split those out of the chunk holding
  `Button` and Lucide, costing 366 B. Its heading icon put them back together. Measure every new
  lazy chunk with `npm run bundle:check`, and compare the initial chunk list with `main`'s.
- Prefer source-level `import()` at genuine interaction or data boundaries. Do not move initial code
  into eagerly imported vendor chunks to make the entry filename smaller.
  Vite 8 (Rolldown) makes its own shared chunk for React once enough lazy chunks use it; that
  bundler-made chunk is expected, and the budget counts it because the entry imports it.
- Development and verification controls are gated where they are rendered, with a build-time
  constant such as `sentryVerificationEnabled`, so normal production builds leave them out. Define
  the constant in the module that renders the control: Rolldown does not fold one imported from
  another module, so the gated `import()` and its chunk survive. A control is loaded with `lazy`
  behind the gate, as the FM-1+VA preset probe and the Sentry test control are: imported
  statically, the probe gave the entry a path to the preset read, and once the import dialog used
  the read too, Rolldown kept 1.6 KB of it in the entry, although the probe never renders there;
  the Sentry control kept its Lucide icon there.
- A rejected optional chunk must be contained and recoverable; stale deployment chunks must not
  crash the entire application. Every deploy renames every chunk, so a tab left open across a
  deploy cannot load any lazy part it has not loaded yet. When a lazy feature fails to open, explain
  it with `LoadFailedNotice`, which offers the reload that fetches the current deployment.
- Vite's manifest is used by `npm run bundle:check` to follow all transitive static JavaScript imports.
  Dynamic imports are excluded. Do not weaken or bypass the 165 KiB gzip budget; raising it needs
  explicit approval, as the drag-to-bank copy's raise from 148 KiB, workspace backup's raise from
  149 KiB, React 19.3's raise from 151 KiB, the FM-1+VA header photos' raise from 162 KiB,
  reading FM-1+VA presets from the FM1's raise from 163 KiB, and Vite 8.3.2's raise from 164 KiB
  had. Reading presets paid for the read's eager English strings, because every `en-GB` string is
  in the entry, even one only a lazy dialog shows, apart from the editor's help. React DOM ships
  prebuilt with its features switched on, so 19.3's stable View Transitions, Fragment refs, and
  SuspenseList cost about 8.4 KiB whether or not the app uses them; a React upgrade is measured
  like any other change. Vite's `__vitePreload` helper, which every lazy import calls, is in the
  entry too, so a Vite upgrade is measured the same way: 8.3.2's rewrite of its CSS check cost
  61 B gzip when 52 B were spare.
- Do not commit `dist/`, source maps, or one-off bundle-analysis reports.
- The firmware page (`firmware/index.html`) is static HTML and shares no JavaScript with the app.
  Vite splits any module two pages import into a chunk of its own that the app's entry loads too,
  and its module preload polyfill counts: importing the colourway helpers cost the entry 237 B. It
  links its stylesheet (`src/firmware-page.css`, which imports `index.css`) from the HTML and takes
  the editor's finish through `public/firmware-colourway.js`, a plain script served unchanged. Add a firmware as another `<article class="firmware-entry">` whose `id` is its short anchor, such as `felucca` (Baud Girl's is `baud-girl`), linked by the `#` beside its title, which people share, so never rename one; `src/firmware-page.test.ts` checks each
  has its heading, maker, support tag, blurb, sized photo or placeholder, and links. The page is in
  British English only, outside the locale files.

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
- Errors raised by code a host app injects, such as the Android in-app browser's navigation logger
  or an iOS Web MIDI shim's native callbacks, are dropped in `beforeSend`. Match them narrowly, by
  the injected script's URL or the exact names it uses, so an error in the app's own code that
  merely resembles one is still reported. An `unhandledrejection` event another script dispatches
  itself, untrusted and with no `reason`, is dropped the same way: the browser's own always
  carries the reason, so the app's real rejections are still reported. A browser extension's error
  that reaches the page with no stack frame, such as Safari's
  `Invalid call to runtime.sendMessage(). Tab not found.`, is matched by its exact message and the
  absence of any frame, since the app calls no extension API.
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
- Catalog search reads the patch names and voice fingerprints from
  `src/data/dx7-catalog-index.json` rather than the bank files. Run `npm run catalog:index`
  whenever a bank is added, removed, or replaced; `src/data/dx7-catalog-index.test.ts` fails in
  `npm test` while the index is stale. The index stores `voiceFingerprint` values, so changing that
  function means regenerating the index in the same change.
- The bank picker lists catalog groups alphabetically by the name it shows, compared in the
  interface language, so no group is appended at the bottom. A group of banks one person compiled or
  programmed is named for them, as the `mene311` group is, and like product names it is not
  translated.

### Theme and finishes

- The shell is a CRT terminal theme. Colour lives in tokens in `src/index.css`: the `--crt-*`
  palette, the `--fm1-*` aliases that UI code consumes, and one `:root[data-fm1-colorway='…']`
  block per finish. Style components from the aliases rather than hard-coded colours.
- `src/lib/fm1-colorway.ts` is the list of finishes. Adding or renaming one means updating its token
  block, its favicon, its colourway images, and the tests that pair them. Each finish has two
  photos: the stock screen in `src/lib/fm1-colorway-images.ts`, and FM-1+VA's screen in
  `src/lib/fm1-va-colorway-images.ts`, which the header loads and shows only once the FM1 is
  identified as running FM-1+VA. Both sets keep the 923 × 554 size.
- Panels, dialogs, racks, and slots share the bevelled terminal chrome already in `src/index.css`.
  Reuse those classes instead of introducing a parallel surface style.
- A drop shadow is a hard-edged offset with no blur, such as `6px 6px 0`, taken from the
  `--shadow-*` tokens. Blur belongs only to glows, the phosphor and LED light around lit controls.

### UI and accessibility

- Prefer semantic HTML and native dialog behavior. Preserve Escape-to-close, modal semantics, focus
  placement/restoration, and keyboard activation.
- A dialog that opens without a click, as the help guide does on a first visit, checks that it is
  connected and not already open before `showModal()`. Crawlers and extensions can take the page
  out of the document, where `showModal()` throws and the guide would report a failed load.
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
- An on/off choice uses `Switch` from `src/components/ui/switch.tsx`, the slide switch MIDI online
  uses, not a bare checkbox. Whether to include something is its own switch, never a "Don't …"
  option in the dropdown that chooses where it goes or what it comes from, and that dropdown then
  lists only the choices, such as bare bank names under **Import into**. The FM-1+VA import and
  write dialogs make each bank's title the label of a switch at its left (`titleSwitch` on
  `RackPanelTitle`, as in "Import FM1 bank A") and disable the bank's dropdown while it is off,
  keeping its choice for when it is switched on again. The editor's effects and its LFO and
  oscillator sync work the same way: each name is its switch's label, so the switch keeps one name
  in either state. A switch waiting on what it started, as MIDI connecting is, is `busy` and
  blinks; `disabled` only greys it out. A dialog listing several sections that would make it scroll, such as
  the FM-1+VA import's banks, folds each with the editor's rack panel pieces in
  `src/components/ui/rack-panel.tsx`; a control on a title strip sits above its fold overlay.
  `rack-panel` takes its help button as an element (the editor's `RackPanelHelp`) rather than
  importing `HelpPopover`: importing it made Rolldown split the help popover and analytics out of
  the entry and cost 1.35 KiB.
- A dialog built from `Dialog` scrolls only its `DialogBody`, so the title bar and any
  `DialogFooter` stay in view; put scrolling content in the body, never beside it. A dialog's
  actions go in its `DialogFooter`, pinned at the bottom, never at the end of the body: a form's
  submit button there names the form by its `useId` id (`form={formId}`). A list whose rows carry
  their own actions, such as the saved banks, keeps them in the body. The body is
  positioned, so visually hidden text inside stays in it; a folding section inside a dialog wraps
  its contents in a positioned element too, or hidden text in a folded section stretches the body.
- The patch-bank header's **Library actions** menu groups its items under headings only where a
  heading holds more than one item, and keeps each label on one line at the menu's width in
  English. An item has a line under it only to say what its label cannot, such as the SysEx
  download leaving out FM1 effects or the date of the last backup, never to restate the label;
  that line fits one line too, and the item lines its icon up with the label's line
  (`menuItemWithHintClassName`). An item
  that replaces patches, such as **Reset to factory patches…**, goes last in the danger colour,
  as **Delete bank…** does in a bank's menu.
- Reading the FM1's presets and importing Baud Girl's presets file are separate menu items opening
  one dialog in two modes (`source`), so neither mode mentions the other: the read starts as its
  dialog opens, and the file mode opens on its chooser. **Read presets from the FM1…** and **Write
  patches to the FM1…** sit together under **Baud Girl (FM-1+VA)**, shown only while the FM1 runs
  it; the presets file import stays under **Other files**, offered whatever the FM1 runs.
- Name FM-1+VA as Baud Girl's firmware in anything users read, since FM1 owners know it by her
  name rather than its own. Its own name appears only in brackets where people look for it, the
  **Library actions** menu's **Baud Girl (FM-1+VA)** heading, the help guide's heading, and the
  badge's description, and on the link to its site. Where the device itself is meant, say the FM1.
  Code, research notes, and analytics keep the name `fm1-va`.
- Show an error in a dialog or on the page with `ErrorNotice` from
  `src/components/ui/error-notice.tsx`, which is the destructive panel and an alert, rather than
  restyling another paragraph.
- A menu item or button that opens a dialog, a file chooser, or a confirmation ends its label in an
  ellipsis, such as **Save bank…** and **Delete bank…**; the dialog's own title and its action
  button do not, so a menu item that shares their words takes its own string.
- Colour a button by whether the action can be undone. `danger`, solid red, marks only what
  nothing reverses, such as deleting a saved bank or writing presets to the FM1. `destructive`,
  red text, marks what replaces or removes data that Undo brings back, such as deleting a bank or
  copying over a slot. An action that only adds stays plain. A Cancel or Close beside an action is
  `ghost`. A warning about what an action will replace is `WarningNotice`; an error is
  `ErrorNotice`; information the action works around is a plain muted line.
- Confirm an action that finished with a notification (`toast.success`), never a status line on the
  page, as sending a bank to the FM1 does. Show progress on the control that started the action,
  such as the button's working label, and keep only an error the user must act on on the page, in
  an `ErrorNotice`. Never show the same message in both places.
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
- The open editor owns one browser history entry (`useEditorHistoryEntry`), naming the patch it was
  opened on, so browser Back leaves it through the same path as its back button, unsaved-changes
  prompt included, and Forward opens that patch again, sending it to the FM1 as opening it does.
  A patch that is gone by then leaves the patch banks showing. Every way of closing the editor
  removes the entry. Other view state, such as the selected bank, stays out of history
  and the URL: bank letters move when a bank is deleted and the library exists only in this browser.
- Favourites are copies of sounds, kept in the workspace record and the backup file, so they
  outlive the slot they came from. A heart matches by `soundKey` from `src/lib/sound-key.ts`, the
  one source the search's duplicate hiding also uses, so every slot holding the same voice data,
  FM1 effects, and FM-1+VA settings record shows it, and Favourites keeps one copy. Saving a sound in the editor goes through
  `saveSound`, which also updates the copies that sounded the same before the edit: a slot's
  favourite, or every slot a favourite came from. Keep that one change, so one Undo reverses it.
- A patch card leaves room for a full ten-character DX7 name beside its heart and menu at every
  width from 360 px, which `e2e/librarian.e2e.ts` checks. The name font is monospaced, so a name is
  about 93 px; give a new control on the card the room back by tightening the card, not the name.
  Every control on the card is at least 24 px square (WCAG 2.5.8), which the same file checks: the
  heart sits on the slot's own button, so spacing cannot excuse a smaller target.
- Favourites are sent to the FM1 as one 32-voice bank: the first 32, and INIT VOICE after a shorter
  list. Say which before and after sending: in the destination instructions
  (`Fm1BankSelectionDialog`'s `note`) and in the sent message. Written preset by preset on
  FM-1+VA, a shorter list writes only its own presets and leaves the rest of the FM1 bank as it
  is, which the write dialog says before writing.
- Deleting a workspace bank moves every later bank up a letter. Anything that keeps a bank letter or
  slot id across the deletion, such as the selected bank or the lit slot, must follow the move or be
  cleared.
- A patch from FM-1+VA keeps its 59-byte settings record (`src/lib/fm1-va-record.ts`) beside its
  voice and effects, exactly as read, through every path its effects take: copying, moving,
  Favourites, saved banks, backups, and Undo. A path that puts in a voice without one, such as a
  DX7 file or bank, leaves the slot with no record. Importing a preset, from the FM1 or its
  file, takes the library's effects from the record's effect bytes (`fm1VaRecordEffects`, a module
  only lazy code imports); after that the library's effects are the ones the effects panel
  edits, and the record keeps its bytes as read. The bytes the panel cannot set (effect
  order, Envelope, the preset's own Filter, Virtual Analog settings, and bytes not
  mapped yet) come only from the record. Lazy code takes `fm1VaRecordSize` from
  `src/lib/patch-library.ts`, since importing the record module directly gave it a chunk of its own.
- A Virtual Analog preset lives in the snapshot's `virtualAnalog` map, never in `voices`: its 128
  voice bytes exactly as the FM1 reads them back (`isFm1VaVirtualAnalogVoice`), with its record in
  `records`. Every DX7 path reads `voices`, so it meets these slots as empty, which is safe by
  default; a path that should carry them (copying, moving, compacting, saved banks from version 3,
  backups from version 4) handles `virtualAnalog` on purpose. Its slot sends only its Program
  Change, never opens the voice editor, and a DX7 bank, sent or downloaded, gets INIT VOICE in its
  place and says so before and after. Only the preset write carries its bytes to the FM1; never
  normalise, clamp, or send them as a DX7 voice.
  Anything that compares sounds keeps the engines apart: a Virtual Analog preset's sound key is
  `virtualAnalogSoundKey`, and duplicates match only within one engine. **Change to FM…** replaces
  one with INIT VOICE and no record, keeping its FM1 effects, so a write still leaves a Virtual
  Analog preset in that FM1 slot alone. Its card shows `EngineTag`, VA in a small amber box with
  the letters stacked, between its slot code and name, and while the FM1 runs FM-1+VA every FM card
  shows FM in a dim one, search results included. A card that shows a tag names the engine in text
  for assistive technology and on the first line of its tooltip (`banks.engineTitle`). The letters
  stack so the tag is one character wide, and the card made room for it by tightening its gaps,
  never by narrowing the name.
- Record byte 18 names a preset's engine, read only through `fm1VaRecordEngine`
  (`src/lib/fm1-va-engine.ts`): `5A` Virtual Analog, `C3` 8-Bit from `FM-1_096`, anything else FM.
  The library cannot hold an 8-Bit preset yet, since its voice bytes are not a DX7 voice and it has
  no place of its own, so reading or importing presets marks one **8-Bit** and leaves its slot as it
  is, and a write keeps it on the FM1. Never read one as a DX7 voice, which would change its bytes.
- Distortion type is the one record byte the editor changes (38). The editor keeps it after the
  effects in its parameters (`FM1_VA_DISTORTION_TYPE_INDEX`), so undo and compare cover it, and
  saving writes it into the record through `saveSound`, which gives the copies that held the same
  record the new one. No MIDI message carries it, so it is heard only once the patch is written to
  the FM1. The effects panel offers it only while `hasFm1VaPresetCommands` allows the preset
  write, disabled for a patch without a record, which never gains one; on other firmware it names
  a type other than Soft Clip that the patch keeps. Sound starters leave it as it is.
- Bitcrush, FM-1_096's seventh effect, is kept the same way: its switch, Bits, Sample Rate, and Mix
  follow the Distortion type in the editor's parameters (`FM1_VA_BITCRUSH_START`), and saving
  writes record bytes 5, 35, 41, and 44 through `fm1VaRecordWithBitcrush`. That leaves a record
  whose Bitcrush the editor did not change exactly as it was, so a record that never set it keeps
  its `03`; setting it marks it set and writes all three settings, as the FM1 does, keeping its
  place or putting it after the Distortion. The effects panel offers it only while
  `playsFm1VaBitcrush` allows (FM-1+VA from `FM-1_096`), disabled for a patch without a record; on
  other firmware it says when the patch keeps Bitcrush on. It has no FX Channel controller, so it is
  heard only once the patch is written to the FM1.
- The order of the seven effects follows Bitcrush in the editor's parameters
  (`FM1_VA_EFFECT_ORDER_START`), as effect numbers first to last: 0 Filter, 1 Reverb, 2 Delay,
  3 Distortion, 4 Chorus, 5 Phaser, 6 Bitcrush. Saving writes it through
  `fm1VaRecordWithEffectOrder`: the chain bytes take the six other effects and byte 5 Bitcrush's
  place, and a record already in that order, or one whose unset Bitcrush stays after the
  Distortion, keeps its bytes. It is offered with Bitcrush, from `FM-1_096`, the release it was
  mapped on, as a strip of move buttons whose focus follows the moved effect. A move is one undo
  step and sends nothing.
- **Backup** names only this app's own file, which holds FM1 effects and saved banks; **SysEx**,
  `.syx`, patch, and bank name the DX7 files other tools read. **Restore** means restoring a backup
  and nothing else, which is why putting the factory banks back is **Reset to factory patches**.
  Restoring replaces the workspace, which Undo reverses, and only adds saved banks, never
  overwriting a stored one (`addStoredNamedBank`), because Undo cannot reach saved banks.
  FM-1+VA's own file is not a backup in this sense: the app calls it the **Baud Girl presets** file,
  and names the button that saves it, **“Back up everything”** in Baud Girl's Device Manager, only
  in quotation marks, as the site's own label.
- A library change that replaces or removes sounds (deleting a bank, resetting to factory banks,
  restoring a backup, importing or loading over a bank, importing FM-1+VA presets, copying a sound over a slot) offers Undo in its notification through `undoToastOptions`, and a
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
- A dialog built on `Dialog` that a click opens zooms out of the control clicked
  (`src/lib/dialog-zoom.ts`) and stays hidden until the zoom arrives, then shows. It closes back
  into what opened it: the control, or the toggle of the `<details>` menu the control sits in, such
  as a bank's ⋮, since the item goes as the menu closes; failing that, the control focus returns
  to. A dialog that opens by itself, such as the guide on a first visit, does not zoom, and reduced
  motion shows a dialog at once.
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
- Type a MIDI or library fake as the slice the component takes, without `as` or `as unknown as`,
  so a member the component starts reading fails to compile rather than arriving as `undefined`.
  Librarian page tests build theirs with `makeLibrarianLibrary` and `makeLibrarianMidi` from
  `src/test/librarian-fakes.ts`.
- Use deterministic fakes/deferred promises for storage, MIDI, time, imports, and races. Do not use
  real sleeps, network calls, hardware, or test-order-dependent state.
- jsdom has no `matchMedia`, so the editor renders the narrow-window rack and treats motion as
  reduced. A test that stubs `matchMedia` for a width, as the operator table's page tests do, keeps
  `prefers-reduced-motion` matching, or the effect scopes animate without end and the worker runs
  out of memory.
- jsdom takes each history step two timer tasks after `history.back()` or `forward()`, choosing
  its destination in the first, so a second step started between them is measured from the old
  entry and can be lost. A test that steps through history waits for any step the app takes itself
  to land first, as the editor's browser Forward test waits for `history.state` to clear after the
  app takes its entry away.
- A test that runs the real storage module, such as a hook test that follows a saved bank into
  IndexedDB, installs the in-memory database with `installFakeIndexedDb` from
  `src/test/fake-indexed-db.ts`, not `fake-indexeddb` directly. Under jsdom the fake's copies are
  made in another realm and fail `instanceof Uint8Array`, so every stored voice reads as damaged.
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
  - A dialog that opens itself on a first visit, such as the help guide, arrives with its own chunk,
    so a browser journey waits for it and confirms it closed rather than probing its visibility
    once. A single check can run before it opens, leaving it to intercept the journey's first
    clicks, which reads as unrelated flakiness.
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
npm run test:coverage
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
need permission in a restricted environment. It drives the production page directly and is not part
of `npm run check`, so a change to anything it reads, such as a dialog that now mounts on demand,
updates `scripts/check-layout-shift.mjs` in the same change.

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

`npm run deps:audit` runs `scripts/check-dependency-audit.mjs`, which fails on any high or critical
advisory missing from its `auditAllowlist`. `npm run deps:audit:prod` is plain `npm audit` and is
never filtered. An advisory may join the allowlist only with the user's approval, only when no
patched release of the package exists, and only when `npm run deps:audit:prod` does not report it.
Its entry records the GHSA id, the package, the advisory's exact range, the package's latest
published version, a review date no more than three months ahead, and how the repository reaches
it. The script fails when the range changes, a newer version is published, the review date passes,
the advisory reaches production, or the advisory is no longer reported; then look for a fix, run
`npm run lockfile:refresh` and remove the entry, or ask the user before renewing it. Never point an
`overrides` entry at an unreleased fix, such as a git branch.

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

The audition phrases behind the on-screen keyboard's **Play** are not part of this feature and must
not grow into it. They are a fixed, bundled table in `src/lib/audition-phrases.ts`, played live by
`src/lib/phrase-player.ts` while a patch is edited. They stay unwritable and unrecordable: no
editing, no saving, no transfer to the device, and no phrase that quotes an existing recording.

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
