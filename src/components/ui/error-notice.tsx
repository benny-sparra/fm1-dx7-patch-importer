import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ErrorNoticeProps = {
  children: ReactNode
  className?: string
}

/**
 * A translated explanation of something that went wrong, in the destructive panel the dialogs and
 * the librarian share. It is an alert, so a screen reader announces it as it appears.
 */
export function ErrorNotice({ children, className }: ErrorNoticeProps) {
  return (
    <p
      className={cn(
        'rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
        className,
      )}
      role="alert"
    >
      {children}
    </p>
  )
}
