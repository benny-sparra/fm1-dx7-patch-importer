import { type ComponentPropsWithoutRef, type MouseEventHandler, forwardRef } from 'react'

import { cn } from '@/lib/utils'

const dialogWidths = {
  sm: 'w-[min(480px,calc(100vw-2rem))]',
  md: 'w-[min(520px,calc(100vw-2rem))]',
  lg: 'w-[min(560px,calc(100vw-2rem))]',
  xl: 'w-[min(620px,calc(100vw-2rem))]',
  '2xl': 'w-[min(640px,calc(100vw-2rem))]',
  '3xl': 'w-[min(760px,calc(100vw-2rem))]',
  '4xl': 'w-[min(52rem,calc(100vw-2rem))]',
} as const

type DialogProps = Omit<ComponentPropsWithoutRef<'dialog'>, 'onClick'> & {
  closeOnBackdrop?: boolean
  onClick?: MouseEventHandler<HTMLDialogElement>
  size?: keyof typeof dialogWidths
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  { className, closeOnBackdrop = true, onClick, size = 'lg', ...props },
  ref,
) {
  return (
    // Native dialog handles Escape; this click handler only detects pointer activation on its backdrop.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      className={cn(
        'modal-surface fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] overflow-x-hidden overflow-y-auto border-2 border-[var(--crt-acc-lt)] bg-[var(--crt-bg-panel2)] p-0 whitespace-normal text-[var(--crt-ink)]',
        dialogWidths[size],
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (
          !event.defaultPrevented &&
          closeOnBackdrop &&
          event.target === event.currentTarget &&
          event.currentTarget.open
        ) {
          event.currentTarget.close()
        }
      }}
      ref={ref}
      {...props}
    />
  )
})

/**
 * The dialog's title bar. Holds the title and the close control only — the
 * hairlines running through it leave no room for supporting copy, which
 * belongs in `DialogBody`.
 */
export function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('crt-titlebar flex items-center gap-2 px-2.5 pt-[7px]', className)}
      {...props}
    />
  )
}

export function DialogTitle({ children, className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn(
        'font-dot-matrix mx-1 flex min-w-0 items-center gap-2 truncate px-2.5 text-sm font-black tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

/**
 * The recessed well the dialog's content sits in. It carries the inset
 * border and ground only — its children bring their own padding, so it can
 * wrap existing dialog bodies without doubling their spacing. Without a
 * footer below it, it keeps the same margin from the frame as at its sides.
 */
export function DialogBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'mx-2.5 mt-2 border-t border-r border-b border-l border-t-[var(--crt-shadow)] border-r-[var(--crt-line)] border-b-[var(--crt-line)] border-l-[var(--crt-shadow)] bg-[var(--crt-bg-1)] text-[var(--crt-ink)] last:mb-2.5',
        className,
      )}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'mt-3 flex justify-end gap-2 border-t border-[var(--crt-line-dk)] bg-[var(--crt-bg-1)] px-3 py-2.5',
        className,
      )}
      {...props}
    />
  )
}

type DialogCloseButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'type'> & {
  label: string
}

export function DialogCloseButton({ className, label, ...props }: DialogCloseButtonProps) {
  return (
    /*
      The close control is the terminal's own bracketed glyph rather than an
      icon: it has to paint over the title bar's hairlines to break them, so
      it needs a text-sized box on the dialog background.
    */
    <button
      aria-label={label}
      className={cn(
        'ml-auto shrink-0 cursor-pointer px-1.5 text-xs leading-4 tracking-[0.08em] text-[var(--crt-acc-lt)] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-acc-lt)]',
        className,
      )}
      type="button"
      {...props}
    >
      <span aria-hidden="true">[╳]</span>
    </button>
  )
}
