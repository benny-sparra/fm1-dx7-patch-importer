# Feature backlog

Candidate features for the editor and librarian, ranked by value for effort. Tick an item when it
ships, and move anything rejected to [Decided against](#decided-against) with the reason.

This list is for work that needs no new FM1 protocol. Protocol-backed work, such as the sequencer
and slot-addressed bank writes, stays in [the roadmap](fm1-roadmap.md).

Every item follows [`AGENTS.md`](../AGENTS.md): strings in every locale, one undo step for
multi-parameter edits, tests in the same change, and the legacy-data rules for anything stored.

## Housekeeping

- [ ] **Fix the stale bank transfer status claim.** The README still lists "track whether a bank is
      local, transferred, or changed since transfer", but that status was removed in `14d3618`. The
      locale keys `banks.localOnly`, `banks.transferred`, and `banks.changed` are now unused in every
      locale. Either remove the README line and the keys, or restore the feature on purpose (see
      [Bank transfer status](#bank-transfer-status)).

## Worth doing

- [ ] **Copy and paste operators.** Copy one operator's settings (frequency, envelope, output level,
      keyboard scaling, sensitivity) to another operator, or to an operator in another voice.
  - Paste is one undo step and sends the changed parameters live.
  - Decide whether the clipboard survives leaving the editor. Keep it in memory, not storage.
  - Tests: a rendered paste that reverses in one undo, and pasting into another voice.

- [ ] **Effect presets.** A presets menu on the effects panel, like the pitch envelope presets, that
      sets the FM1 effects chain (filter, reverb, delay, distortion, chorus, phaser) without touching the
      DX7 voice.
  - Keep the table in `src/lib/`, separate from `sound-presets.ts`, which changes the whole voice.
  - Values stay within the documented ranges in `src/lib/fm1-parameters.ts`. Hardware scaling and
    display units are still unconfirmed for some controls (see `docs/fm1-research.md`), so name
    presets by character ("Small room", "Slapback", "Warm drive") rather than by claimed values.
  - Decide per preset whether effects it does not use are bypassed or left alone.
  - Applying a preset is one undo step and sends all effect controls once, not one message per
    repeated click.
  - Tests: a `src/lib/` table test (unique ids, values in range), a rendered one-undo test, and the
    preset names in every locale.

- [ ] **Compare with saved.** A button in the editor that switches between the working copy and the
      saved version, sending each to the FM1 so the difference can be heard.
  - Comparing never changes the working copy or the undo history.
  - Editing while showing the saved version needs a clear rule: return to the working copy first,
    or disable the controls.
  - Do not resend when the selected version has not changed.

- [ ] **Copy patches between banks.** "Copy to bank…" on a patch, and possibly dragging onto a bank
      tab.
  - Choose the target slot, and confirm before overwriting a populated slot.
  - Copies the patch's FM1 effects with the voice.
  - Offer Undo in the notification through `undoToastOptions`.

- [ ] **Single-voice `.syx` import and export.** Load and download one DX7 voice (the 163-byte
      single-voice dump) as well as 32-voice banks.
  - Apply the same rules as bank import: header, length, 7-bit data, and checksum, with translated
    errors.
  - Importing into a slot replaces a sound, so confirm first and offer Undo.
  - Export contains voice data only, as bank export does.

## Nice to have

- [ ] **Search across all banks and the catalog.** Find a patch name in every workspace bank, saved
      bank, and bundled catalog bank, then audition it or copy it in. Pairs with copying patches
      between banks.

- [ ] **Init voice.** A clean starting voice next to Randomise, applied as one undo step and keeping
      the patch name.

## Open questions

### Bank transfer status

A per-bank "Local only / Transferred / Changed" marker existed and was removed in `14d3618`. Before
bringing it back, find out why it was removed. Without device readback it can only report what this
browser last sent, never what is on the FM1, so its wording must not suggest the two are in sync.
A full sync workflow with confirmation prompts was judged too complex for what it can promise.

## Decided against

- **Tags, ratings, and favourites.** New stored fields to support forever, for little benefit with
  32-slot banks.
- **Online sharing or accounts.** Needs a server and conflicts with the client-only design and the
  privacy rules.
- **Voice morphing, and sequencer features beyond the FM1's own model.** Out of scope; the sequencer
  follows [the roadmap](fm1-roadmap.md).
