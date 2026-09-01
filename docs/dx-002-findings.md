# DX-002 findings — verification of DX-001

Reviewed: 2026-08-31

## Tests performed

- Compared the DX-001 branch diff with `docs/fm1-research.md`, `docs/fm1-roadmap.md`,
  `docs/codex-tasks.md`, and the cited stock V13 FM1 firmware analysis.
- Traced live parameter edits from the React editor through the MIDI queue and Yamaha SysEx
  encoder.
- Exercised the parameter schema, payload validation, DX7 VMEM/VCED conversion, voice-name edits,
  and MIDI sender tests.
- Added boundary coverage for addresses 127/128 and a real ROM1A bank round trip that edits two
  fields sharing packed bytes, exports and re-imports the bank, and verifies all unrelated packed
  data and voices remain unchanged.

## Issues found

No implementation defect or regression attributable to DX-001 was found.

DX-001 correctly fixes two demonstrated defects in the previous implementation: address 155 was
outside the FM1's 155-byte stored VCED buffer, and the stock FM1 parameter-change handler requires
sub-status `10` hex rather than a value derived from the selected note/program channel.

The per-parameter maxima are consistent with the standard DX7 VCED format and editor serialization,
but are strongly inferred for FM1 rather than confirmed by row-by-row hardware captures. The stock
handler performs a direct byte write and does not independently demonstrate those legal ranges.

## Documentation updated

`docs/fm1-research.md` now separates the live-parameter findings into firmware-confirmed,
strongly inferred, and unresolved/hardware-test categories.

## Recommended follow-up

- Capture representative minimum, midpoint, and maximum changes for each parameter family on a
  physical stock FM1, including addresses around 127/128 and voice-name bytes.
- Keep address 155 rejected unless a safe, explicit FM1 operator-enable implementation is proven;
  do not infer original-DX7 behaviour from the adjacent address.
- Continue the separately scoped Yamaha fixture work for malformed delimiters, illegal high-bit
  data, invalid lengths, and checksum failures. No FX behaviour was changed by this review.
