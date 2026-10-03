import { cn } from '@/lib/utils'

type PreviewPatchButtonProps = {
  isPlaying: boolean
  label: string
  /**
   * Shows a dot after the name and describes the patch with the element of this id, as the FM-1+VA
   * import marks a patch that differs from the library.
   */
  markId?: string
  name: string
  number: number
  onClick: () => void
  playingLabel: string
}

/** A patch in a file being imported, which plays it on the FM1 when clicked. */
export function PreviewPatchButton({
  isPlaying,
  label,
  markId,
  name,
  number,
  onClick,
  playingLabel,
}: PreviewPatchButtonProps) {
  return (
    <button
      aria-current={isPlaying ? 'true' : undefined}
      aria-describedby={markId}
      aria-label={label}
      className={cn(
        'patch-cell flex min-h-9 w-full cursor-pointer items-center gap-1.5 border px-1.5 py-1 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
        isPlaying
          ? 'border-[var(--crt-acc)] bg-[var(--crt-sel-bg)]'
          : 'border-[var(--crt-line)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          'font-vt323 shrink-0 text-[16px] leading-none',
          isPlaying ? 'text-[var(--crt-acc-br)]' : 'text-[var(--crt-acc-lt)]',
        )}
      >
        {String(number).padStart(2, '0')}
      </span>
      <span
        className={cn(
          'font-dot-matrix min-w-0 truncate text-[13px] font-bold whitespace-pre',
          isPlaying ? 'text-white' : 'text-[var(--crt-ink)]',
        )}
      >
        {name}
      </span>
      {markId ? (
        <span
          aria-hidden="true"
          className="ml-auto size-2 shrink-0 rounded-full bg-[var(--crt-led)]"
        />
      ) : null}
      {isPlaying ? <span className="sr-only">{playingLabel}</span> : null}
    </button>
  )
}
