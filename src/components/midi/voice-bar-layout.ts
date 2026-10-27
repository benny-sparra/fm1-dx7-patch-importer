/**
 * Where each part of the Voices bar sits in the grid the librarian page makes for it. The page
 * holds the Multitimbral switch, which stays mounted when the mode goes on, and the lazy
 * `VoiceStrip` adds the rest beside it as more cells of the same grid, so these are plain strings
 * with no imports for both to take.
 *
 * A tab needs about 96px, its label and its 24px switch (VT323 sets "Voice 1" 62px wide), so eight
 * need 780px and one row with the controls 1070px. From `xl` the tabs and controls share one row:
 * tabs, then the switch, then Send setup and Channels…. From 840px the switch and the two buttons
 * are a bar of their own above the tabs, which share the row, fused to the Patch banks panel. Below
 * 840px the same bar sits above a 4 × 2 grid of cells, not fused, or 2 × 4 below 376px where a
 * cell no longer fits its label.
 */
export const voiceBarClassName = () =>
  // The tabs overlap the panel's 2px top border once fused; below that the grid sits clear.
  'grid grid-cols-[1fr_auto] items-center gap-x-2 max-[52.49rem]:mb-2 min-[52.5rem]:-mb-0.5 xl:grid-cols-[1fr_auto_auto] xl:gap-x-3'

export const voiceNoticesCellClassName = 'col-span-full row-start-1 grid'
export const voiceToolbarBackdropClassName =
  'pointer-events-none col-span-full row-start-2 h-9 border-t border-r border-b border-l border-t-[var(--crt-shadow)] border-r-[var(--crt-line-lt2)] border-b-[var(--crt-line-lt2)] border-l-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] xl:hidden'
export const voiceSwitchCellClassName =
  'relative z-[1] row-start-2 col-start-1 justify-self-start px-2 xl:col-start-2 xl:px-0'
export const voiceActionsCellClassName =
  'relative z-[1] row-start-2 col-start-2 flex items-center gap-2 justify-self-end pr-1 xl:col-start-3 xl:gap-1 xl:pr-0'
export const voiceTabsCellClassName =
  'relative z-10 col-span-full row-start-3 mt-2 grid grid-cols-2 gap-1 min-[23.5rem]:grid-cols-4 min-[52.5rem]:flex min-[52.5rem]:items-end min-[52.5rem]:gap-0.5 xl:col-span-1 xl:col-start-1 xl:row-start-2 xl:mt-0'
