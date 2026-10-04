# FM-1+VA controller test run

- Started: 2026-10-04 21:31
- Firmware: FM-1_093
- Setup: yes
- Destination: 0 USB Composite Device

Session from 2026-10-04 21:31, resuming at prep.

## V1 · Defaults of a new Virtual Analog preset

- Waveform: Super 0
- Super: 0
- Detune: 50
- Drift: 0
- Sub: 0
- Noise: 0
- PWM: 0
- Level: 99
- Mono: Off
- Filter Type: LP12
- Cutoff: 20k
- Resonance: 0
- Filter Envelope: 0
- Filter Decay: 0
- Filter Shape: square?
- Filter Velocity: 0
- Filter Key Tracking: 0
- LFO to Cutoff: 0
- LFO Wave: triangle
- LFO Speed: 35
- LFO Pitch Mod Depth: 0
- LFO Amp Mod Depth: 0
- LFO Delay: 0
- LFO Pitch Sensitivity: 3
- LFO Sync: off
- Envelope switch (On/Off): Off
- Attack: 0
- Decay: 0
- Sustain: 0
- Release: 0

## V2 · Each CC reaches its row (run 1)

- CC 24 = 0: `to_fm1 B0 18 00` → waveform sine
- CC 24 = 64: `to_fm1 B0 18 40` → Waveform tri
- CC 24 = 127: `to_fm1 B0 18 7F` → wave
- CC 24, held note changed: notes; dot on HOME: y
- CC 25 = 0: `to_fm1 B0 19 00` → super 0
- CC 25 = 64: `to_fm1 B0 19 40` → super 50
- CC 25 = 127: `to_fm1 B0 19 7F` → super 100
- CC 25, held note changed: n; dot on HOME: y
- CC 26 = 0: `to_fm1 B0 1A 00` → detune 0
- CC 26 = 64: `to_fm1 B0 1A 40` → detune 50
- CC 26 = 127: `to_fm1 B0 1A 7F` → detune 100
- CC 26, held note changed: y; dot on HOME: y
- CC 27 = 0: `to_fm1 B0 1B 00` → drift 0
- CC 27 = 64: `to_fm1 B0 1B 40` → drift 50
- CC 27 = 127: `to_fm1 B0 1B 7F` → drift 100
- CC 27, held note changed: not sure; dot on HOME: y
- CC 28 = 0: `to_fm1 B0 1C 00` → sub 0
- CC 28 = 64: `to_fm1 B0 1C 40` → sub 50
- CC 28 = 127: `to_fm1 B0 1C 7F` → sub 100
- CC 28, held note changed: y; dot on HOME: y
- CC 29 = 0: `to_fm1 B0 1D 00` → noise 0
- CC 29 = 64: `to_fm1 B0 1D 40` → noise 50
- CC 29 = 127: `to_fm1 B0 1D 7F` → noise 100
- CC 29, held note changed: y; dot on HOME: y
- CC 30 = 0: `to_fm1 B0 1E 00` → pwm 0
- CC 30 = 64: `to_fm1 B0 1E 40` → pwm 50
- CC 30 = 127: `to_fm1 B0 1E 7F` → pwm 100
- CC 30, held note changed: not sure; dot on HOME: y
- CC 31 = 0: `to_fm1 B0 1F 00` → type lp12
- CC 31 = 64: `to_fm1 B0 1F 40` → type bp
- CC 31 = 127: `to_fm1 B0 1F 7F` → type hp
- CC 31, held note changed: y; dot on HOME: y
- CC 52 = 0: `to_fm1 B0 34 00` → envelope 0
- CC 52 = 64: `to_fm1 B0 34 40` → envelope 50
- CC 52 = 127: `to_fm1 B0 34 7F` → envelope 100
- CC 52, held note changed: not sure; dot on HOME: y
- CC 53 = 0: `to_fm1 B0 35 00` → decay 0
- CC 53 = 64: `to_fm1 B0 35 40` → decay 50
- CC 53 = 127: `to_fm1 B0 35 7F` → missed that one, but probably decay 100
- CC 53, held note changed: not sure; dot on HOME: y
- CC 54 = 0: `to_fm1 B0 36 00` → shape 0
- CC 54 = 64: `to_fm1 B0 36 40` → shape 50
- CC 54 = 127: `to_fm1 B0 36 7F` → shape 100
- CC 54, held note changed: not sure; dot on HOME: y
- CC 55 = 0: `to_fm1 B0 37 00` → velocity 0
- CC 55 = 64: `to_fm1 B0 37 40` → velocity 50
- CC 55 = 127: `to_fm1 B0 37 7F` → velocity 100
- CC 55, held note changed: not sure; dot on HOME: y
- CC 56 = 0: `to_fm1 B0 38 00` → key trking 0
- CC 56 = 64: `to_fm1 B0 38 40` → keytracking 67
- CC 56 = 127: `to_fm1 B0 38 7F` → keytracking 100
- CC 56, held note changed: not sure; dot on HOME: y
- CC 57 = 0: `to_fm1 B0 39 00` → left ot cutoff 0
- CC 57 = 64: `to_fm1 B0 39 40` → LFO to cutoff 50
- CC 57 = 127: `to_fm1 B0 39 7F` → LFO to cutoff 100
- CC 57, held note changed: not sure; dot on HOME: y
- CC 71 = 0: `to_fm1 B0 47 00` → resonance 0
- CC 71 = 64: `to_fm1 B0 47 40` → resonance 50
- CC 71 = 127: `to_fm1 B0 47 7F` → resonance 100
- CC 71, held note changed: unsure; dot on HOME: y
- CC 74 = 0: `to_fm1 B0 4A 00` → cutoff 20
- CC 74 = 64: `to_fm1 B0 4A 40` → cutoff 632
- CC 74 = 127: `to_fm1 B0 4A 7F` → cutoff 20k
- CC 74, held note changed: y; dot on HOME: y
- CC 76 = 0: `to_fm1 B0 4C 00` → speed 0
- CC 76 = 64: `to_fm1 B0 4C 40` → speed 50
- CC 76 = 127: `to_fm1 B0 4C 7F` → speed 99
- CC 76, held note changed: unsure; dot on HOME: y
- CC 77 = 0: `to_fm1 B0 4D 00` → pitch mod depth 0
- CC 77 = 64: `to_fm1 B0 4D 40` → pitch mod depth 50
- CC 77 = 127: `to_fm1 B0 4D 7F` → pitch mod depth 99
- CC 77, held note changed: y; dot on HOME: y
- CC 78 = 0: `to_fm1 B0 4E 00` → delay 0
- CC 78 = 64: `to_fm1 B0 4E 40` → delay 50
- CC 78 = 127: `to_fm1 B0 4E 7F` → delay 99
- CC 78, held note changed: y; dot on HOME: y
- CC 70 = 0: `to_fm1 B0 46 00` → sustaon 0
- CC 70 = 64: `to_fm1 B0 46 40` → sustain 50
- CC 70 = 127: `to_fm1 B0 46 7F` → sustain 99 - sorry didn't see
- CC 70, held note changed: y; dot on HOME: y
- CC 72 = 0: `to_fm1 B0 48 00` → release 0
- CC 72 = 64: `to_fm1 B0 48 40` → release 50
- CC 72 = 127: `to_fm1 B0 48 7F` → release 100
- CC 72, held note changed: y; dot on HOME: y
- CC 73 = 0: `to_fm1 B0 49 00` → attack 0
- CC 73 = 64: `to_fm1 B0 49 40` → attack 50
- CC 73 = 127: `to_fm1 B0 49 7F` → attack 100
- CC 73, held note changed: y; dot on HOME: y
- CC 75 = 0: `to_fm1 B0 4B 00` → decay 0
- CC 75 = 64: `to_fm1 B0 4B 40` → decay 50
- CC 75 = 127: `to_fm1 B0 4B 7F` → decay 100
- CC 75, held note changed: y; dot on HOME: y

