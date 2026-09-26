# Feature backlog

Candidate features for the editor and librarian, ranked by value for effort. Tick an item when it
ships, and move anything rejected to [Decided against](#decided-against) with the reason.

This list is for work that needs no new FM1 protocol. Protocol-backed work, such as the sequencer
and slot-addressed bank writes, stays in [the roadmap](fm1-roadmap.md).

Every item follows [`AGENTS.md`](../AGENTS.md): strings in every locale, one undo step for
multi-parameter edits, tests in the same change, and the legacy-data rules for anything stored.

## Housekeeping

- [x] **Fix the stale bank transfer status claim.** The README still lists "track whether a bank is
      local, transferred, or changed since transfer", but that status was removed in `14d3618`. The
      locale keys `banks.localOnly`, `banks.transferred`, and `banks.changed` are now unused in every
      locale. Either remove the README line and the keys, or restore the feature on purpose (see
      [Bank transfer status](#bank-transfer-status)).

## Worth doing

- [x] **Effect presets.** A presets menu in each effect's box on the effects panel, like the pitch
      envelope presets, that sets that FM1 effect (filter, reverb, delay, distortion, chorus, phaser)
      without touching the DX7 voice or the other effects.
  - Keep the table in `src/lib/`, separate from `sound-presets.ts`, which changes the whole voice.
  - Values stay within the documented ranges in `src/lib/fm1-parameters.ts`. Hardware scaling and
    display units are still unconfirmed for most controls (see `docs/fm1-research.md` §7), so name
    presets by character ("Small room", "Slapback", "Warm drive") rather than by claimed values,
    and keep values away from the ends of each range.
  - A preset sets every one of its effect's controls, so applying it always gives the same sound.
    The menu is disabled while the effect is bypassed, like the effect's other controls. Each box
    already has an on/off button, so there is no "Dry" preset.
  - Applying a preset is one undo step and sends that effect's four controls once. Choosing the
    preset that is already applied sends nothing.
  - Tests: a `src/lib/` table test (unique ids, values in range, only its own effect), a rendered
    one-undo test, and the preset names in every locale.
  - Build it in phases, starting with the effects whose result is easiest to recognise by ear. Each
    phase ships only after its presets have been listened to on an FM1, using the matching effect
    block in `docs/fx-003-hardware-verification.md`, with the observations recorded there.
    1. **Space: reverb and delay.** Builds the menu, the table, the send, and the one-undo apply,
       with _Small room_, _Large room_, _Small hall_, _Large hall_, and _Plate_ for reverb and
       _Slapback_, _Quick delay_, _Quick repeats_, and _Echo_ for delay. Small room, Large hall, and
       Plate were heard on an FM1 on 2026-09-16 and matched their names and the room/hall/plate
       order. Listening also found that a higher delay Rate repeats faster, the reverse of the
       editor's assumption, so the delay scope and every delay preset rate were flipped. Every preset
       was then heard on an FM1 on 2026-09-16 (`docs/fx-003-hardware-verification.md` §8).
    2. **Movement: chorus and phaser.** _Subtle chorus_, _Ensemble_, _Chorus wash_, and _Shimmer_
       for chorus and _Gentle phase_, _Slow sweep_, _Deep phase_, and _Fast swirl_ for phaser.
       Chorus and phaser Frequency were heard to speed up as they rise before these were built.
       Built, and every preset heard on an FM1 on 2026-09-16 (`docs/fx-003-hardware-verification.md` §8).
    3. **Tone: filter and distortion.** _Warm_, _Muffled_, _Telephone_, _Thin_, and _Resonant_
       for the filter and _Light drive_, _Warm drive_, _Crunch_, and _Fuzz_ for distortion. Filter
       Cutoff, Resonance, and distortion Tone were heard to go the editor's way before these were
       built. Distortion gain and filter resonance can jump sharply in level, so check the loudest
       preset at a safe listening volume. Built, and every preset heard on an FM1 on 2026-09-16 (`docs/fx-003-hardware-verification.md` §8).
  - Presets that combine effects, such as a phaser over a small reverb, are not planned: set one
    effect's preset, then another's.
  - Later, once [effect routing order](#effect-routing-order) is known, the routing could have
    presets of its own.

- [x] **Copy and paste operators.** Copy one operator's settings (frequency, envelope, output level,
      keyboard scaling, sensitivity) to another operator, or to an operator in another voice.
  - Paste is one undo step and sends the changed parameters live.
  - Decide whether the clipboard survives leaving the editor. Keep it in memory, not storage.
    Decided: the app keeps the copied operator in memory until the tab closes, so it can be pasted
    into another voice. Copy and Paste sit in a ⋮ menu in the open operator's header, and paste includes output
    level.
  - Tests: a rendered paste that reverses in one undo, and pasting into another voice.

- [x] **Compare with saved.** A button in the editor that switches between the working copy and the
      saved version, sending each to the FM1 so the difference can be heard.
  - Comparing never changes the working copy or the undo history.
  - Editing while showing the saved version needs a clear rule: return to the working copy first,
    or disable the controls. Decided: while the saved version shows, the controls, presets, undo,
    save, and back are disabled, and a notice says why. Compare is offered only with unsaved edits.
  - Do not resend when the selected version has not changed.

- [x] **Copy patches between banks.** "Copy to…" in a slot's menu copies it over a chosen slot in
      any bank that has sounds, or dragging it onto a bank tab.
  - Choose the target slot, and confirm before overwriting a populated slot.
  - Copies the patch's FM1 effects with the voice.
  - Offer Undo in the notification through `undoToastOptions`.

- [x] **Single-voice `.syx` import and export.** Load and download one DX7 voice (the 163-byte
      single-voice dump) as well as 32-voice banks. Built as **Import patch…** and
      **Download patch** in a slot's ⋮ menu; a replaced slot's FM1 effects return to their defaults.
  - Apply the same rules as bank import: header, length, 7-bit data, and checksum, with translated
    errors.
  - Importing into a slot replaces a sound, so confirm first and offer Undo.
  - Export contains voice data only, as bank export does.

- [x] **Firefox support.** Let desktop Firefox users connect to the FM1, not just Chrome, Edge, and
      Opera users.
  - Firefox has Web MIDI, but grants it through its own site permission prompt rather than
    Chromium's. Confirm on current desktop Firefox that `requestMIDIAccess({ sysex: true })` works
    through that flow and that bank transfers and live edits reach the FM1 on hardware. Firefox 156
    on macOS connected with SysEx enabled on 2026-09-16, and slot sends, live voice and effect
    edits, and a full bank transfer all reached the FM1. Declining the site permission add-on shows the
    translated blocked-access message.
  - `src/lib/browser.ts` blocks every non-Chromium browser. Base the check on Web MIDI itself
    rather than the browser name, keeping the mobile and insecure-page rules, and update
    `browser.test.ts`.
  - The unsupported-browser and connection messages (`unsupportedBody`, `requires`,
    `unsupportedBrowser`) name Chromium browsers. Reword them in every locale, and explain a denied
    or dismissed Firefox permission prompt with a translated message.
  - Add a Firefox project to the Playwright journeys, and update the README requirements,
    `docs/user-guide.md`, and `CONTRIBUTING.md`.
  - Check Firefox-only differences in layout, fonts, native dialogs, drag-and-drop reordering, and
    app installation, which Firefox does not offer.

- [x] **Workspace backup and restore.** Download one file holding the workspace banks, each patch's
      FM1 effects, and the saved banks, and restore from it. Every download today (patch, bank, and
      the all-banks `.zip`) is DX7 voice data only, so FM1 effects and saved banks exist nowhere
      but browser storage, and clearing site data loses them.
  - The file is a new public format from its first release: a versioned record with an upgrade
    path on read, and a fixture test for version 1 in the same change, under the legacy-data rules
    in `AGENTS.md`.
  - Check voice data at the same boundary as `.syx` import (reject bytes above 7-bit, normalise on
    read) and give every failure a translated error.
  - Load the backup code when a backup or restore starts, like `fflate` for bulk export.

  **File format.** JSON with base64 voice and effect bytes, not a zip. A full workspace is ten
  banks of thirty-two 128-byte voices plus their effects, so even a heavy backup is a few hundred
  kilobytes and base64's third again on top does not justify a container. Plain JSON stays
  inspectable and recoverable by hand, which matters for what may be the user's only copy.

  ```
  { "format": "fm1-librarian-backup", "version": 1, "savedAt": "<ISO>",
    "workspace": { "workspaceBanks", "loadedBanks", "bankNames", "bankDescriptions",
                   "slots": [{ "id": "A01", "voice": "<base64>", "effects": "<base64>" }] },
    "savedBanks": [{ "id", "name", "description", "createdAt", "updatedAt",
                     "slots": [{ "slot": 1, "voice": "<base64>", "effects": "<base64>" }] }] }
  ```

  Version the file independently of `StoredPatchLibrary.version` and `NamedBank.version`. They
  change for different reasons, and coupling them forces a file-format bump whenever the IndexedDB
  record shifts.

  **The two halves restore differently, because undo cannot cover both.** `undoChange` works on the
  library snapshot history in `src/hooks/use-patch-library.ts`; saved banks are separate IndexedDB
  records written through `saveStoredNamedBank` and are not in that history. One Undo therefore
  cannot reverse a saved-bank write, and `AGENTS.md` forbids promising an undo the app does not
  offer. So:
  - The workspace is **replaced**, through the normal snapshot path, and Undo reverses it with
    `undoToastOptions` exactly as importing over a bank does.
  - Saved banks are **merged and additive**: a bank whose `id` is not already present is added, an
    id already present is skipped and counted in the result. Nothing is overwritten, so nothing
    needs undoing. This also settles the earlier merge-or-replace question in the direction that
    cannot lose data.
  - The confirmation dialog states what happens to each half, so the asymmetry is visible before
    the user commits.

  **Validation** reuses the existing boundaries rather than adding new checks:
  `normalizeStoredDx7Voice` for voices, which enforces the 128-byte length and 7-bit data;
  `normalizeFm1Effects` for effects; `validateNamedBank` for each saved bank; and
  `isWorkspaceBankId`, `maximumWorkspaceBanks`, `workspaceBankTitleLength`, and
  `bankDescriptionLength` for the bank metadata. Failures carry a typed `problem` code like
  `Dx7BankFileError` and are translated. Check the file size before reading it, as
  `readDx7BankFile` does. A damaged saved bank inside an otherwise good file is skipped and
  reported, matching `listStoredNamedBanks`.

  **UI.** Backup is workspace-wide, so it belongs in the header ⋮ menu beside **Download all banks
  (.zip)** rather than a bank or slot menu — but that menu is where the wording gets dangerous, and
  the naming has to be settled before this is built. See
  [Separating patch files from backups](#separating-patch-files-from-backups).

  - Tests: a round trip, a version 1 fixture, a damaged file reaching the UI as translated text, a
    rendered restore that reverses in one undo, a voice with a byte above 7 bits rejected, and a
    file with one damaged saved bank importing the rest.

- [ ] **Multi-bank `.syx` import.** DX7 archive collections often join several 32-voice dumps in
      one file, which bank import refuses today. Split the file into its banks, show each with its
      first few patch names, and import the one chosen.
  - Each bank passes the existing checks: header, length, 7-bit data, and checksum.
  - A file with some damaged banks lists the readable ones and reports the rest, as saved banks
    do, rather than rejecting the whole file.
  - Importing over a populated bank keeps its confirmation and Undo. Update the SysEx
    compatibility section of `docs/user-guide.md`.

- [ ] **Hear a `.syx` file before importing it.** Choosing a bank or patch file lists its patches,
      and clicking one plays it through the FM1 edit buffer, as a search result does, before
      anything in the library changes. Today **Import bank** asks only which bank to replace, so
      the only way to hear an archive bank is to import it over one of yours and undo.
      [FM-1 Utility](https://fm1-utility.pages.dev/) offers this as a cartridge browser, with an
      option to play each patch as it is selected.
  - Playing a patch never writes to the library or to FM1 storage; the FM1 effects are the
    defaults, as for a catalog result. Reuse `auditionInEditBuffer` and its duplicate-send guard,
    so each parsed voice keeps one object while the dialog is open.
  - The listing is the natural home for [Multi-bank `.syx` import](#worth-doing): a file holding
    several banks shows each with its patches. Build them together, or leave room for it.
  - Keep the existing file checks, confirmation, and Undo for the import itself. Check whether the
    dialog stays a lazy chunk and measure with `npm run bundle:check`.
  - Tests: playing a patch sends it to the edit buffer and leaves the library unchanged, playing
    the same patch twice sends once, and closing without importing changes nothing.

- [x] **Velocity on the on-screen keyboard.** The keyboard always strikes at velocity 96
      (`defaultNoteVelocity` in `src/lib/midi.ts`), so an operator's velocity sensitivity, which
      the editor explains, cannot be heard without a hardware keyboard. Add a velocity control to
      the keyboard dialog, as [FM-1 Utility](https://fm1-utility.pages.dev/) has. Built as a
      **Level** slider beside the keyboard's title. The label avoids the technical word; the
      operator's own setting keeps the name **Velocity**.
  - Keep the control to 1–127; `sendNoteOn` already takes a velocity. Played notes use it; the
    audition phrases keep the velocities they are written with. Decided: the limits are
    `minNoteVelocity` and `maxNoteVelocity`, with `defaultNoteVelocity` in
    `src/lib/note-velocity.ts`, and `sendNoteOn` keeps accepting 0, as its tests expect.
  - Decide whether the setting survives closing the dialog. Remembering it across visits means a
    new `localStorage` key, which becomes a public format under the legacy-data rules; keeping it
    in memory for the tab needs none. Decided: in memory. The dialog stays mounted once first
    opened, so the setting lasts until the tab closes with no stored key.
  - Its accessible name and value text come from the locale files, and a keyboard change to it
    must not play notes: the dialog claims plain keys for the piano.
  - Tests: a note played after changing velocity sends that velocity, and the phrase velocities
    are unchanged.

- [x] **Drag a patch onto a bank tab.** Finishes [Copy patches between banks](#worth-doing):
      dropping a patch on a bank tab opens **Copy to…** with that bank chosen, so the overwrite
      confirmation and Undo stay in one place.
  - The ⋮ menu stays the keyboard route. Dropping on the patch's own bank is ignored or picks a slot
    as the dialog does today. Decided: it is ignored, and a keyboard drag never reaches the tabs,
    so the arrow keys keep reordering within the bank. Only banks with sounds take a drop, matching
    the dialog's bank tabs.
  - Cover the drop in Playwright; jsdom cannot check dragging onto another element.

- [x] **Search everywhere.** Extend the librarian search beyond loaded workspace banks to saved banks
      and the bundled catalog, and play a result through the FM1 edit buffer. This reverses the
      decision recorded under [Search across all banks](#nice-to-have): results that are not slots
      get their own grouping and actions, and the catalog is searched through a small generated
      index loaded on demand, so the initial bundle is unaffected.
  - Decided: every search looks everywhere; a toggle to widen it was built and dropped as
    unnecessary. Matches in the user's own banks keep their slots under **Your patch banks**;
    saved-bank and catalog matches follow under **Saved banks** and **Other DX7 patch banks**, 60 per
    group until the search narrows. The search field is labelled just **Search**.
  - A saved-bank result plays with its stored FM1 effects and a catalog result with the defaults,
    through `auditionInEditBuffer` in `src/App.tsx` and its duplicate-send guard. Each search
    caches the catalog banks it fetches, so a result played twice is the same voice object.
  - **Copy to…** puts a result in a workspace slot through `replaceVoice`, with the existing
    confirmation and Undo. Double-clicking a result, or Enter on the one just played, opens the
    same dialog as **Replace … and edit** and then the editor on the copy, since a result has no slot
    to edit. Dragging a result onto a bank tab is not built; add it if asked.
  - The index is `src/data/dx7-catalog-index.json`, written by `npm run catalog:index`. Its check is
    `src/data/dx7-catalog-index.test.ts`, a Vitest file snapshot that fails in `npm test` while the
    index is stale, rather than a separate `--check` script. The results component, the search code,
    and the index load on first use; the props and strings cost well under 1 KiB of the initial bundle.
  - Decided: duplicates are hidden. A saved-bank or catalog result that plays exactly like one
    listed above it (the same 128-byte voice data, name included, and the same FM1 effects, with a
    catalog patch taking the defaults) is left out, and a line under the group says duplicates aren’t shown.
    The first of several catalog copies stays, and same-name patches whose data differs all show.
    The catalog index carries each voice's 53-bit fingerprint (`voiceFingerprint`), ready for
    [Find duplicate patches](#nice-to-have).

## Nice to have

- [ ] **Receive a DX7 voice over MIDI.** Offer to place a standard DX7 single-voice dump arriving at
      the MIDI input, from Dexed, a DX7, or another editor, into a chosen slot, with the same checks
      and confirmation as **Import patch…**.
  - This is standard Yamaha SysEx, not FM1 readback, which stays unsupported. Nothing is taken
    without the user asking: listen only while a receive dialog is open, and ignore everything
    else arriving at the input.
  - Validate length, header, 7-bit data, and checksum at the boundary, and drop the listener when
    the dialog closes, MIDI goes offline, or the input changes.
  - Tests use captured fixtures and a fake input; no hardware or permission.

- [ ] **Share a patch as a link.** **Copy share link** in a slot's ⋮ menu copies a URL that carries
      the patch in its fragment (the part after `#`), so someone else can open it in their own
      library. The fragment never reaches a server, so this needs none: it is not the rejected
      [Online sharing or accounts](#decided-against).
  - The link carries the 128-byte packed voice, which includes the name, and the patch's FM1
    effects, base64url encoded: a couple of hundred characters. Tag it with a format version, such
    as `#patch=1.<data>`. Links outlive releases, so from its first release this is a public format
    under the legacy-data rules in `AGENTS.md`, with a fixture test for version 1.
  - Opening a link never writes anything by itself. It opens the **Import patch…** flow with the
    patch shown, the user picks a slot, and overwriting keeps its confirmation and Undo. Clear the
    fragment with `history.replaceState` once it is read, so a reload does not ask again.
  - Validate at the same boundary as `.syx` import: length, 7-bit data, and effect ranges. A bad
    or truncated link reaches the UI as a translated error, not a raw message.
  - The fragment holds a user-authored patch name. Confirm that Umami and Sentry drop fragments,
    which `AGENTS.md` already requires, and add a test that a shared link is not reported.
  - Links name the deployed domain, so moving the site breaks them unless the old domain redirects
    and keeps the fragment.
  - Tests: a round trip, the version 1 fixture, a malformed link reaching the UI translated, a byte
    above 7 bits rejected, nothing written without confirmation, and one-step Undo.

- [ ] **Find duplicate patches.** List patches in loaded workspace banks whose voice data is
      identical, with a way to jump to each copy, so imported archives can be tidied.
  - Read-only: it never deletes or changes a slot. Compare packed voice bytes; say in the UI
    whether names and FM1 effects are part of the match.

- [x] **Search across all banks.** The librarian's search box finds a patch in every loaded
      workspace bank, and clicking a result plays it while the results stay up.
  - Decided: saved banks and the bundled catalog are left out. Searching them would need results
    that are not slots, and loading the catalog would weigh on the initial bundle. Choosing a bank
    clears the search; clearing it returns to the bank of the last result played. A lone letter
    matches names only, and a slot code matches only as the whole query.

## Open questions

### Syncing patches with the FM1

Keeping the browser library and the hardware in step — showing what differs, and reconciling it —
is the feature this librarian would most like to offer. It is blocked, and the blocker is one
direction of traffic rather than any amount of UI work.

Checked again on 2026-09-20 against both upstream sources:

- [AL-255/FM-1-RE](https://github.com/AL-255/FM-1-RE) `docs/io/05-midi.md` documents inbound paths
  only: UART RX DMA, USB EP4 OUT, and BLE-MIDI feeding parse and dispatch. Its MIDI output section
  covers note events, not patch data. The repository's subject is architecture, boot chain, and the
  OTA update protocol, all host to device.
- [KingParamount/fm1-factory-presets](https://github.com/KingParamount/fm1-factory-presets) states
  the FM-1 receives SysEx but never sends it, and the only device-to-host messages in its capture
  are identity replies and acknowledgements.

Both match [research 6.3](fm1-research.md#63-updater-preset-restore-over-manufacturer-id-00-32),
whose open question 9 — whether the `00 32` family offers a read or bulk-dump request at all — is
still unanswered. The research has not moved on readback; it never had it.

Only one direction exists:

- **Browser to FM1** works today through standard DX7 bank dumps, and the `00 32` capture suggests a
  better path in [slot-addressed voice-bank write](fm1-roadmap.md), parked as Dangerous / excluded
  because the capture came from an updater build that downgrades firmware.
- **FM1 to browser** has no known mechanism. It is absent from every capture taken, not merely
  undocumented.

Without readback there is nothing to diff, no drift to detect, no merge to perform, and no way to
confirm the device holds what was sent. A one-way push with delivery confirmation is the most that
the known protocol could ever support, and that is parked. This is the same limitation that
[Bank transfer status](#bank-transfer-status) runs into: anything claiming to describe the hardware's
contents can only report what this browser last sent.

It also sets the terms for [Workspace backup and restore](#worth-doing). Because the FM1 can never be
read back, the browser is the only copy of a patch that exists, which makes the backup file the sole
protection against losing everything rather than a convenience.

Reopen only if a stock-safe read or bulk-dump request is identified and recorded in
`docs/fm1-research.md`. Do not probe for one by sending unknown command IDs.

### Bank transfer status

A per-bank "Local only / Transferred / Changed" marker existed and was removed in `14d3618`. Before
bringing it back, find out why it was removed. Without device readback it can only report what this
browser last sent, never what is on the FM1, so its wording must not suggest the two are in sync.
A full sync workflow with confirmation prompts was judged too complex for what it can promise.

### Separating patch files from backups

**Settled 2026-09-21** with [Workspace backup and restore](#worth-doing):

- **Backup** names only the app's own file, never export or download; **SysEx**, `.syx`, patch, and
  bank stay on the DX7 side.
- **Restore all banks** became **Reset to factory patches…**, so _restore_ means a backup alone.
- The header ⋮ menu names each group for who the file is for, not its format. **Full backup** comes
  first, because the backup is the only copy of FM1 effects and saved banks: **Download backup**,
  with a line saying it includes FM1 effects and when this browser last made one (the
  `fm1-last-backup` key), then **Restore from backup…**. **For other DX7 tools** follows, with
  **Download SysEx banks (.zip)** and a line saying it holds DX7 data only, no FM1 effects.
  The factory reset sits below a divider. A backup dialog with a tab for the DX7 export was
  considered and rejected: tabs hide the comparison the menu needs to show, and add a click to the
  action people should take most.
- The persistence warning also offers **Download backup** while browser storage is not keeping the
  workspace, which is when a backup matters most. There is no permanent storage area to put it in.

### Audio preview in the browser

A DX7 engine running in the browser, such as the Dexed engine that WebDX7 builds to WebAssembly,
would let a patch be heard without the FM1: auditioning an imported or catalog bank before sending
it, using the librarian with no device connected, and in Safari, which has no Web MIDI. Other DX7
tools offer this, and a DX7-profile offshoot of this editor would need it to compete with Dexed.

**Doubtful for the FM1 app**, for two reasons:

- It cannot play the FM1's effects. Most FM1 patches rely on them, so the preview would sound drier
  and plainer than the device. Rebuilding them in Web Audio would only be a guess, because their
  hardware scaling is still unconfirmed (see `docs/fm1-research.md` §7).
- The FM1's engine may not render a voice the way a DX7 emulation does, and nothing yet measures the
  difference. A preview that sounds unlike the device misleads the person choosing a patch.

Before deciding, settle:

- **Fidelity.** Record a spread of patches from the FM1 with effects bypassed, and compare them
  with the same voices in the candidate engine. If they differ audibly, drop the idea for the FM1
  app.
- **Labelling.** Whether a "DX7 preview, without FM1 effects" label is honest enough, or whether any
  preview beside a connected FM1 invites confusion.
- **Licensing.** Dexed is GPL-3 and its original engine (MSFA) Apache-2.0, as understood; check
  both. The repository is MIT-licensed (see `LICENSE`), which decides what can be embedded.
- **Cost.** Load the engine only when preview is first used, to stay inside the 162 KiB budget. The
  CSP in `public/_headers` would need `wasm-unsafe-eval`, with `scripts/check-security-headers.mjs`
  updated and a security review. Audio needs a user gesture to start.

If it goes ahead, the natural entry is the piano keyboard: with MIDI offline, its notes play the
preview.

### Effect routing order

The FM1 is believed to let the order of the effects chain (filter, reverb, delay, distortion,
chorus, phaser) be changed, for example putting distortion before or after the filter. An editor
control for this, such as a reorderable list on the effects panel, would make that easy to try.

This is not yet non-protocol work. The published CC map covers only CC 0–23 (the per-effect
switches and parameters), and `docs/fm1-research.md` lists interaction/routing as unconfirmed on
V15. Before it can be built:

- Find how routing order is set: a documented CC, an FM1 menu setting, or vendor traffic. Follow
  the hardware research discipline in `AGENTS.md` and record the result in `docs/fm1-research.md`.
  Do not send guessed CCs or vendor command IDs.
- Confirm by listening that order actually changes the sound, using the cross-block order test in
  `docs/fx-003-hardware-verification.md`, and find whether the order is per patch or global, and
  whether it persists.
- Once known, move the item to [the roadmap](fm1-roadmap.md) or into [Worth doing](#worth-doing).
  If order is per patch, storing it is a new field in the saved effect state, which must follow the
  legacy-data rules (optional on read, default to the stock order).
- It pairs with [Effect presets](#worth-doing): the routing could have presets of its own.

**Parked 2026-09-16.** What a first look found:

- M-VAVE's [FM-1 MIDI Control guide](https://www.m-vave.com/download) documents only FX CC 0–23,
  the note-channel messages, System Real-Time, and the Yamaha single-parameter SysEx. It has no
  effect-order CC or SysEx.
- [FM-1-RE](https://github.com/AL-255/FM-1-RE/blob/main/docs/io/05-midi.md#7-cc-map-6-slots)
  shows six FX slots processed by `fx_chain_process`, each holding an effect group at
  `ENG+5791+i*3`, and the CC handler finds an effect's slot by searching that table (medium
  confidence). That indirection suggests order is stored device state rather than a CC, and that
  CC 0–23 would still reach the same effect after a reorder. Nothing found writes the table.
- The FM1's own menus do not appear to offer effect ordering, so there is no stock operation to
  capture. The only remaining route would be an unidentified `F0 35 59` vendor command, which stays
  Dangerous / excluded.

Reopen only if a stock control or an official M-VAVE app is found that changes the order.

### MIDI clock and transport

A tempo control with Start and Stop, sending MIDI clock (`F8`) at a chosen BPM with Start (`FA`),
Continue (`FB`), and Stop (`FC`), would let the editor run the FM1's arpeggiator or sequencer from
the browser. This is standard System Real-Time MIDI, not vendor protocol, and M-VAVE's MIDI Control
guide lists System Real-Time among what the FM1 receives.

[FM-1 Utility](https://fm1-utility.pages.dev/) ships this (seen 2026-09-25), telling the user to
choose arp or sequencer mode on the FM1 itself. It sends Stop five times over half a second (at 0,
50, 125, 250, and 500 ms), which suggests its author saw the FM1 miss a single Stop. It cites no
evidence that the FM1 follows the clock.

Whether it does is unknown: [research §4.5](fm1-research.md#45-external-control) finds no
clock-follow or Start/Stop handler in the firmware, and §4.6 lists the hardware test. Before this
can be built:

- Run §4.6 test 1 with Sync on and off: does the arp, and the sequencer, follow external tempo, and
  do Start, Continue, and Stop start, resume, and stop it? Check whether one Stop is reliable, or
  whether a repeated Stop is needed and harmless. Record the result in `docs/fm1-research.md`.
- If the FM1 follows the clock, move this into [Worth doing](#worth-doing). Browser timers drift,
  and a hidden tab holds them back, so the clock needs the same lateness handling as the audition
  phrase player (`phraseLatenessLimitMs`), and it must stop when the output changes or MIDI is
  switched off, as the MIDI rules in `AGENTS.md` require. MIDI panic stops it.
- If it does not, record that here and move this to [Decided against](#decided-against).

It does not reopen the parked sequencer: starting the FM1's own pattern is not writing one.

## Decided against

- **Tags, ratings, and favourites.** New stored fields to support forever, for little benefit with
  32-slot banks.
- **Vary the current voice.** Small random changes around the current sound, beside Randomise.
  Too close to voice morphing, and Randomise plus undo already covers exploring.
- **Online sharing or accounts.** Needs a server and conflicts with the client-only design and the
  privacy rules.
- **Voice morphing, and sequencer features beyond the FM1's own model.** Out of scope; the sequencer
  follows [the roadmap](fm1-roadmap.md).
- **Download a bank's patch list.** A printed slot list only helps at the FM1 without the browser,
  where the device already shows patch names; with the browser open, the patch grid and
  [Search across all banks](#nice-to-have) find a patch faster. Not worth a permanent bank-menu
  entry, strings in every locale, and CSV quoting to keep correct.
- **Paste part of an operator.** **Paste operator** already covers the case that came up, and
  pasting only an envelope or only a frequency was never asked for. Add it if someone asks.
