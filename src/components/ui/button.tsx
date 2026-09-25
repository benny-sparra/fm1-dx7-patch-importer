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
const bevelLight =
  'border-t border-r border-b border-l border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)]'
const bevel =
  'border-t border-r border-b border-l border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)]'
const bevelSunken =
  'border-t border-r border-b border-l border-t-[var(--crt-shadow)] border-r-[var(--crt-line-lt2)] border-b-[var(--crt-line-lt2)] border-l-[var(--crt-shadow)]'

/*
 * `cn` does not resolve conflicting classes, so each variant sets its own colours and each size
 * its own dimensions and type, and a `className` passed in must not repeat either. A button that
 * needs other colours or another size gets a variant here, or `bare`, which sets none.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: `${bevelLight} bg-[var(--crt-btn)] text-white hover:bg-[var(--crt-btn-hover)]`,
        /** A confirmed destructive action, such as deleting a bank. */
        danger: `${bevelLight} bg-destructive text-destructive-foreground hover:bg-destructive/90`,
        destructive: `${bevel} bg-[var(--crt-btn-face)] text-destructive hover:bg-destructive hover:text-destructive-foreground`,
        secondary: `${bevel} bg-[var(--crt-btn-face)] text-[var(--crt-ink-2)] hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)]`,
        outline: `${bevelSunken} bg-[var(--crt-bg-1)] text-[var(--crt-ink-2)] hover:bg-[var(--crt-bg-head)] hover:text-[var(--crt-acc-lt)]`,
        /** A toggle shown pressed, lit like an LED. */
        pressed: `${bevelSunken} bg-[var(--crt-led)] text-[var(--crt-bg-0)] hover:bg-[var(--crt-led)] hover:text-[var(--crt-bg-0)]`,
        ghost:
          'text-[var(--crt-ink-2)] hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)]',
        /** A flat icon button for a destructive action. */
        ghostDanger: 'text-destructive hover:bg-[var(--crt-sel-bg)] hover:text-[var(--crt-acc-lt)]',
        /** No colours, for a button that sets its own through `className`. */
        bare: '',
      },
      size: {
        default: 'h-8 px-3 text-xs font-semibold',
        sm: 'h-7 px-2 text-[11px] font-semibold',
        icon: 'size-8 p-0 text-xs font-semibold',
        /** No dimensions or type, for a button that sets its own through `className`. */
        bare: '',
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
  ref?: React.Ref<HTMLButtonElement>
}

function Button({ className, variant, size, asChild = false, ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
}

export { Button, buttonVariants }
