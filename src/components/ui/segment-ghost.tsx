import { segmentGhost } from '@/lib/segment-ghost'
import { cn } from '@/lib/utils'

/**
 * The unlit segments behind a seven-segment input, which cannot draw them itself. It fills the
 * same grid cell as the input, takes the input's padding and size through `className`, and shows
 * the ghost of `text`, the value the input shows.
 */
export function SegmentGhost({ className, text }: { className?: string; text: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('font-seven-segment pointer-events-none [grid-area:1/1]', className)}
      data-ghost={segmentGhost(text)}
    />
  )
}
