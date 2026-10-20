# Official Open V14: identity and sending patches to DX7 tracks, 2026-10-20

First run of the editor against Official Open on V14, over USB from macOS Chrome, development
build, on the orange FM1 updated from V12/V13 to V14. Nothing new was sent: this is the editor's
own sends, approved on 2026-10-16 (identity query, command 0, single-voice dump to a DX7 track).
The user's project was saved on the FM1 first.

- Tracks: 1 and 4 run DX7, track 2 runs 303.
- Log: `official-open-v14-tracks-midi-log-2026-10-20.txt` (exported by the editor).

| Check                       | Result                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                    | The badge read **M-VAVE OPEN V14**, so the reply was `FM-1_8000014` and the editor classified it. The raw reply is not in the log, which starts at the first command 0 |
| Command 0 before every send | One 10-byte request and one 28-byte reply per click, a new token each time (`01`–`0F`), every reply valid                                                              |
| Dump to track 1 (channel 1) | 163 bytes, `F0 43 00 00 01 1B …`; the track's sound changed to the voice sent                                                                                          |
| Dump to track 4 (channel 4) | `F0 43 03 00 01 1B …`; the same behaviour as track 1, and track 1 was not touched                                                                                      |
| Track 2 (303)               | Nothing sent. The page showed "Track 2 runs 303, which cannot take a patch, so nothing was sent…" and the log "TIBET was not sent: track 2 runs 303…"                  |
| Notification                | A slot click showed "Sent “TOM TOMS” to track 1. Save the project on the FM1 to keep it." and the log carried the same message for each send                           |
| Effects                     | None sent: the log notes "This firmware takes no FM1 effect controllers" after each patch                                                                              |
| Duplicate sends             | None: one dump per click                                                                                                                                               |

## Observations

- **Home screen name lags.** After a dump the track's edit screen names the new voice at once and
  the sound changes on both screens, but the main screen keeps the old patch name until the user
  enters and leaves the track's screen. Seen on tracks 1 and 4. The same main-screen behaviour was
  seen on V12 (it shows the track's program, not its voice). Nothing the editor can change.
- **Command 0 replies changed between runs.** The replies at 20:54–20:57 end `… 00 02 14 00 30 60
40 01 03 00 <sum>`; those at 21:02 end `… 00 00 10 28 30 60 40 01 03 00 <sum>`. The user may have
  changed the tracks' engines in between; this was not asked, so it is not confirmed.
- **Undo not tested.** The user could not find an undo control on the FM1, so open question 1 of
  the released-source section stays open.

Nothing in this run involves OTA, the loader, or Flash.
