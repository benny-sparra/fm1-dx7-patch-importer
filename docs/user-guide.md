# User guide

This guide covers the M-VAVE FM1 Editor & Librarian in detail. For requirements and a quick start,
see the [README](../README.md).

## Banks, transfers, and settings

After the first successful connection, the app remembers the selected MIDI ports and both channels and reconnects automatically on future visits. Switch **MIDI online** off to disable automatic connection.

The selected bank in the browser does not determine the hardware destination—the final destination is chosen on the FM1 itself.

To send one sound instead, open its patch in the editor. The app selects the matching hardware slot and sends the voice and its FM1 effects to the edit buffer; hold **SAVE** on the FM1 to store it on the hardware.

To import another bank, open that workspace bank's menu, choose **Import DX7 bank**, and select a compatible `.syx` file. Replacing a populated bank requires confirmation. The same menu lets you edit the bank title and description, download the bank, or delete it when more than one workspace bank exists. Use the menu in the patch-bank header to download all loaded banks or restore factory banks A–D. Additional workspace banks are left intact. If a bank is empty, you can load the built-in demo bank instead.

The interface follows the browser language on first use when it is supported. Change it later in **Settings**; the selection is remembered. Settings also provides separate channels for notes/program changes and effects because the FM1 defaults its effects controls to MIDI channel 2.

## The voice editor

The editor is laid out as a rack. The six operators stand side by side as columns: five show a compact readout, and the selected operator grows in place to carry its full controls. On narrower screens the open operator drops onto a row of its own. Each column has its own mute and solo buttons, so an operator can be silenced without opening it.

Click anywhere on the title strip of the operators or effects panel to fold it away, and click again to bring it back. Each panel folds on its own and keeps its title visible, so a long editor can be trimmed to the sections you are working on.

**Randomise** generates a new DX7 voice with the DX Android "Android-1" approach rather than fully random values: carriers stay near the fundamental and loud, envelopes always peak, and keyboard scaling, velocity sensitivity and detune are left neutral. The patch name and FM1 effect settings are kept, and the new voice is a single undo step.

The pitch envelope has a presets menu of starting shapes: **Flat**, **Attack blip up**, **Attack drop**, **Scoop**, and **Release fall**. Each one is applied as a single undo step.

The LFO and every FM1 effect open with a small animated scope drawn from their current settings. The LFO scrolls its selected wave at a rate set by LFO Speed. The filter shows its response curve, delay its echo taps, chorus its drifting copies, reverb its tail, distortion its clipped wave, and phaser its sweeping notches. A scope dims when its effect is bypassed or when the LFO has no modulation depth. With reduced motion enabled, each scope shows a still frame instead.

## Keyboard shortcuts

The **?** guide lists these on its own tab. Each view binds the actions that also appear in its
toolbar. `Ctrl` stands in for `Cmd` on Windows and Linux, and the matching button or field shows the
shortcut in its tooltip for the current platform.

In the patch banks:

| Shortcut           | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `/`                | Jump to the search field                                    |
| `Cmd`/`Ctrl` + `F` | Jump to the search field, selecting whatever it holds       |
| `Esc`              | Clear the search                                            |
| `Enter`            | Play the focused slot, then open the lit slot in the editor |

In the voice editor:

| Shortcut                     | Action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `Cmd`/`Ctrl` + `Z`           | Undo the last edit                                                      |
| `Cmd`/`Ctrl` + `Shift` + `Z` | Redo the undone edit                                                    |
| `Cmd`/`Ctrl` + `S`           | Save to Library                                                         |
| `Esc`                        | Return to the patch banks, prompting first if there are unsaved changes |

These act on the view as a whole and stay out of the way of everything else: they are ignored while
a dialog is open, `Esc` closes an open menu before the view reacts to it, and a shortcut that takes
a modifier still works while a text field has focus, so `Cmd`/`Ctrl` + `S` saves without leaving the
patch-name field. Bare keys are left to whatever is being typed into, so `/` and `Esc` behave
normally inside the search field, where `Esc` clears it.

`Enter` gives the keyboard the route the mouse already had through double-click: it plays an unlit
slot as a click would, and opens the slot that is already lit. The toolbar's **Edit** button
remains the signposted way in.

Individual controls keep their own keyboard behaviour. Rotary controls and envelope points respond
to the arrow keys, `Home`, `End`, `Page Up`, and `Page Down`, and the bank tabs move with the arrow
keys.

The patch grid is a single tab stop. The arrow keys move between slots, following the rows as the
grid reflows, and `Home` and `End` jump to the first and last slot. Moving only changes which slot
has focus: because selecting one sends a Program Change and plays it on the FM1, that waits for
`Enter`. Each slot's grip handle stays separately reachable for keyboard reordering.

The on-screen piano plays from the computer keyboard while it is open, using the usual two-row
layout: `A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K` from the root note upwards,
with `Z` and `X` shifting the octave down and up.

## SysEx compatibility

The DX7 import feature intentionally validates bank files before loading them. A compatible file must:

- contain exactly 32 packed DX7 voices
- be exactly 4,104 bytes long
- use the Yamaha DX7 32-voice bulk dump header and terminator
- contain a valid Yamaha checksum

Single-voice dumps, larger archive files, and banks using another SysEx format are not accepted.

The browser library is the source of truth. The current FM1 firmware does not document transmission of stored voices or banks over MIDI, so the librarian cannot import a bank directly from the hardware. Keep `.syx` source files or download browser banks as backups. If M-VAVE adds bulk-dump output in a future firmware release, device-to-browser bank import can be added without changing the saved library format.