## V3 · List settings (run 1)

- CC 24 = 31: `to_fm1 B0 18 1F` → 20k 0 0 0
- CC 24 = 32: `to_fm1 B0 18 20` → 20k 0 0 0
- CC 24 = 63: `to_fm1 B0 18 3F` → waveform saw
- CC 24 = 64: `to_fm1 B0 18 40` → waveform tri
- CC 24 = 95: `to_fm1 B0 18 5F` → waveform tri
- CC 24 = 96: `to_fm1 B0 18 60` → waveform square
- CC 31 = 31: `to_fm1 B0 1F 1F` → type lp12
- CC 31 = 32: `to_fm1 B0 1F 20` → type lp24
- CC 31 = 63: `to_fm1 B0 1F 3F` → type lp24
- CC 31 = 64: `to_fm1 B0 1F 40` → type bp
- CC 31 = 95: `to_fm1 B0 1F 5F` → type bp
- CC 31 = 96: `to_fm1 B0 1F 60` → type hp
- CC 56 = 31: `to_fm1 B0 38 1F` → keytrackong 0
- CC 56 = 32: `to_fm1 B0 38 20` → keytracking 33
- CC 56 = 63: `to_fm1 B0 38 3F` → keytracking 33
- CC 56 = 64: `to_fm1 B0 38 40` → keytracking 67
- CC 56 = 95: `to_fm1 B0 38 5F` → keytracking 67
- CC 56 = 96: `to_fm1 B0 38 60` → keytracking 100

