import {
  type ComponentPropsWithoutRef,
  type MouseEventHandler,
  type SVGProps,
  forwardRef,
} from 'react'

import { Button } from '@/components/ui/button'
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

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog({
  className,
  closeOnBackdrop = true,
  onClick,
  size = 'lg',
  ...props
}, ref) {
  return (
    <dialog
      className={cn(
        'modal-surface fixed inset-0 z-50 m-auto max-h-[calc(100svh-2rem)] overflow-x-hidden overflow-y-auto whitespace-normal rounded-lg border border-primary/30 bg-white p-0 text-card-foreground shadow-2xl',
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

export function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b bg-white px-5 py-4 [&>*:first-child]:min-w-0 [&>*:first-child]:break-words',
        className,
      )}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('flex justify-end gap-2 border-t bg-white px-5 py-4', className)}
      {...props}
    />
  )
}

function PixelCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 18 18" {...props}>
      <path
        d="M2 2h4v4h2v2h2V6h2V2h4v4h-2v2h-2v2h2v2h2v4h-4v-4h-2v-2H8v2H6v4H2v-4h2v-2h2V8H4V6H2V2Z"
        fill="currentColor"
      />
    </svg>
  )
}

type DialogCloseButtonProps = Omit<ComponentPropsWithoutRef<typeof Button>, 'aria-label' | 'size' | 'variant'> & {
  label: string
}

export function DialogCloseButton({ className, label, ...props }: DialogCloseButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn('shrink-0', className)}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <PixelCloseIcon className="!size-5" />
    </Button>
  )
}
