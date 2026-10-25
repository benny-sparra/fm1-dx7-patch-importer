# Feature backlog

Candidate features for the editor and librarian, ranked by value for effort. Tick an item when it
ships, and move anything rejected to [Decided against](#decided-against) with the reason.

This list is for work that needs no new FM1 protocol. Protocol-backed work for M-VAVE's firmware,
such as the sequencer and slot-addressed bank writes, stays in [the roadmap](fm1-roadmap.md). Work
for the FM-1+VA replacement firmware, most of which needs that firmware's own commands, is planned
in [FM-1+VA firmware](#fm-1va-firmware).

Every item follows [`AGENTS.md`](../AGENTS.md): strings in every locale, one undo step for
multi-parameter edits, tests in the same change, and the legacy-data rules for anything stored.

## Housekeeping

- [ ] **Name Vivaldi among the browsers that work.** Issue 334 reports the editor works perfectly
      in Vivaldi. No code needs to change: `isUnsupportedBrowser` accepts any browser that offers
      Web MIDI, whatever its name. Only the lists that name browsers leave it out: the tables in
      the README and `docs/user-guide.md`, which leave out Opera too, the unsupported-browser
      messages in `en-GB.ts` (one names Opera, the other does not), and the guide's warning in
      `en-GB-help.ts`. Add Vivaldi and Opera to both tables as desktop browsers, name them in each
      message, and change the strings in every locale. Name only browsers someone has seen drive
      an FM1, as Vivaldi has now, never a browser just because it is built on Chromium. Ranked
      first because it is a few strings and answers a user directly.

- [x] **Stop cutting off port names in Settings.** On macOS the closed **Output** and **Input
      monitor** lists show "USB Composite Dev", cut without an ellipsis (seen 2026-09-29). Let the
      name wrap or end in an ellipsis, with the full name in its title, at every width from 360 px.
      _Done:_ the two lists take the panel's full width, a longer name ends in an ellipsis, and the
      selected port's full name is the list's tooltip; `e2e/midi.e2e.ts` checks the macOS name at
      1280, 768, and 360 px.

- [x] **Fix the stale bank transfer status claim.** The README still lists "track whether a bank is
      local, transferred, or changed since transfer", but that status was removed in `14d3618`. The
      locale keys `banks.localOnly`, `banks.transferred`, and `banks.changed` are now unused in every
      locale. Either remove the README line and the keys, or restore the feature on purpose (see
      [Bank transfer status](#bank-transfer-status)).

## Worth doing

- [ ] **Stock firmware V16 (`FM-1_016`).** M-VAVE published it on 2026-10-21 (forum topic 23,
      "FM-1 Official Firmware Update Summary", file `FM-1_016.fwsc`) as the successor to V15. It
      identifies as `FM-1_016`, so the editor already classes it `mvave`. Ranked first because
      the editor's effect sends may now do the wrong thing on it. Issue 334 asks for this item:
      editor support for V16 (steps 1–3) and reading patches back from an FM1 running it (step 4).
      None of the release notes below is confirmed on hardware; treat every row as **Needs hardware test** until a run is recorded in
      `docs/hardware-runs/` and `docs/fm1-research.md`.
  1. **Effect controllers moved (urgent).** The notes say FX control is now CC 70–93 on the Effect
     Ch channel (Filter 70–73, Reverb 74–77, Delay 78–81, Distortion 82–85, Chorus 86–89,
     Phaser 90–93), and "the former CC0–23 FX mapping is no longer active". The editor sends
     CC 0–23, and on V16 CC 1, 2, 4, 7, and 11 are modulation, master volume, and expression, so an
     effect send could change the sound or the volume rather than an effect. Until a V16 run shows
     what happens, give V16 no `effectControllers` and keep its effects local, as Official Open
     does: add a stock release threshold to `familyProfiles` (`mvave` lists `effectControllers`
     from release 0 today, so the capability becomes "0 to 15", which the profile's
     first-release shape cannot say; extend it, never branch in the sender). Then, once the run
     confirms CC 70–93, send them on V16 and later. _The safe default is done (2026-10-22): the
     stock profile lists `effectControllers` only before release 16, and the firmware setting
     says the effect controls send nothing yet. Sending CC 70–93 waits for the run._ _Done
     (2026-10-23), confirmed on hardware that day (`docs/hardware-runs/stock-v16-2026-10-23.md`):
     V16 takes the editor's 24 effect parameters at CC 70–93, so the profile gives V16 an
     `effectControllerBase` of 70, and since its Voices share one FX group, a patch's effects go
     only as they are edited, never on a slot click (the owner's choice)._
  2. **Say what V16 is.** The badge, the firmware setting, and the bank instructions word stock as
     one thing. Add V16's differences once they are confirmed: eight parts, 20 voices shared, the
     effects as one shared library of 128 groups that no longer follows the preset.
     _Done (2026-10-25): the badge's description says V16 has eight Voices, each on its own
     channel, sharing one FX group, all confirmed on hardware. The firmware setting already says
     the effects are shared and which Voice the editor reaches (steps 1 and 3), and the bank
     instructions already say what V16's prompt does (#360), so neither changed. Left out because
     only the release notes give them: 20-voice polyphony and the library of 128 FX groups._
  3. **Voice sends with eight parts.** V16 gives each of eight Voices its own preset and MIDI
     receive channel. Check on hardware where a single-voice dump, the 155 parameter changes, and a
     Program Change land: the Voice on the note channel, Voice 1, or every Voice. Check the editor's
     audition notes too. The editor may need to say which Voice it edits. _Run 2026-10-25
     (`docs/hardware-runs/stock-v16-2026-10-25.md`): the Program Change and notes reach the Voice
     on their channel, a dump the Voice selected on the FM1's screen, and parameter changes that
     Voice only while it listens on channel 1 or All. A slot click on another channel can put the
     program on one Voice and the sound on another, and live edits reach no Voice off channel 1.
     _Done (2026-10-25): the editor says so on V16 (`selectedVoiceEdits`), naming the note
     channel. The double send at 11:29:53 was a double-click: the click played the slot and the
     editor it opened sent the program and patch again; the editor now waits for the click's send
     instead. The firmware setting says the same in one line (2026-10-25), beside the effects
     line._
  4. **Bank Export into the library.** V16 sends the 32 saved presets of a bank as a standard DX7
     `.syx` (voice data only: no ENV, effects, Voice setup, or patterns). If a run shows the
     FM1 sends that as ordinary Yamaha bulk-dump messages, the existing **Receive patch…** listener
     could take the bank, giving the first supported way to read a stock FM1 back. Needs a capture
     first (the format, its pacing, and whether it is a bulk dump or the vendor protocol), and its
     own approval in `AGENTS.md` if it sends anything. Bank import now waits for a destination bank
     choice on the FM1, which may change how **Send to FM1** instructions read. Issue 334's
     reporter reads patches back on Baud Girl's firmware and asks for the same on V16. Until this
     step ships, `docs/user-guide.md` and the help guide should say plainly that the stock firmware
     cannot be read back; today they only describe reading Baud Girl's presets. _Done
     (2026-10-23): the capture showed one standard 4104-byte bulk dump, so **Receive patch…**
     takes a 32-voice bank and hands it to the DX7 bank import, sending nothing (#351). Receiving
     V16's Export of bank A through the dialog worked on the orange FM1 the same day; Undo after
     the import was not tried there. The flow reads as disjointed: see **Receive from the FM1 as
     a wizard** below._
  5. **New CCs worth knowing, not building yet.** CC 7 master volume, CC 11 expression, panic on
     holding PLAY/STOP, and key LEDs lit by notes 0–26 on the Effect Ch channel. The editor's
     MIDI panic already sends Note Offs; do not add these without a use.
  6. **Sequencer and arrangement changes.** Patterns grow to 64 steps with ratchets, and an
     eight-track arrangement replaces chaining. This reopens none of the parked sequencer
     (see [the roadmap](fm1-roadmap.md)); record it in `docs/fm1-research.md` so the next
     attempt starts from V16, not V15.
  7. **Housekeeping.** Add the release notes to `docs/fm1-research.md`. The firmware page's stock
     entry moved to V16 in the 22 October update (#337); its **Works with this editor** tag stays
     until the V16 hardware run.
  - Order: 1 (a safe default, before anyone on V16 sends effects), then 7, then the hardware run
    that settles 1, 3, and 4 together, then 2, then 4's build if the capture allows it.
  - Tests: a `firmware-profile.test.ts` case on each side of the V16 threshold, a rendered test
    that V16 sends no effect controller, and fixtures for any capture.

- [x] **Receive from the FM1 as a wizard.** Receiving a bank from V16's Bank Export works (#351)
      but felt disjointed when tried on 2026-10-23, and says too little about what is happening.
  - **Built (2026-10-25):** **Receive patches** (`receive-from-fm1-dialog.tsx`) opens from
    **Receive from the FM1…** in a bank's menu and **Library actions**, and from a slot's
    **Receive patch…** on its single-patch path, the owner's choice. The bank import lost its
    `received` mode. Left out: a byte count while receiving, since Web MIDI hands the bank over
    as one message, and the firmware profile choosing the steps, since both sources stay offered
    whatever the FM1 runs. Still needs a run on the orange FM1.
  - **What felt wrong:**
    - It starts from one patch's ⋮ menu, as **Receive patch…**, and its title stays "Receive a
      patch into A01 “ORGAN 3”" after a whole bank has arrived.
    - The bank then takes a second dialog, **Import over “…”?**, reached through **Import bank
      into “…”…**, so one task crosses two dialogs with different titles.
    - Nothing says what to do on the FM1 (GLOBE → Export, over USB), that the editor sends
      nothing and only listens, or what it has heard so far.
  - **Shape:** one wizard built from `src/components/patches/bank-wizard.tsx`, with its
    Back/Next footer and one decision per screen, as **Add new bank…** and **Import DX7 bank…**
    are.
    1. **Source.** What is sending: an FM1 on V16's Bank Export, or one patch from Dexed, a DX7,
       or another editor. Each comes with its own short steps, such as "On the FM1, open GLOBE,
       choose Export, and pick a bank", and a line that the editor only listens.
    2. **Listening.** Live status in a `role="status"` region: waiting, receiving with a byte
       count, received, or a translated error with how to retry. Name the input monitor it
       listens on, and fix a missing input or SysEx there rather than sending the user
       elsewhere.
    3. **Review.** A received bank shows the **Patches received** grid to audition, and a single
       patch its name, with a button to listen.
    4. **Destination and confirm.** Which slot or bank it replaces, with the replace warning,
       then **Replace**, and Undo in the notification.
  - **Where it starts:** a bank's ⋮ menu and **Library actions** can offer **Receive from the
    FM1…** for a bank, beside the slot menu's patch item. The firmware profile decides whether to
    show the V16 Export steps.
  - **Shipped when:** strings are in every locale, the receive dialog stays lazy, the bundle is
    measured with `npm run bundle:check`, and a rendered test walks each screen with the Bank
    Export capture (`docs/hardware-runs/stock-v16-bank-export-2026-10-23.json`) as its fixture.

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

- [x] **Multi-bank `.syx` import.** DX7 archive collections often join several 32-voice dumps in
      one file, which bank import refuses today. Split the file into its banks, show each with its
      first few patch names, and import the one chosen.
  - Each bank passes the existing checks: header, length, 7-bit data, and checksum.
  - A file with some damaged banks lists the readable ones and reports the rest, as saved banks
    do, rather than rejecting the whole file.
  - Importing over a populated bank keeps its confirmation and Undo. Update the SysEx
    compatibility section of `docs/user-guide.md`.
  - _Done:_ **Import DX7 bank** and **Add new bank** read up to 256 joined banks through
    `src/lib/dx7-bank-archive.ts`, which loads when a file is chosen, and list them to choose
    from. An empty bank still takes a single-bank file at once and opens the dialog only for a
    file that joins several.

- [x] **Hear a `.syx` file before importing it.** Choosing a bank or patch file lists its patches,
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
  - Decided: built into the **Import over “…”?** dialog, which reads the file as it is chosen,
    lists its 32 patches, and plays one on click through the search results' `onPlaySearchResult`
    path with default effects. A file it cannot read is explained at once and **Replace bank
    contents** stays disabled. Importing into an empty bank still goes straight from the file
    picker, since nothing is replaced and its slots can be played afterwards; **Add new bank** and
    **Import patch…** are unchanged. The list shows one bank, so [Multi-bank `.syx`
    import](#worth-doing) would add a bank choice above it. The dialog is eager and the preview
    costs about 450 B of the initial bundle.

- [x] **Velocity on the on-screen keyboard.** The keyboard always strikes at velocity 96
      (`defaultNoteVelocity` in `src/lib/midi.ts`), so an operator's velocity sensitivity, which
      the editor explains, cannot be heard without a hardware keyboard. Add a velocity control to
      the keyboard dialog, as [FM-1 Utility](https://fm1-utility.pages.dev/) has. Built as a
      **Level** slider beside the keyboard's title. The label avoids the technical word; the
      operator's own setting keeps the name **Velocity**.
  - Keep the control to 1–127; `sendNoteOn` already takes a velocity. Played notes use it; the
    audition phrases keep the velocities they are written with. Decided: the limits are
    `minNoteVelocity` and `maxNoteVelocity`, with `defaultNoteVelocity` in
    `src/lib/note-velocity.ts`, and `sendNoteOn` keeps accepting 0, as its tests expect. Changed
    after trying it: the phrases follow the Level too, scaled in proportion by
    `scaleNoteVelocity`, so the default level plays them as written and keeps their accents.
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

- [x] **Receive a DX7 voice over MIDI.** Offer to place a standard DX7 single-voice dump arriving at
      the MIDI input, from Dexed, a DX7, or another editor, into a chosen slot, with the same checks
      and confirmation as **Import patch…**.
  - This is standard Yamaha SysEx, not FM1 readback, which stays unsupported. Nothing is taken
    without the user asking: listen only while a receive dialog is open, and ignore everything
    else arriving at the input.
  - Validate length, header, 7-bit data, and checksum at the boundary, and drop the listener when
    the dialog closes, MIDI goes offline, or the input changes.
  - Tests use captured fixtures and a fake input; no hardware or permission.
  - _Done:_ **Receive patch…** sits in a slot's ⋮ menu beside **Import patch…**, since it replaces
    one slot the same way and the menu chooses the slot, so the dialog needs no slot picker. The
    lazy dialog listens on the input monitor through `useDx7VoiceReceiver` only while open, and
    `Dx7VoiceReceiver` (`src/lib/dx7-voice-receiver.ts`) joins a dump split across messages, ignores
    everything but a Yamaha bulk dump (Dexed's parameter changes included), and checks it with
    `parseDx7VoiceFile`. It sends nothing. A later dump replaces the one shown; the replacement is
    one library change with Undo, as **Import patch…** is. No analytics event or stored state.

- [ ] **Set V16's screen colours from the browser.** V16 adds RGB colour editing in GLOBE for the
      page background, parameter widgets, footer, waveform, text, page text, and borders, previewed
      at once and saved with SAVE (release notes, `docs/fm1-research.md`, "M-VAVE's V16 stock
      firmware"). Ben suggested it on 2026-10-22, with the orange FM1 on V16. The editor could offer
      colour pickers for each element, and starting points such as one matched to the page's FM1
      colour, so the screen and the editor look alike.
  - **Blocked on the protocol.** The notes name no MIDI message for the colours, and the editor may
    send none it does not know: a vendor command stays **Dangerous / excluded** until classified.
    First, change one colour on the FM1 with the MIDI log open and see whether it sends anything;
    then look for the setting in M-VAVE's updated manual or a later release's notes. Without a
    documented message, or one captured and approved in `AGENTS.md`, this does not get built.
  - Stock only, from release 16, through a capability in the firmware profile, so earlier releases
    and other firmware never see it.
  - The colours are global settings, so a write changes the FM1 for every preset; say so before
    sending, and say whether SAVE → Globe is still needed to keep them.

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

- [x] **Find duplicate patches.** List patches in loaded workspace banks whose voice data is
      identical, with a way to jump to each copy, so imported archives can be tidied.
  - Read-only: it never deletes or changes a slot. Compare packed voice bytes; say in the UI
    whether names and FM1 effects are part of the match.
  - _Done:_ **Find duplicate patches…** in the patch-bank header menu. Decided: names and FM1
    effects are left out of the match, so a renamed copy is found, and a group says when its
    copies' effects differ. Going to a copy selects its bank and plays it, as clicking the slot
    does.

- [x] **Search across all banks.** The librarian's search box finds a patch in every loaded
      workspace bank, and clicking a result plays it while the results stay up.
  - Decided: saved banks and the bundled catalog are left out. Searching them would need results
    that are not slots, and loading the catalog would weigh on the initial bundle. Choosing a bank
    clears the search; clearing it returns to the bank of the last result played. A lone letter
    matches names only, and a slot code matches only as the whole query.

## FM-1+VA firmware

[FM-1+VA](https://baudgirl.com/work/FM-1+VA) is Baud Girl's replacement firmware. The editor already
recognises it and plays patches on it safely (`docs/fm1-research.md`, "The editor on FM-1+VA"). The
items below would use what it adds. Planned 2026-09-29 from its manual, its published web modules,
and tests on FM-1_089; none has been built. FM-1_092, released the same day, still works with the
editor as it is, but changed what some items below would read and write: it saves Envelope On or
Off with each preset, gives FM presets the Virtual Analog filter, and changes the pattern format.
The record and patterns can still change between releases, so map them against the release being
built for, and record which one.

Rules that apply to every item:

- **Each FM-1+VA command needs its own approval** before production code sends it, recorded in
  `AGENTS.md` and the research notes as the identity query's was. Until then they stay excluded.
  Only bounded operations, such as reading preset _n_: never a generic transmitter, and never the
  raw memory read (below).
- **Gate on the firmware.** Offer a feature only while `firmware.kind` is `fm1-va` and its version
  is at least the one that added the command, and hide it otherwise. M-VAVE's firmware and an
  unidentified FM1 keep today's behaviour. A feature that only reads a file FM-1+VA wrote, such as item 1, sends
  no command and is offered whatever the FM1 runs.
- **Protocol discipline.** Follow the roadmap's build order and the hardware research discipline in
  `AGENTS.md`: capture each reply from an FM1 as a fixture, decode it in `src/lib/`, and test on
  hardware before shipping. Anything that writes the FM1's memory starts from an FM-1+VA backup.
- **Reimplement from facts.** FM-1+VA's source is announced under GPL-3.0-or-later; this project
  is MIT, so no code is copied. A written specification from its author would settle the unknowns
  below faster than capture and diffing. The author has been contacted (2026-09-29).

What is known, from FM-1+VA's own code and manual:

| Command (`F0 43 00 7D …`) | From     | What it does                                                                                                                                                             |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `10 <slot>`               | FM-1_079 | Reads stored preset _slot_ (0–127): its 128-byte packed DX7 voice and 59-byte settings record.                                                                           |
| `04 <slot> …`             | FM-1_079 | Writes a preset exactly, 231 bytes: the voice as a 155-byte edit buffer, then the record in 8-into-7 groups. Writes memory; FM-1+VA's own tool waits 3 s between writes. |
| `20 <pattern> <part> …`   | FM-1_042 | Writes eight steps of a Sequencer pattern and the pattern's settings, 177 bytes. Parts 2–7 (steps 17–64) from FM-1_082.                                                  |
| `11 <address> <length>`   | —        | Reads raw RAM. FM-1+VA reads patterns back this way. **Stays excluded**: it is a generic memory read.                                                                    |

- Every request ends with a checksum: the low seven bits of the sum of each body byte's
  complement. Replies arrive as `F0 7D …`, a 7-bit LSB-first packed buffer holding `7D`, a kind
  (`50` preset, `51` memory, `52` pattern), a status (`0` done, `1` value out of range, `2` damaged
  in transit, `3` Sequencer playing), a 32-bit argument, a 16-bit length, the data, and
  `~sum & 0xFF`.
- The 59-byte record holds each preset's effect parameters (bytes 0–17), an engine marker (18:
  `5A` Virtual Analog, `A5` FM), engine settings (19–22), the Virtual Analog filter (23–26), the
  effect chain with order, switch, and type per slot (27–44), and Attack, Decay, Sustain, and
  Release (54–57). Bytes 45–53 and 58 are unexplained. Where a Virtual Analog preset keeps its
  oscillator settings is not known. How the record's effect bytes relate to CC 0–23 values is not
  known either. Backups confirm only the marker's place: byte 18 is `5A` in a Virtual Analog preset
  but `03`, not `A5`, in an FM one, and the rest of this map does not match what they hold
  (`docs/fm1-research.md`, "Its backup file"), so item 2 maps it afresh.

Suggested order: 1 needs no new command; 2 underpins 3 to 6. Status as of 2026-10-13: 1 and 2 are
done, and 3, 4, 5, 9, and the Virtual Analog editor in 6 are built, each with a hardware check
left (`Send to FM1`, the effect order and Bitcrush read back, and `FM-1_098`). Next: **Erase a
patch** (6), now that the Virtual Analog editor has shipped, then Favourites for Virtual Analog
and 8-Bit presets, then the 8-Bit editor (9) once item 10 has mapped its Note Engine row.

- [x] **1. Import an FM-1+VA backup file.** Read the `.syx` file FM-1+VA's **Save a backup**
      writes (128 `04` messages, each naming its slot) into banks A–D, as an ordinary import:
      a preview of every bank, confirmation, and one Undo. It reads a file and sends nothing, so
      it needs no approval. Until the record is mapped (2), import the voices only and say that
      effects are left as they are. A full backup is 29,568 bytes; check the size and each
      message's checksum before reading, and report a damaged message rather than failing the
      whole file.
      _Shipped 2026-10-01 (#131):_ **Import FM-1+VA presets…** in the patch-bank header menu
      reads the file and replaces the banks the user ticks, voices only, with the effects off. It is offered whatever firmware is connected, because it reads a
      file and sends nothing. A Virtual Analog preset, which record byte 18 marks with `5A`
      (`docs/fm1-research.md`, "Its backup file"), is shown as VA and left out, so its slot keeps
      its patch until item 6 can hold one.
- [x] **2. Groundwork: read presets, and map the record.** Approve `10`, build a bounded
      `readFm1VaPreset(slot)` with typed, translated errors, and capture fixtures from an FM1.
      Then map the record by the research discipline: change one setting on the FM1 (an effect
      switch, a CC value, the effect order, a Virtual Analog setting), press SAVE, read, and diff,
      recording each byte in `docs/fm1-research.md`. Include the settings FM-1_092 added to every
      preset: Envelope On or Off, and the Virtual Analog filter on FM presets. Until a byte is
      understood, keep it exactly as read. Storing the record with each slot is a new optional field: the workspace record
      moves to version 7 and the backup file to version 3, with fixtures for both and a default
      for patches that never had one.
      _Shipped 2026-10-03 (#151):_ `10` is approved, for FM-1+VA from FM-1_079.
      `readFm1VaPreset(slot)` reads one preset through `useFm1VaPresetReader`, with typed errors
      that item 3 translates when it shows them; a development build's **FM-1+VA preset probe
      (dev)** shows each read byte by byte. Captures from FM-1_093 confirmed the read, settled the
      backup's high-bit order, and mapped every effect controller (bytes 0–17 and 27–44, each the
      value the FM1 uses), Distortion Type (38), Envelope On and Attack (53 and 54), and the FM
      preset's own Filter switch and Cutoff (26 and 23) (`docs/fm1-research.md`, "What the record
      holds"). Each slot that has a record keeps it, exactly as read: workspace version 7, saved
      banks version 2, and backup files version 3, each with fixture tests. **Import FM-1+VA
      presets…** keeps each FM preset's record, and the sound key includes it. The Virtual Analog
      settings wait for item 6, and the Filter section's other settings are not mapped yet.
- [ ] **3. Import from the FM1.** A **Read from FM1…** action reads all 128 presets, shows which
      slots differ from banks A–D, and lets the user take the FM1's version of each bank, with
      effects and record, as one Undo. This answers [Syncing patches with the FM1](#syncing-patches-with-the-fm1)
      on FM-1+VA: the browser stops being the only copy, and differences can be shown. Reading
      is one reply per preset; show progress, allow cancelling between presets, and handle
      disconnection and completions after unmount.
      _Built and tested on hardware 2026-10-03 (FM-1_093):_ **Read from FM1** sits in the
      **Import FM-1+VA presets…** dialog beside the backup file, so the read shares its preview,
      bank switches, and Undo. It reads the 128 presets one at a time, with progress and **Stop
      reading**, and stops when the dialog closes or the ports change. A dot marks each patch
      whose sound key differs from the library slot it would replace, and only the banks holding
      one start set to import. Each FM1 bank chooses where it goes, from the FM1 or the file alike:
      not imported, over any library bank no other FM1 bank takes, or into a new bank titled
      "FM-1+VA A" and so on. Each patch takes its library effects from the record's effect bytes.
- [ ] **4. Write presets exactly.** Approve `04` and send chosen slots, or only the ones that
      differ from the FM1, straight to their own slots with effects and record, reading each back
      to confirm it. This replaces the **Replace Bank A?** prompt on FM-1+VA and carries the
      effects a DX7 bank loses. Each write stores the preset at once, so the confirmation names
      every preset it replaces and says an FM-1+VA backup is the way back; there is no Undo on
      the FM1. Pace writes 3 s apart, never cancel mid-write, and stop at the first preset that
      does not read back the same.
      _Started 2026-10-03:_ `04` is approved, with those limits, in `AGENTS.md`.
      `makeFm1VaPresetWrite` rebuilds FM-1+VA's own backup messages byte for byte, and
      `useFm1VaPresetWriter` sends one write at a time, 3 s apart. A patch without a record of its
      own takes the FM1 slot's stored record with the library's effects put in. The dev probe's
      write test passed on FM-1_093: a write stores the preset exactly, shows on the selected
      preset at once, and gets no reply, so the read back is the only confirmation. **Write patches
      to the FM1…** in the patch-bank header menu (built 2026-10-03; on FM-1_093 it wrote one changed
      preset, 001, and confirmed it)
      reads the FM1, writes each library bank chosen over an FM1 bank, only the patches that
      differ and never over a Virtual Analog preset, names every preset first, and reads each
      write back. **Send to FM1** uses the same path from FM-1_079 (built 2026-10-03, waiting for a
      hardware test): the selected bank, or Favourites, is written over an FM1 bank chosen in the
      dialog, so the **Replace Bank A?** prompt is left to releases before it. A short Favourites
      writes only its own presets rather than INIT VOICE.
- [ ] **5. Effect order and distortion type.** FM-1+VA stores both in the record and has no CC for
      them. A reorderable effect list and a Soft Clip / Hard Clip / Foldback choice in the effects
      panel, sent with the preset through 4, so a change is heard once written. This settles
      [Effect routing order](#effect-routing-order) on FM-1+VA only.
      The record keeps the order and type with the patch, but no other firmware reads them: sent
      to M-VAVE's firmware, a patch plays in the stock order with its stock distortion. Hide both
      controls there, and say so in the effects panel where a patch carries a changed order.
      _Distortion type built 2026-10-04:_ the Distortion box offers **Type** while the FM1 runs
      FM-1+VA from FM-1_079, for a patch with a record, and saving writes record byte 38; it is
      heard once the patch is written. A patch without a record cannot keep one, and on other
      firmware a type other than Soft Clip is named under Distortion. Foldback's `02` was read from
      the FM1 on 2026-10-04. _Bitcrush built 2026-10-06:_ FM-1_096's seventh effect, mapped on
      hardware the same day (`docs/hardware-runs/fm1-va-bitcrush-order-2026-10-06.md`), has its own
      box in the effects panel from FM-1_096, written into record bytes 5, 35, 41, and 44.
      _Effect order built 2026-10-06:_ from FM-1_096 the effects panel lays the seven boxes out in
      their order, and each drags to another place by its grip; the order is written into the
      chain bytes and Bitcrush's place. Neither has been written to the FM1 from the editor and
      read back yet.
- [ ] **6. Virtual Analog presets.** Built in steps, each shippable:
  - **Keep them.** A slot whose record is marked Virtual Analog shows as such, survives import,
    backup, and copy unchanged, and is left out of DX7 `.syx` export with an explanation,
    because its voice bytes are not a DX7 voice.
    - Store it as its own shape, never as a `Dx7Voice`: the 155 voice bytes and the 68 record
      bytes exactly as read, checked to be seven-bit and nothing more. Pack presets hold 127 where
      a DX7 voice allows 99 (`docs/fm1-research.md`, "A Virtual Analog preset's voice bytes are
      not a DX7 voice"), so the normalisation stored DX7 voices get on read would change the
      sound. Only the name bytes, 145–154, are ever edited.
    - Its patch card carries a small VA tag in the corner, like the import dialog's. While
      FM-1+VA is identified on the ports in use (`firmware.kind` is `fm1-va`), every other card
      carries an FM tag, so each slot names its engine. On other firmware, or before the
      firmware is known, FM cards have no tag, because there every playable patch is FM. The
      tags fit without taking room from a full ten-character name (`e2e/librarian.e2e.ts`).
    - Clicking the slot sends only its Program Change, never a voice: no message the editor sends
      before 4 can carry a Virtual Analog preset. The bank destination instructions on FM-1+VA
      say that writing a bank turns every Virtual Analog preset in it into an FM preset
      (`FM-1_087` on).
    - `soundKey` covers the raw bytes, so a favourite of a Virtual Analog slot matches it, and
      the search's duplicate hiding treats two identical ones as one.
    - _Built 2026-10-04, waiting for a hardware test:_ importing from the FM1 or Baud Girl's
      presets file keeps each Virtual Analog preset in the workspace's `virtualAnalog` map, never
      in `voices`: its 128 voice bytes exactly as the FM1 reads them back, rather than the file's
      155, since the FM1 stores that form and the file's packs into it byte for byte (preset 097
      read both ways), and its record in `records`. Workspace version 8, saved banks version 3,
      and backup files version 4 carry them, each with fixture tests. Its card has the VA tag and
      no Edit or DX7 download; its click sends only its Program Change; copying, moving, and
      deleting a bank carry it; and a DX7 bank, sent or downloaded, puts INIT VOICE in its slot
      and says so. Still to do: Favourites (its heart is hidden), which needs workspace version 9
      and backup version 5.
    - _Built 2026-10-04:_ **Change to FM…** in a Virtual Analog slot's ⋮ menu, with its name
      field, replaces it with INIT VOICE and no record, keeping its FM1 effects, and offers Undo. A
      write still leaves a Virtual Analog preset in that FM1 slot alone, which the dialog says. Cards
      carry FM tags while FM-1+VA is identified. Saved-bank search finds Virtual Analog presets,
      which can be copied into a slot but not played or edited there, and the duplicate finder
      groups identical ones, never with a DX7 voice. The bank instructions' warning is dropped: on
      FM-1+VA from FM-1_079 **Send to FM1** writes presets rather than a DX7 bank, and releases
      before FM-1_087 are not known to turn Virtual Analog presets into FM.
    - _Writing them back built 2026-10-04 (#178):_ the preset write
      takes a preset's voice bytes as a read returns them, for either engine, so a Virtual Analog
      patch is written with its bytes and record exactly as read, as FM-1+VA's own backup restores
      one. **Write patches to the FM1…** and **Send to FM1** write it over any preset that differs,
      a DX7 patch still never replaces a Virtual Analog preset, and a Virtual Analog patch the write
      would not store exactly is kept back and counted. The dev probe writes a Virtual Analog
      preset back too: on FM-1_093, 097 written back unchanged read back exactly (2026-10-04).
  - **Play them live.** From FM-1_086, CC 24–31 and 52–57 on the note channel set Waveform,
    Super, Detune, Drift, Sub, Noise, PWM, Filter Type, and the filter's envelope and modulation,
    and CC 70–78 the shared Envelope, LFO, Cutoff, and Resonance, as unsaved edits heard at once.
    A lazy Virtual Analog editor page, like the voice editor, sends these; continuous input is one
    undo step. Showing the current values needs the record map from 2. The CC map is recorded in
    `docs/fm1-research.md`, "Controllers on the MIDI Channel", and its hardware tests
    ([`fm1-va-controller-tests.md`](fm1-va-controller-tests.md)) ran on 2026-10-04: every CC
    reached its row, list settings split 128 values into equal bands, continuous ones show
    `round(value × top ÷ 127)`, and fast sweeps need no thinning. The Envelope switch side effect
    (V5) was seen on 2026-10-07. `makeFm1VaSoundControlMessage` and `useFm1VaSoundControl` send
    them, and the development probe's **Map a setting** uses them to find the bytes each setting
    is stored in, the map this step needs to show current values. It never sends CC 85–119, which press the FM1's own buttons.
  - **Save them.** Edits from the Virtual Analog editor page are saved to the library and written
    with 4.
  - _Play them live and Save them built 2026-10-06, byte map confirmed on hardware 2026-10-07_
    ([`fm1-va-editor-tests.md`](fm1-va-editor-tests.md)): a Virtual Analog slot's **Edit** opens
    its own lazy editor with the oscillator, filter, output, LFO, Envelope, and effects rows, read
    and written as Baud Girl's Device Manager maps them (**Confirmed** by that run). In banks A–D on
    FM-1_086 and later it reads the slot's stored preset, and if it is Virtual Analog, sends each
    change with a controller as it is made; the rest are heard once written. Saving puts the
    preset's bytes back in its slot, every byte not edited exactly as read. The operator 6
    amplitude envelope rows are not offered.
  - _Knob choices built 2026-10-10:_ from FM-1_096, the Virtual Analog editor and the voice
    editor, for a patch with a record, offer what KNOB1–4 play on the Preset knob bank, from the
    engine's eight, written into record bytes 52 and 53 (confirmed on FM-1_097) and heard once
    the patch is written.
  - **Erase a patch.** Planned 2026-10-02 as **Change to Virtual Analog…** and **Change to FM…**,
    replanned 2026-10-06 as one **Erase patch…**, named after the FM1's own **Erase Preset**. Built
    after the Virtual Analog editor (**Play them live** and **Save them**), with 8-Bit added once 9
    is built. On the FM1, EDIT, **Erase Preset**, then **FM**, **VA**, or **8-Bit** makes a blank
    preset of that engine, reachable only through the panel. The editor never repeats that: the
    buttons' CCs, 85–119, stay excluded. Instead, a slot's ⋮ menu offers **Erase patch…**, which
    replaces the library patch with a blank one of the chosen engine, and the FM1 takes it at the
    next **Write patches to the FM1…** or **Send to FM1**.
    - Offered only while the FM1 is identified as running FM-1+VA from FM-1_079, so the result can
      reach it, and on every slot, whatever its engine. There it takes the place of **Change to
      FM…**; elsewhere a Virtual Analog slot keeps **Change to FM…**, its only way back to FM.
    - The dialog is its confirmation: it names the slot, says the current sound is replaced, and
      lists the engines as a choice, FM first. It says the FM1 is unchanged until the patch is
      written. An engine the library cannot hold yet is left out rather than shown disabled.
    - The dialog has a name field, filled with the patch's current name and focused with it
      selected, so typing replaces it and Enter confirms. It follows the editor's name field: ten
      characters (`FM1_VOICE_NAME_LENGTH`), and the characters `updateDx7VoiceName` keeps, any
      other becoming a space.
    - It replaces a sound that Undo brings back, so its action button is `destructive`, not
      `danger`, and its notification offers Undo through `undoToastOptions`.
    - Each engine's blank is the preset **Erase Preset** makes, captured from an FM1, voice and
      record byte for byte, so the editor needs no defaults of its own. Erasing matches the FM1:
      every effect Off. FM can ship first as INIT VOICE with no record and every effect Off, as
      **Change to FM…** gives, and take the captured FM blank's record once test M3
      ([`fm1-va-096-tests.md`](fm1-va-096-tests.md)) has read one. VA waits for M3's capture and
      the slot question below; 8-Bit waits for 9 and M3's 8-Bit capture.
    - No templates: starting a slot from another patch, of either engine, is what **Copy to…** and
      search already do.
  - Unknowns: where the oscillator settings are stored, and how each CC value maps to the stored
    value. A list setting such as Waveform divides the 128 CC values into equal bands. Whether
    the name a preset gets from **Erase patch…** shows on the FM1 as written needs a
    hardware check once 4 exists, and whether an erased preset's bytes depend on its slot needs a
    second erase diffed against 097.
- [ ] **7. The Sequencer, on FM-1+VA.** `20` writes a pattern directly, the transfer
      [the parked sequencer](fm1-roadmap.md) was waiting for, so writing a pattern could reopen it
      for FM-1+VA under the sequencer scope in `AGENTS.md`. Reading patterns back uses the
      excluded raw memory read, so it waits for a bounded pattern read (the reply kind `52`
      suggests one may exist; ask the author). Each step's Ratchet, Gate, Chance, Transpose,
      Accent, and Slide are not in the known write message, and FM-1_092 changed the pattern
      format again (held notes and per-note Tie & Slide), so the known message may no longer
      describe it. Status `3` refuses a write while the
      Sequencer plays.
      Version 98 (2026-10-10) changes patterns again: each pattern's settings gain **Preset**, the
      preset the FM1 switches to when the pattern starts (Off keeps the one playing), and real-time
      recording writes the notes the Note Engine plays rather than the key held. Map both before
      any pattern write, and offer a pattern's Preset as a slot from banks A–D, or Off.
- [ ] **8. Performance controls.** Small, and optional: from FM-1_086, CC 70–78 set Brightness,
      Feedback, the envelope, and the LFO on the playing preset, and CC 58 its Algorithm. Most of
      these duplicate the voice editor's own controls; Brightness, which moves every modulator's
      output level together, is the one the editor lacks. Decide whether it earns a control.
  - The CCs change the FM1's edit buffer without the editor knowing, so the library's voice and
    what plays drift apart until the patch is sent again; say so where the control sits.
  - CC 70, 72, 73, and 75 also switch the preset's Envelope on (`docs/fm1-research.md`,
    "Controllers on the MIDI Channel").
  - Not CC 85–88: they turn KNOB1–4, which play whatever parameter each knob is assigned on the
    FM1, and the research notes exclude CC 85–119 because their effect depends on device state the
    editor cannot read.
- [ ] **9. 8-Bit presets.** FM-1_096 added an 8-Bit engine, record byte 18 `C3`
      (`docs/fm1-research.md`, "FM-1_096"). Since 2026-10-06 the editor recognises one, leaves it
      out of every import, and never writes over it, so the library has no copy of it. Keeping
      them would follow item 6's steps. Every field is now mapped from Baud Girl's Device Manager
      (`docs/fm1-research.md`, "Every field of an 8-Bit preset", **Likely**), and the 8-Bit pack's
      16 presets already round-trip byte for byte through the packed voice and
      `makeFm1VaPresetWrite`. In order:
  - **Hold and write them.** Keep the voice bytes and record exactly as read in a map of their
    own, not in `virtualAnalog`, whose stored name must not be repurposed: a version bump with
    fixtures for the workspace record, saved banks, and backups. Show an engine tag, write them
    back exactly, and keep them out of every DX7 path. Needs M4 first
    (`docs/fm1-va-096-tests.md`).
    _Built 2026-10-10, after M4 passed on `FM-1_097` the same day:_ reading presets from the FM1
    or Baud Girl's presets file keeps each 8-Bit preset in the workspace's `eightBit` map, its 128
    voice bytes and record exactly as read. Workspace version 9, saved banks version 4, and backup
    files version 5 carry them, each with fixture tests. Its card shows an 8B tag and offers Copy
    but no Edit, DX7 download, heart, or **Change to FM…**; its click sends only its Program
    Change; a DX7 bank, sent or downloaded, puts INIT VOICE in its place and says so; search and
    the duplicate finder keep it apart from the other engines; and **Write patches to the FM1…**
    writes it back exactly, only over an FM or 8-Bit preset. Favourites still holds only FM
    patches, as for Virtual Analog presets.
  - **Erase patch… to 8-Bit** (item 6), once M3 has captured the blank on an FM1; the Device
    Manager's comes from an emulator. _M3 captured it on `FM-1_097` on 2026-10-10._
  - **An 8-Bit editor.** About 150 fields: the Key group, twelve drums of seven rows, and the bass
    and lead with their User Arpeggios. Only the Envelope and LFO controllers reach an 8-Bit
    preset, so the rest is heard once written, unless D2 finds a DX7 parameter change plays a
    voice-byte field live. Needs P1–P7 first. Several of its lists are provisional in the
    firmware and may be renamed.
    _Built 2026-10-17, after P1–P7 and the Pattern passed on `FM-1_098`:_ the drums as twelve
    pads with the chosen one's settings, the Key panel, the bass and the lead, and the Envelope,
    LFO, and effects, which alone play live. Its lists show the FM1's own names. The first Key
    carries each part's Arpeggio over as the FM1 does. Its Presets menu has Init patch only;
    Randomise and sound starters could follow. Not yet heard through the editor on hardware.
  - **8-Bit presets.** A drum preset menu (the FM1 blank kit's twelve drums), a part preset
    menu on the bass and the lead (ten sounds, the first two the FM1's own blank bass and lead),
    and four whole-patch starters beside Init patch. Built 2026-10-17. Before they ship, write
    each to the green FM1 and listen: every part preset on the bass and the lead (a written patch
    per preset), and each starter with Key Off and with a Key set. Change any that do not match
    their names, and note what was heard here. The drum presets are the FM1's own values, so one
    listen through the kit is enough.
    Version 98 adds a **Note Engine** row to the bass and the lead, after Arp Speed: at
    Auto-Chord the part plays its chord's notes together rather than one after another. It is
    not mapped yet (item 10).
- [ ] **10. Version 98.** Baud Girl's Version 98 beta (2026-10-10) adds the Note Engine (Arp,
      Auto-Arp, and Auto-Chord, with chords in a Key and Scale), a Preset per Sequencer pattern,
      a Bluetooth **None**, the 128 factory presets in the Device Manager's Library, and a fix
      for Sustain 0. Its release notes name no new SysEx message, and the 2026-10-13 read of
      Version 101's manual (`docs/fm1-research.md`, "FM-1_101") found none either, nor a record
      change, so `FM-1_101` also gets what 97 gets. The Note Engine's settings are
      the FM1's own, saved with its other settings and used on every preset, so they are not in a
      preset and no approved command reaches them; Bluetooth is the FM1's alone. `FM-1_098` is
      FM-1+VA to `classifyFm1Firmware` and gets what 97 gets. Before relying on that:
  - **Check the editor on 98.** Read the 98 manual against 97's, as for 97, and run the
    identity, read-all, and write-back tests (F1, M4) on `FM-1_098` or later. Record the release in
    `docs/fm1-research.md`.
  - **Map the 8-Bit Note Engine row.** One field per part (P-series in
    [`fm1-va-096-tests.md`](fm1-va-096-tests.md)): set the bass's, then the lead's, to each
    choice, save, read, and diff. Confirm it takes bytes the 8-Bit table counts as unread, so an
    8-Bit preset from 97 reads the same on 98 and the 8-Bit pack still round-trips. Add it to
    the table under "Every field of an 8-Bit preset" before the 8-Bit editor (9) offers it.
  - **Sustain 0.** On 98 a held note at Sustain 0 fades to silence on FM and Virtual Analog
    presets; before it the FM1 held it at a tenth of its level, with the Envelope On. Note the
    change in the research notes, and check the Virtual Analog editor's Envelope drawing and its
    help ("at 0 a held note is short") describe 98 without being wrong for earlier releases.
- [ ] **11. The factory presets with their effects.** The Device Manager's Library now offers
      the 128 presets an FM-1 ships with. **Reset to factory patches** puts back M-VAVE's four
      banks as DX7 voices with every FM1 effect off, since the restore capture carries none
      (`src/data/fm1-factory-banks.ts`). If the Device Manager's set holds each preset's stock
      effects in its records, compare its voices with the bundled banks, byte for byte, and take
      the effects for the factory reset and new workspaces, which changes no stored shape. Check
      first where its records come from (a stock FM1 read, or Baud Girl's defaults) and their
      licence, since the bundled banks are CC0. Until then, a user on FM-1+VA can import the set
      through **Import Baud Girl presets file…** if the Device Manager saves it as a file.

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

On FM-1+VA firmware, which reads its presets back with a command of its own, this is planned in
[FM-1+VA firmware](#fm-1va-firmware), items 2 and 3. M-VAVE's firmware is unchanged.

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
- _Revised 2026-10-02_, once the menu had grown to FM-1+VA's import and **Find duplicate
  patches…**: the toggle is **Library actions**. **Backup** stays first, with its line saying it
  includes FM1 effects and saved banks. **Other files** holds **Download SysEx banks (.zip)** and
  **Import FM-1+VA presets…**, whose line names Baud Girl's FM-1+VA firmware so owners of
  M-VAVE's firmware can pass it by. Below the divider, **Find duplicate patches…** and then
  **Reset to factory patches…**, in the danger colour. Every line under an item fits one line.
- _Revised 2026-10-03_, as the menu read as too wordy: a line under an item stays only where it
  says what the label cannot. **Download backup** keeps just the date of the last backup, and
  **Download SysEx banks (.zip)** its DX7-data-only line, which now carries the comparison with the
  backup alone. The Baud Girl import and write lose theirs: the import's label already names the
  firmware, and the write shows only on it. The menu widens to 360 px so the import's label fits
  one line.
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
- **Cost.** Load the engine only when preview is first used, to stay inside the 163 KiB budget. The
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

Reopen only if a stock control or an official M-VAVE app is found that changes the order. FM-1+VA
stores the order in each preset's record; see [FM-1+VA firmware](#fm-1va-firmware), item 5.

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

### M-VAVE's Official Open firmware

On 2026-10-14 M-VAVE briefly published FM1 Workbench, the web editor and installer for a firmware
it calls Official Open, and on 2026-10-16 released it as V12 with its source. It turns the FM1 into
an eight-track groovebox with DX7, 303, 808, PSG, Pluck, and sampler engines, saved as projects
with a shared sample bank. What its source says is in
[the research notes](fm1-research.md#m-vaves-official-open-firmware).

- **Identified.** The editor names it the `official-open` family and sends it no Program Change
  and no FX Channel effect controllers, which it would take as changes to its tracks. Sending a
  patch as a single-voice dump to a DX7 track, and reading a track's voice over its `7D 'FM'`
  protocol, each need their approval recorded in `AGENTS.md` first.
- **Its restore and migration steps** are in [Switching FM1 firmware](switching-firmware.md)
  (2026-10-18): force flash from stock, Restore original V15, and updates within Official Open,
  with backups first. The firmware page lists it as M-VAVE's own, with its Workbench and source.
- **DX7 tracks.** Its Workbench imports a `.syx` voice or bank into a DX7 track, so the editor's
  library, catalog, and voice editor already feed it through **Download patch**. Exporting a DX7
  patch as a `.fm1t` track sound would save a step; its 223-byte layout is in the source but not
  yet mapped.
- **Keep its projects, but don't edit their steps.** Approved 2026-10-18: the library may store and
  organise `.fm1` projects, list their tracks, and move sounds between a project and the banks
  ([the plan](official-open-plan.md), Phases 4 and 7). Editing its steps is a nice to have, the plan's
  last phase, needing its scope approved first; samples stay with its own Workbench, and the
  [sequencer scope](../AGENTS.md#sequencer-scope) rules out a general sequencer here.
- **Categories for finding sounds.** Reopened 2026-10-18 from "Tags, ratings, and favourites"
  below: a library of thousands of sounds across six engines needs more than 32-slot banks and a
  name search. A fixed, translated list of categories, suggested from DX7 names and bundled with
  catalog sounds, with engine and category filters, a browsable catalog for every engine, and
  starter sets ([the plan](official-open-plan.md), Phase 6). Ratings stay decided against;
  favourites shipped.

## Decided against

- **Ratings.** A new stored field to support forever, for little benefit. Tags were decided against
  with them while the library was 32-slot banks of one engine; categories are reopened above, and
  favourites shipped.
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