## V4 · Continuous scaling

- CC 25 = 0: `to_fm1 B0 19 00` → -
- CC 25 = 1: `to_fm1 B0 19 01` → Super 1
- CC 25 = 2: `to_fm1 B0 19 02` → Super 2
- CC 25 = 32: `to_fm1 B0 19 20` → Super 25
- CC 25 = 63: `to_fm1 B0 19 3F` → Super 50
- CC 25 = 64: `to_fm1 B0 19 40` → Super 50
- CC 25 = 65: `to_fm1 B0 19 41` → Super 51
- CC 25 = 96: `to_fm1 B0 19 60` → Super 76
- CC 25 = 126: `to_fm1 B0 19 7E` → Super 99
- CC 25 = 127: `to_fm1 B0 19 7F` → Super 100
- CC 53 = 0: `to_fm1 B0 35 00` → Decay 0
- CC 53 = 1: `to_fm1 B0 35 01` → Decay 1
- CC 53 = 2: `to_fm1 B0 35 02` → Decay 2
- CC 53 = 32: `to_fm1 B0 35 20` → Decay 25
- CC 53 = 63: `to_fm1 B0 35 3F` → Decay 50
- CC 53 = 64: `to_fm1 B0 35 40` → Decay 50
- CC 53 = 65: `to_fm1 B0 35 41` → Decay 51
- CC 53 = 96: `to_fm1 B0 35 60` → Decay . 76
- CC 53 = 126: `to_fm1 B0 35 7E` → Deay 99
- CC 53 = 127: `to_fm1 B0 35 7F` → Decay 100
- CC 74 = 0: `to_fm1 B0 4A 00` → Cutoff 20
- CC 74 = 1: `to_fm1 B0 4A 01` → Cutoff 21
- CC 74 = 2: `to_fm1 B0 4A 02` → Cutoff 23
- CC 74 = 32: `to_fm1 B0 4A 20` → Fucoff 112
- CC 74 = 63: `to_fm1 B0 4A 3F` → Cutoff 632
- CC 74 = 64: `to_fm1 B0 4A 40` → Cutoff 632
- CC 74 = 65: `to_fm1 B0 4A 41` → Cutoff 678
- CC 74 = 96: `to_fm1 B0 4A 60` → Cutoff 3.8k
- CC 74 = 126: `to_fm1 B0 4A 7E` → Cutoff 18k
- CC 74 = 127: `to_fm1 B0 4A 7F` → Cutoff 20k

