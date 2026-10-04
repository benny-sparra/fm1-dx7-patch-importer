import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * What an action is about to replace, in the destructive panel with a warning sign, before the
 * user confirms it. Unlike `ErrorNotice` it is not an alert: it is part of the dialog's content,
 * read with it, rather than news that has just arrived. Its children are its paragraphs.
 */
export function WarningNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="grid gap-2">{children}</div>
    </div>
  )
}
