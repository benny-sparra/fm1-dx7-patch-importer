# Accessibility

FM1 Editor & Librarian should be usable by anyone who plays an FM1, whether they work with a
mouse, a keyboard, a screen reader, a translator, or reduced motion. This page describes what the
app aims for, how that is checked, and where it still falls short.

## Goal

The app targets [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA. It has not been audited by a
third party, so treat that as a goal the checks below enforce, not a certified conformance claim.

## What the app does

- **Keyboard.** Every action is reachable from the keyboard. The patch grid is one tab stop moved
  with the arrow keys, `Home`, and `End`; rotary controls and envelope points take the arrow keys,
  `Home`, `End`, `Page Up`, and `Page Down`; patches reorder with the keyboard from each slot's
  grip handle; and dragging a patch to another bank has the **Copy to…** menu as its keyboard
  route. View shortcuts are listed in the **?** guide and in the
  [user guide](docs/user-guide.md#keyboard-shortcuts), and they yield to text fields, menus, and
  open dialogs.
- **Screen readers.** Controls have translated accessible names, including the hardware-style panel
  abbreviations such as RATIO and R1, which are shown as on the FM1 but read out in full. Dialogs
  use the native `<dialog>` element, so they are modal, close with `Esc`, and return focus to the
  control that opened them. Confirmations are announced as notifications, and errors as alerts.
  Decorative scopes and meters are hidden from assistive technology.
- **Colour and contrast.** Text meets 4.5:1 and icons, control borders, and state indicators meet
  3:1 against their backgrounds, in each of the six FM1 colour finishes.
- **Motion and transparency.** With reduced motion requested, transitions snap and the animated
  effect scopes show a still frame. With reduced transparency requested, the CRT scanline overlay
  is removed.
- **Language.** The interface is available in British and American English, French, Spanish,
  German, Brazilian Portuguese, and Simplified Chinese, and the page's `lang` attribute follows
  the chosen language. The app keeps working when a browser's page translator rewrites its text.
- **Narrow screens.** The librarian and editor work from 360 px wide, and a patch card always has
  room for a full ten-character DX7 name.

## Known barriers

- **The FM1 itself.** The app cannot make the instrument's own display, buttons, or sound more
  accessible. Some workflows, such as choosing a destination bank on the device, still need its
  front panel; the app explains each step on screen.
- **Browser support.** Sending to the FM1 needs Web MIDI with SysEx, which Safari and every browser
  on iPhone and iPad lack. The librarian still opens there, but cannot reach the device.
- **One dark theme.** There is no light theme, and the app does not yet adapt to forced colours
  (such as Windows High Contrast).
- **Moving the piano window.** The floating on-screen keyboard can only be moved by dragging its
  header with a pointer. It is fully playable from the keyboard where it opens.

If something else gets in your way, please report it.

## How it is checked

Every change runs `npm run check`, locally and in CI, which includes:

- Oxlint's JSX accessibility rules for roles, names, labels, and keyboard patterns.
- [axe-core](https://github.com/dequelabs/axe-core) against representative rendered states of the
  librarian, search, dialogs, MIDI settings, and Favourites (`npm run test:a11y`).
- A contrast test that resolves every text and non-text colour pairing from the theme tokens, for
  every colour finish. axe cannot judge these itself behind the scanline overlay.
- Rendered tests for reduced motion, page translators, and errors reaching the user as translated
  text.

Playwright journeys cover layout-dependent behaviour such as narrow viewports and hit areas.
Screen readers and focus visibility are not tested automatically.

## Reporting a barrier

Open an [issue](https://github.com/benny-sparra/fm1-dx7-patch-importer/issues/new) describing
what you were trying to do, what happened instead, and your browser, operating system, and any
assistive technology you use. Accessibility barriers are treated as bugs, and a barrier that stops
someone completing a task is fixed before new features.

## Contributing

New UI follows the accessibility rules in [`AGENTS.md`](AGENTS.md#ui-and-accessibility) and the
testing guidance in [`CONTRIBUTING.md`](CONTRIBUTING.md): semantic HTML and native dialogs, stable
accessible names from the locale files, keyboard support for every interaction, the
reduced-motion snap for every animation, and a rendered test for each. A change that adds a colour
pairing adds it to the contrast test.

## Ownership

The project maintainer, [Ben Sparrow](https://github.com/benny-sparra), is responsible for this
statement and reviews it whenever a feature changes how the app is used. Last reviewed October 2026.
