# Switching FM1 firmware

How to move one FM1 between M-VAVE's stock firmware, Baud Girl's
[FM-1+VA](https://baudgirl.com/work/FM-1+VA), Hügelton Instruments'
[Felucca](https://hugelton.github.io/Felucca/), and isod89's
[SLOOP](https://github.com/isod89/sloop-fm1), a groovebox firmware built on Felucca, and M-VAVE's
own [Official Open](https://open.m-vave.com/fm1-workbench), an eight-track groovebox. Use the stock
firmware as the middle point: go back to it before moving from one replacement firmware to another.
Written for M-VAVE V15, FM-1+VA `FM-1_093`, and Felucca 1.5.1, from each project's own pages as they
stood on 12 October 2026 (Felucca's source as of its 11 October commit), SLOOP 2.2, as it stood on
5 October 2026, and Official Open V13, from the FM1 Workbench's own manual as it stood on
18 October 2026.

This app never installs firmware. Every step below uses the firmware projects' own tools.

```mermaid
flowchart LR
  VA["FM-1+VA<br/>Baud Girl · FM-1_093"]
  Stock["Stock<br/>M-VAVE · V15"]
  Felucca["Felucca<br/>Hügelton · 1.5.1"]
  Sloop["SLOOP<br/>isod89 · 2.2"]
  Open["Official Open<br/>M-VAVE · V13"]
  Stock -- "FM-1+VA Install page" --> VA
  VA -- "same page, V15 file" --> Stock
  Stock -- "Felucca Install page" --> Felucca
  Felucca -- "M-UPGRADE + V15" --> Stock
  Stock -- "SLOOP installer" --> Sloop
  Sloop -- "M-UPGRADE + V15" --> Stock
  Stock -- "Workbench force flash" --> Open
  Open -- "Workbench Restore original V15" --> Stock
```

No direct route between FM-1+VA and Felucca or SLOOP is documented. Felucca and SLOOP share an
installer, so moving straight between them may work, but neither project documents it (see
[Between Felucca and SLOOP](#between-felucca-and-sloop)).

## Before any switch

The FM1 cannot send its presets back to this app, so your library is your only copy of its patches.

- In this app, choose **Download backup** from the menu in the patch-bank header.
- Leaving FM-1+VA: in its Device Manager, press **Back up everything**. It saves all 128 presets as
  one `.syx` file and the 16 patterns as another. Only FM-1+VA can restore them, with **Install a
  backup** in the Device Manager; this app's **Import Baud Girl presets…** reads only the
  presets file's patches.
- Leaving SLOOP: in its [web editor](https://isod89.github.io/sloop-fm1/webapp/editor/), open
  **Library** and use **Export bank** under **User presets on the device**, and **Export library**
  for the sounds kept in the editor. No export of SLOOP's projects (its patterns and songs) is
  documented.
- Leaving Official Open: in the [FM1 Workbench](https://open.m-vave.com/fm1-workbench), open
  **Projects & sounds** and back up the current project and the sample bank. Load each other
  project slot you want to keep and back it up too, one at a time. Project files hold no audio, so
  keep the sample bank's `.fm1s` file with them.
- Have M-VAVE's files ready from [m-vave.com/download](https://www.m-vave.com/download):
  **M-UPGRADE** (PC Software, Windows or Mac) and **FM-1 V15** (PC Firmware). Leaving Felucca or
  SLOOP depends on them.
- Plug the USB cable straight into the computer, not a hub.
- Close every other app using the FM1. In this app, switch MIDI off.

## Stock to FM-1+VA

The install takes under a minute, and your saved presets and patterns are kept.

1. Open FM-1+VA's **Install** page in Chrome or Edge, and allow MIDI access.
2. Click **Check your FM-1**, then complete the checklist.
3. Click **Install** and keep the FM1 connected. The display goes dark while it installs; that is
   normal.

The installer will not reinstall the release the FM1 already runs. The startup screen shows the
version, such as VERSION 93 for `FM-1_093`.

## FM-1+VA to stock

FM-1+VA's own installer puts M-VAVE's firmware back; M-UPGRADE is not needed for this direction.

1. In FM-1+VA's Device Manager, press **Back up everything**.
2. On its Install page, choose **Install a file from your computer** and pick M-VAVE's V15
   `FM-1.fwsc`.
3. Follow the usual install steps.

Virtual Analog and 8-Bit presets do not play on stock firmware, and FM-1+VA's extra FM features go away.

## Stock to Felucca

Felucca's page installs its own prebuilt package and does not ask for M-VAVE's file.

1. Open the [Felucca installer](https://hugelton.github.io/Felucca/) (the link in Felucca's
   README; the earlier `webapp/installer/` address was not reachable when this was checked) in
   Chrome or Edge and click **Install**.
2. It runs through Starting, Verifying, Switching to update mode, Writing, Restarting, and Done.
   Do not unplug the cable while it writes.
3. If it stops partway, replug the cable and press **Install** again. The FM1 stays in update mode
   until the install finishes, and the page resumes it.

Felucca's repository also has a command-line installer, `tools/fm1_install.py`, for the same
install from a terminal.

Felucca's author accepts no responsibility for damage, and calls 1.x a field-testing release.
Whether your stock presets survive a Felucca install is not known: treat them as lost until you see
otherwise.

## Felucca to stock

Leaving Felucca needs M-VAVE's own updater. Felucca's installer now also has **Return to official
V15**: you select your own unmodified `FM-1.fwsc` from M-VAVE, it saves a complete backup first,
and it warns that official V15 cannot open Felucca's music. The route below is M-VAVE's own.

1. Open **M-UPGRADE**.
2. Install the **FM-1 V15** firmware with it.
3. If it reports “Failed to enter upgrade mode!”, keep M-UPGRADE open, unplug and replug the USB
   cable, then continue. That is M-VAVE's own advice.

To reach FM-1+VA from Felucca, finish this first, then install FM-1+VA from stock. Whether
FM-1+VA's installer accepts a Felucca FM1 is not documented.

## Stock to SLOOP

SLOOP's page installs its own package; nothing needs downloading.

1. Open the [SLOOP installer](https://isod89.github.io/sloop-fm1/) in Chrome or Edge and press
   **INSTALL**. Allow MIDI access when the browser asks.
2. It runs through Starting, Verifying, Switching to update mode, Writing, Restarting, and Done.
   Keep the page open until it says Done.
3. If it stops partway, replug the cable and press **Install** again. The FM1 stays in update mode
   until the install finishes, and the page resumes it.

The installer checks the package before writing it and refuses a damaged one. SLOOP's repository
also has a command-line installer, `tools/fm1_install.py sloop-2.2.fwsc`, which needs
`pip install mido python-rtmidi`.

SLOOP is a beta, installed at your own risk. Whether your stock presets survive a SLOOP install is
not known: treat them as lost until you see otherwise. SLOOP keeps its own projects and presets, and
saves everything before an update between SLOOP releases.

## SLOOP to stock

Leaving SLOOP needs M-VAVE's own updater, as leaving Felucca does.

1. Export what you want to keep (see [Before any switch](#before-any-switch)).
2. Follow [Felucca to stock](#felucca-to-stock): install **FM-1 V15** with **M-UPGRADE**.

## Between Felucca and SLOOP

SLOOP is built on Felucca and uses its installer and update loader, so either installer will
probably take an FM1 running the other directly. Neither project documents that route and it has not
been tested here, so the documented route is through stock: leave with M-UPGRADE and V15, then
install the other.

If an install of either is interrupted, finish it with the installer you started. The two use the
same update mode, so the other's installer could resume it and write its own firmware instead.

## Stock to Official Open

M-VAVE's FM1 Workbench carries the firmware itself, and refuses any file you supply. The stock
firmware has no Official Open update protocol, so the Workbench reaches it through **Force flash**.

1. Open the [FM1 Workbench](https://open.m-vave.com/fm1-workbench) in desktop Chrome or Edge and
   choose **Device update**.
2. Click **Connect device** and allow MIDI. The Workbench identifies the FM1 as other firmware
   (`FM-1_015` on V15).
3. Click **Enable force flash and reconnect**. That writes nothing; it connects again in force mode.
4. Tick **I have backed up the sounds, projects and samples I want to keep**, click **Force flash**,
   and accept the compatibility warning. Keep power and USB connected until it restarts and checks
   the version.

The Workbench warns that a force flash may erase what the FM1 holds. Official Open has no banks of
DX7 voices, so the stock presets do not play there; keep them in this app's library.

## Official Open to stock

1. Back up your projects and sample bank (see [Before any switch](#before-any-switch)).
2. In the Workbench's **Device update**, click **Restore original V15**, connect, confirm your
   backup, then click **Install original V15** and accept the warning.
3. It installs V15, then replaces all four banks with M-VAVE's 128 factory voices. If it is
   interrupted, reconnect and retry.

Official Open's projects and samples do not work on V15. To put your own patches back, send each
bank from this app's library with **Send to FM1**. An FM1 already on V15 is offered **Restore
factory voices**, which skips the firmware install.

## Updating Official Open

The Workbench's **Device update** installs the release that page carries. Back up first, connect,
tick the backup box, and click **Start update**. An update that keeps the same storage layout keeps
your project slots and sample bank; unsaved edits on the FM1 are lost. If samples are unavailable
afterwards, write your backup or the built-in bank from **Projects & sounds**.

V13 keeps per-track tuning in the last 4 KiB of the FM1's memory, where a sample bank written by
V12 at its full size may still reach. The FM1 then shows REDUCE SAMPLE BANK when you save a
project; write a smaller sample bank first.

## If something goes wrong

Most failed installs recover with a replug and a retry, because the FM1 waits in update mode until
an install finishes.

| Message                                                     | Where          | What to do                                                                                                           |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| This browser cannot do it. Open the page in Chrome or Edge. | Felucca, SLOOP | Use Chrome or Edge; other browsers have no Web MIDI.                                                                 |
| FM-1 not found (USB cable, and no other app using it?)      | Felucca        | Check the cable goes straight to the computer, and close this app and any other MIDI app.                            |
| Stopped. Replug the USB cable and press Install again.      | Felucca, SLOOP | Do exactly that; the install resumes.                                                                                |
| The update loader did not appear                            | Felucca        | Replug the cable and press **Install** again.                                                                        |
| The device did not come back: power-cycle it                | Felucca        | Switch the FM1 off and on.                                                                                           |
| Installed, but the device reports …                         | Felucca        | The install finished but the FM1 names another release. Power-cycle it and check the startup screen.                 |
| FM-1 not found. Check the USB cable (a data cable), …       | SLOOP          | Check the cable carries data and goes straight to the computer, and close this app and any other MIDI app.           |
| MIDI (SysEx) access was not allowed.                        | SLOOP          | Allow MIDI in the site settings from the address bar, then press **Install** again.                                  |
| The USB connection was lost.                                | SLOOP          | Replug the cable and press **Install** again; the install resumes.                                                   |
| The FM-1 in update mode was not found.                      | SLOOP          | Replug the cable and press **Install** again.                                                                        |
| The FM-1 is in the update mode of another firmware.         | SLOOP          | An install with another updater was interrupted. Finish it with that updater, such as M-UPGRADE, then install SLOOP. |
| The file to install is damaged. Reload the page.            | SLOOP          | Reload the installer page. Nothing was written.                                                                      |
| The FM-1 did not come back. Power-cycle it.                 | SLOOP          | Switch the FM1 off and on.                                                                                           |
| Written, but the FM-1 reports another version:              | SLOOP          | Power-cycle the FM1 and check the startup screen.                                                                    |
| Failed to enter upgrade mode!                               | M-UPGRADE      | Keep M-UPGRADE open, unplug and replug the USB cable, then continue.                                                 |
| An update stops partway, or the FM1 stays in update mode    | Workbench      | Keep the same version of the Workbench page, check the cable, reconnect, and follow its prompts.                     |
| No device, or no identity reply                             | Workbench      | Open **Connection details** to see the ports found. Close other MIDI apps, power-cycle, replug, and connect again.   |

If you hit an error that isn't listed here, or a step doesn't match what you see,
[open an issue](https://github.com/benny-sparra/fm1-dx7-patch-importer/issues/new). Include the
exact message, the step you were on, and which firmware you were moving from and to.

SLOOP also has a USB rescue mode: hold **OCT−** alone while switching the FM1 on, until it shows
SLOOP USB RESCUE, then install again.

## If the FM1 won't start after a failed install

No web installer can recover an FM1 that no longer starts;
[FM-1-transporter](https://github.com/kurogedelic/FM-1-transporter) can, from a Mac.

- **Hardware:** a Seeed XIAO RP2040. Other RP2040 boards are untested.
- **Wiring:** XIAO D6 to the FM1's D+, D7 to D−, GND to GND. Never connect VBUS; the FM1 runs on
  its battery.
- **Dump:** put the FM1 in UBOOT mode, then `python3 tools/fm1t.py dump backup.bin` saves the whole
  1 MiB flash.
- **Restore:** `python3 tools/fm1t.py write --package FM-1_vNN.fwsc --ref backup.bin --write`. It
  writes only `0x4000`–`0x93000`, leaving the boot loader and device data alone.
- Power-cycle the FM1 after each session before using it over USB again.

The restore expects a dump taken earlier. If you switch firmware often, take that dump now while
the FM1 works; the FM-1-transporter README explains UBOOT mode.

## This app on each firmware

The app asks which firmware the FM1 runs whenever it reconnects, and sends patches to suit it (see
[M-VAVE and Baud Girl firmware](user-guide.md#m-vave-and-baud-girl-firmware) in the user guide).

| Firmware      | Reports as                                      | How the app sends a patch                     | Notes                                                                                                          |
| ------------- | ----------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| M-VAVE stock  | Below `FM-1_020`                                | Single-voice dump                             | Hold **SAVE** on the FM1 to store it                                                                           |
| FM-1+VA       | `FM-1_020` to `FM-1_899`                        | 155 parameter changes                         | A send never overwrites a stored preset                                                                        |
| Felucca       | `FM-1_9XY`, shown as X.Y                        | 155 parameter changes                         | Its port is named Felucca, so choose it yourself; it plays notes but ignores DX7 patches                       |
| SLOOP         | `FM-1_900`, every release                       | 155 parameter changes                         | Shown as Felucca or SLOOP, since a Felucca development build reports the same name; port and MIDI as Felucca   |
| Official Open | `FM-1_8` and six digits (`FM-1_8000013` is V13) | Single-voice dump to the note channel's track | Only once the FM1 says that track runs DX7; no Program Change or effects; press **SAVE** on the FM1 to keep it |

## Sources

- [FM-1+VA](https://baudgirl.com/work/FM-1+VA) and its
  [manual](https://baudgirl.com/work/FM-1+VA/manual) (Baud Girl)
- [Felucca installer](https://hugelton.github.io/Felucca/webapp/installer/),
  [releases](https://github.com/hugelton/Felucca/releases), and
  [repository](https://github.com/hugelton/Felucca) (Hügelton Instruments)
- [SLOOP installer](https://isod89.github.io/sloop-fm1/), its
  [manual](https://github.com/isod89/sloop-fm1/blob/main/SLOOP.md),
  [releases](https://github.com/isod89/sloop-fm1/releases), and
  [repository](https://github.com/isod89/sloop-fm1) (isod89), read at release 2.2
- [FM-1-transporter](https://github.com/kurogedelic/FM-1-transporter)
- [M-VAVE downloads](https://www.m-vave.com/download)
- [FM1 Workbench](https://open.m-vave.com/fm1-workbench) and its manual, and
  [Official Open's source](https://github.com/m-vave/fm1_open) (M-VAVE), read at V13
- [FM1 research notes](fm1-research.md), for how the app identifies each firmware
