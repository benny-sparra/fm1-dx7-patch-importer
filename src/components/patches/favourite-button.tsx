import type { SVGProps } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

// Drawn on a 7 × 6 pixel grid, as a heart on an 8-bit screen.
const outlineHeart = ['.##.##.', '#..#..#', '#.....#', '.#...#.', '..#.#..', '...#...']
const filledHeart = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']

function pixelPath(rows: readonly string[]) {
  return rows
    .flatMap((row, y) =>
      Array.from({ length: row.length }, (_, x) => (row[x] === '#' ? `M${x} ${y}h1v1h-1z` : '')),
    )
    .join('')
}

const outlinePath = pixelPath(outlineHeart)
const filledPath = pixelPath(filledHeart)

/** A pixel heart, filled when `filled`, for Favourites and the hearts that add to it. */
export function PixelHeartIcon({
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg fill="none" shapeRendering="crispEdges" viewBox="-0.5 -1 8 8" {...props}>
      <path d={filled ? filledPath : outlinePath} fill="currentColor" />
    </svg>
  )
}

type FavouriteButtonProps = {
  isFavourite: boolean
  name: string
  onToggle: () => void
}

/**
 * A card's heart. It is a toggle with a stable name, so a screen reader hears whether the sound is
 * a favourite from its pressed state. It sits above the card's own button, so it does not also play
 * the sound.
 */
export function FavouriteButton({ isFavourite, name, onToggle }: FavouriteButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      aria-label={t('favourites.toggle', { name })}
      aria-pressed={isFavourite}
      className={cn(
        'z-[1] -my-1 grid size-6 shrink-0 cursor-pointer place-items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-led)]',
        isFavourite
          ? 'text-[var(--crt-led)] hover:text-[var(--crt-acc-br)]'
          : 'text-[var(--crt-ink-4)] hover:text-[var(--crt-acc-lt)]',
      )}
      onClick={onToggle}
      title={isFavourite ? t('favourites.removeTitle') : t('favourites.addTitle')}
      type="button"
    >
      <PixelHeartIcon aria-hidden="true" className="size-3.5" filled={isFavourite} />
    </button>
  )
}