## V5 · The Envelope switch

- After the erase, Envelope: On
- CC 73 = 64: `to_fm1 B0 49 40` → Yes
- After stepping away and back: yes

## V6 · Channels and preset kinds

- CC 25 = 127 on channel 2: `to_fm1 B1 19 7F` → nothingIcould see
- MIDI Channel 1, CC 25 = 0 on channel 3: `to_fm1 B2 19 00` → nothing
- MIDI Channel 1, CC 25 = 0 on channel 1: `to_fm1 B0 19 00` → Super 0 came up on the screen
- FM preset, CC 24 = 127: `to_fm1 B0 18 7F` → nothing
- FM preset, CC 31 = 127: `to_fm1 B0 1F 7F` → nothing
- FM preset, CC 57 = 127: `to_fm1 B0 39 7F` → nothing
- FM preset, CC 74 = 0: `to_fm1 B0 4A 00` → brightness 0

## V8 · Fast changes

- CC 74 swept 0→127→0 (256 messages, 0 failed): no; ends on: 20
- CC 25 swept 0→127→0 (256 messages, 0 failed): no; ends on: 0

## Repeat run after a power cycle

## V2 · Each CC reaches its row (run 2)

- CC 24 = 0: `to_fm1 B0 18 00` → Waveform sine
- CC 24 = 64: `to_fm1 B0 18 40` → Waveform tri
- CC 24 = 127: `to_fm1 B0 18 7F` → Waveform square
- CC 24, held note changed: y; dot on HOME: y
- CC 25 = 0: `to_fm1 B0 19 00` → Super 0
- CC 25 = 64: `to_fm1 B0 19 40` → Super 50
- CC 25 = 127: `to_fm1 B0 19 7F` → Super 100
- CC 25, held note changed: y; dot on HOME: y
- CC 31 = 0: `to_fm1 B0 1F 00` → type lp12
- CC 31 = 64: `to_fm1 B0 1F 40` → type bp
- CC 31 = 127: `to_fm1 B0 1F 7F` → type hp
- CC 31, held note changed: y; dot on HOME: y
- CC 74 = 0: `to_fm1 B0 4A 00` → Cutoff 20
- CC 74 = 64: `to_fm1 B0 4A 40` → Cutoff 632
- CC 74 = 127: `to_fm1 B0 4A 7F` → Cutoff 20k
- CC 74, held note changed: y; dot on HOME: y

## V3 · List settings (run 2)

- CC 24 = 31: `to_fm1 B0 18 1F` → -
- CC 24 = 32: `to_fm1 B0 18 20` → Wavefor saw
- CC 24 = 63: `to_fm1 B0 18 3F` → -
- CC 24 = 64: `to_fm1 B0 18 40` → Waveform tri
- CC 24 = 95: `to_fm1 B0 18 5F` → -
- CC 24 = 96: `to_fm1 B0 18 60` → Waveform square

## V7 · The editor's patch over a Virtual Analog preset

- Waveform to Square: `to_fm1 B0 18 7F`
- Saved; after stepping away and back: y
- After the editor's patch: plays it: y; EDIT shows: FM; dot: yes
- After stepping away and back: y

## Clean-up

- Done 2026-10-04 22:15.

## Clarifications after the run

Asked on 2026-10-04, after the ledger was written:

- V1: Waveform showed Saw after the erase (recorded above as “Super 0”).
- V1 and V5: erasing again and checking showed Envelope Off, with Attack, Decay, Sustain, and
  Release 0. V5 started with the Envelope already On, so it did not show CC 73 switching it on.
- V7: after stepping PRESETS away and back without SAVE, the stored Virtual Analog preset came back.
