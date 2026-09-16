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

- [ ] **Effect presets.** A presets menu in each effect's box on the effects panel, like the pitch
      envelope presets, that sets that FM1 effect (filter, reverb, delay, distortion, chorus, phaser)
      without touching the DX7 voice or the other effects.
  - Keep the table in `src/lib/`, separate from `sound-presets.ts`, which changes the whole voice.
  - Values stay within the documented ranges in `src/lib/fm1-parameters.ts`. Hardware scaling and
    display units are still unconfirmed for most controls (see `docs/fm1-research.md` §7), so name
    presets by character ("Small room", "Slapback", "Warm drive") rather than by claimed values,
    and keep values away from the ends of each range.
  - A preset switches its effect on and sets every one of its controls, so applying it always gives
    the same sound. The menu stays usable while the effect is bypassed. Each box already has an
    on/off button, so there is no "Dry" preset.
  - Applying a preset is one undo step and sends that effect's four controls once. Choosing the
    preset that is already applied sends nothing.
  - Tests: a `src/lib/` table test (unique ids, values in range, only its own effect), a rendered
    one-undo test, and the preset names in every locale.
  - Build it in phases, starting with the effects whose result is easiest to recognise by ear. Each
    phase ships only after its presets have been listened to on an FM1, using the matching effect
    block in `docs/fx-003-hardware-verification.md`, with the observations recorded there.
    1. **Space: reverb and delay.** Builds the menu, the table, the send, and the one-undo apply,
       with _Small room_, _Large hall_, and _Plate_ for reverb and _Slapback_ and _Echo_ for
       delay. Confirm the room/hall/plate order and the delay decay and rate directions on
       hardware before naming presets after them. Built; waiting on the listening check in
       `docs/fx-003-hardware-verification.md` §8.
    2. **Movement: chorus and phaser.** Adds presets such as _Chorus wash_ and _Ensemble_ for
       chorus and _Slow sweep_ for phaser.
    3. **Tone: filter and distortion.** Adds presets such as _Muffled_ and _Telephone_ for the
       filter and _Warm drive_ and _Crunch_ for distortion. Last, because distortion gain and
       filter resonance can jump sharply in level, so check the loudest preset at a safe listening
       volume.
  - Presets that combine effects, such as a phaser over a small reverb, are not planned: set one
    effect's preset, then another's.
  - Later, once [effect routing order](#effect-routing-order) is known, the routing could have
    presets of its own.

- [ ] **Copy and paste operators.** Copy one operator's settings (frequency, envelope, output level,
      keyboard scaling, sensitivity) to another operator, or to an operator in another voice.
  - Paste is one undo step and sends the changed parameters live.
  - Decide whether the clipboard survives leaving the editor. Keep it in memory, not storage.
  - Tests: a rendered paste that reverses in one undo, and pasting into another voice.

- [ ] **Compare with saved.** A button in the editor that switches between the working copy and the
      saved version, sending each to the FM1 so the difference can be heard.
  - Comparing never changes the working copy or the undo history.
  - Editing while showing the saved version needs a clear rule: return to the working copy first,
    or disable the controls.
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

- [ ] **Firefox support.** Let desktop Firefox users connect to the FM1, not just Chrome, Edge, and
      Opera users.
  - Firefox has Web MIDI, but grants it through its own site permission prompt rather than
    Chromium's. Confirm on current desktop Firefox that `requestMIDIAccess({ sysex: true })` works
    through that flow and that bank transfers and live edits reach the FM1 on hardware.
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

## Decided against

- **Tags, ratings, and favourites.** New stored fields to support forever, for little benefit with
  32-slot banks.
- **Online sharing or accounts.** Needs a server and conflicts with the client-only design and the
  privacy rules.
- **Voice morphing, and sequencer features beyond the FM1's own model.** Out of scope; the sequencer
  follows [the roadmap](fm1-roadmap.md).
