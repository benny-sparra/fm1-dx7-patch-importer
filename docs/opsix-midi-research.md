# Korg opsix MIDI Research Notes

> Status: desk research only, no hardware captures
> Last reviewed: 2026-09-21
> Scope: Korg opsix, opsix mk II, opsix SE (and SE Platinum), opsix module and opsix native. Whether
> this editor could support the opsix as an opaque librarian or a full editor, and whether DX7 voices
> could be converted to opsix programs.

## Purpose

This note records what Korg publishes about the opsix MIDI and data interfaces, so that a decision
about opsix support rests on documents rather than assumptions. It follows the project rule: never
invent protocol details.

Every claim carries one of these tags:

- **Documented** — stated in a Korg primary source, cited with document and page or section.
- **Community-reported** — only from secondary sources; never the basis for implementation.
- **Unknown** — not found in any Korg source; the entry says what would settle it.

The headline finding: Korg publishes **no conventional MIDI Implementation** (no SysEx dump or
parameter-change specification) for any opsix model. Program data moves between the hardware and a
computer over **USB networking (TCP), not MIDI**. The only published SysEx is universal messages and
MIDI-CI Property Exchange, which is read-only for program data.

---

## Primary sources

All Korg download pages were read on 2026-09-21. The opsix, opsix mk II, opsix SE, opsix SE Platinum
and opsix module pages list the same MIDI-related documents.

| Ref      | Document                                                                     | Version / date                                     | URL                                                                                                                                                                                                                              |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OM       | opsix/opsix SE/opsix module Owner's Manual (English), file `opsix_OM_E6.pdf` | E6, printed "Published 10/2023"; listed 2024.01.19 | https://www.korg.com/us/support/download/manual/0/874/5046/ (file: https://cdn.korg.com/us/support/download/files/dc109944c32fd473b555fee28318cf8d.pdf)                                                                          |
| CHART    | MIDI Implementation Chart, OM p.116                                          | Version 3.1.0, dated January 17, 2023              | as OM                                                                                                                                                                                                                            |
| PE-IMP   | opsix Property Exchange MIDI Implementation (`opsix_PE_MIDIimp.txt`)         | Version 1.0 (2025/9/9); listed 2025.09.18          | https://www.korg.com/us/support/download/manual/0/874/5488/                                                                                                                                                                      |
| PE-RES   | opsix Property Exchange Resource List (`opsix_PE_ResourceList.txt`)          | Version 1.0 (2025/9/9); listed 2025.09.18          | https://www.korg.com/us/support/download/manual/0/874/5489/                                                                                                                                                                      |
| LIB      | opsix Sound Librarian Owner's Manual                                         | E1, PDF dated 2020-12-23 (author KORG INC.)        | Korg ships it only inside the installer (https://www.korg.com/us/support/download/software/0/874/4704/). The copy read is a third-party mirror: https://www.deepsonic.ch/deep/docs_manuals/korg_opsix_sound_librarian_manual.pdf |
| LIB-RN   | opsix Sound Librarian download page and release notes                        | 1.3.0, 2024.05.10                                  | https://www.korg.com/us/support/download/software/0/874/4704/                                                                                                                                                                    |
| UPD      | Korg System Updater Owner's Manual (`Korg_System_Updater_E4.pdf`)            | listed 2026.01.14                                  | https://www.korg.com/us/support/download/manual/0/874/5389/                                                                                                                                                                      |
| FW-RN    | opsix hardware release notes (Korg app Help Center)                          | updated March 17, 2026; up to v3.1.2               | https://support.korguser.net/hc/en-us/articles/23999144966297-opsix-hardware-release-notes                                                                                                                                       |
| NAT-OM   | opsix native Owner's Manual                                                  | E1 (predates native v1.2.0)                        | https://storage.korg.com/korgms/support/opsix_native/opsix_native_OM_E.pdf                                                                                                                                                       |
| NAT-RN   | opsix native release notes (Korg app Help Center)                            | updated December 17, 2024; up to v1.3.1            | https://support.korguser.net/hc/en-us/articles/4407442226585-opsix-native-release-notes                                                                                                                                          |
| NAT-NEWS | Korg news: "KORG Collection and opsix native Update."                        | 2023.12.14                                         | https://www.korg.com/us/news/2023/1214/                                                                                                                                                                                          |
| NAT-FAQ  | Korg app Help Center: "How can I import, organize, and share Programs?"      | August 24, 2024                                    | https://support.korguser.net/hc/en-us/articles/6456718793625-How-can-I-import-organize-and-share-Programs                                                                                                                        |
| DATA     | opsix Sound Data 2.0.0 download page                                         | 2021.10.22                                         | https://www.korg.com/us/support/download/software/0/874/4833/                                                                                                                                                                    |

