# V16 Voices: step-by-step checks

Before building the Voice strip (`docs/feature-backlog.md`, "Use V16's eight Voices", step 2), on
the orange FM1 (stock V16). Tick each step as you go, and note anything that differs. The run of
2026-10-25 (`stock-v16-2026-10-25.md`) used only two Voices; this checks all eight.

The editor sends a Program Change and the patch when you click a slot. The Program Change goes to
the Voice on the note channel, and the patch to the Voice selected on the FM1's screen. Keep
**Voice 1 selected on the FM1's screen** throughout, so the patches only ever land on Voice 1, and
don't press SAVE at the end: turning the FM1 off and on puts everything back.

## Before you start

1. Connect the orange FM1 to the Mac with USB.
2. Open the editor from `main` (production or a dev server), switch **MIDI online**, and check the
   badge says V16.
3. Open **MIDI log**, so you can see what is sent and received.
4. On the FM1, write down each Voice's current settings (preset, channel, On/Off), to put them
   back afterwards if you want to keep them.

## Test 1: eight Voices, one Program Change each

1. On the FM1, set Voices 1–8 to MIDI channels 1–8, all **On**. Make sure none is on **All**.
2. In the editor's header, choose **Ch 2** as the note channel, then click slot **A05**.
   - [ ] Voice 2 now plays preset A05. Check on the FM1, and play a note on channel 2 with the
         editor's keyboard.
   - [ ] No other Voice changed preset.
3. Repeat for channels 3–8, a different slot each time (for example A06–A11).
   - [ ] Each time only the Voice on that channel changes preset.
4. Choose **Ch 1** and click **A12**.
   - [ ] Voice 1 plays A12, and Voices 2–8 keep theirs.

## Test 2: a Voice switched Off

1. On the FM1, switch **Voice 4 Off**, and note its preset.
2. In the editor, choose **Ch 4** and click a slot it isn't playing, such as **A01**.
   - [ ] Write down whether Voice 4's preset changed while it was Off.
3. Switch Voice 4 back **On**.
   - [ ] Write down which preset it plays now.

## Test 3: which channel the FM1's keys send on

1. On the FM1, select **Voice 3** on the screen (channel 3), and press a few keys on the FM1.
   - [ ] In the MIDI log, write down which channel the notes arrive on.
2. Select **Voice 6** (channel 6) and press keys again.
   - [ ] Write down the channel again.
3. Select **Voice 1** again before going on.

If the notes follow the Voice selected on the screen, the editor could learn that Voice's channel
from a key press.

## Test 4 (optional): CC 7 on one Voice's channel

The editor has no control that sends CC 7, so this needs another MIDI tool that can send a
Control Change (skip it if there isn't one to hand).

1. Play a held note on channel 2 and one on channel 3, then send **CC 7 = 20 on channel 2**.
   - [ ] Write down whether only Voice 2 got quieter, both did, or neither.
2. Send **CC 7 = 127 on channel 2** to put it back.

## Afterwards

1. Turn the FM1 off and on without saving, or put back the settings you wrote down.
2. Save the MIDI log (**Download**) and attach it to the run record in `docs/hardware-runs/`.
