# Features

The full feature list. The [README](../README.md) has the short version,
[getting started](getting-started.md) walks through a first session, and the
[user guide](user-guide.md) covers each area in more depth.

- Start with the FM-1's four factory banks in banks A–D, so slot names match the patches on a stock FM1
- Add up to six additional banks from the bundled DX7 bank catalog or your own SysEx file, so every bank starts populated
- Rename, describe, or delete banks, with descriptions available from their tabs
- Replace a populated bank only after confirming that its current patches will be overwritten
- Reset banks A–D to the four factory banks at any time without removing additional banks
- Download a backup of every bank, FM1 effect setting, and saved bank in one file, and restore it later
- Save named copies of a bank in the browser, then load, rename, copy, download, or delete them later
- Copy a patch and its FM1 effects over any slot in a bank that has patches, from its **⋮** menu or
  by dragging it onto a bank
- Undo deleting a bank, resetting to the factory patches, restoring a backup, importing over or loading into a bank, or copying a patch over a slot, from its notification or with Cmd/Ctrl + Z
- Keep imported and edited banks across page reloads in IndexedDB browser storage
- Retry browser-storage failures or continue explicitly with a session-only library without overwriting unreadable saved data
- Import standard Yamaha DX7 32-voice bulk SysEx banks
- Download a single patch as a DX7 `.syx` file, or import one over a slot, from the slot's **⋮** menu (**Download patch** and **Import patch…**)
- Receive patches over MIDI with a step-by-step wizard: a 32-voice bank from a stock FM1 on V16's Bank Export, with **Receive from the FM1…** in a bank's **⋮** menu or **Library actions**, or one DX7 single-voice dump from Dexed, a DX7, or another editor, with **Receive over MIDI…** in a slot's **Import patch…** dialog. It says what to do on the sending device, listens on the input monitor only while its listening step shows, sends nothing, lets you hear what arrived, and offers Undo
- Share a patch as a link with **Copy share link** in its **⋮** menu: the patch travels in the link's `#` fragment, which never reaches a server, and opening the link shows the patch to play and add to a slot of your choice, with Undo
- Search every bank at once, and reorder patches with pointer or keyboard drag-and-drop
- Find duplicate patches: the patches in your banks whose voice settings match, renamed copies included, with a way to go to each one
- Search your saved banks and the 76 bundled DX7 catalog banks at the same time, play any match through the FM1 edit buffer, and copy it into a slot of your own, or double-click it to copy it and open it in the editor
- Export one bank as `.syx`, or every loaded bank as a `.zip` of SysEx files for Dexed, a DX7, or other DX7 tools
- Edit all standard DX7 voice parameters with live MIDI updates
- Compare the six operators as table rows under shared column headings on a wide window, and open any one in place beneath its row with its full controls; narrower windows show them as a rack of columns
- Type an operator's ratio, or its fixed frequency in hertz, and Coarse and Fine move to the nearest setting the FM1 can play
- Mute or solo any operator straight from its rack column, without opening it first
- Copy an operator's settings, or only its envelope, and paste them onto another operator, in the same patch or a different one
- Fold the operators and effects panels away to focus the editor on the sections in use
- Visualise all 32 DX7 algorithms, including carrier and modulator roles and each operator's frequency
- Edit four-stage amplitude and pitch envelopes graphically or with precise numeric controls
- Start the pitch envelope from Flat, Attack blip up, Attack drop, Scoop, or Release fall shapes as a single undo step
- Watch the LFO on a scrolling scope that follows the selected wave and LFO Speed
- Edit the FM1's filter, reverb, delay, distortion, chorus, and phaser within their documented ranges
- Start any FM1 effect from a preset in its box, such as Small room, Slapback, Chorus wash, or Warm drive, as a single undo step
- See a live animated scope for every FM1 effect, drawn from its parameters: filter response, delay taps, chorus drift, reverb tail, distortion clipping, and phaser sweep
- Start from the Presets menu: Yamaha's DX7 INIT VOICE, a musically constrained random DX7 voice, or six sound-shaping presets, each as a single undo step
- Open contextual help for voice, envelope, algorithm, and effect controls
- Rename patches using DX7-compatible 10-character names
- Undo and redo edits within the voice editor
- Compare edits with the saved sound, switching the FM1 between the two while editing pauses, without losing the edits or their undo history
- Save edits to the browser library, resend them, or revert both the editor and FM1 to the last saved version
- Warn before leaving an unsaved editing session, with save, discard, and keep-editing choices
- Undo, redo, save, and leave the voice editor from the keyboard
- Jump to patch search, clear it, and open the lit slot from the keyboard
- Heart patches from any bank or search result into Favourites, reorder and edit them, and send them to the FM1 as a bank
- Send individual patches to the edit buffer or a complete 32-patch bank over Web MIDI in Chrome, Edge, Opera, or Firefox
- Audition any patch with a click: a slot in banks A–D selects the matching FM1 slot with MIDI Program Change, then sends the library's voice to the edit buffer, and a patch from an added bank goes straight to the edit buffer
- Select MIDI input and output ports, with separate channels for notes/program changes and FM1 effects
- Recognise Baud Girl's FM-1+VA replacement firmware, and send it patches as parameter changes so auditions never overwrite a stored preset
- Import the FM1's banks A–D with their effects, read straight from an FM1 on Baud Girl's firmware or from the presets file **Back up everything** saves in Baud Girl's Device Manager, into the library banks you choose or new ones, with a preview that marks the patches differing from the library, and Undo
- Write library patches back to an FM1 on Baud Girl's firmware, preset by preset with their effects, only where they differ, each read back to confirm it
- Monitor incoming and outgoing MIDI messages, inspect SysEx data, and copy it as hexadecimal
- Play notes on the FM1 from an on-screen keyboard, or loop one of six short phrases to audition a patch hands-free
- Release hanging notes on the FM1 with a MIDI panic button
- Use the interface in British or American English, French, Spanish, German, Brazilian Portuguese, Ukrainian, or Simplified Chinese
- Use a dark CRT-terminal interface whose accent, product image, and tab icon follow any of the six FM1 colour finishes, with contrast checked to WCAG 2.2 AA in each
- Install the editor as a standalone desktop app in browsers that support installation

