// The patch banks and the Effects view sit side by side as tabs, so they take their chrome from
// here rather than from two copies that drift apart.

export const libraryPanelHeaderClassName =
  'crt-hatch border-b border-[var(--crt-shadow)] px-[9px] py-1.5'

export const libraryPanelTitleClassName =
  'font-dot-matrix flex items-center gap-2 text-[13px] font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase'

export const librarySearchInputClassName =
  'patch-search-input crt-field h-7 w-full pr-2.5 pl-8 text-xs tracking-[0.06em] transition outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:cursor-not-allowed disabled:opacity-50'

/** The strip above the panel's content that names what it holds and sends it. */
export const libraryStripClassName =
  'crt-hatch flex flex-wrap items-center gap-2 border-b border-[var(--crt-shadow)] p-2 sm:px-[9px]'

export const libraryStripNameClassName =
  'font-dot-matrix text-[13px] font-bold tracking-[0.1em] text-[var(--crt-led)]'

export const librarySendButtonClassName =
  'crt-raised-lit inline-flex h-8 flex-auto shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--crt-btn)] px-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-white transition-colors hover:bg-[var(--crt-btn-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] md:ml-auto md:flex-none'

/** A button beside Send on a strip that brings something in from the FM1: raised, not lit. */
export const libraryReadButtonClassName =
  'crt-raised-thin inline-flex h-8 flex-auto shrink-0 cursor-pointer items-center justify-center gap-2 bg-[var(--crt-btn-face)] px-3 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-[var(--crt-ink)] transition-colors hover:bg-[var(--crt-sel-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] md:flex-none'

export const libraryRailClassName = 'border-r-2 border-[var(--crt-shadow)] bg-[var(--crt-bg-panel)]'

export const libraryContentClassName = 'bg-[var(--crt-bg-panel)] p-1.5 min-[360px]:p-[9px]'

/** The rail's last row, which adds to it: **Add new bank…** and **New FX preset…**. */
export const libraryRailAddButtonClassName =
  'font-dot-matrix mx-2 mb-2 flex cursor-pointer items-center justify-center gap-2 border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] px-2 py-[7px] text-[14px] font-bold text-[var(--crt-ink-2)] transition-colors hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--crt-led)] md:justify-start'
