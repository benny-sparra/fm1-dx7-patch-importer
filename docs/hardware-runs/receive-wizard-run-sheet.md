# Receive patches wizard: run sheet

Checks for PR #364 on the orange FM1 (stock V16, `FM-1_016`), with the editor from the dev server
over HTTPS. The **MIDI log** is a dialog, so it cannot stay open while you work, but it keeps its
history: open it at the end of each section, or download it once at the end. Nothing but the
identity query, sent when a port changes, should appear as sent.

## 1. Entry points

1. **Library actions** (⋮ beside the search) lists **Receive from the FM1…** above **Find duplicate
   patches…**, on one line. It opens **Receive patches** with **An FM1 on M-VAVE's V16** chosen.
2. A bank's ⋮ menu lists **Receive from the FM1…** under **Import DX7 bank…**. Closing the wizard
   returns focus to that menu's ⋮.
3. A slot's ⋮ menu still lists **Receive patch…**. It opens the wizard with **One patch from another
   device** chosen. Closing it returns focus to the slot.

## 2. Bank Export, the normal way

1. With MIDI offline, open the wizard and choose **Next**. The listening step offers **Switch MIDI
   online** and does not yet say to start Export.
2. Switch MIDI online from there. The input monitor dropdown appears, set to the FM1, and the
   status says **Listening on "…"**, then "Now open GLOBE on the FM1…".
3. On the FM1, GLOBE → Export a recognisable bank. The status says a bank of 32 arrived and names
   its first patch. **Next** is enabled.
4. **Next**: the 32 patches show. Click two or three: each plays on the FM1.
5. **Next**: the bank you opened from is chosen, with the warning naming it. Choose another bank,
   and the warning follows.
6. **Replace**: the notification says the patches were imported, and **Undo** puts the bank back.
   (Undo after a received bank was never tried on hardware before.)
7. Open the MIDI log: nothing sent since step 3.

## 3. Bank Export started too early

1. Open the wizard but stay on the source step. Start Export on the FM1. It should end in
   **Receive Timeout** (2026-10-25).
2. Choose **Next** in the wizard, then start Export again. The bank arrives with no power cycle.
   The listening step's timeout line says to do exactly this.

## 4. One patch

1. From a slot's **Receive patch…**, choose **Next**, then send one patch from Dexed (or another
   editor) as a DX7 single-voice dump.
2. The status names it. **Next** shows it with a play button that plays it on the FM1.
3. **Next**: the slot it was opened from is chosen in **Slot to replace**, with the warning naming
   both patches. **Replace**, then **Undo**.

## 5. Look and feel

1. At 320 px (phone), each step fits without sideways scrolling, and **Back** and **Next** stay in
   the footer.
2. Keyboard only: Tab and the arrow keys reach every choice; **Next** moves focus to the new
   step's first control.
3. Switch the language to Deutsch and Українська, and check that the steps read naturally.
