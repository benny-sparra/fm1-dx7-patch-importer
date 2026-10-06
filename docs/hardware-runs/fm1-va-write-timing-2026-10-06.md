# FM-1+VA write timing run

- Date: 2026-10-06
- Firmware: FM-1_096
- Plan: [`docs/fm1-va-096-tests.md`](../fm1-va-096-tests.md) §6
- Tool: the development preset probe's **Write timing** section in Chrome, over USB. Each preset
  was read, written back with exactly the bytes read, and read again; a run stops at the first
  preset that does not read back the same.
- What presets 097–112 held was not recorded; with the 8-Bit pack installed they are its 16
  presets.

**Read back** is the time from sending a write to the end of its read-back. **Gap** is the wait
after one read-back before the next write.

| Run | Timing       | Presets                              | Reply wait | Gap     | Outcome       | Per preset | Whole run | Read back    | Crackle         |
| --- | ------------ | ------------------------------------ | ---------- | ------- | ------------- | ---------- | --------- | ------------ | --------------- |
| 1   | T1           | 097–112                              | 1.5 s      | 1500 ms | All 16 landed | 2.95 s     | 47.1 s    | 1528–1543 ms | None heard      |
| 2   | T2 1000 ms   | 097–112                              | none       | 1000 ms | All 16 landed | 1.15 s     | 18.4 s    | 201–213 ms   | None heard      |
| 3   | T2 250 ms    | 097–112                              | none       | 250 ms  | All 16 landed | 0.44 s     | 7.1 s     | 198–211 ms   | None heard      |
| 4   | T2 120 ms    | 097–112                              | none       | 120 ms  | All 16 landed | 0.32 s     | 5.1 s     | 197–211 ms   | None heard      |
| 5   | T2 0 ms      | 097–112                              | none       | 0 ms    | All 16 landed | 0.21 s     | 3.4 s     | 199–211 ms   | None heard      |
| 6   | T2 0 ms      | 097–112                              | none       | 0 ms    | All 16 landed | 0.21 s     | 3.3 s     | 200–212 ms   | Not noted       |
| 7   | T3 (T2 0 ms) | 001–032                              | none       | 0 ms    | All 32 landed | 0.21 s     | 6.7 s     | 199–210 ms   | Not noted       |
| 8   | T3 (T2 0 ms) | 001–032                              | none       | 0 ms    | All 32 landed | 0.21 s     | 6.7 s     | 197–211 ms   | None heard      |
| 9   | T4 (T2 0 ms) | 001, the preset selected and playing | none       | —       | Landed        | —          | 0.2 s     | 208 ms       | No glitch heard |

Not run: T2 500 ms, which falls between two clean runs.

## Findings

- Every write in every run read back byte for byte: 161 writes, 97 of them with no gap at all.
- After a 1.5 s reply wait, the FM1 answered the read-back in 28–43 ms. Read straight after the
  write, it answered in 197–213 ms, which suggests it finishes storing the write before it answers
  the read. The read-back therefore paces the writes even with no gap.
- No crackle was heard at any timing that was noted, and writing the preset selected on the FM1
  while it played made no audible glitch (T4).
- If 097–112 held the 8-Bit pack, its 16 presets wrote back exactly in every 097–112 run, which
  answers M4 of the plan for all 16.

## What the editor does with it

From `FM-1_096`, `fm1VaPresetWriteTiming` drops the 1.5 s reply wait and spaces writes 320 ms
apart, about 120 ms after the read-back, as FM-1+VA's Device Manager does. Earlier releases keep
the 3 s spacing and the reply wait, since only `FM-1_096` was tested.
