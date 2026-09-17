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
      any bank that has sounds. Dragging onto a bank tab is not built yet.
  - Choose the target slot, and confirm before overwriting a populated slot.
  - Copies the patch's FM1 effects with the voice.
  - Offer Undo in the notification through `undoToastOptions`.

- [ ] **Single-voice `.syx` import and export.** Load and download one DX7 voice (the 163-byte
      single-voice dump) as well as 32-voice banks.
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

## Nice to have

- [ ] **Search across all banks and the catalog.** Find a patch name in every workspace bank, saved
      bank, and bundled catalog bank, then audition it or copy it in. Pairs with copying patches
      between banks.

## Open questions

### Bank transfer status

A per-bank "Local only / Transferred / Changed" marker existed and was removed in `14d3618`. Before
bringing it back, find out why it was removed. Without device readback it can only report what this
browser last sent, never what is on the FM1, so its wording must not suggest the two are in sync.
A full sync workflow with confirmation prompts was judged too complex for what it can promise.

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

## Decided against

- **Tags, ratings, and favourites.** New stored fields to support forever, for little benefit with
  32-slot banks.
- **Online sharing or accounts.** Needs a server and conflicts with the client-only design and the
  privacy rules.
- **Voice morphing, and sequencer features beyond the FM1's own model.** Out of scope; the sequencer
  follows [the roadmap](fm1-roadmap.md).
