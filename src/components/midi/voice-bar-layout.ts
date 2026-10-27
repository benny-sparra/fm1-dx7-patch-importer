/**
 * Where each part of the Voices bar sits in the grid the librarian page makes for it. The lazy
 * `VoiceStrip` adds its cells to the grid the page holds, so these are plain strings with no
 * imports for both to take.
 *
 * A tab needs about 100px, its label and its 24px switch (Doto Bold 13px sets "Voice 8" 60px wide),
 * so eight need 815px, and the Effects tab after them about 90px more. From 992px the tabs share one
 * row, fused to the Patch banks panel, with the ⋮ menu at its right end. Below 992px they are a 4 × 2
 * grid of cells, not fused, or 2 × 4 below 376px where a cell no longer fits its label, with the
 * Effects tab across the row beneath and the ⋮ menu beside the grid's first row.
 */
export const voiceBarClassName = () =>
  // The tabs overlap the panel's 2px top border once fused; below that the grid sits clear.
  'grid grid-cols-[1fr_auto] items-start gap-x-2 max-[61.99rem]:mb-2 min-[62rem]:-mb-0.5 min-[62rem]:items-end'

export const voiceNoticesCellClassName = 'col-span-full row-start-1 grid'
export const voiceActionsCellClassName =
  'relative z-[1] col-start-2 row-start-2 justify-self-end min-[62rem]:mb-0.5'
export const voiceTabsCellClassName =
  'relative z-10 col-start-1 row-start-2 grid grid-cols-2 gap-1 min-[23.5rem]:grid-cols-4 min-[62rem]:flex min-[62rem]:items-end min-[62rem]:gap-0.5'
/** The Effects tab: a row of its own below 992px, one more tab beside the Voices from there. */
export const voiceEffectsCellClassName =
  'col-span-full min-[23.5rem]:col-span-4 min-[62rem]:col-auto'
