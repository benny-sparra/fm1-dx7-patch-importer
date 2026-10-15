import type { ReactNode } from 'react'

/**
 * The info sign as 12 × 12 pixels: a ringed disc with the "i" left out of it, so the panel behind
 * shows through. Each `#` is a lit pixel.
 */
const infoSignPixels = [
  '....####....',
  '..########..',
  '.####..####.',
  '#####..#####',
  '############',
  '####...#####',
  '#####..#####',
  '#####..#####',
  '####....####',
  '.##########.',
  '..########..',
  '....####....',
]

/** Each row's runs of lit pixels, so a row is a few rectangles rather than a dozen. */
const infoSignRects = infoSignPixels.flatMap((row, y) =>
  Array.from(row.matchAll(/#+/g), (run) => ({ width: run[0].length, x: run.index, y })),
)

function InfoSign() {
  return (
    <svg
      aria-hidden="true"
      className="size-6 shrink-0 text-[var(--crt-acc)]"
      fill="currentColor"
      shapeRendering="crispEdges"
      viewBox="0 0 12 12"
    >
      {infoSignRects.map(({ width, x, y }) => (
        <rect height={1} key={`${x},${y}`} width={width} x={x} y={y} />
      ))}
    </svg>
  )
}

/**
 * Something the user should know about the page they are on, in a sunken terminal message box: an
 * 8-bit info sign in a cell of its own, the text beside it. It is not an alert. Put it inside the
 * live region that announces it, as the Virtual Analog editor does, rather than giving it a role.
 * Its children are its paragraphs.
 */
export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex border-2 border-t-[var(--crt-shadow)] border-r-[var(--crt-bevel)] border-b-[var(--crt-bevel)] border-l-[var(--crt-shadow)] bg-[color-mix(in_srgb,var(--crt-sel-bg)_55%,var(--crt-bg-well))]">
      <div className="flex shrink-0 items-start border-r-2 border-r-[var(--crt-line)] bg-[var(--crt-sel-bg)] p-2.5">
        <InfoSign />
      </div>
      <div className="grid min-w-0 flex-1 gap-2 self-center px-3.5 py-2.5 text-sm leading-6 text-[var(--crt-ink-2)]">
        {children}
      </div>
    </div>
  )
}