Download product pages: opsix https://www.korg.com/us/support/download/product/0/874/, opsix SE
.../product/0/921/, opsix SE Platinum .../product/0/920/, opsix mk II .../product/0/946/, opsix module
.../product/0/948/. The Japanese opsix page (https://www.korg.com/jp/support/download/product/0/874/)
lists no additional MIDI document either.

Sources not accessed: the Sound Librarian installer (DMG/ZIP) was not downloaded, so the manual
shipped with Librarian 1.3.0 was not read; the E1 mirror copy predates it. No newer opsix native
manual than E1 was found.

---

## 1. Is there a MIDI Implementation document?

- **Documented** — No conventional MIDI Implementation (SysEx formats, dump layouts, parameter
  tables) is published for any opsix model. The download pages list only the Owner's Manual, the
  two Property Exchange text files, updater manuals and software. (Download pages above.)
- **Documented** — The Owner's Manual contains only a one-page MIDI Implementation Chart, which ends
  by telling readers to consult their local Korg distributor for more MIDI implementation detail.
  (OM p.116.)
- **Documented** — The chart covers opsix, opsix SE and opsix module; version 3.1.0, dated
  2023-01-17. (CHART header.)
- **Documented** — The Property Exchange MIDI Implementation and Resource List, version 1.0 dated
  2025/9/9, are the only byte-level MIDI documents Korg publishes. They cover MIDI-CI only.
  (PE-IMP, PE-RES.)
- The opsix mk II and SE Platinum pages carry the same Owner's Manual and PE files; the mk II has no
  separate MIDI document.
- **opsix native**: **Documented** — its manual describes MIDI receive settings (CC, program change,
  pitch bend) but publishes no MIDI Implementation. (NAT-OM, "SETTINGS".)

## 2. System exclusive

### Manufacturer and device identity

| Field                                 | Value                 | Tag and source                                                       |
| ------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| Manufacturer ID (MIDI-CI 3-byte form) | `42 00 00` (Korg)     | **Documented**, PE-IMP [4-1] note *4; PE-RES DeviceInfo `[66, 0, 0]` |
| Device family ID (LSB first)          | `61 01`               | **Documented**, PE-IMP *4; PE-RES `familyId [97, 1]`                 |
| Model number: opsix and opsix native  | `01 00`               | **Documented**, PE-IMP *4; PE-RES table                              |
| Model number: opsix mk II             | `1D 00`               | **Documented**, same                                                 |
| Model number: opsix SE                | `09 00`               | **Documented**, same                                                 |
| Model number: opsix module            | `14 00`               | **Documented**, same                                                 |
| Model number: opsix SE Platinum       | not listed separately | **Unknown** — capture a Discovery or Device Inquiry reply            |

These values are given for MIDI-CI Discovery. Korg does not say they are also the family and model
fields of the Universal Device Inquiry reply.

### Universal SysEx

- **Documented** — The hardware transmits and recognises SysEx and "supports universal system
  exclusive messages device inquiry, master volume, master fine tuning, and master coarse tuning".
  (CHART, System Exclusive row and note *3.)
- **Unknown** — The byte layout of the opsix Device Inquiry reply (`F0 7E <ch> 06 02 ...`), including
  its software-revision bytes and whether the family/model match the MIDI-CI values above. Settle by
  capturing a reply from each model.
- **Unknown** — Which device ID the opsix answers to (Global Channel, 7F only, or System ID). Settle by
  capture.

### MIDI-CI Property Exchange (firmware 3.1.0 and later)

- **Documented** — Supported message types, all `F0 7E 7F 0D <sub-ID #2> 01 <src MUID ×4>
<dst MUID ×4> ... F7`, MUIDs 28-bit LSB first (PE-IMP §2, §4):

  | Sub-ID #2 | Message                    | opsix transmits | opsix recognises |
  | --------- | -------------------------- | --------------- | ---------------- |
  | 70        | Discovery                  | yes             | yes              |
  | 71        | Reply to Discovery         | yes             | yes              |
  | 30        | Inquiry: PE Capabilities   | no              | yes              |
  | 31        | Reply to PE Capabilities   | yes             | no               |
  | 34        | Inquiry: Get Property Data | no              | yes              |
  | 35        | Reply to Get Property Data | yes             | no               |
  | 38        | Subscription               | no              | yes              |
  | 39        | Reply to Subscription      | yes             | no               |
  | 7E        | Invalidate MUID            | yes             | yes              |

- **Documented** — Discovery and its reply carry: manufacturer (3 bytes), family (2, LSB first),
  model (2, LSB first), software revision (4, device-specific format), CI category bitmap (1),
  maximum receivable SysEx size (4, LSB first). (PE-IMP [4-1], [4-2].)
- **Documented** — Get/Subscription messages carry request ID (1), header length (2, LSB first),
  JSON header, chunk count (2), chunk number (2, from 1), property-data length (2), property data.
  (PE-IMP [4-5] to [4-8].)
- **Documented** — There is **no Set Property Data** message: the opsix does not recognise Set
  (`36`), and both custom resources are declared `"canSet": "none"`. (PE-IMP §1; PE-RES "Resource
  List".)
- **Documented** — Resources the opsix serves: `ResourceList`, `DeviceInfo`, `ChannelList`,
  `ProgramList`, `JSONSchema`, `X-ParameterList`, `X-ProgramEdit`. (PE-RES §1.)
- **Documented** — `DeviceInfo` example: family "opsix", model "mkII", version "3.1.2".
  (PE-RES [2].)
- **Documented** — `ProgramList` lists program names with a `bankPC` triple, e.g. the first program
  at `[0, 0, 0]` and the second at `[0, 0, 1]`, "(500 programs)"; a subscription notification is sent
  when a program is saved. `ChannelList` notifies on Global Channel, program or program-name change.
  (PE-RES [3], [4].)
- **Documented** — `X-ParameterList` and `X-ProgramEdit` expose only the 22 front-panel macro
  parameters (the CC list in section 5), as CC values 0–127 plus a display string and unit. They are
  not a program dump. (PE-RES "Custom" [1], [2].)
- **Documented** — Korg describes the feature as provided for Keystage integration. (FW-RN v3.1.0;
  NAT-RN v1.2.0.)

### Program, bank, global dumps, dump requests, write requests

- **Documented (by absence)** — No opsix program dump, all-program dump, global dump, dump request,
  write request or parameter-change SysEx appears in any Korg source. The manual points to the Sound
  Librarian for program transfer. (OM p.98 "Librarian software"; download pages.)
- **Unknown** — Whether the firmware contains any undocumented Korg-format SysEx at all. Settle only
  by passive capture of the Sound Librarian (which uses TCP, see section 8, so probably none) and of
  the hardware's MIDI output; never by sending guessed messages.

## 3. Program data layout

- **Unknown** — No byte-level program layout, parameter offset table, packing scheme (such as Korg's
  7-in-8 encoding used by other Korg synths) or program length is published for the opsix. Nothing in
  the Korg sources states a program size in bytes.
- **Documented** — Programs are stored as files of type `.op6program` (one program), `.op6lib`
  (all 500 programs and 64 favourites), `.op6favs` (four banks of 16 favourites), `.op6global` and
  `.op6all` (the other four combined). (LIB p.6 "File Types".) The contents of these files are not
  documented.
- **Documented** — opsix native uses the same `.op6program` file type and shares programs with the
  hardware through the Sound Librarian. (NAT-FAQ; NAT-OM p.4.)
- **Documented** — 500 program slots: 350 presets and 150 user programs as factory default; all
  slots are writable. (OM p.6.) Factory data: 350 programs from Sound Data 2.0.0, requiring firmware
  2.0.0. (DATA; FW-RN v2.0.0.) Slots 351–500 are initialised programs. (OM p.114, preset list footnote.)
- **Documented** — opsix native ships 350 preset programs including 30 templates, compatible with
  the hardware. (NAT-OM p.4.)
- **Unknown** — Whether `.op6program` data from firmware 1.x, 2.x and 3.x differ. Settle with files
  saved from each version.

## 4. Parameter change

- **Documented (by absence)** — No SysEx parameter-change message or parameter ID list is published.
- **Documented** — The only published way to change program parameters over MIDI is the fixed CC set
  in section 5. No NRPN is listed on the chart. (CHART.)
- **Documented** — Property Exchange cannot set parameters (no Set, `canSet: none`). (PE-IMP,
  PE-RES.)

## 5. CC map

**Documented** — CHART (OM p.116), with Tx/Rx columns as printed:

| CC         | Function                                                   | Tx  | Rx  |
| ---------- | ---------------------------------------------------------- | --- | --- |
| 0, 32      | Bank Select MSB, LSB                                       | yes | yes |
| 1          | Modulation                                                 | yes | yes |
| 5          | Glide Time (Voice Assign page)                             | yes | yes |
| 7          | Volume                                                     | no  | yes |
| 10         | Pan                                                        | no  | yes |
| 11         | Expression                                                 | no  | yes |
| 64         | Damper                                                     | yes | yes |
| 65         | Glide Mode (Tx 0 Off / 64 Legato / 127 On; Rx split at 64) | yes | yes |
| 66         | Sostenuto                                                  | no  | yes |
| 67         | Soft                                                       | no  | yes |
| 70         | Algorithm                                                  | yes | yes |
| 71         | Filter Resonance                                           | yes | yes |
| 73         | Attack (Home/Algorithm)                                    | yes | yes |
| 74         | Filter Cutoff                                              | yes | yes |
| 79         | Decay/Release (Home/Algorithm)                             | yes | yes |
| 81, 82, 83 | FX1, FX2, FX3 (Home/Algorithm)                             | yes | yes |
| 102–107    | OP1–6 Level sliders                                        | yes | yes |
| 108–113    | OP1–6 Ratio knobs                                          | yes | yes |
| 1–119      | Any CC as a Virtual Patch source                           | no  | yes |
| 1–119      | Any CC transmitted from the Motion Sequencer               | yes | no  |
| 120, 121   | All Sounds Off, Reset All Controllers                      | no  | yes |

- **Documented** — The macro CC numbers are fixed; there is no user CC assignment on the hardware.
  Received CCs 1–119 can additionally be chosen as Virtual Patch modulation sources. (CHART; the
  GLOBAL MIDI page has only Rx/Tx CC on/off, OM p.78.)
- **Documented** — Rx CC off does not block CC 1, CC 64 or CC 120 and above. (OM p.78.)
- **Documented** — CC transmit/receive, program change, pitch bend and transport each have Tx/Rx
  switches on the GLOBAL MIDI page. (OM p.41, p.78.)
- **Documented** — The CCs are macro controls. A CC value maps to a display value such as a ratio or
  a frequency; Property Exchange returns the mapping for the current program. (PE-RES [2].) The
  mapping curves are not published: **Unknown**.
- **opsix native**: **Documented** — it has a user-editable MIDI CC settings menu, including "Recall
  opsix hardware settings" to follow CCs sent by the hardware; some parameters are not supported.
  (NAT-RN v1.0.4.)
- **Documented** — Channel aftertouch is transmitted only by the opsix SE; all models receive
  channel and poly aftertouch. (CHART note *4; OM p.78.)

## 6. Program change and bank select

- **Documented** — Program change is transmitted and recognised with values 0–99, and bank select
  MSB/LSB (CC 0/32) is transmitted and recognised. (CHART.)
- **Documented** — 500 programs; no hardware program banks are described beyond the four favourite
  banks of 16. (OM p.6, p.21.)
- **Documented** — Property Exchange lists programs as `bankPC` triples; the only published examples
  are programs 1–5 as `[0, 0, 0]` to `[0, 0, 4]`. (PE-RES [4].)
- **Unknown** — How bank select MSB/LSB and program change 0–99 address programs 101–500. The chart's
  0–99 range suggests five banks of 100, but Korg does not state the bank values. Settle by reading
  the full `ProgramList` through Property Exchange (Get only, safe) or by capturing the hardware's
  transmitted bank select when it changes program with Tx Prog Chg on.
- **Documented** — A "Prog Chg Lock" setting (Off, Shift, Home) exists. (OM p.41, p.80.)
- **opsix native**: **Documented** — program change selects entries from a user-built "Program
  Change" list rather than fixed slots. (NAT-OM p.15.)

## 7. DX7 import

### Hardware (all opsix models)

- **Documented** — The hardware itself receives DX7 SysEx over MIDI and converts it to opsix
  programs. (OM p.99, "Loading DX7 sounds".) The manual says it can be sent "from your DX7, computer";
  it does not restrict the port.
- **Documented** — Only a complete 32-voice bank in first-generation DX7 format is accepted (also
  DX9 and other six-operator synths using that format). Single-voice dumps and four-operator formats
  (DX, TX81Z, SY77 and so on) are rejected. (OM p.99.)
- **Documented** — The user selects a start program; the 32 programs from there are overwritten after
  a YES confirmation on the panel. (OM p.99.)
- **Documented** — Errors: "No readable data" if the data is under 4,104 bytes or the header is not
  DX7 bank format; "Unsupported data" if the checksum does not match. (OM p.100.) 4,104 bytes is the
  standard 32-voice bulk dump: 6 header bytes, 4,096 data bytes, checksum and `F7`.
- **Documented** — Firmware 2.0.1 fixed DX7 import when a start program after 470 was selected.
  (FW-RN v2.0.1.) Korg does not say what happens to voices that would pass slot 500: **Unknown**.
- **Documented** — The conversion "will not be perfect" because the two synths use different
  parameter configurations; some sounds may differ a lot. (OM p.99.) Korg does not document the
  mapping or what it drops.
- **Unknown** — The conversion rules (envelope rate/level mapping, keyboard scaling, LFO, pitch EG,
  algorithm mapping, operator mode). Settle by importing known DX7 banks and comparing the resulting
  programs; there is no published target format to compare against in bytes.

### opsix Sound Librarian

- **Documented** — Librarian 1.3.0 (2024-05-10) added DX7 SysEx (`.syx`) files to "Merge Library".
  (LIB-RN.) The conversion then happens on the computer, and the result is sent to the hardware over
  USB networking. Korg does not describe its conversion separately from the hardware's.

### opsix native

- **Documented** — opsix native 1.2.0 added "DX7 Sound Import" from the import menu: a DX7 SysEx
  file's bank is converted to opsix native programs; the same "not perfect" caveat applies.
  (NAT-RN v1.2.0; NAT-NEWS 2023-12-14.)
- **Unknown** — Whether the hardware, Librarian and native share one converter and give identical
  results.

## 8. Official editor/librarian software

- **Documented** — The official tool is the **opsix Sound Librarian** (current 1.3.0, 2024-05-10,
  macOS and Windows). It is a librarian, not a parameter editor: it views, organises, sends and
  receives programs, favourites, global settings and all data, and edits program metadata (name,
  category, author, notes). (LIB p.1, pp.10–11; LIB-RN.) Korg publishes no opsix sound editor.
- **Documented** — It talks to the opsix over **networking over USB, not MIDI**: RNDIS or NCM
  (GLOBAL > SYS > USB Network), Bonjour discovery, and TCP ports 50000 and 50001. It cannot work over
  5-pin DIN MIDI. Multiple units are told apart by GLOBAL > SYS > System ID (1–254). (LIB p.2, p.5,
  p.12; OM p.82.)
- **Documented** — NCM is the default USB Network setting from firmware 3.0.2 and is required on
  Windows for firmware 3 and later. (FW-RN v3.0.2; LIB-RN 1.2.0 r1; UPD "USB Network setting".)
- **Documented** — Librarian 1.2.0 added opsix SE support; Librarian needs opsix firmware 1.0.3 or
  later. (LIB-RN.)
- **Documented** — The Korg System Updater also uses the USB network connection rather than MIDI.
  (UPD.) Firmware update is out of scope and must stay separate from any editor code.
- **Unknown** — The TCP protocol on ports 50000/50001. It is undocumented and, being TCP over a USB
  network interface, is unreachable from a browser using Web MIDI.

## 9. Firmware and software versions that changed the above

Hardware (FW-RN; applies to all models unless noted):

| Version | MIDI/data-relevant change                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.1   | Minimum for Sound Librarian (LIB p.1)                                                                                             |
| 1.0.3   | GLOBAL > SYS > USB Network parameter added; display updates after Librarian sends data                                            |
| 1.0.4   | Step sequencer output follows Global Channel                                                                                      |
| 2.0.0   | 350 factory programs (Sound Data 2.0.0 needs 2.0.0+); aftertouch as modulation source via external MIDI; more accurate MIDI clock |
| 2.0.1   | Fixed DX7 SysEx import when a program after 470 is selected; Factory Reset > All deletes programs after 501                       |
| 3.0.2   | USB Network default changed to NCM; Windows NCM support; Aftertouch Src and other parameters added; opsix SE compatibility        |
| 3.1.0   | MIDI-CI Property Exchange (for Keystage); MIDI chart version 3.1.0                                                                |
| 3.1.1   | Keystage integration; fixed duplicated CCs during motion-sequence playback                                                        |
| 3.1.2   | Auto Power-Off change; no MIDI change listed                                                                                      |

opsix native (NAT-RN): 1.0.4 added the MIDI CC settings menu; 1.0.8 VST3 program change; 1.1.0
global MIDI channel and program-change fixes; 1.2.0 DX7 import and MIDI-CI (standalone only);
latest 1.3.1.

Sound Librarian (LIB-RN): 1.1.0 `.op6program` drag-and-drop; 1.2.0 opsix SE; 1.2.0 r1 NCM on
Windows; 1.3.0 DX7 `.syx` in Merge Library, global parameters from firmware 3.

---

## Community evidence (unverified)

Not used for any Documented claim.

- **Community-reported** — Gearspace users describe the opsix as having no parameter SysEx, like the
  wavestate, and describe the RNDIS setup as the main hurdle for the librarian.
  https://gearspace.com/threads/korg-wavestate.1293634/page-114 ,
  https://gearspace.com/threads/korg-opsix-win7-usb-driver-issue.1393209/
- **Community-reported** — Users send DX7 banks from Dexed or a SysEx manager to the hardware.
  https://synthanatomy.com/2020/11/korg-opsix-supports-yamaha-dx7-patches-here-is-a-tutorial.html
- No public project documenting the `.op6program` format or an opsix SysEx dump was found.

---

## Implications for this editor

- **Opaque librarian over Web MIDI: not feasible from the documents.** Korg documents no MIDI
  program dump or dump request. Program transfer uses TCP over a USB network interface, which a
  browser cannot open. An opaque store of `.op6program`/`.op6lib` files the user moves with Korg's
  Librarian is possible, but it would add nothing to the device link, and the file contents are
  undocumented.
- **What Web MIDI could safely do from the documents:** send program change with bank select (once
  the bank mapping is confirmed), send the fixed macro CCs from section 5, read program names and the
  current macro values through Property Exchange Get and Subscription (read-only), and send a
  32-voice DX7 bank for the hardware's own import, which the user then confirms on the panel.
- **Full editor: not feasible.** Only 22 macro CCs are controllable; there is no documented
  parameter-change SysEx, NRPN or program layout, and Property Exchange cannot set values.
- **DX7-to-opsix conversion: no documented target format.** Korg converts on the device, in the
  Librarian and in opsix native, but publishes neither the program format nor the mapping. The one
  documented path is to hand Korg a valid 4,104-byte DX7 bank; this editor already produces DX7 banks.
- **Open questions needing hardware captures (passive or read-only only):**
  1. Device Inquiry reply bytes for each model, including the SE Platinum model number.
  2. Bank select MSB/LSB values for programs 101–500 (via the full PE `ProgramList` or a Tx capture).
  3. Whether DX7 bank import is accepted over USB-MIDI as well as DIN, and what happens past slot 500.
  4. The complete PE `X-ParameterList`, compared with the chart, on each firmware version.
  5. Whether the hardware sends any Korg-specific SysEx during normal use.
  6. The CC-value-to-parameter mapping for ratio, cutoff and the other macros.
- Any opsix work must keep the project's safety rules: no guessed Korg SysEx, nothing touching the
  System Updater or USB network paths, and hardware verification before any production behaviour.
