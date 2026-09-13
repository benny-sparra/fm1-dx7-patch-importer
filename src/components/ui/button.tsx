import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/*
 * Terminal pushbuttons. Every variant is a two-tone bevel — light on the
 * top-left, `--crt-shadow` on the bottom-right — so the face, not a radius or
 * a glow, is what marks a control as pressable. `ghost` is the one exception:
 * it stays flat until hovered, for icon affordances sitting on a hatched
 * header where a permanent bevel would read as clutter.
 */
const buttonVariants = cva(
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 px-3 text-xs font-semibold tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default:
          'border-t border-r border-b border-l border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-white hover:bg-[var(--crt-btn-hover)]',
        destructive:
          'border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-destructive hover:bg-destructive hover:text-destructive-foreground',
        secondary:
          'border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-2)] hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)]',
        outline:
          'border-t border-r border-b border-l border-t-[var(--crt-shadow)] border-r-[var(--crt-line-lt2)] border-b-[var(--crt-line-lt2)] border-l-[var(--crt-shadow)] bg-[var(--crt-bg-1)] text-[var(--crt-ink-2)] hover:bg-[var(--crt-bg-head)] hover:text-[var(--crt-acc-lt)]',
        ghost:
          'text-[var(--crt-ink-2)] hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)]',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2 text-[11px]',
        icon: 'size-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
