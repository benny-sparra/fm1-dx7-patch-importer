# V16 effect order: run of 2026-11-01

The owner, on the orange FM1 running stock V16 (`FM-1_016`), with the development build of PR #401
(`claude/v16-fx-order-27ffa2` at `bfdaf56f`) and its `effectOrder` capability listed locally for
the `mvave` family, as the [run sheet](stock-v16-effect-order-run-sheet.md) allows.

## What was done

- The Effects tab read the FM1's order as it opened: its grips appeared, so the reply to the
  object 4 read (`0x23`) parsed as a block with an order of the six effects.
- Reverb was dragged before Filter. The FM1's FX page moved its blocks to match.

## What it settles

- The read's request and reply framing, and the 27-byte write at `0x92`, work on V16.
- Byte 0 of entries 0–5 is the chain order, and position 0 is the first block on the FM1's FX
  page, as the editor lays the boxes out.

## Not checked

The run sheet's other steps were not done or not reported: comparing two reads byte for byte, an
unchanged write, another Voice selected during a write, a power cycle without SAVE, SAVE, and an
effect switched between a read and a write. No captures were kept.