1. Open the app in a supported browser. A first visit opens a short welcome; the **Help** button (**?**) in the header opens the full guide at any time.
2. Switch **MIDI online** on and grant MIDI/SysEx permission. Firefox asks you to install a small site permission add-on instead; accept it.
3. Open **Settings** to select the FM1 as the MIDI output and the input monitor and, if needed, the note/program and effects channels. With the input selected, the app asks the FM1 which firmware it runs and shows the answer under **FM1 firmware**.
4. Select Bank 1, 2, 3, or 4. On first use these contain FM-1 Banks 1, 2, 3, and 4, the patches the FM1 ships with. Use **Add new bank…** to add another bank in a few steps: name and describe it, then populate it either from the bundled DX7 catalog, where you pick a collection and then a bank in it, or from your own standard 32-voice DX7 SysEx file. The catalog holds banks from the [Yamaha Black Boxes collection](https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/) mene311's themed FM-1 banks, and Aquanode's Dexed presets.
5. Click a patch to select the matching FM1 slot and play it: the voice and effects in your library go to the edit buffer, so you hear the patch as it is in the browser even before its bank is on the FM1. The FM1 has four banks, so a patch in an added bank is only sent to the edit buffer. Double-click it, or choose **Edit** from its **⋮** menu, to load it into the edit buffer and open the voice editor. Changes are sent live once the initial voice and effects have reached the FM1. On the [FM-1+VA](https://baudgirl.com/work/FM-1+VA) replacement firmware, which stores a single-patch transfer over the selected preset, and whenever the firmware is not identified, a patch is sent as parameter changes instead, so it stays an unsaved edit until you press **SAVE** on the FM1.
6. Use **Save to library** to keep an edit, or open its adjacent menu to resend the working copy or **Revert to saved** on both the editor and FM1.
7. Select the heart on any patch, or search result, to keep it in **Favourites**, below the banks on the left. Favourites can be played, edited, and reordered like a bank, and editing a favourite or the patch it came from updates both.
8. Return to the librarian and choose **Send to FM1** to transfer the selected bank, or Favourites. Favourites is sent as a 32-patch bank: a shorter list is filled with INIT VOICE, and from a longer one only the first 32 are sent. The instructions before sending say which.
9. When the FM1 displays its bank selection screen, turn knob 1, 2, 3, or 4 to choose destination bank A, B, C, or D. The hardware saves the bank automatically after a short delay. FM-1+VA before FM-1_079 asks **Replace Bank A?** instead, starting on bank A: turn **ALGORITHM** to the destination bank, then turn **SELECT** to **Replace** and press **SEL**. It also replaces that bank's factory presets for good. The instructions before sending follow the firmware the FM1 named. From FM-1_079, FM-1+VA needs no steps on the FM1: you choose its bank A–D in the app, which writes only the patches that differ, with their effects, and a short Favourites leaves the rest of the bank as it is.
